# Backend-Driven Online/Offline Status Implementation

## Overview
This update adds backend-driven online/offline status tracking to prevent the app from showing "Safe" when a device is actually offline after a page refresh. The status is now managed by Firebase Cloud Functions and stored in RTDB, ensuring consistent status across all users.

## Changes Made

### 1. Backend (Firebase Cloud Functions)
**File**: `functions/index.js`

Added three new Cloud Functions:

#### a) `updateDeviceOnlineStatus` (Scheduled Function)
- Runs **every 1 minute** via Cloud Scheduler
- Checks all devices in RTDB for their `lastSeen` timestamp
- Marks device as offline if no data received for **2 minutes**
- Updates `isOnline` and `lastChecked` fields in RTDB

#### b) `markDeviceOnline` (Trigger Function)
- Triggers on any device data update in RTDB
- Immediately marks device as online when it sends new data
- Prevents false offline status when device is actively sending data

#### Configuration
```javascript
const OFFLINE_THRESHOLD = 2 * 60 * 1000; // 2 minutes
```

**RTDB Structure Update**:
```json
{
  "devices": {
    "DEVICE_ID_HERE": {
      "isOnline": true,          // NEW: Backend-managed online status
      "lastSeen": 1700000000000, // Timestamp of last data
      "lastChecked": 1700000000000, // NEW: Last time status was checked
      "temperature": 25,
      "smokeLevel": 100,
      // ... other sensor data
    }
  }
}
```

### 2. Frontend (Device Controller Service)
**File**: `src/services/deviceController.js`

#### Updated Functions:
- `determineStatus(data, isOnline)` - Now accepts `isOnline` parameter, prioritizes offline status
- `determineStatusFromButton(data, buttonEvent, isOnline)` - Same, checks offline first
- `start()` - Reads `isOnline` field from RTDB and passes to status functions

**Status Priority Order**:
1. **Offline** (from backend `isOnline: false`)
2. Alert conditions (fire, smoke, gas, sensor error)
3. Safe

### 3. Frontend (Device Detail View)
**File**: `src/views/DeviceDetail.vue`

#### UI Updates:
- Added **WifiOff icon** from lucide-vue-next for offline status
- Added `.offline-circle` CSS class (gray gradient)
- Added `.offline-label` CSS class
- Status circle shows offline icon when `latest.status === 'Offline'`
- Status label displays "Device Offline"

#### Status Display:
```vue
<div class="status-circle" :class="{ 'offline-circle': latest.status === 'Offline' }">
  <WifiOff v-if="latest.status === 'Offline'" class="status-bell-icon" />
</div>
<div class="status-label" :class="{ 'offline-label': latest.status === 'Offline' }">
  <span v-if="latest.status === 'Offline'">Device Offline</span>
</div>
```

### 4. Frontend (Home View)
**File**: `src/views/HomeView.vue`

#### Updated:
- `determineStatus()` - Checks `data.isOnline === false` first
- Added `.device-status-badge.offline` CSS (gray background)
- Badge automatically applies correct styling via existing `getStatusClass()` function

### 5. Frontend (Map View)
**File**: `src/components/showMap.vue`

#### Updates:
- `determineStatus(data, isOnline)` - Prioritizes offline status
- Device markers show **📡 icon** for offline devices
- Markers styled with reduced opacity and grayscale filter
- Device panel buttons show gray background for offline devices
- Map popup displays "Offline" status in gray color

## Deployment Instructions

### Step 1: Deploy Firebase Functions
```bash
# Navigate to project root
cd c:\Users\aezra\projects\firetap

# Deploy only the new functions
firebase deploy --only functions:updateDeviceOnlineStatus,functions:markDeviceOnline

# Or deploy all functions
firebase deploy --only functions
```

### Step 2: Enable Cloud Scheduler
The `updateDeviceOnlineStatus` function requires Cloud Scheduler (uses Pub/Sub):

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project `firetap-f2bcd`
3. Navigate to **Cloud Scheduler**
4. Enable the Cloud Scheduler API if prompted
5. Verify the scheduled job appears (created automatically by Firebase)

