<template>
  <div class="firetap-loader">
    <div class="firetap-loader-content">
      <div class="firetap-logo">🔥</div>
      <div class="firetap-title">FireTap</div>
      <div class="firetap-subtitle">Loading...</div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.firetap-loader {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #ff7043 0, #d32f2f 45%, #b71c1c 100%);
  color: #fff;
  z-index: 9999;
}

.firetap-loader-content {
  text-align: center;
  padding: 2.5rem 3rem;
  border-radius: 1.5rem;
  background: rgba(0, 0, 0, 0.18);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
}

.firetap-logo {
  font-size: 4rem;
  animation: pulse 1.2s ease-in-out infinite;
}

.firetap-title {
  margin-top: 0.75rem;
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.firetap-subtitle {
  margin-top: 0.75rem;
  font-size: 1rem;
  opacity: 0.9;
  letter-spacing: 0.25em;
  text-transform: uppercase;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    filter: drop-shadow(0 0 0 rgba(255, 255, 255, 0.4));
  }
  50% {
    transform: scale(1.08);
    filter: drop-shadow(0 0 22px rgba(255, 255, 255, 0.85));
  }
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 0 rgba(255, 255, 255, 0.4));
  }
}
</style>
