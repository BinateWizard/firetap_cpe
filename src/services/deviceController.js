import { ref, onUnmounted } from 'vue';
import { ref as dbRef, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { rtdb } from '@/firebase';
import { stopAllAlerts } from '@/services/alertMonitor';

function determineStatus(data) {
  if (!data || typeof data !== 'object') return 'Safe';
  const toStr = v => String(v || '').toLowerCase();
  if (data.sensorError === true) return 'Alert';
  if (data.message === 'help requested' || data.message === 'alarm has been triggered') return 'Alert';
  if (data.lastType === 'alarm') return 'Alert';
  const gas = toStr(data.gasStatus);
  if (['critical','detected'].includes(gas)) return 'Alert';
  // Smoke status: rely on digital flags (smokeDetected / mq2_do.smokeDetected)
  const smokeDetectedFlag =
    data.smokeDetected === true ||
    (data.mq2_do && data.mq2_do.smokeDetected === true);
  if (smokeDetectedFlag) return 'Alert';
  return 'Safe';
}

function determineStatusFromButton(data, buttonEvent) {
  if (buttonEvent === 'STATE_ALERT') return 'Alert';
  if (buttonEvent === 'STATE_SPRINKLER') return 'Safe';
  return determineStatus(data);
}

export function useDeviceController(deviceIdRef) {
  const latest = ref(null);
  const history = ref([]);
  const statusCards = ref([]);
  const loading = ref(true);
  const noData = ref(false);
  const lastUpdated = ref(null);
  let mainUnsub = null;
  let statusUnsub = null;

  function start() {
    const deviceId = deviceIdRef.value;
    loading.value = true;
    noData.value = false;

    const deviceDataRef = dbRef(rtdb, `devices/${deviceId}`);
    mainUnsub = onValue(deviceDataRef, snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const sensorErrorFlag = (data.sensorError === true);
        const sprinklerActiveFlag = (data.sprinklerActive === true);
        const buttonStatus = data.status || {};
        const buttonState = buttonStatus.state || 'idle';
        let buttonEventState = 'STATE_IDLE';
        if (buttonState === 'alert') buttonEventState = 'STATE_ALERT';
        else if (buttonState === 'sprinkler') buttonEventState = 'STATE_SPRINKLER';

        let buttonMessage = '';
        if (buttonEventState === 'STATE_ALERT') buttonMessage = 'alert triggered';
        else if (buttonEventState === 'STATE_SPRINKLER') buttonMessage = 'sprinkler activated';

        const dhtNode = data.dht || {};
        const mq2DoNode = data.mq2_do || {};
        let currentTemp = data.temperature;
        let currentHumidity = data.humidity;
        if (currentTemp === undefined && dhtNode.temperature !== undefined) currentTemp = dhtNode.temperature;
        if (currentHumidity === undefined && dhtNode.humidity !== undefined) currentHumidity = dhtNode.humidity;

        // Normalize smoke reading and detection flags for different schemas (legacy vs DEVICE_010)
        const rawSmokeAnalog =
          data.smokeLevel ||
          data.smoke ||
          data.smokeAnalog ||
          data.mq2 ||
          0;
        const smokeDetected =
          data.smokeDetected === true ||
          mq2DoNode.smokeDetected === true;

        const currentData = {
          id: Date.now(),
          dateTime: buttonStatus.lastEventAt
            ? new Date(buttonStatus.lastEventAt)
            : (data.lastSeen
              ? new Date(data.lastSeen)
              : (dhtNode.timestamp
                ? new Date(dhtNode.timestamp)
                : (mq2DoNode.timestamp
                  ? new Date(mq2DoNode.timestamp)
                  : (data.timestamp ? new Date(data.timestamp) : new Date())))),
          smokeAnalog: rawSmokeAnalog,
          gasStatus: data.gasStatus || 'normal',
          temperature: currentTemp,
          humidity: currentHumidity,
          message: buttonMessage || data.message || (sensorErrorFlag ? 'Sensor Error' : ''),
          sensorError: sensorErrorFlag,
          sprinklerActive: sprinklerActiveFlag || buttonEventState === 'STATE_SPRINKLER',
          buttonEvent: buttonEventState,
          buttonState,
          lastType: data.lastType,
          smokeDetected,
          status: determineStatusFromButton(data, buttonEventState)
        };

        latest.value = currentData;
        loading.value = false;
        noData.value = false;
        lastUpdated.value = new Date();

        // Build history for charts
        if (data.readings && typeof data.readings === 'object') {
          const arr = Object.entries(data.readings).map(([key, value]) => ({
            id: key,
            dateTime: value.lastSeen ? new Date(value.lastSeen) : (value.timestamp ? new Date(value.timestamp) : new Date()),
            smokeAnalog: value.smokeLevel || value.smoke || value.smokeAnalog || value.mq2 || 0,
            gasStatus: value.gasStatus || 'normal',
            temperature: value.temperature,
            humidity: value.humidity,
            message: value.message || (value.sensorError === true ? 'Sensor Error' : ''),
            sensorError: value.sensorError === true,
            status: determineStatus(value)
          })).sort((a,b) => b.dateTime - a.dateTime).slice(0,200);
          history.value = arr;
        } else {
          history.value = currentData ? [currentData] : [];
        }
      } else {
        loading.value = false;
        noData.value = true;
        latest.value = null;
        history.value = [];
      }
    }, err => {
      console.error('Device listener error', err);
      loading.value = false;
      noData.value = true;
    });

    // Status history listener
    const statusHistoryRef = query(
      dbRef(rtdb, `devices/${deviceId}/statusHistory`),
      orderByChild('timestamp'),
      limitToLast(5)
    );
    statusUnsub = onValue(statusHistoryRef, snap => {
      if (!snap.exists()) {
        statusCards.value = [];
        return;
      }
      const obj = snap.val() || {};
      const arr = Object.entries(obj).map(([id,v]) => ({
        id,
        dateTime: v.timestamp ? new Date(v.timestamp) : new Date(),
        smokeAnalog: v.smokeLevel !== undefined ? v.smokeLevel : 0,
        gasStatus: v.gasStatus || 'normal',
        temperature: v.temperature,
        humidity: v.humidity,
        message: v.message || 'Alert',
        sensorError: false,
        lastType: 'alarm',
        status: 'Alert'
      })).sort((a,b) => b.dateTime - a.dateTime);
      statusCards.value = arr;
    });
  }

  function stop() {
    if (mainUnsub) { mainUnsub(); mainUnsub = null; }
    if (statusUnsub) { statusUnsub(); statusUnsub = null; }
    stopAllAlerts(); // ensure cleanup if leaving page
  }

  onUnmounted(() => stop());

  return { latest, history, statusCards, loading, noData, lastUpdated, start, stop };
}
