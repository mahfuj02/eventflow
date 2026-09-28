<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'
import { syncGuest, type SyncedGuest } from './lib/api'
import logo from './assets/logo.svg'

const { currentUser, loading, signOutUser, sendVerificationEmail } = useAuth()
const router = useRouter()
const guest = ref<SyncedGuest | null>(null)
const guestFetchAttempted = ref(false)
const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const verificationSent = ref(false)

watch(
  currentUser,
  async (user) => {
    if (!user) {
      guest.value = null
      guestFetchAttempted.value = true
      return
    }
    try {
      guest.value = await syncGuest()
    } catch {
      guest.value = null
    } finally {
      guestFetchAttempted.value = true
    }
  },
  { immediate: true },
)

// Gates the nav on both Firebase resolving AND (for a logged-in user)
// the role fetch settling - fixes the "guest nav flashes before host
// nav" reload flicker, since loading alone only covers the first half.
const authReady = computed(() => !loading.value && (!currentUser.value || guestFetchAttempted.value))

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

async function handleResendVerification() {
  await sendVerificationEmail()
  verificationSent.value = true
}
</script>

<template>
  <div v-if="!authReady" class="flex min-h-svh items-center justify-center bg-ivory">
    <img :src="logo" alt="" class="h-10 w-10" />
  </div>

  <template v-else>
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
            <RouterLink v-else to="/home" class="text-ink-soft hover:text-ink">
              Your tickets
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

    <div
      v-if="currentUser && currentUser.email && !currentUser.emailVerified"
      class="border-b border-card-border bg-[#FDF3E0] px-4 py-2 text-center text-sm text-ink sm:px-6"
    >
      <span>Please verify your email address.</span>
      <button
        type="button"
        :disabled="verificationSent"
        class="ml-2 font-medium text-teal hover:underline disabled:cursor-not-allowed disabled:text-ink-soft"
        @click="handleResendVerification"
      >
        {{ verificationSent ? 'Email sent' : 'Resend email' }}
      </button>
    </div>

    <RouterView />
  </template>
</template>
