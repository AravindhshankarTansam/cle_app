import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid, AppState } from 'react-native';

// Poll interval: check or simulate new missed calls every 5 seconds
const POLL_INTERVAL_MS = 5_000;

// How far back (ms) to look on the very first load to avoid flooding the server
const INITIAL_LOOKBACK_MS = 5 * 60 * 1000;

let CallLog;
try {
  const mod = require('react-native-call-log');
  CallLog = mod.default || mod;
} catch (_) {
  CallLog = null;
}

export default function useCallLogMonitor({ apiUrl, submittedBy, enabled = true }) {
  const [permissionGranted, setPermissionGranted] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [recentAutoLogs, setRecentAutoLogs] = useState([]); // auto-detected calls this session
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [simWorkers, setSimWorkers] = useState([]);

  const lastCheckedRef = useRef(Date.now() - INITIAL_LOOKBACK_MS);
  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const processedCallsRef = useRef(new Set());

  // We set isSupported to true, but set isSimulated to true if native CallLog is not available
  const isSimulated = !CallLog;
  const isSupported = true; // Always allow the widget to show status/activity

  // ── Fetch active workers for simulation mode ───────────────────────────────
  useEffect(() => {
    if (isSimulated && enabled) {
      fetch(`${apiUrl}/api/workers`)
        .then((res) => res.json())
        .then((data) => {
          const active = data.filter((w) => w.status === 'Active');
          setSimWorkers(active);
        })
        .catch((err) => console.log('[CallLogMonitor] Simulation workers load failed:', err.message));
    }
  }, [apiUrl, enabled, isSimulated]);

  // ── Request Permission ──────────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setPermissionGranted(true);
      return true;
    }
    try {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
      );
      if (hasPermission) {
        setPermissionGranted(true);
        return true;
      }

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        {
          title: 'Call Log Access Required',
          message:
            'CLE Call AP needs access to your call log to automatically detect missed calls and update worker attendance.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      setPermissionGranted(granted);
      return granted;
    } catch (err) {
      console.warn('[CallLogMonitor] Permission request error:', err);
      setPermissionGranted(false);
      return false;
    }
  }, []);

  // ── Post a single missed call to the server ─────────────────────────────────
  const postMissedCall = useCallback(
    async (call) => {
      try {
        const callMs = parseInt(call.timestamp || call.dateTime, 10);
        const callDate = new Date(callMs);

        const yyyy = callDate.getFullYear();
        const mm = String(callDate.getMonth() + 1).padStart(2, '0');
        const dd = String(callDate.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const timeStr = callDate
          .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          .replace(':', ':'); // HH:MM

        const body = {
          caller_number: call.phoneNumber,
          call_date: dateStr,
          call_time: timeStr,
          submitted_by: submittedBy || 'Admin (Auto)',
          notes: isSimulated
            ? `Simulated missed call (Expo Go Mode).`
            : `Auto-detected from device call log. Duration: ${call.duration || 0}s`,
        };

        const response = await fetch(`${apiUrl}/api/mobile/call-log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          const logEntry = {
            id: data.id || Date.now(),
            phoneNumber: call.phoneNumber,
            dateTime: callDate,
            dateStr,
            timeStr,
            workerName: data.worker_name || null,
            departmentName: data.department_name || null,
            matched: data.matched,
            autoDetected: true,
          };

          if (data.matched) {
            setRecentAutoLogs((prev) => [logEntry, ...prev].slice(0, 50));
          }

          console.log(
            `[CallLogMonitor] ✓ Auto-posted missed call: ${call.phoneNumber}` +
            (data.worker_name ? ` → ${data.worker_name}` : ' (unregistered)')
          );
          return logEntry;
        } else {
          console.warn('[CallLogMonitor] Server rejected call log:', data.error || 'unknown error');
        }
      } catch (err) {
        console.error('[CallLogMonitor] Error posting missed call:', err.message);
      }
      return null;
    },
    [apiUrl, submittedBy, isSimulated]
  );

  // ── Helper to get midnight timestamp for today ──────────────────────────────
  const getStartOfTodayMs = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  // ── Main Poll / Simulation Function ─────────────────────────────────────────
  const poll = useCallback(async () => {
    if (permissionGranted === false) return;
    setIsPolling(true);

    try {
      if (isSimulated) {
        // Simulation Mode: Generate a mock missed call from a random active worker
        if (simWorkers && simWorkers.length > 0) {
          const randomIndex = Math.floor(Math.random() * simWorkers.length);
          const worker = simWorkers[randomIndex];
          const call = {
            phoneNumber: worker.phone,
            timestamp: Date.now(),
            duration: 0,
            type: 'MISSED',
          };
          console.log(`[CallLogMonitor] [Simulation] Simulating missed call from ${worker.name} (${worker.phone})`);
          await postMissedCall(call);
        } else {
          console.log('[CallLogMonitor] Simulation Mode: No active workers loaded to generate mock calls.');
        }
      } else {
        // Native Call Log Mode: Always look back to start of today (midnight)
        if (!CallLog) return;
        const sinceTimestamp = getStartOfTodayMs();
        const logs = await CallLog.load(200);

        const newMissed = logs.filter((c) => {
          const isMissed =
            String(c.type) === '3' ||
            (typeof c.type === 'string' && c.type.toUpperCase().includes('MISSED'));

          const callMs = parseInt(c.timestamp || c.dateTime, 10);
          const isNewToday = callMs >= sinceTimestamp;

          // Generate a unique identifier for this call (number + timestamp)
          const callId = `${c.phoneNumber}_${c.timestamp || c.dateTime}`;
          const isNotProcessed = !processedCallsRef.current.has(callId);

          return isMissed && isNewToday && isNotProcessed;
        });

        console.log(
          `[CallLogMonitor] Poll: found ${newMissed.length} new missed call(s) since midnight`
        );

        // Sort ascending (oldest first) so that the newest gets prepended last and appears at the top of recentAutoLogs
        const newMissedSorted = [...newMissed].sort((a, b) => {
          const tsA = parseInt(a.timestamp || a.dateTime, 10) || 0;
          const tsB = parseInt(b.timestamp || b.dateTime, 10) || 0;
          return tsA - tsB;
        });

        for (const call of newMissedSorted) {
          const callId = `${call.phoneNumber}_${call.timestamp || call.dateTime}`;
          processedCallsRef.current.add(callId);
          await postMissedCall(call);
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      setLastCheckedAt(new Date());
    } catch (err) {
      console.warn('[CallLogMonitor] Poll error:', err.message);
    } finally {
      setIsPolling(false);
    }
  }, [permissionGranted, isSimulated, simWorkers, postMissedCall, apiUrl]);

  // ── Handle AppState ─────────────────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        if (enabled && permissionGranted) poll();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [enabled, permissionGranted, poll]);

  // ── Start / Stop Polling ────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    let didMount = true;

    const start = async () => {
      const granted = await requestPermission();
      if (!granted || !didMount) return;

      // Immediate first poll
      poll();

      // Then poll on interval
      intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    };

    start();

    return () => {
      didMount = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, requestPermission, poll]);

  return {
    permissionGranted,
    isSupported,
    isSimulated,
    isPolling,
    recentAutoLogs,
    lastCheckedAt,
    pollNow: poll,
  };
}

