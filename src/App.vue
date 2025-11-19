<template>
  <div id="app">
    <FireTapLoader v-if="isRouteLoading" />
    <div v-else>
      <router-view />
      <InstallPrompt />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
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

