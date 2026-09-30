<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getMyHostApplication, submitHostApplication, type HostApplication } from '../lib/api'

const orgName = ref('')
const category = ref('Music')
const expectedAttendees = ref('Under 50')
const contactName = ref('')
const role = ref('')
const email = ref('')
const phone = ref('')
const message = ref('')
const confirmed = ref(false)

const loading = ref(true)
const submitting = ref(false)
const error = ref<string | null>(null)
const existingApplication = ref<HostApplication | null>(null)

onMounted(async () => {
  try {
    existingApplication.value = await getMyHostApplication()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load application status'
  } finally {
    loading.value = false
  }
})

async function handleSubmit() {
  error.value = null
  submitting.value = true
  try {
    existingApplication.value = await submitHostApplication({
      orgName: orgName.value,
      category: category.value,
      expectedAttendees: expectedAttendees.value,
      contactName: contactName.value,
      role: role.value,
      email: email.value,
      phone: phone.value,
      message: message.value,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to submit application'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="min-h-[calc(100svh-65px)] bg-ivory px-4 py-10 sm:px-6">
    <div class="mx-auto max-w-2xl">
      <RouterLink to="/" class="text-sm text-ink-soft hover:text-ink">← Back to home</RouterLink>

      <h1 class="mt-4 font-serif text-3xl font-bold text-ink">Apply to host on EventFlow</h1>
      <p class="mt-2 text-ink-soft">
        Tell us about your organization and what you plan to run. We review every application by
        hand — approved organizers get access to the host dashboard and can start publishing
        events.
      </p>

      <p v-if="loading" class="mt-8 text-ink-soft">Loading...</p>

      <template v-else-if="existingApplication">
        <div class="mt-8 rounded-xl border border-card-border bg-white p-6">
          <p v-if="existingApplication.status === 'pending'" data-testid="host-application-pending" class="text-ink">
            Your application is under review. We'll be in touch once it's approved.
          </p>
          <template v-else-if="existingApplication.status === 'approved'">
            <p data-testid="host-application-approved" class="text-ink">
              You're approved to host on EventFlow! Head to your dashboard to create your first
              event.
            </p>
            <RouterLink
              to="/dashboard"
              class="mt-4 inline-block rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark"
            >
              Go to dashboard
            </RouterLink>
          </template>
          <p v-else data-testid="host-application-rejected" class="text-ink">
            Your application wasn't approved. Contact us if you have questions.
          </p>
        </div>
      </template>

      <form
        v-else
        data-testid="host-application-form"
        class="mt-8 rounded-xl border border-card-border bg-white p-6 sm:p-8"
        @submit.prevent="handleSubmit"
      >
        <h2 class="text-xs font-semibold tracking-wide text-teal">ORGANIZATION</h2>
        <label class="mt-4 block text-sm font-medium text-ink">
          Organization or business name
          <input
            v-model="orgName"
            type="text"
            required
            placeholder="e.g. Winnipeg Comedy Collective"
            class="mt-1 w-full rounded-md border border-card-border px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </label>

        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="block text-sm font-medium text-ink">
            Event category
            <select
              v-model="category"
              class="mt-1 w-full rounded-md border border-card-border px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-teal"
            >
              <option>Music</option>
              <option>Comedy</option>
              <option>Contest</option>
              <option>Workshop</option>
              <option>Festival</option>
              <option>Other</option>
            </select>
          </label>
          <label class="block text-sm font-medium text-ink">
            Expected attendees per event
            <select
              v-model="expectedAttendees"
              class="mt-1 w-full rounded-md border border-card-border px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-teal"
            >
              <option>Under 50</option>
              <option>50-200</option>
              <option>200-500</option>
              <option>500+</option>
            </select>
          </label>
        </div>

        <hr class="my-6 border-card-border" />

        <h2 class="text-xs font-semibold tracking-wide text-teal">CONTACT</h2>
        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="block text-sm font-medium text-ink">
            Contact name
            <input
              v-model="contactName"
              type="text"
              required
              placeholder="Full name"
              class="mt-1 w-full rounded-md border border-card-border px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </label>
          <label class="block text-sm font-medium text-ink">
            Role / title
            <input
              v-model="role"
              type="text"
              required
              placeholder="e.g. Founder, Events lead"
              class="mt-1 w-full rounded-md border border-card-border px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </label>
          <label class="block text-sm font-medium text-ink">
            Work email
            <input
              v-model="email"
              type="email"
              required
              placeholder="you@organization.com"
              class="mt-1 w-full rounded-md border border-card-border px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </label>
          <label class="block text-sm font-medium text-ink">
            Phone number
            <input
              v-model="phone"
              type="tel"
              required
              placeholder="(204) 555-0123"
              class="mt-1 w-full rounded-md border border-card-border px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </label>
        </div>

        <hr class="my-6 border-card-border" />

        <label class="block text-sm font-medium text-ink">
          Tell us about your event(s)
          <textarea
            v-model="message"
            required
            rows="4"
            placeholder="What are you planning to run — audience size, venue type, frequency, anything that helps us understand your organization"
            class="mt-1 w-full rounded-md border border-card-border px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-teal"
          ></textarea>
        </label>

        <label class="mt-4 flex items-start gap-2 text-sm text-ink">
          <input v-model="confirmed" type="checkbox" required class="mt-1" />
          I confirm the information above is accurate and I'm authorized to represent this
          organization.
        </label>

        <p v-if="error" role="alert" class="mt-4 text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          :disabled="submitting"
          class="mt-4 rounded-md bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {{ submitting ? 'Submitting...' : 'Submit application' }}
        </button>

        <p class="mt-4 text-sm text-ink-soft">
          Applications are reviewed within 2 business days. We'll email you once your host
          dashboard is ready.
        </p>
      </form>
    </div>
  </main>
</template>
