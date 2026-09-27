<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createEvent } from '../lib/api'

interface TicketRow {
  name: string
  price: string
  quantity: string
}

const title = ref('')
const description = ref('')
const venue = ref('')
const category = ref('')
const startsAt = ref('')
const endsAt = ref('')
const ticketRows = ref<TicketRow[]>([{ name: '', price: '', quantity: '' }])

const error = ref<string | null>(null)
const submitting = ref(false)
const router = useRouter()

function addTicketRow() {
  ticketRows.value.push({ name: '', price: '', quantity: '' })
}

function removeTicketRow(index: number) {
  ticketRows.value.splice(index, 1)
}

async function handleSubmit() {
  error.value = null
  submitting.value = true
  try {
    await createEvent({
      title: title.value,
      description: description.value,
      venue: venue.value,
      category: category.value || undefined,
      startsAt: new Date(startsAt.value).toISOString(),
      endsAt: new Date(endsAt.value).toISOString(),
      ticketTypes: ticketRows.value.map((row) => ({
        name: row.name,
        price: Math.round(Number(row.price) * 100),
        quantityTotal: Number(row.quantity),
      })),
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
        Category (optional)
        <input v-model="category" type="text" placeholder="Music, Comedy, Contest..." />
      </label>
      <label>
        Starts at
        <input v-model="startsAt" type="datetime-local" required />
      </label>
      <label>
        Ends at
        <input v-model="endsAt" type="datetime-local" required />
      </label>

      <fieldset v-for="(row, index) in ticketRows" :key="index">
        <legend>Ticket type {{ index + 1 }}</legend>
        <label>
          Name
          <input v-model="row.name" type="text" placeholder="General Admission" required />
        </label>
        <label>
          Price (USD)
          <input v-model="row.price" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          Quantity available
          <input v-model="row.quantity" type="number" min="1" step="1" required />
        </label>
        <button
          v-if="ticketRows.length > 1"
          type="button"
          @click="removeTicketRow(index)"
        >
          Remove
        </button>
      </fieldset>
      <button type="button" @click="addTicketRow">Add another ticket type</button>

      <p v-if="error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="submitting">
        {{ submitting ? 'Creating...' : 'Create event' }}
      </button>
    </form>
  </main>
</template>
