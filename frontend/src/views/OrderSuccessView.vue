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
  <main>
    <h1>Order confirmation</h1>
    <p v-if="error" role="alert">{{ error }}</p>
    <div v-else-if="result && result.ticket">
      <p>Payment successful! Your ticket is confirmed.</p>
      <p>Ticket code: <strong>{{ result.ticket.code }}</strong></p>
    </div>
    <p v-else-if="result">Payment successful, but no ticket was found.</p>
    <p v-else>Confirming your order...</p>
    <p><RouterLink to="/">Back to events</RouterLink></p>
  </main>
</template>
