<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { syncGuest } from '../lib/api'

const email = ref('')
const password = ref('')
const { signIn, signInWithGoogle, error } = useAuth()
const router = useRouter()

async function redirectAfterAuth() {
  const guest = await syncGuest()
  router.push(guest.role === 'host' ? '/dashboard' : '/home')
}

async function handleSubmit() {
  await signIn(email.value, password.value)
  await redirectAfterAuth()
}

async function handleGoogleSignIn() {
  await signInWithGoogle()
  await redirectAfterAuth()
}
</script>

<template>
  <main class="flex min-h-[calc(100svh-65px)] items-center justify-center bg-ivory px-4">
    <div class="w-full max-w-[400px] rounded-xl border border-card-border bg-white p-8">
      <h1 class="text-center font-serif text-2xl font-semibold text-ink">Log in</h1>

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
            autocomplete="current-password"
            class="mt-1 w-full rounded-lg border border-[#D8D5CA] px-3 py-2.5 text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </label>

        <RouterLink to="/forgot-password" class="-mt-2 self-end text-xs text-teal hover:underline">
          Forgot password?
        </RouterLink>

        <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          class="w-full rounded-lg bg-teal py-2.5 text-sm font-bold text-white hover:bg-teal-dark"
        >
          Log in
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
        Sign in with Google
      </button>

      <p class="mt-6 text-center text-sm text-ink-soft">
        Need an account?
        <RouterLink to="/signup" class="text-teal hover:underline">Sign up</RouterLink>
      </p>
    </div>
  </main>
</template>
