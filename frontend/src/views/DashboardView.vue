<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  syncGuest,
  getMyHostApplication,
  getDashboardSummary,
  getDashboardRevenue,
  getDashboardEvents,
  getDashboardActivity,
  deleteEvent,
  type SyncedGuest,
  type HostApplication,
  type DashboardSummary,
  type DashboardRevenueMonth,
  type DashboardEventRow,
  type DashboardActivityItem,
} from '../lib/api'

const guest = ref<SyncedGuest | null>(null)
const loadError = ref<string | null>(null)
const hostApplication = ref<HostApplication | null>(null)

const summary = ref<DashboardSummary | null>(null)
const months = ref<DashboardRevenueMonth[]>([])
const events = ref<DashboardEventRow[]>([])
const activity = ref<DashboardActivityItem[]>([])
const dashboardError = ref<string | null>(null)
const dashboardLoading = ref(true)
const actionError = ref<string | null>(null)
const showApprovalCongrats = ref(false)

const today = computed(() =>
  new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
)

const maxMonthRevenue = computed(() => Math.max(1, ...months.value.map((m) => m.revenue)))

onMounted(async () => {
  try {
    guest.value = await syncGuest()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load profile'
    return
  }

  try {
    hostApplication.value = await getMyHostApplication()
  } catch {
    // non-critical, leave as null (treated as "no application yet")
  }

  if (guest.value.role === 'host' && hostApplication.value?.status === 'approved') {
    checkShowApprovalCongrats(hostApplication.value._id)
  }

  if (guest.value.role !== 'host') {
    return
  }

  try {
    const [summaryData, revenueData, eventsData, activityData] = await Promise.all([
      getDashboardSummary(),
      getDashboardRevenue(),
      getDashboardEvents(),
      getDashboardActivity(),
    ])
    summary.value = summaryData
    months.value = revenueData.months
    events.value = eventsData.events
    activity.value = activityData.activity
  } catch (err) {
    dashboardError.value = err instanceof Error ? err.message : 'Failed to load dashboard data'
  } finally {
    dashboardLoading.value = false
  }
})

function approvalSeenKey(applicationId: string): string {
  return `eventflow-host-approved-seen-${applicationId}`
}

function checkShowApprovalCongrats(applicationId: string) {
  try {
    if (!localStorage.getItem(approvalSeenKey(applicationId))) {
      showApprovalCongrats.value = true
    }
  } catch {
    // localStorage unavailable - skip rather than risk showing it every visit
  }
}

