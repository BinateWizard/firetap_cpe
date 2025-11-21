<template>
  <div class="page-wrapper">
  <div class="app-container">
    <!-- Header with back button -->
    <div class="header">
      <button @click="$router.back()" class="back-btn">
        <ChevronLeft class="back-icon" />
      </button>
      <h1 class="header-title">{{ deviceName }}</h1>
    </div>

    <!-- Tab Navigation -->
    <div class="tab-nav">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'overview' }"
        @click="activeTab = 'overview'"
      >
        Overview
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'statistics' }"
        @click="activeTab = 'statistics'"
      >
        Statistics
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'info' }"
        @click="activeTab = 'info'"
      >
        Info
      </button>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-section">
        <div class="loading-spinner">⏳</div>
        <div class="loading-text">Connecting to device...</div>
      </div>

      <!-- Offline Modal -->
      <div v-if="noData && showOfflineModal" class="modal-overlay" @click.self="showOfflineModal = false">
        <div class="offline-modal">
          <div class="offline-modal-header">
            <h2>📡 Device Offline</h2>
            <button class="close-modal-btn" @click="showOfflineModal = false">✕</button>
          </div>
          
          <div class="offline-modal-content">
            <div class="offline-info-card">
              <h3>🔍 Diagnostics</h3>
              <div class="diagnostic-item">
                <span class="diagnostic-label">Device ID:</span>
                <span class="diagnostic-value">{{ deviceId }}</span>
              </div>
              <div class="diagnostic-item">
                <span class="diagnostic-label">Device Name:</span>
                <span class="diagnostic-value">{{ deviceName }}</span>
              </div>
              <div class="diagnostic-item" v-if="deviceLocation">
                <span class="diagnostic-label">Location:</span>
                <span class="diagnostic-value">{{ deviceLocation }}</span>
              </div>
              <div class="diagnostic-item">
                <span class="diagnostic-label">Status:</span>
                <span class="diagnostic-value offline-status">Offline</span>
              </div>
              <div class="diagnostic-item">
                <span class="diagnostic-label">RTDB Path:</span>
                <span class="diagnostic-value">/devices/{{ deviceId }}</span>
              </div>
            </div>

            <div class="offline-info-card">
              <h3>⚠️ Troubleshooting</h3>
              <ul class="troubleshooting-list">
                <li>Check if the ESP32 device is powered on</li>
                <li>Verify WiFi connection on the device</li>
                <li>Ensure Firebase RTDB credentials are correct</li>
                <li>Check device firmware is running properly</li>
                <li>View RTDB console to verify data is being sent</li>
              </ul>
            </div>

            <div class="offline-actions">
              <button class="action-btn-modal" @click="router.push('/')">
                ← Back to Home
              </button>
              <button class="action-btn-modal warning" @click="confirmDisconnect">
                🔌 Disconnect Device
              </button>
              <button class="action-btn-modal danger" @click="confirmDelete">
                🗑️ Delete Everything
              </button>
            </div>
          </div>
        </div>
      </div>

      <InactivityModal
        v-model:show="showInactivityModal"
        :device-id="deviceId"
        @closed="handleInactivityClosed"
      />

      <!-- No Data State (shows modal button) -->
      <div v-if="noData && activeTab === 'overview'" class="no-data-section">
        <div class="no-data-icon">📡</div>
        <div class="no-data-title">Device Offline</div>
        <div class="no-data-text">{{ deviceName }} is not sending data to Realtime Database.</div>
        <button class="diagnostics-btn" @click="showOfflineModal = true">
          🔍 View Diagnostics
        </button>
      </div>

      <!-- Device Dashboard (when data available) -->
      <div v-else-if="!noData" :key="deviceId">

      <!-- OVERVIEW TAB -->
      <div v-if="activeTab === 'overview'">
      <!-- Status Circle -->
      <div class="status-section" v-if="latest">
        <div class="status-circle" :class="{
          'safe-circle': !hasFireCondition && !hasSprinklerActive && !hasSmokeCondition && !hasRecentSmokeAlert && latest.status === 'Safe',
          'help-circle': hasRecentSmokeAlert && !hasNonSmokeFireCondition && !hasSprinklerActive,
          'sprinkler-circle': hasSprinklerActive,
          'alert-circle': hasNonSmokeFireCondition && !hasSprinklerActive
        }">
          <div class="status-icon-container">
            <!-- High temperature or fire detected -->
            <Flame v-if="hasHighTempCondition || hasNonSmokeFireCondition" class="status-bell-icon" />
            <!-- Sprinkler active (6s button): Droplets icon -->
            <Droplets v-else-if="hasSprinklerActive" class="status-bell-icon" />
            <!-- Smoke-only condition: Cloud icon -->
            <Cloud v-else-if="hasRecentSmokeAlert" class="status-bell-icon" />
            <!-- Safe: Check icon -->
            <Check v-else-if="latest.status === 'Safe'" class="status-bell-icon" />
            <!-- Other alerts: Bell icon -->
            <Bell v-else class="status-bell-icon" />
          </div>
        </div>
        <div class="status-label" :class="{
          'safe-label': !hasFireCondition && !hasSprinklerActive && !hasSmokeCondition && !hasRecentSmokeAlert && latest.status === 'Safe',
          'help-label': hasRecentSmokeAlert && !hasNonSmokeFireCondition && !hasSprinklerActive,
          'sprinkler-label': hasSprinklerActive,
          'alert-label': hasNonSmokeFireCondition && !hasSprinklerActive
        }">
          <span v-if="hasSprinklerActive">Sprinkler Active</span>
          <span v-else-if="hasRecentSmokeAlert">Smoke Detected</span>
          <span v-else-if="hasHighTempCondition">High Temperature</span>
          <span v-else-if="hasNonSmokeFireCondition">Fire Detected</span>
          <span v-else>{{ latest.status || 'Safe' }}</span>
        </div>
      </div>

      <!-- Smoke Alert (smoke-only, including 5s hold) -->
      <div v-if="hasRecentSmokeAlert && !hasSprinklerActive" class="warning-banner">
        💨 <strong>Smoke Detected!</strong><br>
        <span v-if="latest && latest.smokeDetected">Digital smoke sensor reported smoke.</span>
        <span v-else>High smoke levels detected recently.</span>
        Press button for ≤1s to reset or activate sprinkler (6s hold).
        <div class="respond-actions">
          <button class="respond-btn" @click="handleRespond">🚑 Respond</button>
        </div>
      </div>

      <!-- Fire Alert (gas/high temp/alarm/button, excluding smoke-only) -->
      <div v-if="hasNonSmokeFireCondition && !hasSprinklerActive" class="alert-banner">
        🔥 <strong>Fire Alert!</strong><br>
        <span v-if="latest.buttonEvent === 'STATE_ALERT'">Emergency alert activated via button (3s hold).</span>
        <span v-else-if="latest.gasStatus === 'detected' || latest.gasStatus === 'critical'">Critical gas levels detected.</span>
        <span v-else-if="latest.lastType === 'alarm'">Alarm has been triggered by sensors.</span>
        <span v-else-if="hasHighTempCondition">High temperature detected. Fire risk is elevated.</span>
        <span v-else>Fire condition detected. Check device immediately.</span>
        Press button for ≤1s to reset or activate sprinkler (6s hold).
        <div class="respond-actions">
          <button class="respond-btn" @click="handleRespond">🚑 Respond</button>
        </div>
      </div>

      <!-- Sprinkler Active (6s press) -->
      <div v-if="hasSprinklerActive" class="sprinkler-banner">
        💦 <strong>Sprinkler System Active!</strong><br>
        Sprinkler activated via button (6s hold). Press button for ≤1s to reset.
      </div>

      <!-- Sensor Error Warning -->
      <div v-if="latest && latest.sensorError === true" class="error-banner">
        ⚠️ <strong>Sensor Error Detected</strong><br>
        DHT11 sensor is not responding. Check wiring and power.
      </div>

      <!-- Alarm Alert -->
      <div v-if="latest && latest.lastType === 'alarm'" class="alert-banner">
        🔥 <strong>Alarm Triggered!</strong><br>
        Device detected critical condition at {{ formatTime(latest.dateTime) }}
      </div>

      <!-- Gas Alert -->
      <div v-if="latest && (latest.gasStatus === 'detected' || latest.gasStatus === 'critical')" class="warning-banner">
        ⚠️ <strong>Gas Detected!</strong><br>
        Critical gas levels detected. Take immediate action.
      </div>

      <!-- Time and Date -->
      <div class="time-section" v-if="latest">
        <div class="current-time">{{ formatTime(latest.dateTime) }}</div>
        <div class="current-date">{{ formatDate(latest.dateTime) }}</div>
      </div>

      <!-- Location -->
      <div class="location-section" v-if="deviceLocation">
        <MapPin class="location-icon" />
        <span class="location-text">{{ deviceLocation }}</span>
      </div>

      <!-- Smoke & Gas Indicators -->
      <div class="sensor-section" v-if="latest">
        <div class="sensor-item">
          <label>SMOKE LEVEL</label>
          <div class="smoke-bar-container">
            <div 
              class="smoke-bar" 
              :style="{ width: smokePercentage + '%', backgroundColor: getSmokeColor(smokePercentage) }"
            ></div>
            <span class="smoke-value">{{ smokePercentage }}%</span>
          </div>
        </div>

        <div class="sensor-item">
          <label>GAS STATUS</label>
          <div class="gas-status" :class="{ 'gas-high': latest.gasStatus === 'detected' || latest.gasStatus === 'critical' || latest.gasStatus === 'high' }">
            <span v-if="latest.gasStatus === 'detected' || latest.gasStatus === 'critical'">⚠️ DETECTED</span>
            <span v-else-if="latest.gasStatus === 'high'">⚠️ HIGH</span>
            <span v-else>✅ NORMAL</span>
          </div>
        </div>
      </div>

      <showMap v-if="showMapModal" @close="closeMap" />

      <!-- Current Readings Section -->
      <div class="current-readings-section" v-if="latest">
        <h2 class="section-title">📊 CURRENT READINGS</h2>
        
        <div class="readings-grid">
          <div class="reading-card">
            <div class="reading-icon">🌡️</div>
            <div class="reading-value">{{ (latest && latest.temperature !== undefined) ? latest.temperature + '°C' : 'No readings' }}</div>
            <div class="reading-label">Temperature</div>
          </div>

          <div class="reading-card">
            <div class="reading-icon">💧</div>
            <div class="reading-value">{{ (latest && latest.humidity !== undefined) ? latest.humidity + '%' : 'No readings' }}</div>
            <div class="reading-label">Humidity</div>
          </div>

          <div class="reading-card">
            <div class="reading-icon">💨</div>
            <div class="reading-value" :style="{ color: (latest && latest.smokeAnalog !== undefined) ? getSmokeColor(smokePercentage) : '#6b7280' }">{{ (latest && latest.smokeAnalog !== undefined) ? smokePercentage + '%' : 'No readings' }}</div>
            <div class="reading-label">Smoke Level</div>
          </div>

          <div class="reading-card">
            <div class="reading-icon">🔥</div>
            <div class="reading-value" :class="latest && latest.gasStatus && latest.gasStatus !== 'normal' ? 'text-alert' : 'text-safe'">{{ (latest && latest.gasStatus !== undefined) ? (latest.gasStatus || 'normal') : 'No readings' }}</div>
            <div class="reading-label">Gas Status</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions" v-if="latest">
        <button class="action-btn" @click="showMapModal = true">
          <MapPin :size="20" />
          View on Map
        </button>
        <button class="action-btn" @click="activeTab = 'statistics'">
          📈 View Statistics
        </button>
      </div>

      </div>
      <!-- END OVERVIEW TAB -->

      <!-- STATISTICS TAB (available even when offline if history exists) -->
      <div v-if="activeTab === 'statistics'">
        <!-- Time Range Filter -->
        <div class="time-range-filter">
          <button 
            class="range-btn" 
            :class="{ active: timeRange === 'week' }"
            @click="changeTimeRange('week')"
          >
            Week
          </button>
          <button 
            class="range-btn" 
            :class="{ active: timeRange === 'month' }"
            @click="changeTimeRange('month')"
          >
            Month
          </button>
          <button 
            class="range-btn" 
            :class="{ active: timeRange === 'year' }"
            @click="changeTimeRange('year')"
          >
            Year
          </button>
        </div>

        <!-- Charts -->
        <div class="charts-section" v-if="filteredHistory.length > 0">
          <h2 class="section-title">📊 SENSOR TRENDS ({{ timeRangeLabel }})</h2>
          
          <div class="chart-card">
            <h3 class="chart-title">Temperature (°C)</h3>
            <div class="chart-container">
              <canvas ref="tempChart"></canvas>
            </div>
            <div class="chart-stats">
              <span class="stat-item">Peak: {{ tempPeak }}°C</span>
              <span class="stat-item">Avg: {{ tempAvg }}°C</span>
              <span class="stat-item">Low: {{ tempMin }}°C</span>
            </div>
          </div>

          <div class="chart-card">
            <h3 class="chart-title">Humidity (%)</h3>
            <div class="chart-container">
              <canvas ref="humidityChart"></canvas>
            </div>
            <div class="chart-stats">
              <span class="stat-item">Peak: {{ humidityPeak }}%</span>
              <span class="stat-item">Avg: {{ humidityAvg }}%</span>
              <span class="stat-item">Low: {{ humidityMin }}%</span>
            </div>
          </div>

          <div class="chart-card">
            <h3 class="chart-title">Smoke Level</h3>
            <div class="chart-container">
              <canvas ref="smokeChart"></canvas>
            </div>
            <div class="chart-stats">
              <span class="stat-item">Peak: {{ smokePeak }}%</span>
              <span class="stat-item">Avg: {{ smokeAvg }}%</span>
            </div>
          </div>
        </div>

        <div v-else class="no-data-message">
          <p>No data available for the selected time range</p>
        </div>
      </div>
      <!-- END STATISTICS TAB -->

      <!-- INFO TAB -->
      <div v-if="activeTab === 'info'">
        <div class="info-section">
          <h2 class="section-title">📝 DEVICE INFORMATION</h2>
          
          <div class="info-card">
            <div class="info-row">
              <span class="info-label">Device ID:</span>
              <span class="info-value">{{ deviceId }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Device Name:</span>
              <span class="info-value">{{ deviceName }}</span>
            </div>
            <div class="info-row" v-if="deviceLocation">
              <span class="info-label">Location:</span>
              <span class="info-value">{{ deviceLocation }}</span>
            </div>
            <div class="info-row" v-if="deviceInfo.description">
              <span class="info-label">Description:</span>
              <span class="info-value">{{ deviceInfo.description }}</span>
            </div>
            <div class="info-row" v-if="deviceInfo.addedByEmail">
              <span class="info-label">Added By:</span>
              <span class="info-value">{{ deviceInfo.addedByEmail }}</span>
            </div>
            <div class="info-row" v-if="deviceInfo.createdAt">
              <span class="info-label">Date Added:</span>
              <span class="info-value">{{ formatDate(deviceInfo.createdAt.toDate()) }}</span>
            </div>
            <div class="info-row" v-if="latest">
              <span class="info-label">Last Updated:</span>
              <span class="info-value">{{ formatTime(latest.dateTime) }}, {{ formatDate(latest.dateTime) }}</span>
            </div>
          </div>

          <h2 class="section-title" style="margin-top: 24px;">📈 CURRENT READINGS</h2>
          <div class="info-card" v-if="latest">
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span class="info-value" :class="latest.status === 'Alert' ? 'text-alert' : 'text-safe'">{{ latest.status }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Temperature:</span>
              <span class="info-value">{{ latest.temperature || 'N/A' }}°C</span>
            </div>
            <div class="info-row">
              <span class="info-label">Humidity:</span>
              <span class="info-value">{{ latest.humidity || 'N/A' }}%</span>
            </div>
            <div class="info-row">
              <span class="info-label">Smoke Level:</span>
              <span class="info-value">{{ smokePercentage }}%</span>
            </div>
            <div class="info-row">
              <span class="info-label">Gas Status:</span>
              <span class="info-value" :class="latest.gasStatus !== 'normal' ? 'text-alert' : 'text-safe'">{{ latest.gasStatus || 'normal' }}</span>
            </div>
          </div>
          <div v-else class="info-card">
            <p class="no-data-message">Device is currently offline. No current readings available.</p>
          </div>

          <!-- Device Management Buttons -->
          <div class="danger-zone">
            <h3 class="danger-title">⚠️ Device Management</h3>
            
            <!-- Disconnect Section -->
            <div class="management-section">
              <h4 class="management-subtitle">🔌 Disconnect Device</h4>
              <p class="management-description">Remove this device from your account. Device data remains in Realtime Database and can be re-added later.</p>
              <button class="management-btn disconnect-btn" @click="confirmDisconnect">
                🔌 Disconnect from Account
              </button>
            </div>

            <!-- Delete Section -->
            <div class="management-section">
              <h4 class="management-subtitle">🗑️ Delete Everything</h4>
              <p class="management-description">Permanently delete this device from your account AND all sensor data from Realtime Database. This cannot be undone.</p>
              <button class="management-btn delete-btn" @click="confirmDelete">
                🗑️ Delete Device & Data
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- END INFO TAB -->

      <!-- Recent Status History -->
      <div class="history-section">
        <h2 class="history-title">RECENT STATUS HISTORY</h2>
        <div class="history-list" v-if="statusCards.length > 0">
          <div 
            v-for="entry in statusCards" 
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
                <div class="history-status">
                  <span v-if="entry.lastType === 'alarm'">🔥 Alarm Triggered</span>
                  <span v-else-if="entry.sensorError">⚠️ Sensor Error</span>
                  <span v-else-if="entry.gasStatus === 'detected' || entry.gasStatus === 'critical'">⚠️ Gas Detected</span>
                  <span v-else>{{ (entry.status === 'Alert' || entry.status === 'Safe') ? entry.status : 'Safe' }}</span>
                </div>
                <div class="history-time">
                  {{ formatTime(entry.dateTime) }}, {{ formatDate(entry.dateTime) }}
                </div>
              </div>
            </div>
              <!-- Metrics as labeled badges for clarity -->
              <div class="history-metrics">
                <span 
                  v-if="entry.smokeAnalog !== undefined && !entry.sensorError"
                  class="badge"
                  :class="getSmokeBadgeClass(getSmokeLevel(entry.smokeAnalog))">
                  Smoke: {{ getSmokeLevel(entry.smokeAnalog) }}%
                </span>
                <span v-if="entry.temperature !== undefined && !entry.sensorError" class="badge temp">
                  Temp: {{ entry.temperature }}°C
                </span>
                <span v-if="entry.humidity !== undefined && !entry.sensorError" class="badge humidity">
                  Humidity: {{ entry.humidity }}%
                </span>
                <span v-if="entry.gasStatus && entry.gasStatus !== 'normal'" class="badge gas-alert">
                  Gas: Detected
                </span>
                <span v-else-if="entry.gasStatus" class="badge gas-normal">
                  Gas: Normal
                </span>
                <span v-if="entry.sensorError" class="badge error">Sensor Error</span>
                <span v-if="entry.message === 'help requested'" class="badge help">Help Requested</span>
                <span v-if="entry.message === 'alarm has been triggered'" class="badge alarm">Alarm</span>
              </div>
          </div>
        </div>
        <div v-else class="no-data">No recent alerts for this device</div>
      </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup>
import showMap from "@/components/showMap.vue";
import InactivityModal from "@/components/InactivityModal.vue";
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from "vue";
import { useRoute } from "vue-router";
import { useRouter } from "vue-router";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { ref as dbRef, onValue, query, orderByChild, limitToLast, remove } from "firebase/database"; // retained for disconnect/delete only
import { db, rtdb, auth } from "@/firebase";
import { stopAllAlerts } from "@/services/alertMonitor";
import { useDeviceController } from "@/services/deviceController";
import { 
  Bell, 
  MapPin, 
  Check, 
  AlertTriangle,
  ChevronLeft,
  Flame,
  Droplets
} from 'lucide-vue-next'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Filler
} from 'chart.js'

// Register Chart.js components
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Filler
)

