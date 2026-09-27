<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { getEvent, createCheckoutSession, type EventWithOrganizer } from '../lib/api'

const route = useRoute()
const { currentUser, signInAsGuest } = useAuth()

const data = ref<EventWithOrganizer | null>(null)
const notFound = ref(false)
const error = ref<string | null>(null)
const submitting = ref(false)
const quantities = reactive<Record<string, number>>({})

const eventId = computed(() => {
  const id = route.params.eventId
  return typeof id === 'string' ? id : ''
})

onMounted(async () => {
  try {
    data.value = await getEvent(eventId.value)
    for (const ticketType of data.value.event.ticketTypes) {
      quantities[ticketType.id] = 0
    }
  } catch {
    notFound.value = true
  }
})

function remaining(ticketTypeId: string): number {
  const ticketType = data.value?.event.ticketTypes.find((t) => t.id === ticketTypeId)
  if (!ticketType) return 0
  return ticketType.quantityTotal - ticketType.quantitySold
}

function increment(ticketTypeId: string) {
  if (quantities[ticketTypeId] < remaining(ticketTypeId)) {
    quantities[ticketTypeId]++
  }
}

function decrement(ticketTypeId: string) {
  if (quantities[ticketTypeId] > 0) {
    quantities[ticketTypeId]--
  }
}

const subtotal = computed(() => {
  if (!data.value) return 0
  return data.value.event.ticketTypes.reduce(
    (sum, t) => sum + t.price * (quantities[t.id] ?? 0),
    0,
  )
})

const totalQuantity = computed(() => Object.values(quantities).reduce((sum, q) => sum + q, 0))

const initials = computed(() => {
  const name = data.value?.organizer.name ?? ''
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
})

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

async function handleCheckout() {
  if (!data.value || totalQuantity.value === 0) return

  error.value = null
  submitting.value = true
  try {
    if (!currentUser.value) {
      await signInAsGuest()
    }

    const items = data.value.event.ticketTypes
      .filter((t) => quantities[t.id] > 0)
      .map((t) => ({ ticketTypeId: t.id, quantity: quantities[t.id] }))

    const { url } = await createCheckoutSession(data.value.event._id, items)
    window.location.href = url
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start checkout'
    submitting.value = false
  }
}
</script>

<template>
  <main class="min-h-[calc(100svh-65px)] bg-ivory">
    <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <RouterLink to="/" class="text-sm text-ink-soft hover:text-ink">← Back to events</RouterLink>

      <p v-if="notFound" class="mt-6 text-ink-soft">Event not found.</p>
      <p v-else-if="!data" class="mt-6 text-ink-soft">Loading...</p>

      <div v-else class="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div class="lg:col-span-2">
          <div class="relative flex h-64 items-center justify-center overflow-hidden rounded-xl bg-[#efece4] sm:h-80">
            <span
              v-if="data.event.category"
              class="absolute left-4 top-4 rounded-full bg-teal/10 px-2.5 py-0.5 text-xs font-medium text-teal-dark"
            >
              {{ data.event.category }}
            </span>
            <svg class="h-10 w-10 text-ink-soft/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 4.5h18a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 18V6A1.5 1.5 0 0 1 3 4.5Zm12 5.25a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
            </svg>
          </div>

          <h1 class="mt-6 font-serif text-3xl font-semibold text-ink">{{ data.event.title }}</h1>
          <p class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span>{{ formatDateTime(data.event.startsAt) }}</span>
            <span>{{ data.event.venue }}</span>
          </p>

          <hr class="my-6 border-card-border" />

          <h2 class="font-serif text-lg font-semibold text-ink">About this event</h2>
          <p class="mt-2 whitespace-pre-line text-ink-soft">{{ data.event.description }}</p>

          <h2 class="mt-8 font-serif text-lg font-semibold text-ink">Organizer</h2>
          <div class="mt-3 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10 text-sm font-semibold text-teal-dark">
              {{ initials }}
            </div>
            <div>
              <p class="font-medium text-ink">{{ data.organizer.name }}</p>
              <p class="text-sm text-ink-soft">Hosting since {{ data.organizer.hostingSinceYear }}</p>
            </div>
          </div>
        </div>

        <div class="lg:sticky lg:top-6 lg:self-start">
          <div class="rounded-xl border border-card-border bg-white p-6">
            <h2 class="font-serif text-lg font-semibold text-ink">Select tickets</h2>

            <div
              v-for="ticketType in data.event.ticketTypes"
              :key="ticketType.id"
              class="mt-4 flex items-center justify-between border-t border-card-border pt-4 first:mt-4 first:border-t-0 first:pt-0"
            >
              <div>
                <p class="font-medium text-ink">{{ ticketType.name }}</p>
                <p class="text-sm text-ink-soft">
                  {{ formatPrice(ticketType.price) }}
                  <span v-if="remaining(ticketType.id) === 0"> · Sold out</span>
                  <span v-else-if="remaining(ticketType.id) <= 10">
                    · {{ remaining(ticketType.id) }} left
                  </span>
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  :disabled="quantities[ticketType.id] === 0"
                  class="flex h-8 w-8 items-center justify-center rounded-md border border-[#D8D5CA] text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  @click="decrement(ticketType.id)"
                >
                  −
                </button>
                <span class="w-6 text-center text-ink">{{ quantities[ticketType.id] }}</span>
                <button
                  type="button"
                  :disabled="quantities[ticketType.id] >= remaining(ticketType.id)"
                  class="flex h-8 w-8 items-center justify-center rounded-md border border-[#D8D5CA] text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  @click="increment(ticketType.id)"
                >
                  +
                </button>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between border-t border-card-border pt-4">
              <span class="text-sm text-ink-soft">Subtotal</span>
              <span class="font-semibold text-ink">{{ formatPrice(subtotal) }}</span>
            </div>

            <p v-if="error" role="alert" class="mt-3 text-sm text-red-600">{{ error }}</p>

            <button
              type="button"
              :disabled="totalQuantity === 0 || submitting"
              class="mt-4 w-full rounded-md bg-teal py-2.5 text-sm font-semibold text-white hover:bg-teal-dark disabled:cursor-not-allowed disabled:bg-gray-300"
              @click="handleCheckout"
            >
              {{ submitting ? 'Redirecting...' : 'Continue to checkout' }}
            </button>
            <p class="mt-3 text-center text-xs text-ink-soft">
              No account required to buy — you can save your tickets afterward.
            </p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
