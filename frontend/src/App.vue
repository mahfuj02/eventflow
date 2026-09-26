<script setup lang="ts">
import { useAuth } from './composables/useAuth'

const { currentUser } = useAuth()
</script>

<template>
  <nav>
    <RouterLink to="/">EventFlow</RouterLink>
    <RouterLink v-if="currentUser" to="/dashboard">Dashboard</RouterLink>
    <template v-else>
      <RouterLink to="/login">Log in</RouterLink>
      <RouterLink to="/signup">Sign up</RouterLink>
    </template>
  </nav>
  <RouterView />
</template>
