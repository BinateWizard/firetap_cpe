<template>
  <div class="map-container">
    <div class="map-header">
      <button class="close-btn" @click="close">Close</button>
    </div>
    <div id="map"></div>
    
    <!-- Device List Panel -->
    <div v-if="devices.length > 0" class="device-panel">
      <div class="panel-title">Devices ({{ devices.length }})</div>
      <div class="device-list">
        <button 
          v-for="device in devices" 
          :key="device.deviceId"
          class="device-btn"
          :class="{ 
            'alert': device.status === 'Alert',
            'offline': device.status === 'Offline'
          }"
          @click="focusOnDevice(device)"
        >
          <span class="device-icon">{{ 
            device.status === 'Alert' ? '🔥' : 
            (device.status === 'Offline' ? '📡' : '📍') 
          }}</span>
          <div class="device-info">
            <div class="device-name">{{ device.name }}</div>
            <div class="device-status">{{ device.status }}</div>
          </div>
        </button>
      </div>
    </div>
    <div v-else class="device-panel">
      <div class="panel-title">No devices with location</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { defineEmits } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { ref as dbRef, onValue } from 'firebase/database'
import { db, rtdb, auth } from '@/firebase'

const emit = defineEmits(['close'])
const router = useRouter()
const route = useRoute()

let map = null
const userMarker = ref(null)
const deviceMarkers = ref([])
const devices = ref([])

function close() {
  // Notify parent (modal) that it should close
  emit('close')

  // If this component was visited via the /map route, navigate away so Close does something
  if (route.name === 'map' || route.path === '/map') {
    // Prefer going back in history, otherwise push to home
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push({ path: '/' })
    }
  }
}

function focusOnDevice(device) {
  if (!map || !device.lat || !device.lng) return
  
  // Zoom to device location
  map.setView([device.lat, device.lng], 16, {
    animate: true,
    duration: 1
  })
  
  // Open the marker popup
  const marker = deviceMarkers.value.find(m => m.deviceId === device.deviceId)
  if (marker && marker.marker) {
    marker.marker.openPopup()
  }
}

function checkDeviceOnline(data) {
  // Priority 1: Check backend-set isOnline field (from Cloud Functions)
  if (data.isOnline !== undefined) {
    return data.isOnline;
  }
  
  // Priority 2: Client-side fallback - check lastSeen timestamp
  const OFFLINE_THRESHOLD = 2 * 60 * 1000; // 2 minutes
  const lastSeen = data.lastSeen || data.timestamp || 0;
  
  if (lastSeen === 0) {
    return false;
  }
  
  const now = Date.now();
  const timeSinceLastSeen = now - lastSeen;
  
  return timeSinceLastSeen < OFFLINE_THRESHOLD;
}

function determineStatus(data, isOnline = true) {
  // Always prioritize offline status
  if (!isOnline) return 'Offline'
  if (!data) return 'Safe'
  if (data.message === 'help requested' || data.message === 'alarm has been triggered') return 'Alert'
  const smokeValue = data.smokeLevel ?? data.smoke ?? 0
  if (typeof smokeValue === 'number' && smokeValue > 1500) return 'Alert'
  if (data.status && typeof data.status === 'string') {
    const s = data.status.toLowerCase()
    if (s === 'offline') return 'Offline'
    if (s === 'alert') return 'Alert'
  }
  return 'Safe'
}