const route = useRoute();
const router = useRouter();
const deviceId = computed(() => route.params.deviceId);
const deviceName = ref('Loading...');
const deviceLocation = ref('');
const deviceInfo = ref({});

// Device controller encapsulates RTDB listeners & status logic
const { latest, history, statusCards, loading: ctrlLoading, noData: ctrlNoData, lastUpdated, start: startController, stop: stopController } = useDeviceController(deviceId);
// Reuse names expected in template
const loading = ctrlLoading;
const noData = ctrlNoData;
const showMapModal = ref(false);
const showOfflineModal = ref(false);
const showInactivityModal = ref(false);
// replaced by controller refs above

let inactivityTimeoutId = null;

// Tab state
const activeTab = ref('overview');
const timeRange = ref('week');

// Chart refs
const tempChart = ref(null);
const humidityChart = ref(null);
const smokeChart = ref(null);
let tempChartInstance = null;
let humidityChartInstance = null;
let smokeChartInstance = null;

// Computed statistics
const tempPeak = computed(() => {
  const temps = filteredHistory.value.filter(h => h.temperature).map(h => h.temperature);
  return temps.length ? Math.max(...temps).toFixed(1) : 'N/A';
});

const tempAvg = computed(() => {
  const temps = filteredHistory.value.filter(h => h.temperature).map(h => h.temperature);
  return temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : 'N/A';
});

