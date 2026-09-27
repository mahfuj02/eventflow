<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const email = ref('')
const sent = ref(false)
const { resetPassword, error } = useAuth()

async function handleSubmit() {
  await resetPassword(email.value)
  sent.value = true
}
</script>

<template>
  <main class="flex min-h-[calc(100svh-65px)] items-center justify-center bg-ivory px-4">
    <div class="w-full max-w-[400px] rounded-xl border border-card-border bg-white p-8">
      <h1 class="text-center font-serif text-2xl font-semibold text-ink">Reset password</h1>

      <p v-if="sent" class="mt-6 text-center text-sm text-ink-soft">
        Check your email for a link to reset your password.
      </p>

      <form v-else class="mt-6 flex flex-col gap-4" @submit.prevent="handleSubmit">
        <label class="block text-sm font-medium text-ink">
          Email
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2.5 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </label>

        <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          class="w-full rounded-lg bg-teal py-2.5 text-sm font-bold text-white hover:bg-teal-dark"
        >
          Send reset link
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-ink-soft">
        <RouterLink to="/login" class="text-teal hover:underline">Back to log in</RouterLink>
      </p>
    </div>
  </main>
</template>
