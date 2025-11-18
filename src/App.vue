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

// Initial load: keep loader for a short minimum time so it is visible even on fast /login refresh
router.isReady().then(() => {
  if (firstLoad) {
    setTimeout(() => {
      isRouteLoading.value = false
      firstLoad = false
    }, 3000)
  } else {
    isRouteLoading.value = false
  }
})

router.beforeEach((to, from, next) => {
  isRouteLoading.value = true
  next()
})

router.afterEach(() => {
  setTimeout(() => {
    isRouteLoading.value = false
  }, 300)
})
</script>
