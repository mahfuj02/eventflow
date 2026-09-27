<script setup lang="ts">
import { useAuth } from './composables/useAuth'

const { currentUser } = useAuth()
</script>

<template>
  <header class="border-b border-gray-200 bg-white">
    <nav class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
      <RouterLink to="/" class="text-lg font-semibold text-gray-900">EventFlow</RouterLink>

      <div class="flex items-center gap-6 text-sm font-medium">
        <template v-if="currentUser">
          <RouterLink to="/dashboard" class="text-gray-600 hover:text-gray-900">Dashboard</RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/" class="text-gray-600 hover:text-gray-900">Browse Events</RouterLink>
          <RouterLink to="/login" class="text-gray-600 hover:text-gray-900">Sign in</RouterLink>
          <RouterLink
            to="/signup"
            class="rounded-md bg-gray-900 px-3 py-1.5 text-white hover:bg-gray-700"
          >
            Sign up
          </RouterLink>
        </template>
      </div>
    </nav>
  </header>
  <RouterView />
</template>
