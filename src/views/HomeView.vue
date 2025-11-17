<template>
  <div class="app-container">
    <!-- Header -->
    <div class="header"></div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Title -->
      <h1 class="page-title">STATUS OVERVIEW</h1>

      <!-- Status Circle -->
      <div class="status-section" v-if="latest">
        <div class="status-circle">
          <div class="status-icon-container">
            <Bell class="status-bell-icon" />
          </div>
        </div>
        <div class="status-label">{{ latest.status }}</div>
      </div>

      <!-- Time and Date -->
      <div class="time-section" v-if="latest">
        <div class="current-time">{{ formatTime(latest.dateTime) }}</div>
        <div class="current-date">{{ formatDate(latest.dateTime) }}</div>
      </div>

      <!-- Location -->
      <div class="location-section" v-if="latest && latest.location">
        <MapPin class="location-icon" />
        <span class="location-text">{{ latest.location }}</span>
      </div>

      <!-- Smoke & Gas Indicators -->
      <div class="sensor-section" v-if="latest">
        <div class="sensor-item">
          <label>SMOKE LEVEL</label>
          <div class="smoke-bar-container">
            <div 
              class="smoke-bar" 
              :style="{ width: smokePercentage + '%' }"
              :class="{ 'smoke-warning': smokePercentage > 60, 'smoke-alert': smokePercentage > 80 }"
            ></div>
            <span class="smoke-value">{{ smokePercentage }}%</span>
          </div>
        </div>

        <div class="sensor-item">
          <label>GAS STATUS</label>
          <div class="gas-status" :class="{ 'gas-high': latest.gasStatus === 'high' }">
            {{ latest.gasStatus === 'high' ? '⚠️ HIGH' : '✅ NORMAL' }}
          </div>
        </div>
      </div>
<showMap v-if="showMapModal" @close="closeMap" />

      <!-- Recent Status History -->
      <div class="history-section">
        <h2 class="history-title">RECENT STATUS HISTORY</h2>
        <div class="history-list">
          <div 
            v-for="entry in history" 
            :key="entry.id" 
            class="history-item"
          >
            <div class="history-left">
              <div 
                class="history-icon" 
                :class="entry.status === 'Safe' ? 'safe' : 'alert'"
              >
                <component :is="entry.status === 'Safe' ? Check : AlertTriangle" class="icon" />
              </div>
              <div class="history-info">
                <div class="history-status">{{ entry.status }}</div>
                <div class="history-time">
                  {{ formatTime(entry.dateTime) }}, {{ formatDate(entry.dateTime) }}
                </div>
              </div>
            </div>
            <div class="history-temperature" v-if="entry.temperature !== undefined">
              {{ entry.temperature }}°C
            </div>
            <div class="history-temperature" v-else-if="entry.message === 'help requested'">
              🆘 Help
            </div>
            <div class="history-temperature" v-else-if="entry.message === 'alarm has been triggered'">
              🔥 Alarm
            </div>

            <!-- Show Smoke & Gas in History -->
            <div class="history-extra" v-if="entry.smokeAnalog !== undefined">
              Smoke: {{ getSmokeLevel(entry.smokeAnalog) }}%
              <span v-if="entry.gasStatus === 'high'" style="color: #eab308; margin-left: 8px;">⚡ Gas: High</span>
            </div>
          </div>
        </div>

        <!-- View Full History Link -->
        <div class="view-full-history">
          <a href="#" class="history-link">View Full History</a>
        </div>
      </div>
    </div>

      </div>
</template>

<script setup>
import showMap from "@/components/showMap.vue";

import { ref, onMounted, onUnmounted, computed } from "vue";
import { 
  collection, query, orderBy, limit, getDocs, 
  doc, setDoc, updateDoc, getDoc, serverTimestamp 
} from "firebase/firestore";
import { db } from "@/firebase";
import { 
  Bell, 
  MapPin, 
  Check, 
  AlertTriangle, 
  Settings 
} from 'lucide-vue-next'

const latest = ref(null);
const history = ref([]);
const lastUpdated = ref(new Date());

// Device/location tracking
const deviceId = ref(null);
const locationWatcher = ref(null);
const showMapModal = ref(false);

function openMap() {
  showMapModal.value = true;
}
function closeMap() {
  showMapModal.value = false;
}

function getOrCreateDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = "dev-" + Math.random().toString(36).substring(2, 12);
    localStorage.setItem("deviceId", id);
  }
  return id;
}

