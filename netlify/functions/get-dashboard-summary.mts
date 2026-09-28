import type { EventDocument } from '../../shared/types/event'
import type { GuestDocument } from '../../shared/types/guest'
import { getDb } from './_lib/mongo'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

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

    let totalTicketsSold = 0
    let totalRevenue = 0
    let activeEvents = 0

    for (const event of hostEvents) {
      if (event.status !== 'cancelled') activeEvents++
      for (const ticketType of event.ticketTypes) {
        totalTicketsSold += ticketType.quantitySold
        totalRevenue += ticketType.quantitySold * ticketType.price
      }
    }

    return Response.json({ totalTicketsSold, totalRevenue, activeEvents })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('get-dashboard-summary failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