const tempMin = computed(() => {
  const temps = filteredHistory.value.filter(h => h.temperature).map(h => h.temperature);
  return temps.length ? Math.min(...temps).toFixed(1) : 'N/A';
});

const humidityPeak = computed(() => {
  const humidities = filteredHistory.value.filter(h => h.humidity).map(h => h.humidity);
  return humidities.length ? Math.max(...humidities).toFixed(1) : 'N/A';
});

const humidityAvg = computed(() => {
  const humidities = filteredHistory.value.filter(h => h.humidity).map(h => h.humidity);
  return humidities.length ? (humidities.reduce((a, b) => a + b, 0) / humidities.length).toFixed(1) : 'N/A';
});

const humidityMin = computed(() => {
  const humidities = filteredHistory.value.filter(h => h.humidity).map(h => h.humidity);
  return humidities.length ? Math.min(...humidities).toFixed(1) : 'N/A';
});

const smokePeak = computed(() => {
  const smokes = filteredHistory.value.filter(h => h.smokeAnalog).map(h => getSmokePercentage(h.smokeAnalog));
  return smokes.length ? Math.max(...smokes).toFixed(0) : 'N/A';
});

const smokeAvg = computed(() => {
  const smokes = filteredHistory.value.filter(h => h.smokeAnalog).map(h => getSmokePercentage(h.smokeAnalog));
  return smokes.length ? (smokes.reduce((a, b) => a + b, 0) / smokes.length).toFixed(0) : 'N/A';
});

