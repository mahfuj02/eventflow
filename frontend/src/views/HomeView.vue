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

const categoryBadgeStyles: Record<string, string> = {
  music: 'bg-teal/10 text-teal-dark',
  comedy: 'bg-amber-100 text-amber-800',
  contest: 'bg-rose-100 text-rose-800',
}

function categoryBadgeClass(category: string): string {
  return categoryBadgeStyles[category.toLowerCase()] ?? 'bg-gray-100 text-gray-700'
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
      <div
        class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a2620] via-teal-dark to-teal px-6 py-16 text-center sm:px-12"
      >
        <div class="pointer-events-none absolute inset-0">
          <div class="absolute -right-10 top-6 h-56 w-56 rounded-full border border-white/10"></div>
          <div class="absolute right-24 top-32 h-28 w-28 rounded-full border border-white/10"></div>
          <div class="absolute right-16 top-10 h-2 w-2 rounded-full bg-white/30"></div>
          <div class="absolute right-40 top-20 h-1.5 w-1.5 rounded-full bg-white/20"></div>
          <div class="absolute right-56 top-40 h-1.5 w-1.5 rounded-full bg-white/20"></div>
        </div>

        <div class="relative">
          <h1 class="font-serif text-3xl font-semibold text-white sm:text-5xl">
            Discover events worth showing up for
          </h1>
          <p class="mx-auto mt-4 max-w-xl text-gray-300">
            Concerts, comedy nights, festivals, and workshops — book in a minute, no account
            required.
          </p>
          <form class="mx-auto mt-8 flex max-w-lg gap-2" @submit.prevent>
            <input
              v-model="search"
              type="search"
              placeholder="Search events, venues, or cities"
              class="w-full rounded-lg border-0 bg-white px-4 py-3 text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-teal"
            />
            <button
              type="submit"
              class="shrink-0 rounded-lg bg-teal px-5 py-3 text-sm font-semibold text-white hover:bg-teal-dark"
            >
              Search
            </button>
          </form>
        </div>
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
            <span
              v-if="event.category"
              class="mb-2 inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="categoryBadgeClass(event.category)"
            >
              {{ event.category }}
            </span>

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

    <section class="sticky bottom-0 z-10 bg-ivory px-4 pb-6 pt-4 sm:px-6">
      <div
        class="mx-auto flex max-w-6xl flex-col items-start gap-4 rounded-2xl bg-[#e3f5ee] px-6 py-8 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] sm:flex-row sm:items-center sm:justify-between sm:px-10"
      >
        <div>
          <h2 class="font-serif text-xl font-semibold text-ink">Bring your event to EventFlow</h2>
          <p class="mt-2 max-w-xl text-sm text-teal-dark">
            Apply as an organizer. Tell us about your organization and events — we review every
            application and set up your host dashboard once approved.
          </p>
        </div>
        <RouterLink
          to="/apply-to-host"
          class="shrink-0 rounded-md bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark"
        >
          Apply to host →
        </RouterLink>
      </div>
    </section>
  </main>
</template>
