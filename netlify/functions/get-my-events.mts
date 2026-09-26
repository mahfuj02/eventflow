import type { EventDocument } from '../../shared/types/event'
import { getDb } from './_lib/mongo'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    const db = await getDb()
    const collection = db.collection<Omit<EventDocument, '_id'>>('events')

    const events = await collection
      .find({ hostId: user.uid })
      .sort({ createdAt: -1 })
      .toArray()

    return Response.json(
      events.map(({ _id, ...rest }) => ({ _id: _id.toString(), ...rest })),
    )
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('get-my-events failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