const timeRangeLabel = computed(() => {
  if (timeRange.value === 'week') return 'Last 7 Days';
  if (timeRange.value === 'month') return 'Last 30 Days';
  if (timeRange.value === 'year') return 'Last 365 Days';
  return '';
});

const filteredHistory = computed(() => {
  const now = new Date();
  const cutoffDate = new Date();
  
  if (timeRange.value === 'week') {
    cutoffDate.setDate(now.getDate() - 7);
  } else if (timeRange.value === 'month') {
    cutoffDate.setDate(now.getDate() - 30);
  } else if (timeRange.value === 'year') {
    cutoffDate.setDate(now.getDate() - 365);
  }
  
  return history.value.filter(h => h.dateTime >= cutoffDate);
});

// High temperature condition helper
const hasHighTempCondition = computed(() => {
  if (!latest.value) return false;
  return typeof latest.value.temperature === 'number' && latest.value.temperature >= 30;
});

// High smoke condition helper (direct reading: digital flag or high analog)
const hasSmokeCondition = computed(() => {
  if (!latest.value) return false;
  // Treat either a digital smokeDetected flag or a high analog value as smoke
  if (latest.value.smokeDetected === true) return true;
  const smokeValue = latest.value.smokeLevel ?? latest.value.smoke ?? latest.value.smokeAnalog ?? 0;
  return typeof smokeValue === 'number' && smokeValue > 1500;
});

