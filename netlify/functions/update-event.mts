import { ObjectId } from 'mongodb'
import type { EventDocument, TicketType } from '../../shared/types/event'
import { isNonEmptyString, validateEventFields, type EventFieldsBody } from './_lib/eventValidation'
import { getDb } from './_lib/mongo'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

type UpdateEventBody = EventFieldsBody

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'PATCH') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    const eventId = new URL(req.url).searchParams.get('eventId')
    if (!eventId) {
      return new Response('eventId is required', { status: 400 })
    }

    const body = (await req.json()) as UpdateEventBody

    const db = await getDb()
    const events = db.collection<Omit<EventDocument, '_id'>>('events')
    const existingEvent = await events.findOne({ _id: new ObjectId(eventId) })
    if (!existingEvent) {
      return new Response('Event not found', { status: 404 })
    }
    if (existingEvent.organizerId !== user.uid) {
      return new Response('You do not own this event', { status: 403 })
    }

    const error = validateEventFields(body)
    if (error) {
      return new Response(error, { status: 400 })
    }

    // Partial lock: existing ticket types keep their id/quantitySold and
    // can have name/price/quantityTotal edited (price changes only affect
    // future buyers - past Orders already snapshot their own amountTotal).
    // quantityTotal can't drop below quantitySold, and a type with any
    // sales can't be removed outright. New rows become new ticket types.
    const existingById = new Map(existingEvent.ticketTypes.map((t) => [t.id, t]))
    const incomingIds = new Set<string>()

    const ticketTypes: TicketType[] = []
    for (const ticketType of body.ticketTypes!) {
      const id = typeof ticketType.id === 'string' ? ticketType.id : undefined
      const existing = id ? existingById.get(id) : undefined

      if (existing) {
        incomingIds.add(existing.id)
        const quantityTotal = ticketType.quantityTotal as number
        if (quantityTotal < existing.quantitySold) {
          return new Response(
            `"${existing.name}" has ${existing.quantitySold} sold — quantity available can't go below that`,
            { status: 400 },
          )
        }
        ticketTypes.push({
          id: existing.id,
          name: (ticketType.name as string).trim(),
          price: ticketType.price as number,
          currency: existing.currency,
          quantityTotal,
          quantitySold: existing.quantitySold,
        })
      } else {
        ticketTypes.push({
          id: crypto.randomUUID(),
          name: (ticketType.name as string).trim(),
          price: ticketType.price as number,
          currency: 'usd',
          quantityTotal: ticketType.quantityTotal as number,
          quantitySold: 0,
        })
      }
    }

    for (const existing of existingEvent.ticketTypes) {
      if (!incomingIds.has(existing.id) && existing.quantitySold > 0) {
        return new Response(
          `Can't remove "${existing.name}" — it already has ${existing.quantitySold} ticket(s) sold`,
          { status: 400 },
        )
      }
    }

    const now = new Date().toISOString()
    const updatedEvent: Omit<EventDocument, '_id'> = {
      organizerId: existingEvent.organizerId,
      title: (body.title as string).trim(),
      description: (body.description as string).trim(),
      venue: (body.venue as string).trim(),
      startsAt: new Date(body.startsAt as string).toISOString(),
      endsAt: new Date(body.endsAt as string).toISOString(),
      status: existingEvent.status,
      ticketTypes,
      createdAt: existingEvent.createdAt,
      updatedAt: now,
      ...(isNonEmptyString(body.category) ? { category: body.category.trim() } : {}),
      ...(isNonEmptyString(body.imageUrl) ? { imageUrl: body.imageUrl.trim() } : {}),
    }

    await events.replaceOne({ _id: new ObjectId(eventId) }, updatedEvent)

    return Response.json({ _id: eventId, ...updatedEvent })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('update-event failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
