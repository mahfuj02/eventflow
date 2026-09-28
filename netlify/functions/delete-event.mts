import { ObjectId } from 'mongodb'
import type { EventDocument } from '../../shared/types/event'
import { getDb } from './_lib/mongo'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'DELETE') {
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
    const event = await events.findOne({ _id: new ObjectId(eventId) })
    if (!event) {
      return new Response('Event not found', { status: 404 })
    }
    if (event.organizerId !== user.uid) {
      return new Response('You do not own this event', { status: 403 })
    }

    const totalSold = event.ticketTypes.reduce((sum, t) => sum + t.quantitySold, 0)
    if (totalSold > 0) {
      return new Response(
        "Can't delete an event with existing ticket sales — contact support",
        { status: 409 },
      )
    }

    await events.deleteOne({ _id: new ObjectId(eventId) })

    return new Response(null, { status: 204 })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('delete-event failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
