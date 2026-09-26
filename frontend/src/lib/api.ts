import { auth } from './firebase'

export interface SyncedGuest {
  firebaseUid: string
  email: string
  name: string
}

export async function syncGuest(): Promise<SyncedGuest> {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')

  const token = await user.getIdToken()
  const response = await fetch('/.netlify/functions/sync-guest', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error(`sync-guest failed: ${response.status}`)
  }

  return response.json() as Promise<SyncedGuest>
}
