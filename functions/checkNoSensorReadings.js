const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Cloud Function: Set status.noSensorReadings if no recent sensor data
exports.checkNoSensorReadings = functions.database
  .ref('/devices/{deviceId}/status/lastEventAt')
  .onWrite(async (change, context) => {
    const deviceId = context.params.deviceId;
    const statusRef = admin.database().ref(`/devices/${deviceId}/status`);
    const dhtRef = admin.database().ref(`/devices/${deviceId}/dht/timestamp`);
    const mq2Ref = admin.database().ref(`/devices/${deviceId}/mq2/timestamp`);
    const now = Date.now();
    const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000;

    // Get latest sensor timestamps
    const [dhtTsSnap, mq2TsSnap] = await Promise.all([
      dhtRef.once('value'),
      mq2Ref.once('value')
    ]);
    const dhtTs = dhtTsSnap.val() || 0;
    const mq2Ts = mq2TsSnap.val() || 0;
    const latestSensorTs = Math.max(dhtTs, mq2Ts);

    // If no recent sensor data, set flag
    const noSensorReadings = !latestSensorTs || (now - latestSensorTs) > OFFLINE_THRESHOLD_MS;
    await statusRef.update({ noSensorReadings });
    return null;
  });