function dismissApprovalCongrats() {
  showApprovalCongrats.value = false
  if (!hostApplication.value) return
  try {
    localStorage.setItem(approvalSeenKey(hostApplication.value._id), 'true')
  } catch {
    // ignore - worst case it shows again next visit
  }
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusBadgeClass(event: DashboardEventRow): string {
  if (event.status === 'cancelled') return 'bg-red-100 text-red-700'
  if (event.isPast) return 'bg-gray-100 text-gray-600'
  if (event.status === 'published') return 'bg-teal/10 text-teal-dark'
  return 'bg-gray-100 text-gray-600'
}

function statusLabel(event: DashboardEventRow): string {
  if (event.status === 'cancelled') return 'Cancelled'
  if (event.isPast) return 'Ended'
  return event.status.charAt(0).toUpperCase() + event.status.slice(1)
}

async function handleDelete(eventId: string) {
  if (!window.confirm("Delete this event? This can't be undone.")) return

  actionError.value = null
  try {
    await deleteEvent(eventId)
    events.value = events.value.filter((event) => event._id !== eventId)
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Failed to delete event'
  }
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
</script>

<template>
  <main class="min-h-[calc(100svh-65px)] bg-ivory">
    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p v-if="loadError" role="alert" class="text-red-600">{{ loadError }}</p>

      <template v-else-if="guest">
        <div
          v-if="showApprovalCongrats"
          data-testid="approval-congrats-modal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          @click.self="dismissApprovalCongrats"
        >
          <div class="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
            <p class="text-3xl">🎉</p>
            <h2 class="mt-2 font-serif text-xl font-semibold text-ink">You're approved!</h2>
            <p class="mt-2 text-sm text-ink-soft">
              Your application to host on EventFlow has been approved. You can now create and manage
              events from your dashboard.
            </p>
            <button
              type="button"
              class="mt-5 w-full rounded-md bg-teal py-2.5 text-sm font-semibold text-white hover:bg-teal-dark"
              @click="dismissApprovalCongrats"
            >
              Let's go
            </button>
          </div>
        </div>

        <template v-if="guest.role === 'host'">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-ink-soft">EventFlow</p>
              <h1 class="font-serif text-3xl font-semibold text-ink">Your dashboard</h1>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm text-ink-soft">{{ today }}</span>
              <RouterLink
                to="/events/new"
                class="rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark"
              >
                + Create event
              </RouterLink>
            </div>
          </div>

          <p v-if="dashboardError" role="alert" class="mt-6 text-red-600">{{ dashboardError }}</p>
          <p v-else-if="dashboardLoading" class="mt-6 text-ink-soft">Loading dashboard...</p>

          <template v-else>
            <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div class="rounded-xl border border-card-border bg-white p-5">
                <p class="text-sm text-ink-soft">Total tickets sold</p>
                <p data-testid="summary-tickets-sold" class="mt-1 font-serif text-3xl font-semibold text-ink">{{ summary?.totalTicketsSold ?? 0 }}</p>
              </div>
              <div class="rounded-xl border border-card-border bg-white p-5">
                <p class="text-sm text-ink-soft">Total revenue</p>
                <p data-testid="summary-total-revenue" class="mt-1 font-serif text-3xl font-semibold text-ink">{{ formatPrice(summary?.totalRevenue ?? 0) }}</p>
              </div>
              <div class="rounded-xl border border-card-border bg-white p-5">
                <p class="text-sm text-ink-soft">Active events</p>
                <p data-testid="summary-active-events" class="mt-1 font-serif text-3xl font-semibold text-ink">{{ summary?.activeEvents ?? 0 }}</p>
              </div>
            </div>

            <div class="mt-6 rounded-xl border border-card-border bg-white p-6">
              <div class="flex items-baseline justify-between">
                <h2 class="font-serif text-lg font-semibold text-ink">Revenue overview</h2>
                <span class="text-xs text-ink-soft">Last 6 months</span>
              </div>
              <div v-if="months.length === 0" class="mt-4 text-ink-soft">No revenue yet.</div>
              <div v-else class="mt-6 flex items-end justify-between gap-4">
                <div
                  v-for="(month, index) in months"
                  :key="month.label + index"
                  class="flex flex-1 flex-col items-center gap-2"
                >
                  <span
                    class="text-xs font-medium"
                    :class="index === months.length - 1 ? 'text-teal-dark' : 'text-ink-soft'"
                  >
                    {{ formatPrice(month.revenue) }}
                  </span>
                  <div
                    class="w-full max-w-10 rounded-t-sm"
                    :class="index === months.length - 1 ? 'bg-teal' : 'bg-teal/30'"
                    :style="{ height: `${Math.max(6, (month.revenue / maxMonthRevenue) * 140)}px` }"
                  ></div>
                  <span
                    class="text-xs font-medium"
                    :class="index === months.length - 1 ? 'text-ink' : 'text-ink-soft'"
                  >
                    {{ month.label }}
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-6 rounded-xl border border-card-border bg-white p-6">
              <div class="flex items-baseline justify-between">
                <h2 class="font-serif text-lg font-semibold text-ink">Your events</h2>
              </div>

              <p v-if="actionError" role="alert" class="mt-4 text-red-600">{{ actionError }}</p>
              <p v-if="events.length === 0" class="mt-4 text-ink-soft">No events yet.</p>
              <table v-else class="mt-4 w-full text-left text-sm">
                <thead>
                  <tr class="border-b border-card-border text-xs uppercase tracking-wide text-ink-soft">
                    <th class="pb-2 font-medium">Event</th>
                    <th class="pb-2 font-medium">Date</th>
                    <th class="pb-2 font-medium">Sold</th>
                    <th class="pb-2 font-medium">Revenue</th>
                    <th class="pb-2 font-medium">Status</th>
                    <th class="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="event in events"
                    :key="event._id"
                    :data-testid="`dashboard-event-row-${event._id}`"
                    class="border-b border-card-border last:border-0"
                  >
                    <td class="py-3 font-medium text-ink">{{ event.title }}</td>
                    <td class="py-3 text-ink-soft">{{ formatDate(event.startsAt) }}</td>
                    <td class="py-3 text-ink-soft">{{ event.sold }} / {{ event.capacity }}</td>
                    <td class="py-3 text-ink-soft">{{ formatPrice(event.revenue) }}</td>
                    <td class="py-3">
                      <span
                        data-testid="dashboard-status-pill"
                        class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        :class="statusBadgeClass(event)"
                      >
                        {{ statusLabel(event) }}
                      </span>
                    </td>
                    <td class="py-3">
                      <div class="flex items-center justify-end gap-3">
                        <RouterLink
                          :to="`/events/${event._id}/guests`"
                          class="text-sm font-medium text-teal hover:underline"
                        >
                          View guests
                        </RouterLink>
                        <RouterLink
                          :to="`/events/${event._id}/edit`"
                          class="text-sm font-medium text-teal hover:underline"
                        >
                          Edit
                        </RouterLink>
                        <button
                          type="button"
                          class="text-sm font-medium text-ink-soft hover:text-red-600"
                          @click="handleDelete(event._id)"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-6 rounded-xl border border-card-border bg-white p-6">
              <h2 class="font-serif text-lg font-semibold text-ink">Recent activity</h2>
              <p v-if="activity.length === 0" class="mt-4 text-ink-soft">No activity yet.</p>
              <ul v-else class="mt-4 divide-y divide-card-border">
                <li
                  v-for="(item, index) in activity"
                  :key="item.timestamp + index"
                  class="flex items-center justify-between py-3 text-sm"
                >
                  <span class="text-ink">{{ item.label }}</span>
                  <span class="shrink-0 text-ink-soft">{{ formatRelativeTime(item.timestamp) }}</span>
                </li>
              </ul>
            </div>
          </template>
        </template>

        <template v-else>
          <h1 class="font-serif text-3xl font-semibold text-ink">Your dashboard</h1>
          <div class="mt-6 rounded-xl border border-card-border bg-white p-6">
            <p v-if="hostApplication?.status === 'pending'" class="text-ink-soft">
              Your host application is pending review. We'll let you know once it's approved.
            </p>
            <p v-else-if="hostApplication?.status === 'rejected'" class="text-ink-soft">
              Your host application was not approved.
            </p>
            <template v-else>
              <p class="text-ink-soft">Apply to host events on EventFlow to unlock your dashboard.</p>
              <RouterLink
                to="/apply-to-host"
                class="mt-4 inline-block rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark"
              >
                Apply to host
              </RouterLink>
            </template>
          </div>
        </template>
      </template>

      <p v-else class="text-ink-soft">Loading...</p>
    </div>
  </main>
</template>
