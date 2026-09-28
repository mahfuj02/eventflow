import { ObjectId } from 'mongodb'
import type { GuestDocument } from '../../../shared/types/guest'
import type { HostApplicationDocument } from '../../../shared/types/hostApplication'
import { getDb } from './mongo'
import { getResend, NOTIFICATION_FROM } from './resend'

type ApproveResult = { ok: true } | { ok: false; status: number; message: string }

export async function approveHostApplication(applicationId: string, origin: string): Promise<ApproveResult> {
  const db = await getDb()
  const applications = db.collection<Omit<HostApplicationDocument, '_id'>>('hostApplications')
  const guests = db.collection<Omit<GuestDocument, '_id'>>('guests')

  const application = await applications.findOne({ _id: new ObjectId(applicationId) })
  if (!application) {
    return { ok: false, status: 404, message: 'Application not found' }
  }

  const now = new Date().toISOString()
  await applications.updateOne(
    { _id: new ObjectId(applicationId) },
    { $set: { status: 'approved', updatedAt: now } },
  )
  await guests.updateOne(
    { firebaseUid: application.userId },
    { $set: { role: 'host', updatedAt: now } },
  )

  try {
    const result = await getResend().emails.send({
      from: NOTIFICATION_FROM,
      to: application.email,
      subject: "You're approved to host on EventFlow",
      text: `Good news — your application to host on EventFlow has been approved. You can now create and manage events from your dashboard.\n\n${origin}/dashboard`,
    })
    if (result.error) {
      console.error('Failed to send host approval email:', result.error)
    } else {
      console.log('Sent host approval email:', result.data?.id)
    }
  } catch (err) {
    console.error('Failed to send host approval email:', err)
  }

  return { ok: true }
}
