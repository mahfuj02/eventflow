<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { confirmOrder, type ConfirmedOrder } from '../lib/api'

const route = useRoute()
const result = ref<ConfirmedOrder | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  const sessionId = route.query.session_id
  if (typeof sessionId !== 'string') {
    error.value = 'Missing session_id'
    return
  }

  try {
    result.value = await confirmOrder(sessionId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to confirm order'
  }
})
</script>

<template>
  <main class="flex min-h-[calc(100svh-65px)] items-center justify-center bg-ivory px-4">
    <div class="w-full max-w-md rounded-xl border border-card-border bg-white p-8 text-center">
      <template v-if="error">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 class="mt-4 font-serif text-lg font-semibold text-ink">Something went wrong</h1>
        <p role="alert" class="mt-2 text-sm text-red-600">{{ error }}</p>
      </template>

      <template v-else-if="result && result.tickets.length > 0">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal/10">
          <svg class="h-6 w-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h1 class="mt-4 font-serif text-lg font-semibold text-ink">You're all set!</h1>
        <p class="mt-2 text-sm text-ink-soft">
          {{ result.tickets.length === 1 ? 'Your ticket has been confirmed.' : `Your ${result.tickets.length} tickets have been confirmed.` }}
        </p>
        <div class="mt-6 space-y-2">
          <div
            v-for="ticket in result.tickets"
            :key="ticket._id"
            class="rounded-lg bg-ivory px-4 py-3 text-left"
          >
            <p class="text-xs uppercase tracking-wide text-ink-soft">Ticket code</p>
            <p class="mt-1 font-mono text-lg font-semibold text-ink">{{ ticket.code }}</p>
          </div>
        </div>
      </template>

      <template v-else-if="result">
        <h1 class="mt-4 font-serif text-lg font-semibold text-ink">Payment successful</h1>
        <p class="mt-2 text-sm text-ink-soft">No tickets were found for this order.</p>
      </template>

      <template v-else>
        <p class="text-sm text-ink-soft">Confirming your order...</p>
      </template>

      <RouterLink to="/" class="mt-6 inline-block text-sm font-medium text-teal underline">
        Back to events
      </RouterLink>
    </div>
  </main>
</template>
