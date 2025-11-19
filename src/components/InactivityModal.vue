<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="error-modal-content" @click.stop>
      <div class="modal-icon">⏱️</div>
      <h3 class="modal-title">No Data Received</h3>
      <p class="modal-message">
        The app has not received new data from this device for more than 10 seconds.
      </p>

      <div class="diagnostic-block">
        <div class="diagnostic-item">
          <span class="diagnostic-label">Device ID:</span>
          <span class="diagnostic-value">{{ deviceId }}</span>
        </div>
        <ul class="troubleshooting-list">
          <li>Verify the device is powered on</li>
          <li>Check the device's WiFi or internet connection</li>
          <li>Confirm the device is still configured with the correct Firebase settings</li>
        </ul>
      </div>

      <button @click="handleClose" class="modal-btn">OK</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  deviceId: {
    type: [String, Number],
    default: ''
  }
});

const emit = defineEmits(['update:show', 'closed']);

const isVisible = computed(() => props.show);

function handleClose() {
  emit('update:show', false);
  emit('closed');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.error-modal-content {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px 20px;
  max-width: 320px;
  width: 100%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.modal-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.modal-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.modal-message {
  font-size: 14px;
  color: #4b5563;
  margin: 0 0 12px 0;
}

.modal-btn {
  padding: 8px 16px;
  border-radius: 9999px;
  border: none;
  background: #dc2626;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
}

.modal-btn:active {
  transform: scale(0.98);
}

.diagnostic-block {
  margin: 8px 0 16px 0;
  text-align: left;
}

.diagnostic-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 8px;
}

.diagnostic-label {
  font-weight: 600;
  color: #4b5563;
}

.diagnostic-value {
  color: #111827;
}

.troubleshooting-list {
  padding-left: 18px;
  margin: 0;
  font-size: 13px;
  color: #4b5563;
}

.troubleshooting-list li {
  margin-bottom: 4px;
}
</style>
