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
  <main>
    <h1>Sign up</h1>
    <form @submit.prevent="handleSubmit">
      <label>
        Email
        <input v-model="email" type="email" required autocomplete="email" />
      </label>
      <label>
        Password
        <input v-model="password" type="password" required autocomplete="new-password" minlength="6" />
      </label>
      <label>
        Confirm password
        <input
          v-model="confirmPassword"
          type="password"
          required
          autocomplete="new-password"
          minlength="6"
        />
      </label>
      <p v-if="mismatchError" role="alert">{{ mismatchError }}</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <button type="submit">Sign up</button>
    </form>
    <button type="button" @click="handleGoogleSignIn">Sign up with Google</button>
    <p><RouterLink to="/login">Already have an account? Log in</RouterLink></p>
  </main>
</template>
