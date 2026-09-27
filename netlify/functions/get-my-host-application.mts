import type { HostApplicationDocument } from '../../shared/types/hostApplication'
import { getDb } from './_lib/mongo'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    const db = await getDb()
    const applications = db.collection<Omit<HostApplicationDocument, '_id'>>('hostApplications')

    const application = await applications.findOne(
      { userId: user.uid },
      { sort: { createdAt: -1 } },
    )

    if (!application) {
      return Response.json(null)
    }

    const { _id, ...rest } = application
    return Response.json({ _id: _id.toString(), ...rest })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('get-my-host-application failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
