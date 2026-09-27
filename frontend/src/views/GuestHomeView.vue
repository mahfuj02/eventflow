<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { syncGuest, getMyTickets, getEvents, type SyncedGuest, type MyTicketSummary } from '../lib/api'
import type { EventDocument } from '../../../shared/types/event'

const { currentUser, upgradeToAccount } = useAuth()

const guest = ref<SyncedGuest | null>(null)
const loadError = ref<string | null>(null)
const tickets = ref<MyTicketSummary[]>([])
const ticketsError = ref<string | null>(null)
const otherEvents = ref<EventDocument[]>([])

const showCreateAccountForm = ref(false)
const accountEmail = ref('')
const accountPassword = ref('')
const accountConfirmPassword = ref('')
const accountError = ref<string | null>(null)
const upgrading = ref(false)

const firstName = computed(() => (guest.value?.name || 'there').split(' ')[0])

onMounted(async () => {
  try {
    guest.value = await syncGuest()
    accountEmail.value = guest.value.email ?? ''
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load profile'
  }

  try {
    tickets.value = await getMyTickets()
  } catch (err) {
    ticketsError.value = err instanceof Error ? err.message : 'Failed to load tickets'
  }

  try {
    const allEvents = await getEvents()
    const ownedEventIds = new Set(tickets.value.map((t) => t.eventId))
    otherEvents.value = allEvents.filter((e) => !ownedEventIds.has(e._id))
  } catch {
    // non-critical, "More events for you" just stays empty
  }
})

function isUpcoming(endsAt: string): boolean {
  return new Date(endsAt).getTime() > Date.now()
}

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

async function handleCreateAccount() {
  accountError.value = null
  if (accountPassword.value !== accountConfirmPassword.value) {
    accountError.value = 'Passwords do not match'
    return
  }
  if (!accountEmail.value) {
    accountError.value = 'Email is required'
    return
  }

  upgrading.value = true
  try {
    await upgradeToAccount(accountEmail.value, accountPassword.value)
    showCreateAccountForm.value = false
  } catch (err) {
    accountError.value = err instanceof Error ? err.message : 'Failed to create account'
  } finally {
    upgrading.value = false
  }
}
</script>

<template>
  <main class="min-h-[calc(100svh-65px)] bg-ivory">
    <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 class="font-serif text-3xl font-semibold text-ink">Welcome back, {{ firstName }}</h1>
      <p class="mt-1 text-ink-soft">Here's what's coming up, and what you've already booked.</p>
      <p v-if="loadError" role="alert" class="mt-4 text-red-600">{{ loadError }}</p>

      <div
        v-if="currentUser?.isAnonymous"
        class="mt-6 rounded-xl border border-[#F0C978] bg-[#FDF3E0] p-5"
      >
        <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p class="font-semibold text-ink">Save your tickets for next time</p>
            <p class="mt-1 text-sm text-ink-soft">
              You checked out as a guest. Create a free account to keep your history and skip the
              form next time.
            </p>
          </div>
          <button
            v-if="!showCreateAccountForm"
            type="button"
            class="shrink-0 rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark"
            @click="showCreateAccountForm = true"
          >
            Create account
          </button>
        </div>

        <form
          v-if="showCreateAccountForm"
          class="mt-4 flex flex-col gap-3 border-t border-[#F0C978] pt-4 sm:max-w-sm"
          @submit.prevent="handleCreateAccount"
        >
          <label class="block text-sm font-medium text-ink">
            Email
            <input
              v-model="accountEmail"
              type="email"
              required
              readonly
              class="mt-1 w-full rounded-lg border border-[#D8D5CA] bg-white px-3 py-2 text-ink-soft"
            />
          </label>
          <label class="block text-sm font-medium text-ink">
            Password
            <input
              v-model="accountPassword"
              type="password"
              required
              minlength="6"
              autocomplete="new-password"
              class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </label>
          <label class="block text-sm font-medium text-ink">
            Confirm password
            <input
              v-model="accountConfirmPassword"
              type="password"
              required
              minlength="6"
              autocomplete="new-password"
              class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </label>
          <p v-if="accountError" role="alert" class="text-sm text-red-600">{{ accountError }}</p>
          <button
            type="submit"
            :disabled="upgrading"
            class="rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {{ upgrading ? 'Creating...' : 'Create account' }}
          </button>
        </form>
      </div>

      <h2 class="mt-8 font-serif text-xl font-semibold text-ink">Your tickets</h2>
      <p v-if="ticketsError" role="alert" class="mt-4 text-red-600">{{ ticketsError }}</p>
      <p v-else-if="tickets.length === 0" class="mt-4 text-ink-soft">
        You haven't bought any tickets yet.
      </p>
      <div v-else class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          v-for="ticket in tickets"
          :key="ticket._id"
          class="flex items-center gap-4 rounded-xl border border-card-border bg-white p-4"
        >
          <div
            class="h-12 w-12 shrink-0 rounded-lg"
            :class="isUpcoming(ticket.endsAt) ? 'bg-teal/10' : 'bg-gray-100'"
          ></div>
          <div class="flex-1">
            <p class="font-semibold text-ink">{{ ticket.eventTitle }}</p>
            <p class="text-sm text-ink-soft">
              {{ formatDate(ticket.startsAt) }} · {{ ticket.ticketTypeName }}
            </p>
          </div>
          <span
            class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="isUpcoming(ticket.endsAt) ? 'bg-teal/10 text-teal-dark' : 'bg-gray-100 text-gray-600'"
          >
            {{ isUpcoming(ticket.endsAt) ? 'Upcoming' : 'Attended' }}
          </span>
        </div>
      </div>

      <template v-if="otherEvents.length > 0">
        <h2 class="mt-10 font-serif text-xl font-semibold text-ink">More events for you</h2>
        <div class="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="event in otherEvents"
            :key="event._id"
            class="overflow-hidden rounded-xl border border-card-border bg-white"
          >
            <div class="h-32 bg-[#efece4]"></div>
            <div class="p-4">
              <p class="font-semibold text-ink">{{ event.title }}</p>
              <p class="mt-1 text-sm text-ink-soft">
                {{ formatDate(event.startsAt) }}
                <template v-if="event.ticketTypes[0]">
                  · {{ formatPrice(event.ticketTypes[0].price, event.ticketTypes[0].currency) }}
                </template>
              </p>
            </div>
          </article>
        </div>
      </template>
    </div>
  </main>
</template>
