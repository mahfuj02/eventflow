import type { GuestDocument } from '../../shared/types/guest'
import { getDb } from './_lib/mongo'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    const now = new Date().toISOString()
    const db = await getDb()
    const collection = db.collection<GuestDocument>('guests')

    await collection.updateOne(
      { firebaseUid: user.uid },
      {
        $setOnInsert: {
          firebaseUid: user.uid,
          email: user.email,
          name: user.email.split('@')[0],
          role: 'guest',
          createdAt: now,
        },
        $set: { updatedAt: now },
      },
      { upsert: true },
    )

    const guest = await collection.findOne({ firebaseUid: user.uid })
    return Response.json(guest)
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('sync-guest failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
