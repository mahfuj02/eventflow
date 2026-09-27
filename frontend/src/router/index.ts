import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import SignupView from '../views/SignupView.vue'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'
import DashboardView from '../views/DashboardView.vue'
import CreateEventView from '../views/CreateEventView.vue'
import OrderSuccessView from '../views/OrderSuccessView.vue'
import EventGuestsView from '../views/EventGuestsView.vue'
import HostApplyView from '../views/HostApplyView.vue'

function waitForAuthReady(): Promise<void> {
  const { loading } = useAuth()
  if (!loading.value) return Promise.resolve()
  return new Promise((resolve) => {
    const stop = watch(loading, (isLoading) => {
      if (!isLoading) {
        stop()
        resolve()
      }
    })
  })
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/signup', name: 'signup', component: SignupView },
    { path: '/forgot-password', name: 'forgot-password', component: ForgotPasswordView },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/events/new',
      name: 'create-event',
      component: CreateEventView,
      meta: { requiresAuth: true },
    },
    {
      path: '/orders/success',
      name: 'order-success',
      component: OrderSuccessView,
      meta: { requiresAuth: true },
    },
    {
      path: '/events/:eventId/guests',
      name: 'event-guests',
      component: EventGuestsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/apply-to-host',
      name: 'apply-to-host',
      component: HostApplyView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true

  await waitForAuthReady()

  const { currentUser } = useAuth()
  if (!currentUser.value) {
    return { name: 'login' }
  }

  return true
})

export default router
