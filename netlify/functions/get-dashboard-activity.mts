import type { EventDocument } from '../../shared/types/event'
import type { GuestDocument } from '../../shared/types/guest'
import type { OrderDocument } from '../../shared/types/order'
import { getDb } from './_lib/mongo'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

const ACTIVITY_LIMIT = 10
const GUEST_SIGNUP_WINDOW_MS = 2 * 60 * 1000

type ActivityType = 'event_created' | 'new_order' | 'guest_profile_created'

interface ActivityItem {
  type: ActivityType
  label: string
  timestamp: string
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    const db = await getDb()
    const guests = db.collection<Omit<GuestDocument, '_id'>>('guests')
    const guest = await guests.findOne({ firebaseUid: user.uid })
    if (guest?.role !== 'host') {
      return new Response('You must be an approved host to view dashboard data', { status: 403 })
    }

    const events = db.collection<Omit<EventDocument, '_id'>>('events')
    const hostEvents = await events.find({ organizerId: user.uid }).toArray()
    const hostEventIds = hostEvents.map((event) => event._id.toString())
    const titleByEventId = new Map(hostEvents.map((event) => [event._id.toString(), event.title]))

    const activity: ActivityItem[] = hostEvents.map((event) => ({
      type: 'event_created',
      label: `Event created — ${event.title}`,
      timestamp: event.createdAt,
    }))

    if (hostEventIds.length > 0) {
      const orders = db.collection<Omit<OrderDocument, '_id'>>('orders')
      const recentOrders = await orders
        .find({ eventId: { $in: hostEventIds }, status: 'paid' })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()

      for (const order of recentOrders) {
        activity.push({
          type: 'new_order',
          label: `New ticket order — ${titleByEventId.get(order.eventId) ?? 'Unknown event'}`,
          timestamp: order.createdAt,
        })
      }

      const guestIds = [...new Set(recentOrders.map((order) => order.guestId))]
      const relatedGuests = await guests.find({ firebaseUid: { $in: guestIds } }).toArray()
      const guestByUid = new Map(relatedGuests.map((g) => [g.firebaseUid, g]))

      const creditedGuestIds = new Set<string>()
      for (const order of recentOrders) {
        if (creditedGuestIds.has(order.guestId)) continue
        const guestDoc = guestByUid.get(order.guestId)
        if (!guestDoc) continue

        const diffMs = Math.abs(
          new Date(guestDoc.createdAt).getTime() - new Date(order.createdAt).getTime(),
        )
        if (diffMs <= GUEST_SIGNUP_WINDOW_MS) {
          creditedGuestIds.add(order.guestId)
          activity.push({
            type: 'guest_profile_created',
            label: `Guest profile created — ${guestDoc.name}`,
            timestamp: guestDoc.createdAt,
          })
        }
      }
    }

    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return Response.json({ activity: activity.slice(0, ACTIVITY_LIMIT) })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('get-dashboard-activity failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
