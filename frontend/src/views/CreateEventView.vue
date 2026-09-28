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
  <main class="min-h-[calc(100svh-65px)] bg-ivory">
    <div class="mx-auto max-w-[720px] px-4 py-10 sm:px-6">
      <h1 class="font-serif text-3xl font-semibold text-ink">Create event</h1>

      <form
        class="mt-6 rounded-xl border border-card-border bg-white p-6 sm:p-8"
        @submit.prevent="handleSubmit"
      >
        <div class="flex flex-col gap-5">
          <label class="block text-sm font-medium text-ink">
            Title
            <input
              v-model="title"
              type="text"
              required
              class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </label>
          <label class="block text-sm font-medium text-ink">
            Description
            <textarea
              v-model="description"
              required
              rows="4"
              class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
            ></textarea>
          </label>
          <label class="block text-sm font-medium text-ink">
            Venue
            <input
              v-model="venue"
              type="text"
              required
              class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </label>
          <label class="block text-sm font-medium text-ink">
            Category (optional)
            <input
              v-model="category"
              type="text"
              placeholder="Music, Comedy, Contest..."
              class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </label>
          <div class="grid grid-cols-2 gap-4">
            <label class="block text-sm font-medium text-ink">
              Starts at
              <input
                v-model="startsAt"
                type="datetime-local"
                required
                class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </label>
            <label class="block text-sm font-medium text-ink">
              Ends at
              <input
                v-model="endsAt"
                type="datetime-local"
                required
                class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </label>
          </div>
        </div>

        <h2 class="mt-8 font-serif text-lg font-semibold text-ink">Ticket types</h2>
        <div class="mt-4 flex flex-col gap-4">
          <fieldset
            v-for="(row, index) in ticketRows"
            :key="index"
            class="rounded-lg border border-card-border bg-ivory/40 p-4"
          >
            <legend class="px-1 text-sm font-medium text-ink-soft">Ticket type {{ index + 1 }}</legend>
            <div class="grid grid-cols-3 gap-4">
              <label class="block text-sm font-medium text-ink">
                Name
                <input
                  v-model="row.name"
                  type="text"
                  placeholder="General Admission"
                  required
                  class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </label>
              <label class="block text-sm font-medium text-ink">
                Price (USD)
                <input
                  v-model="row.price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </label>
              <label class="block text-sm font-medium text-ink">
                Quantity available
                <input
                  v-model="row.quantity"
                  type="number"
                  min="1"
                  step="1"
                  required
                  class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </label>
            </div>
            <button
              v-if="ticketRows.length > 1"
              type="button"
              class="mt-3 text-sm font-medium text-ink-soft hover:text-red-600"
              @click="removeTicketRow(index)"
            >
              Remove
            </button>
          </fieldset>
        </div>
        <button
          type="button"
          class="mt-4 rounded-md border border-[#D8D5CA] px-4 py-2 text-sm font-medium text-ink hover:bg-ivory"
          @click="addTicketRow"
        >
          + Add another ticket type
        </button>

        <div class="mt-8 border-t border-card-border pt-6">
          <p v-if="error" role="alert" class="mb-4 text-sm text-red-600">{{ error }}</p>
          <button
            type="submit"
            :disabled="submitting"
            class="w-full rounded-md bg-teal py-2.5 text-sm font-semibold text-white hover:bg-teal-dark disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {{ submitting ? 'Creating...' : 'Create event' }}
          </button>
        </div>
      </form>
    </div>
  </main>
</template>
