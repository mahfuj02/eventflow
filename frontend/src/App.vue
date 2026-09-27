<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuth } from './composables/useAuth'
import { syncGuest, type SyncedGuest } from './lib/api'

const { currentUser } = useAuth()
const guest = ref<SyncedGuest | null>(null)

watch(
  currentUser,
  async (user) => {
    if (!user) {
      guest.value = null
      return
    }
    try {
      guest.value = await syncGuest()
    } catch {
      guest.value = null
    }
  },
  { immediate: true },
)
</script>

<template>
  <header class="border-b border-card-border bg-ivory">
    <nav class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
      <RouterLink to="/" class="font-serif text-lg font-semibold text-ink">EventFlow</RouterLink>

      <div class="flex items-center gap-6 text-sm font-medium">
        <template v-if="currentUser">
          <RouterLink to="/" class="text-ink-soft hover:text-ink">Browse events</RouterLink>
          <span class="text-ink-soft">{{ guest?.name || currentUser.email }}</span>
          <RouterLink v-if="guest?.role === 'host'" to="/dashboard" class="text-ink-soft hover:text-ink">
            Dashboard
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/" class="text-ink-soft hover:text-ink">Browse events</RouterLink>
          <RouterLink
            to="/login"
            class="rounded-md border border-card-border px-3 py-1.5 text-ink hover:bg-white"
          >
            Sign in
          </RouterLink>
          <RouterLink
            to="/signup"
            class="rounded-md bg-teal px-3 py-1.5 text-white hover:bg-teal-dark"
          >
            Get started
          </RouterLink>
        </template>
      </div>
    </nav>
  </header>
  <RouterView />
</template>
