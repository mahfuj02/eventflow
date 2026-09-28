import { timingSafeEqual } from 'node:crypto'
import { ObjectId } from 'mongodb'
import type { HostApplicationDocument } from '../../shared/types/hostApplication'
import { approveHostApplication } from './_lib/hostApplicationApproval'
import { getDb } from './_lib/mongo'

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

function htmlPage(message: string): Response {
  return new Response(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>EventFlow</title>
  </head>
  <body style="margin:0; padding:64px 24px; background:#F7F5F0; font-family: system-ui, sans-serif; text-align:center;">
    <p style="font-size:18px; color:#1C1B19;">${message}</p>
  </body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

function tokensMatch(expected: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(actual)
  if (expectedBuf.length !== actualBuf.length) return false
  return timingSafeEqual(expectedBuf, actualBuf)
}

const INVALID_LINK_MESSAGE = 'This approval link is no longer valid.'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const url = new URL(req.url)
    const applicationId = url.searchParams.get('applicationId')
    const token = url.searchParams.get('token')
    if (!applicationId || !token) {
      return htmlPage(INVALID_LINK_MESSAGE)
    }

    const db = await getDb()
    const applications = db.collection<Omit<HostApplicationDocument, '_id'>>('hostApplications')
    const application = await applications.findOne({ _id: new ObjectId(applicationId) })

    const isExpired = application
      ? Date.now() - new Date(application.createdAt).getTime() > EXPIRY_MS
      : true

    if (
      !application ||
      application.approvalTokenUsed ||
      application.status !== 'pending' ||
      !tokensMatch(application.approvalToken, token) ||
      isExpired
    ) {
      return htmlPage(INVALID_LINK_MESSAGE)
    }

    const result = await approveHostApplication(applicationId, url.origin)
    if (!result.ok) {
      return htmlPage(INVALID_LINK_MESSAGE)
    }

    await applications.updateOne({ _id: new ObjectId(applicationId) }, { $set: { approvalTokenUsed: true } })

    return htmlPage('Application approved.')
  } catch (err) {
    console.error('approve-application-by-link failed:', err)
    return htmlPage('Something went wrong. Please try again or use the dashboard approval method.')
  }
}
