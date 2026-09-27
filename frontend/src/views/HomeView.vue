<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { getEvents, createCheckoutSession } from '../lib/api'
import type { EventDocument } from '../../../shared/types/event'

const { currentUser } = useAuth()
const router = useRouter()
const events = ref<EventDocument[]>([])
const error = ref<string | null>(null)
const buyingTicketTypeId = ref<string | null>(null)

onMounted(async () => {
  try {
    events.value = await getEvents()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load events'
  }
})

function formatPrice(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
}

async function handleBuy(eventId: string, ticketTypeId: string) {
  if (!currentUser.value) {
    router.push('/login')
    return
  }

  error.value = null
  buyingTicketTypeId.value = ticketTypeId
  try {
    const { url } = await createCheckoutSession(eventId, ticketTypeId)
    window.location.href = url
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start checkout'
    buyingTicketTypeId.value = null
  }
}
</script>

<template>
  <main>
    <h1>EventFlow</h1>

    <p v-if="error" role="alert">{{ error }}</p>
    <p v-else-if="events.length === 0">No events yet.</p>

    <ul v-else>
      <li v-for="event in events" :key="event._id">
        <strong>{{ event.title }}</strong> — {{ event.venue }}
        <br />
        {{ new Date(event.startsAt).toLocaleString() }} –
        {{ new Date(event.endsAt).toLocaleString() }}
        <p>{{ event.description }}</p>
        <div v-for="ticket in event.ticketTypes" :key="ticket.id">
          {{ ticket.name }}: {{ formatPrice(ticket.price, ticket.currency) }}
          <button
            type="button"
            :disabled="ticket.quantitySold >= ticket.quantityTotal || buyingTicketTypeId === ticket.id"
            @click="handleBuy(event._id, ticket.id)"
          >
            {{ ticket.quantitySold >= ticket.quantityTotal ? 'Sold out' : 'Buy ticket' }}
          </button>
        </div>
      </li>
    </ul>
  </main>
</template>
