<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const mismatchError = ref<string | null>(null)
const { signUp, signInWithGoogle, sendVerificationEmail, error } = useAuth()
const router = useRouter()

async function handleSubmit() {
  mismatchError.value = null
  if (password.value !== confirmPassword.value) {
    mismatchError.value = 'Passwords do not match'
    return
  }

  await signUp(email.value, password.value)
  await sendVerificationEmail()
  router.push('/dashboard')
}

async function handleGoogleSignIn() {
  await signInWithGoogle()
  router.push('/dashboard')
}
</script>

<template>
  <main class="flex min-h-[calc(100svh-65px)] items-center justify-center bg-ivory px-4">
    <div class="w-full max-w-[400px] rounded-xl border border-card-border bg-white p-8">
      <h1 class="text-center font-serif text-2xl font-semibold text-ink">Sign up</h1>

      <form class="mt-6 flex flex-col gap-4" @submit.prevent="handleSubmit">
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
        <label class="block text-sm font-medium text-ink">
          Password
          <input
            v-model="password"
            type="password"
            required
            autocomplete="new-password"
            minlength="6"
            class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2.5 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </label>
        <label class="block text-sm font-medium text-ink">
          Confirm password
          <input
            v-model="confirmPassword"
            type="password"
            required
            autocomplete="new-password"
            minlength="6"
            class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2.5 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </label>

        <p v-if="mismatchError" role="alert" class="text-sm text-red-600">{{ mismatchError }}</p>
        <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          class="w-full rounded-lg bg-teal py-2.5 text-sm font-bold text-white hover:bg-teal-dark"
        >
          Sign up
        </button>
      </form>

      <div class="my-6 flex items-center gap-3">
        <div class="h-px flex-1 bg-card-border"></div>
        <span class="text-xs text-ink-soft">or</span>
        <div class="h-px flex-1 bg-card-border"></div>
      </div>

      <button
        type="button"
        class="w-full rounded-lg border border-[#D8D5CA] bg-white py-2.5 text-sm font-medium text-ink hover:bg-ivory"
        @click="handleGoogleSignIn"
      >
        Sign up with Google
      </button>

      <p class="mt-6 text-center text-sm text-ink-soft">
        Already have an account?
        <RouterLink to="/login" class="text-teal hover:underline">Log in</RouterLink>
      </p>
    </div>
  </main>
</template>
