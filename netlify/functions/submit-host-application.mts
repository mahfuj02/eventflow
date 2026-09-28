import type { HostApplicationDocument } from '../../shared/types/hostApplication'
import { getDb } from './_lib/mongo'
import { getResend, NOTIFICATION_FROM } from './_lib/resend'
import { UnauthorizedError, verifyAuth } from './_lib/verifyAuth'

interface SubmitApplicationBody {
  orgName?: unknown
  category?: unknown
  expectedAttendees?: unknown
  contactName?: unknown
  role?: unknown
  email?: unknown
  phone?: unknown
  message?: unknown
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function validate(body: SubmitApplicationBody): string | null {
  if (!isNonEmptyString(body.orgName)) return 'orgName is required'
  if (!isNonEmptyString(body.category)) return 'category is required'
  if (!isNonEmptyString(body.expectedAttendees)) return 'expectedAttendees is required'
  if (!isNonEmptyString(body.contactName)) return 'contactName is required'
  if (!isNonEmptyString(body.role)) return 'role is required'
  if (!isNonEmptyString(body.email)) return 'email is required'
  if (!isNonEmptyString(body.phone)) return 'phone is required'
  if (!isNonEmptyString(body.message)) return 'message is required'
  return null
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const user = await verifyAuth(req.headers.get('authorization'))
    const body = (await req.json()) as SubmitApplicationBody

    const error = validate(body)
    if (error) {
      return new Response(error, { status: 400 })
    }

    const db = await getDb()
    const applications = db.collection<Omit<HostApplicationDocument, '_id'>>('hostApplications')

    const existing = await applications.findOne({
      userId: user.uid,
      status: { $in: ['pending', 'approved'] },
    })
    if (existing) {
      return new Response('You already have an application on file', { status: 400 })
    }

    const now = new Date().toISOString()
    const application: Omit<HostApplicationDocument, '_id'> = {
      userId: user.uid,
      orgName: (body.orgName as string).trim(),
      category: (body.category as string).trim(),
      expectedAttendees: (body.expectedAttendees as string).trim(),
      contactName: (body.contactName as string).trim(),
      role: (body.role as string).trim(),
      email: (body.email as string).trim(),
      phone: (body.phone as string).trim(),
      message: (body.message as string).trim(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }

    const result = await applications.insertOne(application)

    try {
      await getResend().emails.send({
        from: NOTIFICATION_FROM,
        to: process.env.ADMIN_EMAIL!,
        subject: `New host application — ${application.orgName}`,
        text: [
          `Organization: ${application.orgName}`,
          `Category: ${application.category}`,
          `Expected attendees: ${application.expectedAttendees}`,
          `Contact: ${application.contactName} (${application.role})`,
          `Email: ${application.email}`,
          `Phone: ${application.phone}`,
          ``,
          `Message:`,
          application.message,
        ].join('\n'),
      })
    } catch (err) {
      console.error('Failed to send host application notification email:', err)
    }

    return Response.json({ _id: result.insertedId.toString(), ...application })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(err.message, { status: 401 })
    }
    console.error('submit-host-application failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
