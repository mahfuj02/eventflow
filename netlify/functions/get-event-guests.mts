import { ObjectId } from 'mongodb'
import type { EventDocument } from '../../shared/types/event'
import type { GuestDocument } from '../../shared/types/guest'
import type { TicketDocument } from '../../shared/types/ticket'
import { getDb } from './_lib/mongo'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    const eventId = new URL(req.url).searchParams.get('eventId')
    if (!eventId) {
      return new Response('eventId is required', { status: 400 })
    }

    const db = await getDb()
    const events = db.collection<Omit<EventDocument, '_id'>>('events')
    const tickets = db.collection<Omit<TicketDocument, '_id'>>('tickets')
    const guests = db.collection<Omit<GuestDocument, '_id'>>('guests')

    const event = await events.findOne({ _id: new ObjectId(eventId) })
    if (!event) {
      return new Response('Event not found', { status: 404 })
    }
    if (event.organizerId !== user.uid) {
      return new Response('You do not own this event', { status: 403 })
    }

    const eventTickets = await tickets
      .find({ eventId })
      .sort({ createdAt: -1 })
      .toArray()

    const guestIds = [...new Set(eventTickets.map((t) => t.guestId))]
    const relatedGuests = await guests.find({ firebaseUid: { $in: guestIds } }).toArray()
    const guestByUid = new Map(relatedGuests.map((g) => [g.firebaseUid, g]))

    const guestRows = eventTickets.map((ticket) => {
      const guest = guestByUid.get(ticket.guestId)
      const ticketType = event.ticketTypes.find((t) => t.id === ticket.ticketTypeId)

      return {
        ticketId: ticket._id.toString(),
        code: ticket.code,
        status: ticket.status,
        purchasedAt: ticket.createdAt,
        guestName: guest?.name ?? 'Unknown',
        guestEmail: guest?.email ?? 'Unknown',
        ticketTypeName: ticketType?.name ?? '',
        price: ticketType?.price ?? 0,
        currency: ticketType?.currency ?? 'usd',
      }
    })

    return Response.json({
      event: {
        title: event.title,
        venue: event.venue,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        ticketTypes: event.ticketTypes,
      },
      guests: guestRows,
    })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('get-event-guests failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
