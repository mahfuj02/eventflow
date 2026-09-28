import type { EventDocument, TicketType } from '../../shared/types/event'
import type { GuestDocument } from '../../shared/types/guest'
import { isNonEmptyString, validateEventFields, type EventFieldsBody } from './_lib/eventValidation'
import { getDb } from './_lib/mongo'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

type CreateEventBody = EventFieldsBody

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    const body = (await req.json()) as CreateEventBody

    const db = await getDb()
    const guests = db.collection<Omit<GuestDocument, '_id'>>('guests')
    const guest = await guests.findOne({ firebaseUid: user.uid })
    if (guest?.role !== 'host') {
      return new Response('You must be an approved host to create events', { status: 403 })
    }

    const error = validateEventFields(body)
    if (error) {
      return new Response(error, { status: 400 })
    }

    const ticketTypes: TicketType[] = body.ticketTypes!.map((ticketType) => ({
      id: crypto.randomUUID(),
      name: (ticketType.name as string).trim(),
      price: ticketType.price as number,
      currency: 'usd',
      quantityTotal: ticketType.quantityTotal as number,
      quantitySold: 0,
    }))

    const now = new Date().toISOString()
    const event: Omit<EventDocument, '_id'> = {
      organizerId: user.uid,
      title: (body.title as string).trim(),
      description: (body.description as string).trim(),
      venue: (body.venue as string).trim(),
      startsAt: new Date(body.startsAt as string).toISOString(),
      endsAt: new Date(body.endsAt as string).toISOString(),
      status: 'published',
      ticketTypes,
      createdAt: now,
      updatedAt: now,
      ...(isNonEmptyString(body.category) ? { category: body.category.trim() } : {}),
      ...(isNonEmptyString(body.imageUrl) ? { imageUrl: body.imageUrl.trim() } : {}),
    }

    const collection = db.collection<Omit<EventDocument, '_id'>>('events')
    const result = await collection.insertOne(event)

    return Response.json({ _id: result.insertedId.toString(), ...event })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('create-event failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
