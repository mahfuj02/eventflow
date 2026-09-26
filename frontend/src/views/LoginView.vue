<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const email = ref('')
const password = ref('')
const { signIn, signInWithGoogle, error } = useAuth()
const router = useRouter()

async function handleSubmit() {
  await signIn(email.value, password.value)
  router.push('/dashboard')
}

async function handleGoogleSignIn() {
  await signInWithGoogle()
  router.push('/dashboard')
}
</script>

<template>
  <main>
    <h1>Log in</h1>
    <form @submit.prevent="handleSubmit">
      <label>
        Email
        <input v-model="email" type="email" required autocomplete="email" />
      </label>
      <label>
        Password
        <input v-model="password" type="password" required autocomplete="current-password" />
      </label>
      <p v-if="error" role="alert">{{ error }}</p>
      <button type="submit">Log in</button>
    </form>
    <button type="button" @click="handleGoogleSignIn">Sign in with Google</button>
    <p><RouterLink to="/signup">Need an account? Sign up</RouterLink></p>
  </main>
</template>