async function loadDeviceMarkers() {
  const currentUser = auth.currentUser
  if (!currentUser) return

  try {
    // Get user's devices from Firestore
    const q = query(
      collection(db, 'devices'),
      where('addedBy', '==', currentUser.uid)
    )
    const snapshot = await getDocs(q)

    console.log('📍 Found', snapshot.docs.length, 'devices')

    snapshot.docs.forEach(doc => {
      const deviceData = doc.data()
      const deviceId = deviceData.deviceId

      console.log('🔍 Checking device:', deviceId, deviceData)

      // PRIORITY 1: Check if device has coordinates stored in Firestore (from location picker)
      if (deviceData.coordinates && deviceData.coordinates.lat && deviceData.coordinates.lng) {
        const lat = parseFloat(deviceData.coordinates.lat)
        const lng = parseFloat(deviceData.coordinates.lng)
        
        console.log(`📍 Device ${deviceId} location from Firestore:`, lat, lng)
        
        if (!isNaN(lat) && !isNaN(lng)) {
          // Listen to real-time status from RTDB
          const rtdbRef = dbRef(rtdb, `devices/${deviceId}`)
          onValue(rtdbRef, (rtdbSnapshot) => {
            const liveData = rtdbSnapshot.val()
            const isOnline = liveData ? checkDeviceOnline(liveData) : false
            const status = liveData ? determineStatus(liveData, isOnline) : 'Offline'
            
            addDeviceMarker(deviceId, lat, lng, deviceData.name || deviceId, status)
            
            // Update devices array for the panel
            const existingIndex = devices.value.findIndex(d => d.deviceId === deviceId)
            const deviceInfo = {
              deviceId: deviceId,
              name: deviceData.name || deviceId,
              lat: lat,
              lng: lng,
              status: status
            }
            
            console.log('📝 Device info object:', JSON.stringify(deviceInfo))
            
            if (existingIndex !== -1) {
              devices.value[existingIndex] = deviceInfo
            } else {
              devices.value.push(deviceInfo)
            }
            
            console.log('✅ Added device marker from Firestore:', deviceId)
            console.log('📋 Current devices array:', JSON.stringify(devices.value))
            
            // Clean up any JSON that might leak into DOM
            setTimeout(() => scrubDebugJSON(), 100)
          })
        }
      } 
      // FALLBACK: Check RTDB for Lat/Lon (old ESP32-based location - deprecated)
      else {
        const rtdbRef = dbRef(rtdb, `devices/${deviceId}`)
        onValue(rtdbRef, (rtdbSnapshot) => {
          const liveData = rtdbSnapshot.val()
          
          if (liveData && liveData.Lat && liveData.Lon) {
            const lat = parseFloat(liveData.Lat)
            const lng = parseFloat(liveData.Lon)
            
            console.log(`📍 Device ${deviceId} location from RTDB (legacy):`, lat, lng)
            
            if (!isNaN(lat) && !isNaN(lng)) {
              const isOnline = liveData ? checkDeviceOnline(liveData) : false
              const status = determineStatus(liveData, isOnline)
              addDeviceMarker(deviceId, lat, lng, deviceData.name || deviceId, status)
              
              // Update devices array for the panel
              const existingIndex = devices.value.findIndex(d => d.deviceId === deviceId)
              const deviceInfo = {
                deviceId,
                name: deviceData.name || deviceId,
                lat,
                lng,
                status
              }
              
              if (existingIndex !== -1) {
                devices.value[existingIndex] = deviceInfo
              } else {
                devices.value.push(deviceInfo)
              }
              
              console.log('✅ Added device marker from RTDB (legacy):', deviceId)
              
              // Clean up any JSON that might leak into DOM
              setTimeout(() => scrubDebugJSON(), 100)
            } else {
              console.warn('⚠️ Invalid coordinates from RTDB for', deviceId)
            }
          } else {
            console.warn('⚠️ No location data for device:', deviceId, '(Not set in Firestore or RTDB)')
          }
        })
      }
    })
  } catch (error) {
    console.error('❌ Error loading device markers:', error)
  }
}

function addDeviceMarker(deviceId, lat, lng, name, status) {
  if (!map) return

  // Remove existing marker for this device if any
  const existingIndex = deviceMarkers.value.findIndex(m => m.deviceId === deviceId)
  if (existingIndex !== -1) {
    deviceMarkers.value[existingIndex].marker.remove()
    deviceMarkers.value.splice(existingIndex, 1)
  }

  // Determine marker color based on status
  const color = status === 'Alert' ? '#dc2626' : (status === 'Offline' ? '#9ca3af' : '#10b981')
  const iconHtml = status === 'Alert' 
    ? '<div class="device-marker alert-marker">🔥</div>'
    : (status === 'Offline' 
      ? '<div class="device-marker offline-marker">📡</div>'
      : '<div class="device-marker safe-marker">📍</div>')

  const deviceIcon = L.divIcon({
    className: 'device-location-marker',
    html: iconHtml,
    iconSize: [30, 30]
  })

  const marker = L.marker([lat, lng], { icon: deviceIcon })
    .addTo(map)
    .bindPopup(`
      <div class="device-popup">
        <strong>${name}</strong><br>
        Status: <span style="color: ${color}; font-weight: bold;">${status}</span><br>
        <small>${lat.toFixed(6)}, ${lng.toFixed(6)}</small>
      </div>
    `)

  deviceMarkers.value.push({ deviceId, marker })
}

