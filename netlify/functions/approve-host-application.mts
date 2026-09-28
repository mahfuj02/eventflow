import { ObjectId } from 'mongodb'
import type { GuestDocument } from '../../shared/types/guest'
import type { HostApplicationDocument } from '../../shared/types/hostApplication'
import { getDb } from './_lib/mongo'
import { getResend, NOTIFICATION_FROM } from './_lib/resend'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

interface ApproveBody {
  applicationId?: unknown
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    if (user.email !== process.env.ADMIN_EMAIL) {
      return new Response('Forbidden', { status: 403 })
    }

    const body = (await req.json()) as ApproveBody
    if (typeof body.applicationId !== 'string') {
      return new Response('applicationId is required', { status: 400 })
    }

    const db = await getDb()
    const applications = db.collection<Omit<HostApplicationDocument, '_id'>>('hostApplications')
    const guests = db.collection<Omit<GuestDocument, '_id'>>('guests')

    const application = await applications.findOne({ _id: new ObjectId(body.applicationId) })
    if (!application) {
      return new Response('Application not found', { status: 404 })
    }

    const now = new Date().toISOString()
    await applications.updateOne(
      { _id: new ObjectId(body.applicationId) },
      { $set: { status: 'approved', updatedAt: now } },
    )
    await guests.updateOne(
      { firebaseUid: application.userId },
      { $set: { role: 'host', updatedAt: now } },
    )

    try {
      const origin = new URL(req.url).origin
      await getResend().emails.send({
        from: NOTIFICATION_FROM,
        to: application.email,
        subject: "You're approved to host on EventFlow",
        text: `Good news — your application to host on EventFlow has been approved. You can now create and manage events from your dashboard.\n\n${origin}/dashboard`,
      })
    } catch (err) {
      console.error('Failed to send host approval email:', err)
    }

    return Response.json({ ok: true })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('approve-host-application failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
