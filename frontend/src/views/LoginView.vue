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
        class="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[#DADCE0] bg-white py-2.5 text-sm font-medium text-[#3C4043] hover:border-[#C6C6C6] hover:bg-[#F8F9FA] hover:shadow-sm"
        @click="handleGoogleSignIn"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        <span>Sign in with Google</span>
      </button>

      <p class="mt-6 text-center text-sm text-ink-soft">
        Need an account?
        <RouterLink to="/signup" class="text-teal hover:underline">Sign up</RouterLink>
      </p>
    </div>
  </main>
</template>
