<template>
  <div id="app">
    <FireTapLoader v-if="isRouteLoading" />
    <div v-else>
      <router-view />
      <InstallPrompt />
    </div>
    <!-- Global 5-minute Reminder Modal (always present) -->
    <transition name="modal">
      <div v-if="showReminderModal" class="modal-overlay" @click="() => {}">
        <div class="error-modal-content" @click.stop>
          <div class="modal-icon">⚠️</div>
          <h3 class="modal-title">Reminder</h3>
          <p class="modal-message">This is your scheduled 5-minute reminder.<br>Please acknowledge to continue using the app.</p>
          <button @click="closeReminderModal" class="modal-btn">OK</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
// Global 5-minute reminder modal state
const showReminderModal = ref(false)
let reminderTimer = null

function startReminderTimer() {
  clearReminderTimer()
  reminderTimer = setTimeout(() => {
    showReminderModal.value = true
  }, 5 * 60 * 1000) // 5 minutes
}

function clearReminderTimer() {
  if (reminderTimer) {
    clearTimeout(reminderTimer)
    reminderTimer = null
  }
}

function closeReminderModal() {
  showReminderModal.value = false
  startReminderTimer()
}

onMounted(() => {
  startReminderTimer()
})

onUnmounted(() => {
  clearReminderTimer()
})
import { useRouter } from 'vue-router'
import InstallPrompt from '@/components/InstallPrompt.vue'
import FireTapLoader from '@/components/FireTapLoader.vue'

const isRouteLoading = ref(true)
const router = useRouter()

let firstLoad = true

router.isReady().then(() => {
  if (firstLoad) {
    // Ensure loader shows briefly on first load even if fast
    setTimeout(() => {
      isRouteLoading.value = false
      firstLoad = false
    }, 1200) // slightly shorter than previous 3000ms for snappier feel
  } else {
    isRouteLoading.value = false
  }
})

router.beforeEach((to, from, next) => {
  isRouteLoading.value = true
  next()
})

router.afterEach(() => {
  // Small delay allows view mount transitions to settle
  setTimeout(() => {
    isRouteLoading.value = false
  }, 250)
})
</script>

