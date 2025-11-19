<template>
  <div class="app-container">
    <!-- Fixed Top Navigation -->
    <div class="top-nav">
      <button @click="toggleMenu" class="nav-btn" aria-label="Menu">
        <Menu class="nav-icon" />
      </button>
      <h1 class="app-title">SmartFireX</h1>
      <div class="nav-spacer"></div>
      <button @click="goToNotifications" class="nav-btn" aria-label="Notifications">
        <Bell class="nav-icon" />
      </button>
      <button @click="goToLocation" class="nav-btn" aria-label="Location">
        <MapPin class="nav-icon" />
      </button>
    </div>

    <!-- Side Drawer Menu -->
    <transition name="drawer">
      <div v-if="menuOpen" class="drawer-overlay" @click="toggleMenu">
        <div class="drawer" @click.stop>
          <div class="drawer-header">
            <h2>Menu</h2>
            <button @click="toggleMenu" class="close-btn" aria-label="Close">
              <X class="nav-icon" />
            </button>
          </div>
          <nav class="drawer-nav">
            <a @click="navigateTo('/')" class="drawer-link">
              <Flame class="drawer-icon" /> Devices
            </a>
            <a @click="navigateTo('/notifications')" class="drawer-link">
              <Bell class="drawer-icon" /> Notifications
            </a>
            <a @click="navigateTo('/map')" class="drawer-link">
              <MapPin class="drawer-icon" /> Location
            </a>
            <a @click="navigateTo('/about')" class="drawer-link">
              <Info class="drawer-icon" /> About
            </a>
            <a @click="navigateTo('/settings')" class="drawer-link">
              <Settings class="drawer-icon" /> Settings
            </a>
          </nav>
          
          <!-- Account Footer -->
          <div class="drawer-footer">
            <button @click="showAccountModal = true" class="account-btn">
              <div class="account-avatar">
                <User class="avatar-icon" />
              </div>
              <div class="account-info">
                <div class="account-email">{{ userEmail }}</div>
                <div class="account-status">View Account</div>
              </div>
            </button>
            <button @click="handleSignOut" class="signout-btn" title="Sign Out">
              <LogOut class="signout-icon" />
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Account Modal -->
    <transition name="modal">
      <div v-if="showAccountModal" class="modal-overlay" @click="showAccountModal = false">
        <div class="modal account-modal" @click.stop>
          <div class="modal-header">
            <h2>Account Details</h2>
            <button @click="showAccountModal = false" class="modal-close">×</button>
          </div>
          
          <div class="modal-body">
            <!-- User Info Section -->
            <section class="account-section">
              <h3>User Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Email:</span>
                  <span class="info-value">{{ userEmail }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">User ID:</span>
                  <span class="info-value">{{ userId }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Account Created:</span>
                  <span class="info-value">{{ accountCreated }}</span>
                </div>
              </div>
            </section>

            <!-- BFP Response Stats -->
            <section class="account-section stats-section">
              <h3>BFP Response Statistics</h3>
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-icon">🔥</div>
                  <div class="stat-value">{{ totalIncidents }}</div>
                  <div class="stat-label">Total Incidents</div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">✅</div>
                  <div class="stat-value">{{ responsesMade }}</div>
                  <div class="stat-label">Responses Made</div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">⏱️</div>
                  <div class="stat-value">{{ avgResponseTime }}</div>
                  <div class="stat-label">Avg Response Time</div>
                </div>
              </div>
              
              <button @click="printReport" class="print-btn">
                <Printer class="btn-icon" />
                Print Incident Report
              </button>
            </section>

            <!-- Danger Zone -->
            <section class="account-section danger-section">
              <h3>Danger Zone</h3>
              <div class="danger-content">
                <p>Request your account to be permanently deleted. This action cannot be undone.</p>
                <button @click="requestAccountDeletion" class="danger-btn">
                  <AlertTriangle class="btn-icon" />
                  Request Account Deletion
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </transition>

    <!-- Add Device Modal -->
    <transition name="modal">
      <div v-if="showAddModal" class="modal-overlay" @click="showAddModal = false">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h2>Add New Device</h2>
            <button @click="showAddModal = false" class="modal-close-btn">
              <X class="icon" />
            </button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="handleAddDevice">
              <div class="form-group">
                <div class="label-with-help">
                  <label for="deviceId">Device ID *</label>
                  <button 
                    type="button" 
                    @click="showDeviceIdHelp = !showDeviceIdHelp" 
                    class="help-btn"
                    title="How to get Device ID?"
                  >
                    <HelpCircle class="help-icon" />
                  </button>
                </div>
                
                <!-- Collapsible Help Section -->
                <transition name="slide">
                  <div v-if="showDeviceIdHelp" class="help-section">
                    <p class="help-title">How to get Device ID?</p>
                    <p class="help-text">Each fire alarm device has a unique identifier. You can find it:</p>
                    <ul class="help-list">
                      <li>On the device label or QR code</li>
                      <li>In the device setup documentation</li>
                      <li>From your system administrator</li>
                    </ul>
                  </div>
                </transition>
                
                <input 
                  type="text" 
                  id="deviceId" 
                  v-model="formData.deviceId" 
                  placeholder="e.g., DEVICE_001"
                  required
                />
                <small>Enter the unique device identifier</small>
              </div>

              <div class="form-group">
                <label for="deviceName">Device Name *</label>
                <input 
                  type="text" 
                  id="deviceName" 
                  v-model="formData.name" 
                  placeholder="e.g., Public Market Device"
                  required
                />
              </div>

              <div class="form-group">
                <label for="location">Location</label>
                <button 
                  type="button"
                  class="location-btn"
                  @click="() => { console.log('🗺️ Opening location picker'); showLocationPicker = true; }"
                >
                  <MapPin class="location-icon" />
                  {{ formData.coordinates ? `${formData.coordinates.lat.toFixed(6)}, ${formData.coordinates.lng.toFixed(6)}` : 'Click to set location on map' }}
                </button>
                <small v-if="formData.coordinates">Coordinates: {{ formData.coordinates.lat.toFixed(6) }}, {{ formData.coordinates.lng.toFixed(6) }}</small>
              </div>

              <div class="form-group">
                <label for="description">Description</label>
                <textarea 
                  id="description" 
                  v-model="formData.description" 
                  placeholder="Optional notes about this device"
                  rows="2"
                ></textarea>
              </div>

              <div v-if="addError" class="error-message">
                {{ addError }}
              </div>

              <div v-if="addSuccess" class="success-message">
                Device added successfully!
              </div>

              <div class="modal-actions">
                <button type="button" @click="showAddModal = false" class="btn-secondary">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" :disabled="isSubmitting">
                  {{ isSubmitting ? 'Adding...' : 'Add Device' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </transition>

    <!-- Error Modal -->
    <transition name="modal">
      <div v-if="showErrorModal" class="modal-overlay" @click="showErrorModal = false">
        <div class="error-modal-content" @click.stop>
          <div class="modal-icon">⚠️</div>
          <h3 class="modal-title">Device Not Found</h3>
          <p class="modal-message">{{ errorModalMessage }}</p>
          <button @click="showErrorModal = false" class="modal-btn">OK</button>
        </div>
      </div>
    </transition>

    <InactivityModal
      v-model:show="showInactivityModal"
      device-id="All devices"
      @closed="handleInactivityClosed"
    />

    <!-- Location Picker Modal -->
    <LocationPicker 
      v-if="showLocationPicker"
      @close="showLocationPicker = false"
      @confirm="handleLocationConfirm"
    />

    <!-- Main Content -->
    <div class="main-content">
      <!-- Stats Overview -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ devices.length }}</div>
          <div class="stat-label">Total Devices</div>
        </div>
        <div class="stat-card safe">
          <div class="stat-value">{{ safeDevicesCount }}</div>
          <div class="stat-label">Safe</div>
        </div>
        <div class="stat-card alert">
          <div class="stat-value">{{ alertDevicesCount }}</div>
          <div class="stat-label">Alerts</div>
        </div>
      </div>

      <!-- Add Device Button -->
      <div class="button-row">
        <button @click="showAddModal = true" class="add-device-btn">
          <Plus class="icon" />
          Add New Device
        </button>
        <button @click="$router.push('/debug')" class="debug-btn" title="Test Device Connection">
          🔧
        </button>
      </div>

      <!-- Device List -->
      <div class="devices-section">
        <h2 class="section-title">Fire Safety Devices</h2>
        
        <div v-if="loading" class="loading">Loading devices...</div>
        
        <div v-else-if="devices.length === 0" class="empty-state">
          <Inbox class="empty-icon" />
          <p>No devices registered yet</p>
          <button @click="showAddModal = true" class="btn-primary-small">
            Add Your First Device
          </button>
        </div>

        <div v-else class="device-list">
          <div 
            v-for="device in devices" 
            :key="device.id" 
            class="device-card"
            @click="$router.push(`/device/${device.deviceId}`)"
          >
            <div class="device-icon" :class="getStatusClass(device.status)">
              <!-- Show different icons based on status and button state -->
              <Flame v-if="device.status === 'Alert'" class="icon" />
              <Droplets v-else-if="device.status === 'Sprinkler'" class="icon" />
              <Check v-else-if="device.status === 'Safe'" class="icon" />
              <Bell v-else class="icon" />
            </div>
            <div class="device-info">
              <div class="device-name">{{ device.name || device.deviceId }}</div>
              <div class="device-location" v-if="device.location">
                <MapPin class="loc-icon" />
                {{ device.location }}
              </div>
              <div class="device-status">
                Last update: {{ formatRelativeTime(device.updatedAt) }}
              </div>
            </div>
            <div class="device-status-badge" :class="getStatusClass(device.status)">
              {{ device.status || 'Safe' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import { collection, query, getDocs, where, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { ref as dbRef, onValue, get } from "firebase/database";
import { db, rtdb, auth } from "@/firebase";
import { Bell, MapPin, Plus, Inbox, Menu, X, Settings, HelpCircle, Info, Flame, User, LogOut, Printer, AlertTriangle, Droplets, Check } from 'lucide-vue-next';
import LocationPicker from '@/components/LocationPicker.vue';
import InactivityModal from '@/components/InactivityModal.vue';

const router = useRouter();

const devices = ref([]);
const loading = ref(true);
const menuOpen = ref(false);
const showAddModal = ref(false);
const showDeviceIdHelp = ref(false);
const showAccountModal = ref(false);
const showLocationPicker = ref(false);
const showInactivityModal = ref(false);

let inactivityTimeoutId = null;

// User account info
const userEmail = computed(() => auth.currentUser?.email || 'Unknown');
const userId = computed(() => auth.currentUser?.uid || '');
const accountCreated = computed(() => {
  const createdAt = auth.currentUser?.metadata?.creationTime;
  return createdAt ? new Date(createdAt).toLocaleDateString() : 'Unknown';
});

// Mock BFP response statistics (replace with actual data from Firestore later)
const totalIncidents = ref(0);
const responsesMade = ref(0);
const avgResponseTime = ref('--');

function calculateResponseStats() {
  // Count total alert incidents from devices
  let incidents = 0;
  devices.value.forEach(device => {
    if (device.status === 'Alert') {
      incidents++;
    }
  });
  
  // Mock data for now
  totalIncidents.value = incidents;
  responsesMade.value = Math.floor(incidents * 0.8); // 80% response rate mock
  avgResponseTime.value = incidents > 0 ? '8 min' : '--';
}

function handleLocationConfirm(location) {
  console.log('📍 Location confirmed:', location);
  formData.value.coordinates = location;
  // Set text location to coordinates
  formData.value.location = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
  console.log('✅ Form data updated with coordinates');
}

// Add device form state
const formData = ref({
  deviceId: '',
  name: '',
  location: '',
  description: '',
  coordinates: null  // { lat, lng, address }
});
const isSubmitting = ref(false);
const addError = ref('');
const addSuccess = ref(false);
const showErrorModal = ref(false);
const errorModalMessage = ref('');

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function navigateTo(path) {
  menuOpen.value = false;
  router.push(path);
}

function handleSignOut() {
  if (confirm('Are you sure you want to sign out?')) {
    auth.signOut().then(() => {
      router.push('/login');
    });
  }
}

function printReport() {
  alert('📄 Printing Incident Report (Mock)\n\n' +
    `Total Incidents: ${totalIncidents.value}\n` +
    `Responses Made: ${responsesMade.value}\n` +
    `Average Response Time: ${avgResponseTime.value}\n\n` +
    'This will generate a detailed PDF report in the production version.');
}

function requestAccountDeletion() {
  const confirmation = prompt(
    'Are you sure you want to request account deletion?\n\n' +
    'Type "DELETE" to confirm this irreversible action:'
  );
  
  if (confirmation === 'DELETE') {
    alert('🚨 Account deletion request submitted.\n\n' +
      'Your request has been sent to the administrator. ' +
      'You will receive an email confirmation within 24-48 hours.\n\n' +
      '(This is a mock - implement actual deletion workflow in production)');
    showAccountModal.value = false;
  }
}

function goToNotifications() {
  router.push('/notifications');
}

function goToLocation() {
  router.push('/map');
}

function getStatusClass(status) {
  const statusStr = String(status || 'safe');
  return statusStr.toLowerCase();
}

const safeDevicesCount = computed(() => 
  devices.value.filter(d => d.status === 'Safe').length
);

const alertDevicesCount = computed(() => 
  devices.value.filter(d => d.status === 'Alert').length
);

async function fetchDevices() {
  loading.value = true;
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('❌ No current user');
      loading.value = false;
      return;
    }

    console.log('🔍 Fetching devices for user:', currentUser.uid);

    // Get device list from Firestore - only devices added by this user
    const q = query(
      collection(db, "devices"),
      where("addedBy", "==", currentUser.uid)
    );
    const snapshot = await getDocs(q);
    
    console.log('📦 Firestore query returned:', snapshot.docs.length, 'documents');
    
    const deviceList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      status: 'Loading...', // Will be updated from Realtime DB
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt); // Sort in memory instead of Firestore

    devices.value = deviceList;
    console.log('✅ Devices loaded:', deviceList.length, deviceList);

    // Fetch live status from Realtime Database for each device
    deviceList.forEach(device => {
      const deviceDataRef = dbRef(rtdb, `devices/${device.deviceId}`);
      onValue(deviceDataRef, (snapshot) => {
        // Any live snapshot means we are still receiving data; reset inactivity timer
        showInactivityModal.value = false;
        if (inactivityTimeoutId) {
          clearTimeout(inactivityTimeoutId);
        }
        inactivityTimeoutId = setTimeout(() => {
          showInactivityModal.value = true;
        }, 10000);

        if (snapshot.exists()) {
          const data = snapshot.val();
          const deviceIndex = devices.value.findIndex(d => d.id === device.id);
          if (deviceIndex !== -1) {
            // Extract button state from RTDB structure
            const buttonState = data.status?.state || 'idle';
            
            // Extract status as a clean string
            devices.value[deviceIndex].status = determineStatus(data);
            devices.value[deviceIndex].buttonState = buttonState; // Store button state
            // Use lastSeen or timestamp for update time
            const timestamp = data.lastSeen || data.timestamp || data.status?.lastEventAt;
            devices.value[deviceIndex].updatedAt = timestamp ? new Date(timestamp) : new Date();
            // Store gas status for display
            devices.value[deviceIndex].gasStatus = data.gasStatus || 'normal';
            devices.value[deviceIndex].lastType = data.lastType || 'normal';
          }
        } else {
          // Device not sending data yet
          const deviceIndex = devices.value.findIndex(d => d.id === device.id);
          if (deviceIndex !== -1) {
            devices.value[deviceIndex].status = 'Offline';
          }
        }
      });
    });

    console.log("✅ Devices loaded:", devices.value.length);
    
    // Calculate response stats after loading devices
    calculateResponseStats();
  } catch (error) {
    console.error("❌ Error fetching devices:", error);
  } finally {
    loading.value = false;
  }
}

function determineStatus(data) {
  // Always return a string, never an object
  if (!data || typeof data !== 'object') return 'Safe';
  
  // Check button state from new RTDB structure (status.state)
  const buttonState = data.status?.state || 'idle';
  if (buttonState === 'alert') return 'Alert';
  if (buttonState === 'sprinkler') return 'Sprinkler';
  
  // Check for sensor error
  if (data.sensorError === true) return 'Alert';
  
  // Check lastType field
  if (data.lastType === 'alarm') return 'Alert';
  
  // Check for critical gas status - only if explicitly set to these values
  if (data.gasStatus && (data.gasStatus === 'critical' || data.gasStatus === 'detected')) return 'Alert';
  
  // Check messages
  if (data.message === 'help requested' || data.message === 'alarm has been triggered') {
    return 'Alert';
  }
  
  // Check smoke levels - only if value exists and is high
  if (data.smokeLevel !== undefined || data.smoke !== undefined || data.smokeAnalog !== undefined) {
    const smokeValue = data.smokeLevel || data.smoke || data.smokeAnalog || 0;
    if (typeof smokeValue === 'number' && smokeValue > 1500) return 'Alert';
  }
  
  // Fallback to normal
  return 'Safe';
}

function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

async function handleAddDevice() {
  addError.value = '';
  addSuccess.value = false;
  isSubmitting.value = true;

  try {
    const deviceId = formData.value.deviceId.trim();
    
    if (!deviceId) {
      addError.value = 'Device ID is required';
      isSubmitting.value = false;
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      addError.value = 'You must be logged in to add devices';
      isSubmitting.value = false;
      return;
    }

    // Check if THIS USER already added this device
    const userDeviceRef = doc(db, 'devices', `${currentUser.uid}_${deviceId}`);
    const docSnap = await getDoc(userDeviceRef);

    console.log('📝 Checking document ID:', `${currentUser.uid}_${deviceId}`);

    if (docSnap.exists()) {
      addError.value = 'You have already registered this device';
      isSubmitting.value = false;
      return;
    }

    // Verify device exists in Realtime Database (ESP32 is sending data)
    const rtdbDeviceRef = dbRef(rtdb, `devices/${deviceId}`);
    const rtdbSnapshot = await get(rtdbDeviceRef);
    
    if (!rtdbSnapshot.exists()) {
      errorModalMessage.value = `Device "${deviceId}" doesn't exist in active devices. Check if ESP32 is sending data.`;
      showErrorModal.value = true;
      isSubmitting.value = false;
      return;
    }

    console.log('✅ Device found in RTDB:', rtdbSnapshot.val());

    // Add device to Firestore with user-specific document ID
    console.log('💾 Saving to Firestore with composite ID:', `${currentUser.uid}_${deviceId}`);
    
    const deviceData = {
      deviceId: deviceId,
      name: formData.value.name.trim() || deviceId,
      location: formData.value.location.trim() || '',
      description: formData.value.description.trim() || '',
      status: 'Safe',
      addedBy: currentUser.uid,
      addedByEmail: currentUser.email || 'unknown',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Add coordinates if set via location picker
    if (formData.value.coordinates) {
      deviceData.coordinates = {
        lat: formData.value.coordinates.lat,
        lng: formData.value.coordinates.lng
      };
    }
    
    await setDoc(userDeviceRef, deviceData);

    console.log('✅ Device added successfully to Firestore!');
    addSuccess.value = true;

    // Reset form and close modal after 1 second
    setTimeout(() => {
      formData.value = {
        deviceId: '',
        name: '',
        location: '',
        description: '',
        coordinates: null
      };
      addSuccess.value = false;
      showAddModal.value = false;
      // Refresh devices list
      fetchDevices();
    }, 1000);

  } catch (err) {
    console.error('❌ Error adding device:', err);
    addError.value = 'Failed to add device. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(() => {
  fetchDevices(); // Real-time listeners are set up inside
});

onUnmounted(() => {
  if (inactivityTimeoutId) {
    clearTimeout(inactivityTimeoutId);
    inactivityTimeoutId = null;
  }
});

function handleInactivityClosed() {
  if (inactivityTimeoutId) {
    clearTimeout(inactivityTimeoutId);
  }
  inactivityTimeoutId = setTimeout(() => {
    showInactivityModal.value = true;
  }, 10000);
}
</script>

<style scoped>
.app-container {
  max-width: 400px;
  margin: 0 auto;
  background-color: #fffaf0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  position: relative;
}

/* Fixed Top Navigation */
.top-nav {
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

.app-title {
  font-size: 20px;
  font-weight: 700;
  color: white;
  margin: 0;
  margin-left: 8px;
}

.nav-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background 0.2s;
}

.nav-btn:active {
  background: rgba(255, 255, 255, 0.15);
}

.nav-icon {
  width: 24px;
  height: 24px;
}

.nav-spacer {
  flex: 1;
}

/* Drawer Menu */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
}

.drawer {
  width: 300px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  height: 100vh;
  max-height: 100vh;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

.drawer-header {
  background: #dc2626;
  color: white;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  display: flex;
}

.drawer-nav {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  flex: 1;
  overflow-y: auto;
}

.drawer-link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  color: #374151;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.drawer-link:hover {
  background: #f3f4f6;
}

.drawer-icon {
  width: 20px;
  height: 20px;
  color: #6b7280;
}

/* Drawer Footer */
.drawer-footer {
  margin-top: auto;
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  background: white;
}

.account-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 0;
}

.account-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.account-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-icon {
  width: 18px;
  height: 18px;
  color: white;
}

.account-info {
  flex: 1;
  text-align: left;
  overflow: hidden;
}

.account-email {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-status {
  font-size: 10px;
  color: #6b7280;
}

.signout-btn {
  width: 36px;
  height: 36px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.signout-btn:hover {
  background: #fef2f2;
  border-color: #dc2626;
}

.signout-icon {
  width: 16px;
  height: 16px;
  color: #dc2626;
}

/* Account Modal */
.account-modal {
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.account-modal .modal-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #dc2626;
  color: white;
  padding: 16px 20px;
  border-radius: 16px 16px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.account-modal .modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  line-height: 1;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  transition: background 0.2s;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.account-modal .modal-body {
  overflow-y: auto;
  flex: 1;
}

.account-section {
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.account-section:last-child {
  border-bottom: none;
}

.account-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.info-label {
  font-weight: 600;
  color: #6b7280;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  color: #111827;
  font-size: 14px;
  word-break: break-word;
  line-height: 1.5;
}

.stats-section {
  background: linear-gradient(to bottom, #ffffff, #fef2f2);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 8px;
  text-align: center;
}

.stat-icon {
  font-size: 28px;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 11px;
  color: #6b7280;
  line-height: 1.3;
}

.print-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.print-btn:hover {
  background: #2563eb;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.danger-section {
  background: #fef2f2;
}

.danger-content p {
  margin: 0 0 16px 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.6;
}

.danger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  color: #dc2626;
  border: 2px solid #dc2626;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.danger-btn:hover {
  background: #dc2626;
  color: white;
}

/* Drawer Animation */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s;
}

.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform 0.3s;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(-100%);
}

.main-content {
  padding: 84px 20px 24px 20px;
  flex: 1;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
}

.stat-card.safe {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.stat-card.alert {
  background: linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}

.button-row {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
}

.add-device-btn {
  flex: 1;
  padding: 14px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s;
}

.add-device-btn:hover {
  background: #b91c1c;
}

.add-device-btn .icon {
  width: 20px;
  height: 20px;
}

.debug-btn {
  width: 52px;
  height: 52px;
  padding: 0;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 24px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.debug-btn:hover {
  background: #4b5563;
}

.devices-section {
  margin-top: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #374151;
  margin: 0 0 16px 0;
}

.loading {
  text-align: center;
  padding: 40px 20px;
  color: #9ca3af;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: #d1d5db;
  margin: 0 auto 16px;
}

.empty-state p {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 20px 0;
}

.btn-primary-small {
  padding: 10px 20px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.device-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.device-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.device-icon.safe {
  background: #dcfce7;
}

.device-icon.alert {
  background: #fee2e2;
}

.device-icon .icon {
  width: 24px;
  height: 24px;
  color: #374151;
}

.device-info {
  flex: 1;
}

.device-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.device-location {
  font-size: 13px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}

.loc-icon {
  width: 12px;
  height: 12px;
}

.device-status {
  font-size: 12px;
  color: #9ca3af;
}

.device-status-badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.device-status-badge.safe {
  background: #dcfce7;
  color: #166534;
}

.device-status-badge.alert {
  background: #fee2e2;
  color: #991b1b;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
}

.modal-container {
  background: white;
  border-radius: 16px;
  max-width: 480px;
  width: 100%;
  max-height: 85vh;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  background: #dc2626;
  color: white;
  padding: 16px 20px;
  border-radius: 16px 16px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.modal-close-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  display: flex;
}

.modal-close-btn .icon {
  width: 22px;
  height: 22px;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 16px;
}

.label-with-help {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.help-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: #6b7280;
  transition: color 0.2s;
}

.help-btn:hover {
  color: #dc2626;
}

.help-icon {
  width: 18px;
  height: 18px;
}

.help-section {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.help-title {
  font-size: 13px;
  font-weight: 600;
  color: #0c4a6e;
  margin: 0 0 8px 0;
}

.help-text {
  font-size: 13px;
  color: #075985;
  margin: 0 0 8px 0;
}

.help-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #075985;
}

.help-list li {
  margin-bottom: 4px;
}

/* Slide transition for help section */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  max-height: 200px;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #dc2626;
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.1);
}

.form-group small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.location-btn {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
}

.location-btn:hover {
  border-color: #dc2626;
  background: #fef2f2;
}

.location-icon {
  width: 18px;
  height: 18px;
  color: #dc2626;
  flex-shrink: 0;
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-secondary {
  flex: 1;
  padding: 12px;
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-primary {
  flex: 1;
  padding: 12px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  padding: 12px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
}

.success-message {
  padding: 12px;
  background: #dcfce7;
  color: #166534;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
}

.info-section {
  margin-top: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.info-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.info-section p {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #6b7280;
}

.info-section ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #6b7280;
}

.info-section li {
  margin-bottom: 4px;
}

.error-modal-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.modal-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.modal-message {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.modal-btn {
  padding: 12px 32px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-btn:hover {
  background: #b91c1c;
}

/* Modal Animation */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s;
}

.modal-enter-active .modal-container,
.modal-enter-active .error-modal-content,
.modal-leave-active .modal-container,
.modal-leave-active .error-modal-content {
  transition: transform 0.3s, opacity 0.3s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-enter-from .error-modal-content,
.modal-leave-to .modal-container,
.modal-leave-to .error-modal-content {
  transform: scale(0.9);
  opacity: 0;
}
</style>
