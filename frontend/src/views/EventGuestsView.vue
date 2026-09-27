<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getEventGuests, type EventGuestsResponse } from '../lib/api'

const route = useRoute()
const data = ref<EventGuestsResponse | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  const eventId = route.params.eventId
  if (typeof eventId !== 'string') {
    error.value = 'Missing eventId'
    return
  }

  try {
    data.value = await getEventGuests(eventId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load guest list'
  }
})

function formatPrice(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
}
</script>

<template>
  <main>
    <h1>Guest list</h1>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-else-if="!data">Loading...</p>
    <template v-else>
      <section>
        <h2>{{ data.event.title }}</h2>
        <p>
          {{ data.event.venue }} —
          {{ new Date(data.event.startsAt).toLocaleString() }} –
          {{ new Date(data.event.endsAt).toLocaleString() }}
        </p>
        <p v-for="ticket in data.event.ticketTypes" :key="ticket.id">
          {{ ticket.name }}: {{ formatPrice(ticket.price, ticket.currency) }}
          ({{ ticket.quantitySold }}/{{ ticket.quantityTotal }} sold)
        </p>
      </section>

      <section>
        <h2>Guests ({{ data.guests.length }})</h2>
        <p v-if="data.guests.length === 0">No tickets sold yet.</p>
        <ul v-else>
          <li v-for="guest in data.guests" :key="guest.ticketId">
            <strong>{{ guest.guestName }}</strong> ({{ guest.guestEmail }})
            <br />
            {{ guest.ticketTypeName }}: {{ formatPrice(guest.price, guest.currency) }}
            — code {{ guest.code }} ({{ guest.status }})
            <br />
            Purchased {{ new Date(guest.purchasedAt).toLocaleString() }}
          </li>
        </ul>
      </section>
    </template>
    <p><RouterLink to="/dashboard">Back to dashboard</RouterLink></p>
  </main>
</template>
