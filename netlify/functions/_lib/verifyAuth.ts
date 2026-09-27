import { createRemoteJWKSet, jwtVerify } from 'jose'

export interface AuthenticatedUser {
  uid: string
  email?: string
  name?: string
}

export class UnauthorizedError extends Error {}

const projectId = process.env.FIREBASE_PROJECT_ID
const googleJwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

export async function verifyAuth(authHeader: string | null): Promise<AuthenticatedUser> {
  const token = authHeader?.match(/^Bearer (.+)$/)?.[1]
  if (!token) {
    throw new UnauthorizedError('Missing bearer token')
  }
  if (!projectId) {
    throw new UnauthorizedError('Server auth is not configured')
  }

  const payload = await jwtVerify(token, googleJwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  })
    .then((result) => result.payload)
    .catch(() => {
      throw new UnauthorizedError('Invalid or expired token')
    })

  if (typeof payload.sub !== 'string') {
    throw new UnauthorizedError('Token missing required claims')
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
  }
}
