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

export interface TicketTypeInput {
  name: string
  price: number
  quantityTotal: number
}

export interface CreateEventInput {
  title: string
  description: string
  venue: string
  category?: string
  startsAt: string
  endsAt: string
  ticketTypes: TicketTypeInput[]
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

export interface CheckoutItem {
  ticketTypeId: string
  quantity: number
}

export interface EventWithOrganizer {
  event: EventDocument
  organizer: {
    name: string
    hostingSinceYear: number
  }
}

export async function getEvent(eventId: string): Promise<EventWithOrganizer> {
  const response = await fetch(`/.netlify/functions/get-event?eventId=${encodeURIComponent(eventId)}`)
  if (!response.ok) {
    throw new Error(`get-event failed: ${response.status}`)
  }
  return response.json() as Promise<EventWithOrganizer>
}

export async function createCheckoutSession(
  eventId: string,
  items: CheckoutItem[],
): Promise<{ url: string }> {
  const response = await authedFetch('/.netlify/functions/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, items }),
  })
  return response.json() as Promise<{ url: string }>
}

export interface ConfirmedOrder {
  orders: OrderDocument[]
  tickets: TicketDocument[]
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

export interface DashboardSummary {
  totalTicketsSold: number
  totalRevenue: number
  activeEvents: number
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await authedFetch('/.netlify/functions/get-dashboard-summary')
  return response.json() as Promise<DashboardSummary>
}

export interface DashboardRevenueMonth {
  label: string
  revenue: number
}

export async function getDashboardRevenue(): Promise<{ months: DashboardRevenueMonth[] }> {
  const response = await authedFetch('/.netlify/functions/get-dashboard-revenue')
  return response.json() as Promise<{ months: DashboardRevenueMonth[] }>
}

export interface DashboardEventRow {
  _id: string
  title: string
  startsAt: string
  sold: number
  capacity: number
  revenue: number
  status: EventDocument['status']
}

export async function getDashboardEvents(): Promise<{ events: DashboardEventRow[] }> {
  const response = await authedFetch('/.netlify/functions/get-dashboard-events')
  return response.json() as Promise<{ events: DashboardEventRow[] }>
}

export interface DashboardActivityItem {
  type: 'event_created' | 'new_order' | 'guest_profile_created'
  label: string
  timestamp: string
}

export async function getDashboardActivity(): Promise<{ activity: DashboardActivityItem[] }> {
  const response = await authedFetch('/.netlify/functions/get-dashboard-activity')
  return response.json() as Promise<{ activity: DashboardActivityItem[] }>
}
