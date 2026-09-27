import { ObjectId } from 'mongodb'
import type { EventDocument } from '../../shared/types/event'
import type { GuestDocument } from '../../shared/types/guest'
import { getDb } from './_lib/mongo'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const eventId = new URL(req.url).searchParams.get('eventId')
    if (!eventId) {
      return new Response('eventId is required', { status: 400 })
    }

    const db = await getDb()
    const events = db.collection<Omit<EventDocument, '_id'>>('events')
    const guests = db.collection<Omit<GuestDocument, '_id'>>('guests')

    const event = await events.findOne({ _id: new ObjectId(eventId), status: 'published' })
    if (!event) {
      return new Response('Event not found', { status: 404 })
    }

    const organizerGuest = await guests.findOne({ firebaseUid: event.organizerId })
    const { _id, ...eventRest } = event

    return Response.json({
      event: { _id: _id.toString(), ...eventRest },
      organizer: {
        name: organizerGuest?.name ?? 'Unknown organizer',
        hostingSinceYear: organizerGuest
          ? new Date(organizerGuest.createdAt).getFullYear()
          : new Date(event.createdAt).getFullYear(),
      },
    })
  } catch (err) {
    console.error('get-event failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
