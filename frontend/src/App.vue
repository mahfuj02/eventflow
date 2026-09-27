<script setup lang="ts">
import { useAuth } from './composables/useAuth'

const { currentUser } = useAuth()
</script>

<template>
  <header class="border-b border-card-border bg-ivory">
    <nav class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
      <RouterLink to="/" class="font-serif text-lg font-semibold text-ink">EventFlow</RouterLink>

      <div class="flex items-center gap-6 text-sm font-medium">
        <template v-if="currentUser">
          <RouterLink to="/" class="text-ink-soft hover:text-ink">Browse events</RouterLink>
          <RouterLink to="/dashboard" class="text-ink-soft hover:text-ink">Dashboard</RouterLink>
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
