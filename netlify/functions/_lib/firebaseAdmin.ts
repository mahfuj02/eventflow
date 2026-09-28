import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'

// Only firebase-admin/app + firebase-admin/storage are imported here.
// firebase-admin/auth pulls in jwks-rsa, which requires('jose') at
// load time - jose v6 is ESM-only, and that require() crashes every
// function that imports it. Token verification stays in verifyAuth.ts
// (jose's own createRemoteJWKSet/jwtVerify) and never touches this file.

function getAdminApp() {
  const existing = getApps()[0]
  if (existing) return existing

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET

  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    throw new Error('Firebase Admin is not configured (missing env vars)')
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  })
}

export function getBucket() {
  return getStorage(getAdminApp()).bucket()
}
