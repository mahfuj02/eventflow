import { firebaseAuth } from './firebaseAdmin'

export interface AuthenticatedUser {
  uid: string
  email: string
}

export class UnauthorizedError extends Error {}

export async function verifyAuth(authHeader: string | null): Promise<AuthenticatedUser> {
  const token = authHeader?.match(/^Bearer (.+)$/)?.[1]
  if (!token) {
    throw new UnauthorizedError('Missing bearer token')
  }

  const decoded = await firebaseAuth.verifyIdToken(token).catch(() => {
    throw new UnauthorizedError('Invalid or expired token')
  })

  if (!decoded.email) {
    throw new UnauthorizedError('Token has no email')
  }

  return { uid: decoded.uid, email: decoded.email }
}
