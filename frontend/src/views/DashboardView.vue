<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { syncGuest, type SyncedGuest } from '../lib/api'

const { signOutUser } = useAuth()
const router = useRouter()
const guest = ref<SyncedGuest | null>(null)
const loadError = ref<string | null>(null)

onMounted(async () => {
  try {
    guest.value = await syncGuest()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load profile'
  }
})

async function handleSignOut() {
  await signOutUser()
  router.push('/login')
}
</script>

<template>
  <main>
    <h1>Dashboard</h1>
    <p v-if="guest">Welcome, {{ guest.name || guest.email }}.</p>
    <p v-else-if="loadError" role="alert">{{ loadError }}</p>
    <p v-else>Loading...</p>
    <button type="button" @click="handleSignOut">Sign out</button>
  </main>
</template>
