import { approveHostApplication } from './_lib/hostApplicationApproval'
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

    const origin = new URL(req.url).origin
    const result = await approveHostApplication(body.applicationId, origin)
    if (!result.ok) {
      return new Response(result.message, { status: result.status })
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
