<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getEventGuests, type EventGuestsResponse } from '../lib/api'

const route = useRoute()
const data = ref<EventGuestsResponse | null>(null)
const error = ref<string | null>(null)
const copiedTicketId = ref<string | null>(null)

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
  return `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
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

function statusBadgeClass(status: string): string {
  if (status === 'valid') return 'bg-teal/10 text-teal-dark'
  return 'bg-gray-100 text-gray-600'
}

async function copyCode(ticketId: string, code: string) {
  try {
    await navigator.clipboard.writeText(code)
    copiedTicketId.value = ticketId
    setTimeout(() => {
      if (copiedTicketId.value === ticketId) copiedTicketId.value = null
    }, 1500)
  } catch {
    // clipboard access denied - no-op, code is still visible to copy manually
  }
}
</script>

<template>
  <main class="min-h-[calc(100svh-65px)] bg-ivory">
    <div class="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p v-if="error" role="alert" class="text-red-600">{{ error }}</p>
      <p v-else-if="!data" class="text-ink-soft">Loading...</p>

      <template v-else>
        <RouterLink to="/dashboard" class="text-sm text-ink-soft hover:text-ink">← Back to dashboard</RouterLink>

        <p class="mt-4 text-xs font-medium uppercase tracking-wide text-ink-soft">Guest list</p>
        <h1 class="mt-1 font-serif text-2xl font-semibold text-ink">{{ data.event.title }}</h1>
        <p class="mt-1 text-sm text-ink-soft">
          {{ data.event.venue }} · {{ formatDateTime(data.event.startsAt) }} – {{ formatDateTime(data.event.endsAt) }}
        </p>

        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="ticketType in data.event.ticketTypes"
            :key="ticketType.id"
            class="rounded-xl border border-card-border bg-white p-5"
          >
            <p class="font-medium text-ink">{{ ticketType.name }}</p>
            <p class="mt-1 text-sm text-ink-soft">{{ formatPrice(ticketType.price, ticketType.currency) }}</p>
            <p class="mt-3 font-serif text-2xl font-semibold text-ink">
              {{ ticketType.quantitySold }}<span class="text-base font-normal text-ink-soft">/{{ ticketType.quantityTotal }} sold</span>
            </p>
          </div>
        </div>

        <h2 class="mt-10 font-serif text-lg font-semibold text-ink">Guests ({{ data.guests.length }})</h2>

        <p v-if="data.guests.length === 0" class="mt-4 text-ink-soft">No tickets sold yet.</p>

        <div v-else class="mt-4 overflow-hidden rounded-xl border border-card-border bg-white">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-card-border text-xs uppercase tracking-wide text-ink-soft">
                <th class="px-5 py-3 font-medium">Guest</th>
                <th class="px-5 py-3 font-medium">Ticket</th>
                <th class="px-5 py-3 font-medium">Code</th>
                <th class="px-5 py-3 font-medium">Status</th>
                <th class="px-5 py-3 text-right font-medium">Purchased</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border">
              <tr v-for="guest in data.guests" :key="guest.ticketId">
                <td class="px-5 py-4">
                  <p class="font-medium text-ink">{{ guest.guestName }}</p>
                  <p class="text-sm text-ink-soft">{{ guest.guestEmail }}</p>
                </td>
                <td class="px-5 py-4 text-ink-soft">
                  {{ guest.ticketTypeName }}<br />
                  <span class="text-sm">{{ formatPrice(guest.price, guest.currency) }}</span>
                </td>
                <td class="px-5 py-4">
                  <button
                    type="button"
                    class="max-w-[10rem] truncate rounded-md border border-[#D8D5CA] px-2 py-1 font-mono text-xs text-ink hover:bg-ivory"
                    :title="guest.code"
                    @click="copyCode(guest.ticketId, guest.code)"
                  >
                    {{ copiedTicketId === guest.ticketId ? 'Copied!' : guest.code }}
                  </button>
                </td>
                <td class="px-5 py-4">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    :class="statusBadgeClass(guest.status)"
                  >
                    {{ guest.status }}
                  </span>
                </td>
                <td class="px-5 py-4 text-right text-ink-soft">{{ formatDateTime(guest.purchasedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </main>
</template>