**Note**: Cloud Scheduler is **free** for up to 3 jobs per billing account.

### Step 3: Update RTDB Security Rules (Optional)
Ensure devices can write `lastSeen` but only backend can write `isOnline`:

```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        ".read": true,
        ".write": "auth != null",
        "isOnline": {
          ".write": false  // Only Cloud Functions can update this
        },
        "lastChecked": {
          ".write": false  // Only Cloud Functions can update this
        }
      }
    }
  }
}
```

Update rules:
```bash
firebase deploy --only database
```

### Step 4: Build and Deploy Frontend
```bash
# Install dependencies (if needed)
npm install

# Build production bundle
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## Testing the Implementation

### 1. Test Offline Detection
1. Open the app in browser
2. Navigate to device detail page
3. Note the device showing "Safe" status
4. Stop the ESP32 device (unplug or disable WiFi)
5. **Wait 2 minutes** (offline threshold)
6. **Refresh the page**
7. Device should now show **"Offline"** with gray circle and WiFi icon

### 2. Test Online Transition
1. With device offline, start the ESP32 device
2. Device sends data to RTDB
3. `markDeviceOnline` function triggers immediately
4. Frontend updates to "Safe" or "Alert" based on sensor readings

### 3. Test Map View
1. Go to map view
2. Offline devices show **📡 icon** with gray styling
3. Device panel shows offline devices with gray background

### 4. Monitor Cloud Function Logs
```bash
# View real-time logs
firebase functions:log --only updateDeviceOnlineStatus

# Or use Firebase Console
# https://console.firebase.google.com/project/firetap-f2bcd/functions/logs
```

## Configuration Tuning

### Adjust Offline Threshold
Edit `functions/index.js`:
```javascript
// Change from 2 minutes to desired duration
const OFFLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
```

### Adjust Check Frequency
Edit the schedule in `functions/index.js`:
```javascript
// Change from every 1 minute to desired interval
exports.updateDeviceOnlineStatus = functions.pubsub
  .schedule('every 5 minutes')  // Options: '5 minutes', '10 minutes', etc.
  .onRun(async (context) => {
```

**Note**: More frequent checks = higher Cloud Function costs (but minimal at this scale)

## Cost Implications

### Cloud Functions
- **Invocations**: 1,440 per day (every minute) + device update triggers
- **Free Tier**: 2M invocations/month
- **Expected Cost**: $0.00/month (well within free tier)

### Cloud Scheduler
- **Jobs**: 1 job
- **Free Tier**: 3 jobs per billing account
- **Expected Cost**: $0.00/month

### Realtime Database
- No additional cost (only updating existing device records)

## Troubleshooting

### Issue: Devices always show offline
**Solution**: Check if Cloud Scheduler is enabled and function is running
```bash
firebase functions:log --only updateDeviceOnlineStatus
```

### Issue: Devices take too long to show offline
**Solution**: Reduce offline threshold or check frequency in `functions/index.js`

### Issue: Function deployment fails
**Solution**: Ensure Firebase CLI is up to date
```bash
npm install -g firebase-tools
firebase login
```

### Issue: Status not updating in frontend
**Solution**: 
1. Clear browser cache and hard refresh (Ctrl+Shift+R)
2. Check RTDB console to verify `isOnline` field exists
3. Check browser console for errors

## Rollback Instructions

If issues occur, revert the changes:

### Revert Functions
```bash
# Delete the new functions
firebase functions:delete updateDeviceOnlineStatus
firebase functions:delete markDeviceOnline
```

### Revert Frontend
```bash
git revert HEAD  # Revert last commit
npm run build
firebase deploy --only hosting
```

## Future Enhancements

1. **Notification on Offline**: Send push notification when device goes offline
2. **Offline History**: Track how long devices have been offline
3. **Custom Thresholds**: Allow per-device offline thresholds
4. **Automatic Recovery**: Test device connectivity and send alerts
5. **Dashboard Analytics**: Show device uptime statistics

## References

- [Firebase Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Cloud Scheduler Docs](https://cloud.google.com/scheduler/docs)
- [Firebase Realtime Database Docs](https://firebase.google.com/docs/database)
