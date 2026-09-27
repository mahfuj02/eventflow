<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { syncGuest, getMyEvents, getMyTickets, type SyncedGuest, type MyTicketSummary } from '../lib/api'
import type { EventDocument } from '../../../shared/types/event'

const { signOutUser } = useAuth()
const router = useRouter()
const guest = ref<SyncedGuest | null>(null)
const loadError = ref<string | null>(null)
const events = ref<EventDocument[]>([])
const eventsError = ref<string | null>(null)
const tickets = ref<MyTicketSummary[]>([])
const ticketsError = ref<string | null>(null)

onMounted(async () => {
  try {
    guest.value = await syncGuest()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load profile'
  }

  try {
    events.value = await getMyEvents()
  } catch (err) {
    eventsError.value = err instanceof Error ? err.message : 'Failed to load events'
  }

  try {
    tickets.value = await getMyTickets()
  } catch (err) {
    ticketsError.value = err instanceof Error ? err.message : 'Failed to load tickets'
  }
})

async function handleSignOut() {
  await signOutUser()
  router.push('/login')
}

function formatPrice(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
}
</script>

<template>
  <main>
    <h1>Dashboard</h1>
    <p v-if="guest">Welcome, {{ guest.name || guest.email }}.</p>
    <p v-else-if="loadError" role="alert">{{ loadError }}</p>
    <p v-else>Loading...</p>
    <button type="button" @click="handleSignOut">Sign out</button>

    <section>
      <h2>Your tickets</h2>
      <p v-if="ticketsError" role="alert">{{ ticketsError }}</p>
      <p v-else-if="tickets.length === 0">You haven't bought any tickets yet.</p>
      <ul v-else>
        <li v-for="ticket in tickets" :key="ticket._id">
          <strong>{{ ticket.eventTitle }}</strong> — {{ ticket.eventVenue }}
          <br />
          {{ new Date(ticket.startsAt).toLocaleString() }} –
          {{ new Date(ticket.endsAt).toLocaleString() }}
          <br />
          {{ ticket.ticketTypeName }}: {{ formatPrice(ticket.price, ticket.currency) }}
          — code <strong>{{ ticket.code }}</strong> ({{ ticket.status }})
        </li>
      </ul>
    </section>

    <section>
      <h2>Your events</h2>
      <RouterLink to="/events/new">Create event</RouterLink>

      <p v-if="eventsError" role="alert">{{ eventsError }}</p>
      <p v-else-if="events.length === 0">No events yet.</p>
      <ul v-else>
        <li v-for="event in events" :key="event._id">
          <strong>{{ event.title }}</strong> — {{ event.venue }}
          <br />
          {{ new Date(event.startsAt).toLocaleString() }} –
          {{ new Date(event.endsAt).toLocaleString() }}
          <br />
          <span v-for="ticket in event.ticketTypes" :key="ticket.id">
            {{ ticket.name }}: {{ formatPrice(ticket.price, ticket.currency) }}
            ({{ ticket.quantitySold }}/{{ ticket.quantityTotal }} sold)
          </span>
          <br />
          <RouterLink :to="`/events/${event._id}/guests`">View guests</RouterLink>
        </li>
      </ul>
    </section>
  </main>
</template>