function initMap(lat, lng) {
  // Create map centered on user's location
  map = L.map('map', { zoomControl: true }).setView([lat, lng], 14)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)

  // Add marker for user's location
  const userIcon = L.divIcon({
    className: 'user-location-marker',
    html: '<div class="pulse-marker"></div>',
    iconSize: [20, 20]
  })

  userMarker.value = L.marker([lat, lng], { icon: userIcon })
    .addTo(map)
    .bindPopup('Your Location')

  // Load device markers after map is ready
  loadDeviceMarkers()
}

onMounted(async () => {
  // Wait for DOM to be fully ready
  await nextTick()
  
  // Verify map container exists
  const mapContainer = document.getElementById('map')
  if (!mapContainer) {
    console.error('❌ Map container #map not found in DOM')
    return
  }
  
  // Try to get user's current location
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success - use user's location
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        console.log('📍 User location:', lat, lng)
        initMap(lat, lng)
      },
      (error) => {
        // Error or denied - fallback to NCR
        console.warn('⚠️ Geolocation error, using NCR fallback:', error.message)
        initMap(14.5995, 120.9842)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    )
  } else {
    // Geolocation not supported - fallback to NCR
    console.warn('⚠️ Geolocation not supported, using NCR fallback')
    initMap(14.5995, 120.9842)
  }
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
  
  // Clean up device markers
  deviceMarkers.value.forEach(m => {
    if (m.marker) m.marker.remove()
  })
  deviceMarkers.value = []
  devices.value = []
})

// Defensive: remove any accidental JSON blobs rendered by extensions/old cache
function scrubDebugJSON() {
  try {
    const root = document.querySelector('.device-panel')
    if (!root) return
    const suspiciousKeys = ['"gasStatus"', '"lastSeen"', '"lastType"', '"sensorError"', '"deviceId"']
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
    const toHide = new Set()
    let n
    while ((n = walker.nextNode())) {
      const t = n.textContent?.trim()
      if (!t || t.length < 10) continue
      if (t.startsWith('{') && t.endsWith('}') && suspiciousKeys.some(k => t.includes(k))) {
        if (n.parentElement) toHide.add(n.parentElement)
      }
    }
    toHide.forEach(el => {
      el.style.display = 'none'
    })
  } catch (_) {
    /* no-op */
  }
}
</script>

<style scoped>
.map-container { display: flex; flex-direction: column; height: 100vh; }
.map-header { height: 48px; display:flex; align-items:center; padding:8px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.05); z-index: 2000 }
.close-btn { background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer }
#map { flex:1; height: calc(100vh - 48px); width:100% }
</style>

<style>
/* User location marker styles (global for Leaflet) */
.user-location-marker {
  background: transparent;
  border: none;
}

.pulse-marker {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  border: 3px solid white;
  box-shadow: 0 0 0 rgba(59, 130, 246, 0.4);
  animation: pulse 2s infinite;
  position: relative;
}

/* Device location markers */
.device-location-marker {
  background: transparent;
  border: none;
}

.device-marker {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.alert-marker {
  animation: bounce 1s infinite;
}

.offline-marker {
  opacity: 0.6;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2)) grayscale(0.3);
}

.device-popup {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-width: 150px;
}

.device-popup strong {
  font-size: 14px;
  color: #111827;
}

.device-popup small {
  color: #6b7280;
  font-size: 11px;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.device-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 2px solid #e5e7eb;
  padding: 12px 16px;
  max-height: 180px;
  overflow-y: auto;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.device-panel h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.device-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.device-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: #10b981;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 6px;
}

.device-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.device-btn:active {
  transform: translateY(0);
}

.device-btn.alert {
  background: #dc2626;
  animation: pulse-alert 2s infinite;
}

.device-btn.offline {
  background: #9ca3af;
  opacity: 0.8;
}

.device-icon {
  font-size: 16px;
  line-height: 1;
}

.device-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.device-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
}

.device-status {
  font-size: 11px;
  opacity: 0.9;
  line-height: 1;
}

@keyframes pulse-alert {
  0%, 100% {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  50% {
    box-shadow: 0 2px 12px rgba(220, 38, 38, 0.5);
  }
}
</style>
