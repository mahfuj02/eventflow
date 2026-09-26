import type { EventDocument, TicketType } from '../../shared/types/event'
import { getDb } from './_lib/mongo'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

interface CreateEventBody {
  title?: unknown
  description?: unknown
  venue?: unknown
  startsAt?: unknown
  endsAt?: unknown
  ticketType?: {
    name?: unknown
    price?: unknown
    quantityTotal?: unknown
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function validate(body: CreateEventBody): string | null {
  if (!isNonEmptyString(body.title)) return 'title is required'
  if (!isNonEmptyString(body.description)) return 'description is required'
  if (!isNonEmptyString(body.venue)) return 'venue is required'

  const startsAt = typeof body.startsAt === 'string' ? new Date(body.startsAt) : null
  const endsAt = typeof body.endsAt === 'string' ? new Date(body.endsAt) : null
  if (!startsAt || Number.isNaN(startsAt.getTime())) return 'startsAt must be a valid date'
  if (!endsAt || Number.isNaN(endsAt.getTime())) return 'endsAt must be a valid date'
  if (endsAt <= startsAt) return 'endsAt must be after startsAt'

  const ticketType = body.ticketType
  if (!ticketType || !isNonEmptyString(ticketType.name)) return 'ticketType.name is required'
  if (!isPositiveInteger(ticketType.price)) return 'ticketType.price must be a positive integer (cents)'
  if (!isPositiveInteger(ticketType.quantityTotal)) return 'ticketType.quantityTotal must be a positive integer'

  return null
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    const body = (await req.json()) as CreateEventBody

    const error = validate(body)
    if (error) {
      return new Response(error, { status: 400 })
    }

    const ticketType: TicketType = {
      id: crypto.randomUUID(),
      name: (body.ticketType!.name as string).trim(),
      price: body.ticketType!.price as number,
      currency: 'usd',
      quantityTotal: body.ticketType!.quantityTotal as number,
      quantitySold: 0,
    }

    const now = new Date().toISOString()
    const event: Omit<EventDocument, '_id'> = {
      hostId: user.uid,
      title: (body.title as string).trim(),
      description: (body.description as string).trim(),
      venue: (body.venue as string).trim(),
      startsAt: new Date(body.startsAt as string).toISOString(),
      endsAt: new Date(body.endsAt as string).toISOString(),
      status: 'published',
      ticketTypes: [ticketType],
      createdAt: now,
      updatedAt: now,
    }

    const db = await getDb()
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
