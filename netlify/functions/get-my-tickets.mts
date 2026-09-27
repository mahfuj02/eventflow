import { ObjectId } from 'mongodb'
import type { EventDocument } from '../../shared/types/event'
import type { TicketDocument } from '../../shared/types/ticket'
import { getDb } from './_lib/mongo'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

export interface MyTicketSummary {
  _id: string
  eventId: string
  code: string
  status: TicketDocument['status']
  purchasedAt: string
  eventTitle: string
  eventVenue: string
  startsAt: string
  endsAt: string
  ticketTypeName: string
  price: number
  currency: string
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    const db = await getDb()
    const tickets = db.collection<Omit<TicketDocument, '_id'>>('tickets')
    const events = db.collection<Omit<EventDocument, '_id'>>('events')

    const myTickets = await tickets
      .find({ guestId: user.uid })
      .sort({ createdAt: -1 })
      .toArray()

    const eventIds = [...new Set(myTickets.map((t) => t.eventId))].map((id) => new ObjectId(id))
    const relatedEvents = await events.find({ _id: { $in: eventIds } }).toArray()
    const eventById = new Map(relatedEvents.map((e) => [e._id.toString(), e]))

    const summaries: MyTicketSummary[] = myTickets.map((ticket) => {
      const event = eventById.get(ticket.eventId)
      const ticketType = event?.ticketTypes.find((t) => t.id === ticket.ticketTypeId)

      return {
        _id: ticket._id.toString(),
        eventId: ticket.eventId,
        code: ticket.code,
        status: ticket.status,
        purchasedAt: ticket.createdAt,
        eventTitle: event?.title ?? 'Unknown event',
        eventVenue: event?.venue ?? '',
        startsAt: event?.startsAt ?? '',
        endsAt: event?.endsAt ?? '',
        ticketTypeName: ticketType?.name ?? '',
        price: ticketType?.price ?? 0,
        currency: ticketType?.currency ?? 'usd',
      }
    })

    return Response.json(summaries)
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('get-my-tickets failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
