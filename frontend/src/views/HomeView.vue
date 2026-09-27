<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { getEvents, createCheckoutSession } from '../lib/api'
import type { EventDocument } from '../../../shared/types/event'

const { currentUser } = useAuth()
const router = useRouter()
const events = ref<EventDocument[]>([])
const error = ref<string | null>(null)
const buyingTicketTypeId = ref<string | null>(null)
const search = ref('')

const filteredEvents = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return events.value
  return events.value.filter(
    (event) =>
      event.title.toLowerCase().includes(query) || event.venue.toLowerCase().includes(query),
  )
})

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
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
  <main class="min-h-[calc(100svh-65px)] bg-gray-50">
    <section class="bg-gray-900 px-4 py-16 text-center sm:px-6">
      <h1 class="text-3xl font-bold text-white sm:text-4xl">Find your next event</h1>
      <p class="mx-auto mt-3 max-w-xl text-gray-300">
        Browse events and get your ticket in a couple of clicks.
      </p>
      <div class="mx-auto mt-8 max-w-lg">
        <input
          v-model="search"
          type="search"
          placeholder="Search by event or venue..."
          class="w-full rounded-lg border-0 px-4 py-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
        />
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p v-if="error" role="alert" class="text-red-600">{{ error }}</p>
      <p v-else-if="filteredEvents.length === 0" class="text-gray-500">
        {{ events.length === 0 ? 'No events yet.' : 'No events match your search.' }}
      </p>

      <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="event in filteredEvents"
          :key="event._id"
          class="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div class="flex h-32 items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
            <svg class="h-10 w-10 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 5v2m0 3v2m0 3v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2Z" />
            </svg>
          </div>

          <div class="flex flex-1 flex-col p-5">
            <h2 class="text-lg font-semibold text-gray-900">{{ event.title }}</h2>
            <p class="mt-1 text-sm text-gray-500">
              {{ event.venue }} · {{ formatDate(event.startsAt) }}
            </p>
            <p class="mt-3 line-clamp-2 flex-1 text-sm text-gray-600">{{ event.description }}</p>

            <div
              v-for="ticket in event.ticketTypes"
              :key="ticket.id"
              class="mt-4 flex items-center justify-between border-t border-gray-100 pt-4"
            >
              <span class="text-sm font-medium text-gray-900">
                {{ formatPrice(ticket.price, ticket.currency) }}
              </span>
              <button
                type="button"
                :disabled="ticket.quantitySold >= ticket.quantityTotal || buyingTicketTypeId === ticket.id"
                class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                @click="handleBuy(event._id, ticket.id)"
              >
                {{ ticket.quantitySold >= ticket.quantityTotal ? 'Sold out' : 'Buy ticket' }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