// Keep smoke alert active for 5 seconds after it is detected
const hasRecentSmokeAlert = ref(false);
let smokeAlertTimeoutId = null;

watch(hasSmokeCondition, (isSmoke) => {
  if (isSmoke) {
    hasRecentSmokeAlert.value = true;
    if (smokeAlertTimeoutId) {
      clearTimeout(smokeAlertTimeoutId);
    }
    smokeAlertTimeoutId = setTimeout(() => {
      hasRecentSmokeAlert.value = false;
      smokeAlertTimeoutId = null;
    }, 5000);
  }
});

// Fire condition: non-smoke causes (gas detected, alarm triggered, button alert, or high temperature)
// Note: smoke-only is handled separately by hasSmokeCondition / hasRecentSmokeAlert
const hasFireCondition = computed(() => hasNonSmokeFireCondition.value);

// Fire condition excluding smoke-only (used for dedicated Fire Alert banner)
const hasNonSmokeFireCondition = computed(() => {
  if (!latest.value) return false;

  // Button emergency alert is always fire
  if (latest.value.buttonEvent === 'STATE_ALERT') return true;

  // High temperature without smoke-only condition
  if (hasHighTempCondition.value && !hasRecentSmokeAlert.value && !hasSmokeCondition.value) return true;

  // Gas detection without smoke-only condition
  const gasStatus = String(latest.value.gasStatus || '').toLowerCase();
  if ((gasStatus === 'detected' || gasStatus === 'critical') && !hasRecentSmokeAlert.value && !hasSmokeCondition.value) return true;

  // Alarm messages without smoke-only condition
  if (latest.value.message === 'alarm has been triggered' && !hasRecentSmokeAlert.value && !hasSmokeCondition.value) return true;
  if (latest.value.lastType === 'alarm' && !hasRecentSmokeAlert.value && !hasSmokeCondition.value) return true;

  return false;
});

// Sprinkler condition: 6s button press
const hasSprinklerActive = computed(() => {
  if (!latest.value) return false;
  return latest.value.buttonEvent === 'STATE_SPRINKLER';
});

// Watch for timeRange changes and update charts
watch(timeRange, () => {
  nextTick(() => {
    renderCharts();
  });
});

function closeMap() {
  showMapModal.value = false;
}

function changeTimeRange(range) {
  timeRange.value = range;
  // Re-render charts with new filtered data
  renderCharts();
}

function handleInactivityClosed() {
  if (inactivityTimeoutId) {
    clearTimeout(inactivityTimeoutId);
  }
  inactivityTimeoutId = setTimeout(() => {
    showInactivityModal.value = true;
  }, 10000);
}

async function confirmDisconnect() {
  const confirmMessage = `Disconnect "${deviceName.value}" from your account?\n\nThis will:\n- Remove the device from your dashboard\n- Stop fetching data for this device\n- Keep all sensor data in Realtime Database\n\nYou can re-add this device later using its ID.`;
  
  if (confirm(confirmMessage)) {
    await disconnectDevice();
  }
}

async function disconnectDevice() {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert('You must be logged in to disconnect a device.');
      return;
    }

    console.log("🔌 Disconnecting device from account...");

    // Use composite ID: userId_deviceId
    const docId = `${currentUser.uid}_${deviceId.value}`;
    const deviceRef = doc(db, "devices", docId);
    
    // Check if device exists in Firestore
    const docSnap = await getDoc(deviceRef);
    
    if (docSnap.exists()) {
      // Delete only the Firestore registration (disconnect from account)
      await deleteDoc(deviceRef);
      console.log("✅ Device disconnected from your account");
    } else {
      console.log("ℹ️ Device not found in Firestore");
    }
    
    // Close modal if open
    showOfflineModal.value = false;
    
    // Navigate back to home
    router.push('/');
  } catch (error) {
    console.error("❌ Error disconnecting device:", error);
    alert(`Failed to disconnect device: ${error.message}`);
  }
}

