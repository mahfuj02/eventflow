<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import {
  syncGuest,
  getMyEvents,
  getMyHostApplication,
  type SyncedGuest,
  type HostApplication,
} from '../lib/api'
import type { EventDocument } from '../../../shared/types/event'

const { signOutUser } = useAuth()
const router = useRouter()
const guest = ref<SyncedGuest | null>(null)
const loadError = ref<string | null>(null)
const events = ref<EventDocument[]>([])
const eventsError = ref<string | null>(null)
const hostApplication = ref<HostApplication | null>(null)

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
    hostApplication.value = await getMyHostApplication()
  } catch {
    // non-critical, leave as null (treated as "no application yet")
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
      <h2>Your events</h2>
      <RouterLink v-if="guest?.role === 'host'" to="/events/new">Create event</RouterLink>
      <p v-else-if="hostApplication?.status === 'pending'">Host application pending review.</p>
      <p v-else-if="hostApplication?.status === 'rejected'">Host application was not approved.</p>
      <RouterLink v-else to="/apply-to-host">Apply to host</RouterLink>

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