async function saveLocation(lat, lng) {
  try {
    const deviceRef = doc(db, "devices", deviceId.value);
    const docSnap = await getDoc(deviceRef);

    if (!docSnap.exists()) {
      await setDoc(deviceRef, {
        deviceId: deviceId.value,
        location: { lat, lng },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log("✅ Device registered in Firestore");
    } else {
      await updateDoc(deviceRef, {
        location: { lat, lng },
        updatedAt: serverTimestamp()
      });
      console.log("📍 Device location updated:", lat, lng);
    }
  } catch (err) {
    console.error("❌ Error saving location:", err);
  }
}

function trackLocation() {
  if ("geolocation" in navigator) {
    locationWatcher.value = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        saveLocation(lat, lng);
      },
      (error) => {
        console.error("❌ Location error:", error);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  } else {
    console.error("❌ Geolocation not supported");
  }
}

// ================== SENSOR LOGIC ==================

// Calculate smoke percentage from analog value (0–4095 → 0–100%)
function getSmokePercentage(analogValue) {
  const max = 4095;
  const min = 0;
  let percent = ((analogValue - min) / (max - min)) * 100;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

function getSmokeLevel(analogValue) {
  return getSmokePercentage(analogValue);
}

async function fetchData() {
  try {
    const q = query(
      collection(db, "sensors"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dateTime: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt?.timestampValue)
    }));

    results.forEach(entry => {
      if (entry.message === "help requested" || entry.message === "alarm has been triggered") {
        entry.status = "Alert";
      } else if (entry.smokeAnalog !== undefined) {
        entry.status = entry.smokeAnalog > 1500 ? "Alert" : "Safe";
      } else {
        entry.status = "Safe";
      }
    });

    latest.value = results[0] || null;
    history.value = results;
    lastUpdated.value = new Date();

    console.log("✅ Data refreshed at:", lastUpdated.value.toLocaleTimeString());
  } catch (error) {
    console.error("❌ Error fetching data:", error);
  }
}

onMounted(() => {
  deviceId.value = getOrCreateDeviceId();
  trackLocation();
  fetchData();

  const intervalId = setInterval(fetchData, 60000);
  onUnmounted(() => {
    clearInterval(intervalId);
    if (locationWatcher.value) {
      navigator.geolocation.clearWatch(locationWatcher.value);
    }
  });
});

// Format helpers
function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true
  }).format(date);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

const smokePercentage = computed(() => {
  return latest.value ? getSmokePercentage(latest.value.smokeAnalog) : 0;
});
</script>


<style scoped>
.app-container {
  max-width: 400px;
  margin: 0 auto;
  background-color: #ffffff; /* main background: white */
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  background-color: #dc2626;
  height: 60px;
}

.main-content {
  padding: 24px 20px;
  padding-bottom: 100px;
}

  /* On wider screens the bottom nav becomes a floating bar; keep enough
     bottom padding so content isn't obscured. */
  @media (min-width: 768px) {
    .main-content {
      padding-bottom: 140px;
    }
  }

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #374151;
  text-align: center;
  margin: 0 0 40px 0;
  letter-spacing: 0.5px;
}

.status-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}

.status-circle {
  width: 140px;
  height: 140px;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  position: relative;
}

.status-circle::before {
  content: '';
  position: absolute;
  width: 100px;
  height: 100px;
  background-color: #22c55e;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.status-icon-container {
  position: relative;
  z-index: 1;
}

.status-bell-icon {
  width: 40px;
  height: 40px;
  color: white;
}

.status-label {
  background-color: #bbf7d0;
  color: #166534;
  font-size: 18px;
  font-weight: 700;
  padding: 8px 24px;
  border-radius: 6px;
  letter-spacing: 1px;
}

.time-section {
  text-align: center;
  margin-bottom: 24px;
}

.current-time {
  font-size: 48px;
  font-weight: 300;
  color: #111827;
  margin-bottom: 4px;
}

.current-date {
  font-size: 16px;
  color: #6b7280;
  font-weight: 500;
}

.location-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 40px;
}

.location-icon {
  width: 20px;
  height: 20px;
  color: #374151;
}

.location-text {
  font-size: 16px;
  color: #374151;
  font-weight: 500;
}

/* ========== NEW: SENSOR INDICATORS ========= */
.sensor-section {
  margin: 32px 0;
  padding: 16px;
  background-color: #f3f4f6;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.sensor-item {
  margin-bottom: 16px;
}

.sensor-item label {
  display: block;
  font-size: 14px;
  color: #6b7280;
  font-weight: 600;
  margin-bottom: 6px;
}

.smoke-bar-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.smoke-bar {
  flex-grow: 1;
  height: 12px;
  background-color: #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  transition: width 0.3s ease;
}

.smoke-bar.smoke-warning {
  background-color: #eab308; /* Amber */
}

.smoke-bar.smoke-alert {
  background-color: #dc2626; /* Red */
}

.smoke-value {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  min-width: 40px;
  text-align: right;
}

.gas-status {
  font-size: 16px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  background-color: #d1fae5;
  color: #065f46;
}

.gas-status.gas-high {
  background-color: #fef3c7;
  color: #92400e;
}

/* ========== HISTORY SECTION ========= */
.history-section {
  margin-top: 32px;
}

.history-title {
  font-size: 16px;
  font-weight: 700;
  color: #374151;
  margin: 0 0 20px 0;
  letter-spacing: 0.5px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.history-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-icon.safe {
  background-color: #22c55e;
}

.history-icon.alert {
  background-color: #eab308;
}

.icon {
  width: 14px;
  height: 14px;
  color: white;
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-status {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.history-time {
  font-size: 13px;
  color: #6b7280;
}

.history-temperature {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.history-extra {
  font-size: 13px;
  color: #6b7280;
  margin-top: 6px;
  padding-left: 36px;
}

.view-full-history {
  text-align: center;
  margin-top: 24px;
}

.history-link {
  color: #374151;
  text-decoration: underline;
  font-size: 16px;
  font-weight: 500;
}

.history-link:hover {
  color: #111827;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-item.active .nav-icon {
  color: #dc2626;
}

.nav-item.active .nav-label {
  color: #dc2626;
}

.nav-icon {
  width: 24px;
  height: 24px;
  color: #9ca3af;
  margin-bottom: 4px;
}

.nav-label {
  font-size: 12px;
  color: #9ca3af;
}

.nav-item:hover .nav-icon,
.nav-item:hover .nav-label {
  color: #6b7280;
}
</style>