async function confirmDelete() {
  const confirmMessage = `⚠️ PERMANENTLY DELETE "${deviceName.value}"?\n\nThis will:\n- Remove the device from your account\n- Delete ALL sensor data from Realtime Database\n- Cannot be undone\n\nAre you absolutely sure?`;
  
  if (confirm(confirmMessage)) {
    await deleteDevice();
  }
}

async function deleteDevice() {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert('You must be logged in to delete a device.');
      return;
    }

    console.log("🗑️ Starting complete device deletion...");

    // Use composite ID: userId_deviceId
    const docId = `${currentUser.uid}_${deviceId.value}`;
    const deviceRef = doc(db, "devices", docId);
    
    // Check if device exists in Firestore
    const docSnap = await getDoc(deviceRef);
    
    if (docSnap.exists()) {
      // Delete the device document from Firestore
      await deleteDoc(deviceRef);
      console.log("✅ Device removed from Firestore (disconnected from your account)");
    } else {
      console.log("ℹ️ Device not found in Firestore (already deleted or never existed)");
    }

    // Optionally try to delete device data from Realtime Database
    // This may fail due to permissions, which is okay
    try {
      const rtdbDeviceRef = dbRef(rtdb, `devices/${deviceId.value}`);
      await remove(rtdbDeviceRef);
      console.log("✅ Device data deleted from Realtime Database");
    } catch (rtdbError) {
      console.warn("⚠️ Could not delete from RTDB:", rtdbError.message);
      console.log("ℹ️ Device disconnected from your account. RTDB data may remain.");
    }
    
    console.log("✅ Device disconnected successfully");
    
    // Close modal if open
    showOfflineModal.value = false;
    
    // Navigate back to home
    router.push('/');
  } catch (error) {
    console.error("❌ Error deleting device:", error);
    alert(`Failed to delete device: ${error.message}`);
  }
}

async function handleRespond() {
  try {
    // Stop all alert effects (sound + vibration)
    stopAllAlerts();
  } catch (_) { /* no-op */ }
  // Show the whole map view
  try {
    router.push('/map');
  } catch (_) {
    // Fallback to inline modal if route is unavailable
    showMapModal.value = true;
  }
}

// Defensive: remove any accidental JSON blobs rendered by extensions/old cache
function scrubDebugJSON() {
  try {
    const root = document.querySelector('.app-container');
    if (!root) return;
    const suspiciousKeys = [ '"gasStatus"', '"lastSeen"', '"lastType"', '"sensorError"' ];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const toHide = new Set();
    let n;
    while ((n = walker.nextNode())) {
      const t = n.textContent?.trim();
      if (!t || t.length < 10) continue;
      if (t.startsWith('{') && t.endsWith('}') && suspiciousKeys.every(k => t.includes(k))) {
        if (n.parentElement) toHide.add(n.parentElement);
      }
    }
    toHide.forEach(el => {
      el.style.display = 'none';
    });
  } catch (_) {
    /* no-op */
  }
}

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

function getSmokeColor(percentage) {
  if (percentage > 80) return '#dc2626';
  if (percentage > 60) return '#eab308';
  return '#22c55e';
}

function getSmokeBadgeClass(percentage) {
  if (percentage > 80) return 'smoke-high';
  if (percentage > 60) return 'smoke-med';
  return 'smoke-low';
}

function determineStatusFromButton(data, buttonEvent) {
  // Button event takes priority over sensor data
  if (buttonEvent === 'STATE_ALERT') return 'Alert';
  if (buttonEvent === 'STATE_SPRINKLER') return 'Safe'; // Sprinkler is active but not "alert"
  
  // Fall back to regular status determination
  return determineStatus(data);
}

function determineStatus(data) {
  if (!data || typeof data !== 'object') return 'Safe';

  const toStr = (v) => String(v || '').toLowerCase();

  // Hard alert conditions - only if explicitly set
  if (data.sensorError === true) return 'Alert';
  if (data.message === 'help requested' || data.message === 'alarm has been triggered') return 'Alert';
  if (data.lastType === 'alarm') return 'Alert';
  
  // Only trigger alert for gas if it's explicitly detected/critical (not just missing data)
  if (data.gasStatus && ['critical','detected'].includes(toStr(data.gasStatus))) return 'Alert';

  // If status is a string, normalize only if it's a known label
  if (typeof data.status === 'string') {
    const s = toStr(data.status).trim();
    if (s === 'alert' || s === 'unsafe') return 'Alert';
    if (s === 'safe' || s === 'normal') return 'Safe';
    // If it's JSON-like, try to parse and re-evaluate
    if (s.startsWith('{')) {
      try {
        const parsed = JSON.parse(data.status);
        return determineStatus(parsed);
      } catch (_) { /* ignore */ }
    }
  }

  // Smoke threshold check - only if value exists and is high
  const smokeValue = data.smokeLevel ?? data.smoke ?? data.smokeAnalog ?? 0;
  if (typeof smokeValue === 'number' && smokeValue > 1500) return 'Alert';

  return 'Safe';
}

async function fetchDeviceInfo() {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Use composite ID: userId_deviceId
    const docId = `${currentUser.uid}_${deviceId.value}`;
    const deviceRef = doc(db, "devices", docId);
    const docSnap = await getDoc(deviceRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      deviceInfo.value = data;
      deviceName.value = data.name || data.deviceId || deviceId.value;
      if (data.location && typeof data.location === 'string') {
        deviceLocation.value = data.location;
      } else if (data.coordinates && data.coordinates.lat) {
        deviceLocation.value = `${data.coordinates.lat.toFixed(6)}, ${data.coordinates.lng.toFixed(6)}`;
      }
    } else {
      deviceName.value = deviceId.value;
    }
  } catch (error) {
    console.error("❌ Error fetching device info:", error);
    deviceName.value = deviceId.value;
  }
}

