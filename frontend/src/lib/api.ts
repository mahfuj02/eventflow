import type { EventDocument } from '../../../shared/types/event'
import { auth } from './firebase'

export interface SyncedGuest {
  firebaseUid: string
  email: string
  name: string
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')

  const token = await user.getIdToken()
  const response = await fetch(path, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`)
  }

  return response
}

export async function syncGuest(): Promise<SyncedGuest> {
  const response = await authedFetch('/.netlify/functions/sync-guest', { method: 'POST' })
  return response.json() as Promise<SyncedGuest>
}

export interface CreateEventInput {
  title: string
  description: string
  venue: string
  startsAt: string
  endsAt: string
  ticketType: {
    name: string
    price: number
    quantityTotal: number
  }
}

export async function createEvent(input: CreateEventInput): Promise<EventDocument> {
  const response = await authedFetch('/.netlify/functions/create-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.json() as Promise<EventDocument>
}

export async function getMyEvents(): Promise<EventDocument[]> {
  const response = await authedFetch('/.netlify/functions/get-my-events')
  return response.json() as Promise<EventDocument[]>
}
