<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { createEvent } from '../lib/api'
import { auth, storage } from '../lib/firebase'

interface TicketRow {
  name: string
  price: string
  quantity: string
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const title = ref('')
const description = ref('')
const venue = ref('')
const category = ref('')
const startsAt = ref('')
const endsAt = ref('')
const ticketRows = ref<TicketRow[]>([{ name: '', price: '', quantity: '' }])

const fileInputRef = ref<HTMLInputElement | null>(null)
const bannerPreviewUrl = ref<string | null>(null)
const bannerImageUrl = ref<string | null>(null)
const bannerError = ref<string | null>(null)
const uploadingBanner = ref(false)

const error = ref<string | null>(null)
const submitting = ref(false)
const router = useRouter()

function addTicketRow() {
  ticketRows.value.push({ name: '', price: '', quantity: '' })
}

function removeTicketRow(index: number) {
  ticketRows.value.splice(index, 1)
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  bannerError.value = null

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    bannerError.value = 'Please choose a JPG, PNG, or WEBP image'
    input.value = ''
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    bannerError.value = 'Image must be 5MB or smaller'
    input.value = ''
    return
  }

  if (bannerPreviewUrl.value) URL.revokeObjectURL(bannerPreviewUrl.value)
  bannerPreviewUrl.value = URL.createObjectURL(file)
  bannerImageUrl.value = null
  uploadingBanner.value = true

  try {
    const path = `event-banners/${auth.currentUser!.uid}/${crypto.randomUUID()}`
    const uploadRef = storageRef(storage, path)
    await uploadBytes(uploadRef, file)
    bannerImageUrl.value = await getDownloadURL(uploadRef)
  } catch {
    bannerError.value = 'Failed to upload image'
    if (bannerPreviewUrl.value) URL.revokeObjectURL(bannerPreviewUrl.value)
    bannerPreviewUrl.value = null
  } finally {
    uploadingBanner.value = false
    input.value = ''
  }
}

function removeBanner() {
  if (bannerPreviewUrl.value) URL.revokeObjectURL(bannerPreviewUrl.value)
  bannerPreviewUrl.value = null
  bannerImageUrl.value = null
  bannerError.value = null
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
      imageUrl: bannerImageUrl.value ?? undefined,
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
          <div>
            <label class="block text-sm font-medium text-ink">Event banner (optional)</label>
            <div class="mt-1">
              <button
                v-if="!bannerPreviewUrl"
                type="button"
                class="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#D8D5CA] text-ink-soft hover:border-teal hover:text-teal"
                @click="triggerFileInput"
              >
                <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 4.5h18a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 18V6A1.5 1.5 0 0 1 3 4.5Zm12 5.25a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                </svg>
                <span class="text-sm font-medium">Add a banner image</span>
              </button>

              <div v-else class="relative h-40 w-full overflow-hidden rounded-lg border border-card-border">
                <img :src="bannerPreviewUrl" alt="" class="h-full w-full object-cover" />
                <div class="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/50 to-transparent p-2">
                  <button
                    type="button"
                    class="rounded-md bg-white/90 px-2.5 py-1 text-xs font-medium text-ink hover:bg-white"
                    @click="triggerFileInput"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    class="rounded-md bg-white/90 px-2.5 py-1 text-xs font-medium text-ink hover:bg-white"
                    @click="removeBanner"
                  >
                    Remove
                  </button>
                </div>
                <div
                  v-if="uploadingBanner"
                  class="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-medium text-ink"
                >
                  Uploading...
                </div>
              </div>

              <input
                ref="fileInputRef"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                @change="handleFileSelect"
              />
              <p v-if="bannerError" role="alert" class="mt-1 text-sm text-red-600">{{ bannerError }}</p>
            </div>
          </div>

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