// Removed inline fetchData logic in favor of controller

onMounted(() => {
  fetchDeviceInfo();
  startController();
});

onUnmounted(() => {
  if (tempChartInstance) tempChartInstance.destroy();
  if (humidityChartInstance) tempChartInstance = null;
  if (smokeChartInstance) smokeChartInstance.destroy();
  if (humidityChartInstance) humidityChartInstance = null;
  stopController();
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

function renderCharts() {
  if (filteredHistory.value.length === 0) return;
  
  nextTick(() => {
    // Prepare data (reverse for chronological order)
    const sortedHistory = [...filteredHistory.value].reverse();
    const labels = sortedHistory.map((h, i) => formatTime(h.dateTime));
    const temperatures = sortedHistory.map(h => h.temperature || null);
    const humidities = sortedHistory.map(h => h.humidity || null);
    const smokes = sortedHistory.map(h => getSmokePercentage(h.smokeAnalog));
    
    // Temperature Chart
    if (tempChart.value) {
      if (tempChartInstance) tempChartInstance.destroy();
      tempChartInstance = new Chart(tempChart.value, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Temperature',
            data: temperatures,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 8,
              callbacks: {
                label: (context) => `${context.parsed.y}°C`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              ticks: { color: '#6b7280' },
              grid: { color: 'rgba(0, 0, 0, 0.05)' }
            },
            x: {
              ticks: { color: '#6b7280', maxRotation: 45, minRotation: 45 },
              grid: { display: false }
            }
          }
        }
      });
    }
    
    // Humidity Chart
    if (humidityChart.value) {
      if (humidityChartInstance) humidityChartInstance.destroy();
      humidityChartInstance = new Chart(humidityChart.value, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Humidity',
            data: humidities,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 8,
              callbacks: {
                label: (context) => `${context.parsed.y}%`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: { color: '#6b7280' },
              grid: { color: 'rgba(0, 0, 0, 0.05)' }
            },
            x: {
              ticks: { color: '#6b7280', maxRotation: 45, minRotation: 45 },
              grid: { display: false }
            }
          }
        }
      });
    }
    
    // Smoke Chart
    if (smokeChart.value) {
      if (smokeChartInstance) smokeChartInstance.destroy();
      smokeChartInstance = new Chart(smokeChart.value, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Smoke Level',
            data: smokes,
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 8,
              callbacks: {
                label: (context) => `${context.parsed.y}%`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: { color: '#6b7280' },
              grid: { color: 'rgba(0, 0, 0, 0.05)' }
            },
            x: {
              ticks: { color: '#6b7280', maxRotation: 45, minRotation: 45 },
              grid: { display: false }
            }
          }
        }
      });
    }
  });
}

const smokePercentage = computed(() => {
  return latest.value ? getSmokePercentage(latest.value.smokeAnalog) : 0;
});
</script>

<style scoped>
/* Defensive: Hide any accidental debug output */
pre, code {
  display: none !important;
}

.page-wrapper {
  width: 100%;
  min-height: 100vh;
  background-color: #fffaf0;
  position: relative;
  overflow: hidden;
}

.page-wrapper * {
  box-sizing: border-box;
}

