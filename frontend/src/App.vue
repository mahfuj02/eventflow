<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'
import { syncGuest, type SyncedGuest } from './lib/api'
import logo from './assets/logo.svg'

const { currentUser, signOutUser } = useAuth()
const router = useRouter()
const guest = ref<SyncedGuest | null>(null)
const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

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

const firstName = computed(() => {
  const name = guest.value?.name || currentUser.value?.email || ''
  return name.split(' ')[0]
})

const initials = computed(() => {
  const parts = (guest.value?.name || currentUser.value?.email || '').trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
})

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    dropdownOpen.value = false
  }
}

watch(dropdownOpen, (open) => {
  if (open) {
    window.addEventListener('click', handleClickOutside)
  } else {
    window.removeEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})

async function handleSignOut() {
  dropdownOpen.value = false
  await signOutUser()
  router.push('/login')
}
</script>

<template>
  <header class="border-b border-card-border bg-ivory">
    <nav class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
      <RouterLink to="/" class="flex items-center gap-2">
        <img :src="logo" alt="" class="h-8 w-8" />
        <span class="font-serif text-lg font-semibold text-ink">EventFlow</span>
      </RouterLink>

      <div class="flex items-center gap-4 text-sm font-medium">
        <template v-if="currentUser">
          <RouterLink v-if="guest?.role === 'host'" to="/dashboard" class="text-ink-soft hover:text-ink">
            Dashboard
          </RouterLink>
          <span class="text-ink-soft">{{ firstName }}</span>

          <div ref="dropdownRef" class="relative">
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-xs font-semibold text-white"
              @click="dropdownOpen = !dropdownOpen"
            >
              {{ initials }}
            </button>

            <div
              v-if="dropdownOpen"
              class="absolute right-0 mt-2 w-40 rounded-md border border-card-border bg-white py-1 shadow-lg"
            >
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-sm text-ink hover:bg-ivory"
                @click="handleSignOut"
              >
                Sign out
              </button>
            </div>
          </div>
        </template>
        <template v-else>
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
