<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createEvent } from '../lib/api'

const title = ref('')
const description = ref('')
const venue = ref('')
const startsAt = ref('')
const endsAt = ref('')
const ticketName = ref('')
const ticketPrice = ref('')
const ticketQuantity = ref('')

const error = ref<string | null>(null)
const submitting = ref(false)
const router = useRouter()

async function handleSubmit() {
  error.value = null
  submitting.value = true
  try {
    await createEvent({
      title: title.value,
      description: description.value,
      venue: venue.value,
      startsAt: new Date(startsAt.value).toISOString(),
      endsAt: new Date(endsAt.value).toISOString(),
      ticketType: {
        name: ticketName.value,
        price: Math.round(Number(ticketPrice.value) * 100),
        quantityTotal: Number(ticketQuantity.value),
      },
    })
    router.push('/dashboard')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create event'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main>
    <h1>Create event</h1>
    <form @submit.prevent="handleSubmit">
      <label>
        Title
        <input v-model="title" type="text" required />
      </label>
      <label>
        Description
        <textarea v-model="description" required></textarea>
      </label>
      <label>
        Venue
        <input v-model="venue" type="text" required />
      </label>
      <label>
        Starts at
        <input v-model="startsAt" type="datetime-local" required />
      </label>
      <label>
        Ends at
        <input v-model="endsAt" type="datetime-local" required />
      </label>

      <fieldset>
        <legend>Ticket</legend>
        <label>
          Name
          <input v-model="ticketName" type="text" placeholder="General Admission" required />
        </label>
        <label>
          Price (USD)
          <input v-model="ticketPrice" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          Quantity available
          <input v-model="ticketQuantity" type="number" min="1" step="1" required />
        </label>
      </fieldset>

      <p v-if="error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="submitting">
        {{ submitting ? 'Creating...' : 'Create event' }}
      </button>
    </form>
  </main>
</template>
