<script setup lang="ts">
import { useAuth } from '../composables/useAuth'

const { currentUser } = useAuth()
</script>

<template>
  <main>
    <h1>EventFlow</h1>
    <p v-if="currentUser">
      Signed in as {{ currentUser.email }} —
      <RouterLink to="/dashboard">Go to dashboard</RouterLink>
    </p>
    <p v-else>
      <RouterLink to="/login">Log in</RouterLink> or
      <RouterLink to="/signup">sign up</RouterLink> to get started.
    </p>
  </main>
</template>
