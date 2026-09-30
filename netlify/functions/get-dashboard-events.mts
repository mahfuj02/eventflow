import type { EventDocument, EventStatus } from '../../shared/types/event'
import type { GuestDocument } from '../../shared/types/guest'
import { getDb } from './_lib/mongo'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

interface DashboardEventRow {
  _id: string
  title: string
  startsAt: string
  sold: number
  capacity: number
  revenue: number
  status: EventStatus
  isPast: boolean
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
    const hostEvents = await events
      .find({ organizerId: user.uid })
      .sort({ startsAt: 1 })
      .toArray()

    const now = new Date()
    const rows: DashboardEventRow[] = hostEvents.map((event) => {
      let sold = 0
      let capacity = 0
      let revenue = 0
      for (const ticketType of event.ticketTypes) {
        sold += ticketType.quantitySold
        capacity += ticketType.quantityTotal
        revenue += ticketType.quantitySold * ticketType.price
      }
      return {
        _id: event._id.toString(),
        title: event.title,
        startsAt: event.startsAt,
        sold,
        capacity,
        revenue,
        status: event.status,
        isPast: new Date(event.endsAt) < now,
      }
    })

    return Response.json({ events: rows })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('get-dashboard-events failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
