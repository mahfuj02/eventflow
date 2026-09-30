import type { EventDocument } from '../../shared/types/event'
import { getDb } from './_lib/mongo'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const db = await getDb()
    const collection = db.collection<Omit<EventDocument, '_id'>>('events')

    const events = await collection
      .find({ status: 'published', endsAt: { $gte: new Date().toISOString() } })
      .sort({ startsAt: 1 })
      .toArray()

    return Response.json(
      events.map(({ _id, ...rest }) => ({ _id: _id.toString(), ...rest })),
    )
  } catch (err) {
    console.error('get-events failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