.app-container {
  max-width: 400px;
  margin: 0 auto;
  background-color: #fffaf0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  max-width: 400px;
  width: 100%;
  background-color: #dc2626;
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.back-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.back-icon {
  width: 24px;
  height: 24px;
}

.header-title {
  color: white;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  flex: 1;
}

/* Tab Navigation */
.tab-nav {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 400px;
  width: 100%;
  background-color: white;
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  z-index: 99;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.tab-btn {
  flex: 1;
  padding: 14px 16px;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  color: #374151;
  background: #f9fafb;
}

.tab-btn.active {
  color: #dc2626;
  border-bottom-color: #dc2626;
}

/* Time Range Filter */
.time-range-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding: 4px;
  background: #f3f4f6;
  border-radius: 8px;
}

.range-btn {
  flex: 1;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.range-btn:hover {
  color: #374151;
  background: rgba(255, 255, 255, 0.5);
}

.range-btn.active {
  background: white;
  color: #dc2626;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.main-content {
  padding: 20px 16px;
  padding-top: 124px;
  padding-bottom: 88px;
  flex: 1;
}

.error-banner {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border: 2px solid #ef4444;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: center;
  color: #991b1b;
  font-size: 14px;
  line-height: 1.6;
}

.alert-banner {
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
  border: 2px solid #f97316;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: center;
  color: #7c2d12;
  font-size: 14px;
  line-height: 1.6;
}

.warning-banner {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #eab308;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: center;
  color: #713f12;
  font-size: 14px;
  line-height: 1.6;
}

.sprinkler-banner {
  background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%);
  border: 2px solid #3b82f6;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: center;
  color: #1e3a8a;
  font-size: 14px;
  line-height: 1.6;
  animation: pulse-blue 2s ease-in-out infinite;
}

.sprinkler-banner strong {
  font-size: 16px;
  display: block;
  margin-bottom: 4px;
}

@keyframes pulse-blue {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
}

.error-banner strong {
  font-size: 16px;
  display: block;
  margin-bottom: 4px;
}

.status-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
  margin-top: 8px;
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

.status-circle.safe-circle {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.status-circle.help-circle {
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
}

.status-circle.sprinkler-circle {
  background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%);
  animation: pulse-blue 2s ease-in-out infinite;
}

.status-circle.alert-circle {
  background: linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%);
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

.status-circle.safe-circle::before {
  background-color: #22c55e;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.status-circle.help-circle::before {
  background-color: #f97316;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
}

.status-circle.sprinkler-circle::before {
  background-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.status-circle.alert-circle::before {
  background-color: #ef4444;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
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

.status-label.safe-label {
  background-color: #bbf7d0;
  color: #166534;
}

.status-label.help-label {
  background-color: #fdba74;
  color: #7c2d12;
}

.status-label.sprinkler-label {
  background-color: #93c5fd;
  color: #1e3a8a;
}

.status-label.alert-label {
  background-color: #fca5a5;
  color: #7f1d1d;
}

.time-section {
  text-align: center;
  margin-bottom: 20px;
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
  margin-bottom: 24px;
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

.sensor-section {
  margin: 24px 0;
  padding: 16px;
  background-color: #f3f4f6;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.sensor-item {
  margin-bottom: 16px;
}

.sensor-item:last-child {
  margin-bottom: 0;
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
  border-radius: 6px;
  transition: all 0.3s ease;
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

.charts-section {
  margin-top: 24px;
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #374151;
  margin: 0 0 20px 0;
  letter-spacing: 0.5px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
}

.chart-container {
  height: 200px;
  width: 100%;
  position: relative;
  margin-bottom: 12px;
}

.chart-container canvas {
  max-height: 200px !important;
  width: 100% !important;
  height: 200px !important;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  margin: 0 0 12px 0;
}

.chart-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.stat-item {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.stat-item:first-child {
  color: #dc2626;
  font-weight: 600;
}

/* Current Readings Section */
.current-readings-section {
  margin: 20px 0;
}

.readings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.reading-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.reading-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.reading-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.reading-value {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
}

.reading-label {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 12px;
  margin: 20px 0;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: white;
  border: 2px solid #dc2626;
  color: #dc2626;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #dc2626;
  color: white;
}

/* Info Section */
.info-section {
  padding-bottom: 24px;
}

.info-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 600;
}

.info-value {
  font-size: 14px;
  color: #111827;
  font-weight: 500;
  text-align: right;
  max-width: 60%;
  word-wrap: break-word;
}

.text-alert {
  color: #dc2626 !important;
  font-weight: 600 !important;
}

.text-safe {
  color: #10b981 !important;
  font-weight: 600 !important;
}

/* Danger Zone */
.danger-zone {
  margin-top: 32px;
  padding: 20px;
  background: #fef2f2;
  border: 2px solid #fecaca;
  border-radius: 12px;
}

.danger-title {
  font-size: 16px;
  font-weight: 700;
  color: #dc2626;
  margin-bottom: 16px;
}

.management-section {
  background: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
}

.management-section:last-child {
  margin-bottom: 0;
}

.management-subtitle {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.management-description {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 12px;
  line-height: 1.5;
}

.management-btn {
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.disconnect-btn {
  background: #f97316;
  color: white;
}

.disconnect-btn:hover {
  background: #ea580c;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
}

.delete-btn {
  background: #dc2626;
  color: white;
}

.delete-btn:hover {
  background: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.management-btn:active {
  transform: translateY(0);
}

.danger-description {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 16px;
  line-height: 1.5;
}

.no-data-message {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
  font-size: 15px;
}

.history-section {
  margin-top: 24px;
  margin-bottom: 24px;
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

.no-data {
  text-align: center;
  color: #9ca3af;
  padding: 40px 20px;
  font-size: 15px;
}

.loading-section,
.no-data-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.loading-spinner {
  font-size: 48px;
  margin-bottom: 16px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 16px;
  color: #6b7280;
}

.no-data-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-data-title {
  font-size: 20px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.no-data-text {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 16px;
}

.diagnostics-btn {
  margin-top: 16px;
  padding: 12px 24px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.diagnostics-btn:hover {
  background: #b91c1c;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.no-data-hint {
  font-size: 12px;
  color: #9ca3af;
  font-family: monospace;
  background: #f3f4f6;
  padding: 8px 12px;
  border-radius: 6px;
}

/* Offline Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.offline-modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.offline-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.offline-modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
  transition: color 0.2s;
}

.close-modal-btn:hover {
  color: #111827;
}

.offline-modal-content {
  padding: 24px;
}

.offline-info-card {
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.offline-info-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
}

.diagnostic-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.diagnostic-item:last-child {
  border-bottom: none;
}

.diagnostic-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.diagnostic-value {
  font-size: 13px;
  color: #111827;
  font-weight: 600;
  text-align: right;
  max-width: 60%;
  word-break: break-all;
}

.offline-status {
  color: #dc2626 !important;
}

.troubleshooting-list {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.troubleshooting-list li {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
  line-height: 1.5;
}

.offline-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.action-btn-modal {
  flex: 1;
  padding: 12px 20px;
  border: 2px solid #dc2626;
  background: white;
  color: #dc2626;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn-modal:hover {
  background: #dc2626;
  color: white;
}

.action-btn-modal.warning {
  background: #f97316;
  color: white;
  border-color: #f97316;
}

.action-btn-modal.warning:hover {
  background: #ea580c;
}

.action-btn-modal.danger {
  background: #dc2626;
  color: white;
}

.action-btn-modal.danger:hover {
  background: #b91c1c;
}

/* History Metrics Badges */
.history-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.badge.smoke-low {
  background: #d1fae5;
  color: #065f46;
}

.badge.smoke-med {
  background: #fef3c7;
  color: #92400e;
}

.badge.smoke-high {
  background: #fee2e2;
  color: #991b1b;
}

.badge.temp {
  background: #fef3c7;
  color: #92400e;
}

.badge.humidity {
  background: #dbeafe;
  color: #1e40af;
}

.badge.gas-normal {
  background: #d1fae5;
  color: #065f46;
}

.badge.gas-alert {
  background: #fee2e2;
  color: #991b1b;
}

.badge.error {
  background: #fee2e2;
  color: #991b1b;
}

.badge.help {
  background: #fef3c7;
  color: #92400e;
}

.badge.alarm {
  background: #fee2e2;
  color: #991b1b;
}

</style>
