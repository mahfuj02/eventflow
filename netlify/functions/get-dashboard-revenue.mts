import type { EventDocument } from '../../shared/types/event'
import type { GuestDocument } from '../../shared/types/guest'
import type { OrderDocument } from '../../shared/types/order'
import { getDb } from './_lib/mongo'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

const MONTHS_BACK = 6

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`
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

    const now = new Date()
    const windowStart = new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1), 1)

    const revenueByMonth = new Map<string, number>()
    if (hostEventIds.length > 0) {
      const orders = db.collection<Omit<OrderDocument, '_id'>>('orders')
      const paidOrders = await orders
        .find({
          eventId: { $in: hostEventIds },
          status: 'paid',
          createdAt: { $gte: windowStart.toISOString() },
        })
        .toArray()

      for (const order of paidOrders) {
        const key = monthKey(new Date(order.createdAt))
        revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + order.amountTotal)
      }
    }

    const months = []
    for (let i = MONTHS_BACK - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        label: date.toLocaleString('en-US', { month: 'short' }),
        revenue: revenueByMonth.get(monthKey(date)) ?? 0,
      })
    }

    return Response.json({ months })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('get-dashboard-revenue failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
