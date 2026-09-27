import type { EventDocument, TicketType } from '../../../shared/types/event'
import type { OrderDocument } from '../../../shared/types/order'
import type { TicketDocument } from '../../../shared/types/ticket'
import { auth } from './firebase'

export interface SyncedGuest {
  firebaseUid: string
  email?: string
  name: string
  role: 'guest' | 'host'
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
  category?: string
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

export async function getEvents(): Promise<EventDocument[]> {
  const response = await fetch('/.netlify/functions/get-events')
  if (!response.ok) {
    throw new Error(`get-events failed: ${response.status}`)
  }
  return response.json() as Promise<EventDocument[]>
}

export async function createCheckoutSession(eventId: string, ticketTypeId: string): Promise<{ url: string }> {
  const response = await authedFetch('/.netlify/functions/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, ticketTypeId }),
  })
  return response.json() as Promise<{ url: string }>
}

export interface ConfirmedOrder {
  order: OrderDocument
  ticket: TicketDocument | null
}

export async function confirmOrder(sessionId: string): Promise<ConfirmedOrder> {
  const response = await authedFetch(
    `/.netlify/functions/confirm-order?session_id=${encodeURIComponent(sessionId)}`,
  )
  return response.json() as Promise<ConfirmedOrder>
}

export interface MyTicketSummary {
  _id: string
  eventId: string
  code: string
  status: TicketDocument['status']
  purchasedAt: string
  eventTitle: string
  eventVenue: string
  startsAt: string
  endsAt: string
  ticketTypeName: string
  price: number
  currency: string
}

export async function getMyTickets(): Promise<MyTicketSummary[]> {
  const response = await authedFetch('/.netlify/functions/get-my-tickets')
  return response.json() as Promise<MyTicketSummary[]>
}

export interface EventGuestRow {
  ticketId: string
  code: string
  status: TicketDocument['status']
  purchasedAt: string
  guestName: string
  guestEmail: string
  ticketTypeName: string
  price: number
  currency: string
}

export interface EventGuestsResponse {
  event: {
    title: string
    venue: string
    startsAt: string
    endsAt: string
    ticketTypes: TicketType[]
  }
  guests: EventGuestRow[]
}

export async function getEventGuests(eventId: string): Promise<EventGuestsResponse> {
  const response = await authedFetch(
    `/.netlify/functions/get-event-guests?eventId=${encodeURIComponent(eventId)}`,
  )
  return response.json() as Promise<EventGuestsResponse>
}

export interface HostApplicationInput {
  orgName: string
  category: string
  expectedAttendees: string
  contactName: string
  role: string
  email: string
  phone: string
  message: string
}

export interface HostApplication extends HostApplicationInput {
  _id: string
  userId: string
  status: 'pending' | 'approved' | 'rejected'
}

export async function submitHostApplication(input: HostApplicationInput): Promise<HostApplication> {
  const response = await authedFetch('/.netlify/functions/submit-host-application', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.json() as Promise<HostApplication>
}

export async function getMyHostApplication(): Promise<HostApplication | null> {
  const response = await authedFetch('/.netlify/functions/get-my-host-application')
  return response.json() as Promise<HostApplication | null>
}
