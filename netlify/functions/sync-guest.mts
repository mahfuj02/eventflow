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

    // A field can't be in both $setOnInsert and $set (Mongo rejects that as
    // a conflict on insert) - put each one in whichever operator applies.
    const setOnInsert: Partial<GuestDocument> = {
      firebaseUid: user.uid,
      role: 'guest',
      createdAt: now,
    }
    const set: Partial<GuestDocument> = { updatedAt: now }

    if (user.email) {
      set.email = user.email
    }
    if (user.name) {
      set.name = user.name
    } else {
      setOnInsert.name = user.email ? user.email.split('@')[0] : 'Guest'
    }

    await collection.updateOne(
      { firebaseUid: user.uid },
      { $setOnInsert: setOnInsert, $set: set },
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
