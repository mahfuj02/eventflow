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
  return `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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
  <main class="min-h-[calc(100svh-65px)] bg-ivory">
    <section class="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div class="rounded-2xl bg-ink px-6 py-16 text-center sm:px-12">
        <h1 class="font-serif text-3xl font-semibold text-white sm:text-5xl">
          Discover events worth showing up for
        </h1>
        <p class="mx-auto mt-4 max-w-xl text-gray-300">
          Concerts, meetups, and workshops — browse what's happening and grab your ticket in a
          few clicks.
        </p>
        <form class="mx-auto mt-8 flex max-w-lg gap-2" @submit.prevent>
          <input
            v-model="search"
            type="search"
            placeholder="Search events or venues"
            class="w-full rounded-lg border-0 px-4 py-3 text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-teal"
          />
          <button
            type="submit"
            class="shrink-0 rounded-lg bg-teal px-5 py-3 text-sm font-semibold text-white hover:bg-teal-dark"
          >
            Search
          </button>
        </form>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h2 class="font-serif text-xl font-semibold text-ink">Upcoming events</h2>

      <p v-if="error" role="alert" class="mt-4 text-red-600">{{ error }}</p>
      <p v-else-if="filteredEvents.length === 0" class="mt-4 text-ink-soft">
        {{ events.length === 0 ? 'No events yet.' : 'No events match your search.' }}
      </p>

      <div v-else class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="event in filteredEvents"
          :key="event._id"
          class="flex flex-col overflow-hidden rounded-xl border border-card-border bg-white"
        >
          <div class="flex h-44 items-center justify-center bg-[#efece4]">
            <svg class="h-8 w-8 text-ink-soft/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 4.5h18a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 18V6A1.5 1.5 0 0 1 3 4.5Zm12 5.25a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
            </svg>
          </div>

          <div class="flex flex-1 flex-col p-5">
            <h3 class="font-semibold text-ink">{{ event.title }}</h3>
            <p class="mt-1 text-sm text-ink-soft">
              {{ event.venue }} · {{ formatDate(event.startsAt) }}
            </p>

            <div
              v-for="ticket in event.ticketTypes"
              :key="ticket.id"
              class="mt-4 flex items-center justify-between border-t border-card-border pt-4"
            >
              <span class="text-sm font-medium text-ink">
                {{ formatPrice(ticket.price, ticket.currency) }}
              </span>
              <button
                type="button"
                :disabled="ticket.quantitySold >= ticket.quantityTotal || buyingTicketTypeId === ticket.id"
                class="rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-dark disabled:cursor-not-allowed disabled:bg-gray-300"
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
