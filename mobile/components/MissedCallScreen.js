import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import {
  ChevronLeft,
  Phone,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Building2,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

// ── Date helpers ───────────────────────────────────────────────────────────────
function todayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nowTimeStr() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function MissedCallScreen({ currentUser, apiUrl, isDarkMode, onBack }) {
  const styles = createStyles(isDarkMode);

  const [callerNumber, setCallerNumber] = useState('');
  const [callDate, setCallDate] = useState(todayStr());
  const [callTime, setCallTime] = useState(nowTimeStr());
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // null | { success, worker_name, shortage_count, matched }
  const [error, setError] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const showResult = () => {
    resultAnim.setValue(0);
    Animated.spring(resultAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }).start();
  };

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = () => {
    const cleaned = callerNumber.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setError('Enter a valid phone number (min 10 digits).');
      return false;
    }
    if (!callDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setError('Date must be in YYYY-MM-DD format.');
      return false;
    }
    if (!callTime.match(/^\d{2}:\d{2}$/)) {
      setError('Time must be in HH:MM format (24-hour).');
      return false;
    }
    setError('');
    return true;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch(`${apiUrl}/api/mobile/call-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller_number: callerNumber.trim(),
          call_date: callDate,
          call_time: callTime,
          submitted_by: currentUser.username,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
        showResult();
        // Reset form
        setCallerNumber('');
        setCallDate(todayStr());
        setCallTime(nowTimeStr());
        setNotes('');
      } else {
        setError(data.error || 'Failed to submit call log.');
      }
    } catch (err) {
      setError('Network error — could not reach server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Background */}
      <View style={styles.bgAccent} />
      <View style={styles.bgCircle} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.75}>
          <ChevronLeft size={24} color={isDarkMode ? '#f9fafb' : '#1e1b4b'} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Log Missed Call</Text>
          <Text style={styles.headerSub}>Admin Only</Text>
        </View>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Info Banner ── */}
        <View style={styles.infoBanner}>
          <Phone size={14} color={isDarkMode ? '#a78bfa' : '#7c3aed'} />
          <Text style={styles.infoText}>
            Capture a missed call manually. Number, date &amp; time will be sent to the server and saved as a call log record.
          </Text>
        </View>

        {/* ── Form Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Call Details</Text>

          {/* Phone Number */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabel}>
              <Phone size={14} color={isDarkMode ? '#a78bfa' : '#7c3aed'} />
              <Text style={styles.labelText}>Caller Number</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor={isDarkMode ? '#4b5563' : '#94a3b8'}
              keyboardType="phone-pad"
              value={callerNumber}
              onChangeText={setCallerNumber}
              maxLength={15}
              autoFocus
            />
          </View>

          {/* Date */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabel}>
              <Calendar size={14} color={isDarkMode ? '#a78bfa' : '#7c3aed'} />
              <Text style={styles.labelText}>Call Date (YYYY-MM-DD)</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="2026-06-01"
              placeholderTextColor={isDarkMode ? '#4b5563' : '#94a3b8'}
              keyboardType="numbers-and-punctuation"
              value={callDate}
              onChangeText={setCallDate}
              maxLength={10}
            />
          </View>

          {/* Time */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabel}>
              <Clock size={14} color={isDarkMode ? '#a78bfa' : '#7c3aed'} />
              <Text style={styles.labelText}>Call Time (HH:MM, 24-hr)</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="09:30"
              placeholderTextColor={isDarkMode ? '#4b5563' : '#94a3b8'}
              keyboardType="numbers-and-punctuation"
              value={callTime}
              onChangeText={setCallTime}
              maxLength={5}
            />
          </View>

          {/* Notes (optional) */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabel}>
              <AlertTriangle size={14} color={isDarkMode ? '#a78bfa' : '#7c3aed'} />
              <Text style={styles.labelText}>Notes (optional)</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Called during tea break, worker confirmed verbally…"
              placeholderTextColor={isDarkMode ? '#4b5563' : '#94a3b8'}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* ── Error Banner ── */}
        {error ? (
          <View style={styles.errorBanner}>
            <XCircle size={16} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Result Card ── */}
        {result && (
          <Animated.View
            style={[
              styles.resultCard,
              result.matched ? styles.resultSuccess : styles.resultWarning,
              { opacity: resultAnim, transform: [{ scale: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] },
            ]}
          >
            {result.matched ? (
              <>
                <View style={styles.resultHeader}>
                  <CheckCircle2 size={20} color="#10b981" />
                  <Text style={[styles.resultTitle, { color: '#10b981' }]}>Worker Matched!</Text>
                </View>
                <View style={styles.resultRow}>
                  <User size={14} color={isDarkMode ? '#9ca3af' : '#64748b'} />
                  <Text style={styles.resultLabel}>Worker:</Text>
                  <Text style={styles.resultValue}>{result.worker_name}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Building2 size={14} color={isDarkMode ? '#9ca3af' : '#64748b'} />
                  <Text style={styles.resultLabel}>Dept. Shortage:</Text>
                  <View style={[styles.shortageBadge, { backgroundColor: result.shortage_count > 0 ? (isDarkMode ? 'rgba(245,158,11,0.15)' : '#fffbeb') : (isDarkMode ? 'rgba(16,185,129,0.12)' : '#ecfdf5') }]}>
                    <Text style={[styles.shortageBadgeText, { color: result.shortage_count > 0 ? '#f59e0b' : '#10b981' }]}>
                      {result.shortage_count > 0 ? `−${result.shortage_count} short` : 'Fully staffed'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.resultNote}>Missed call record saved successfully ✓</Text>
              </>
            ) : (
              <>
                <View style={styles.resultHeader}>
                  <AlertTriangle size={20} color="#f59e0b" />
                  <Text style={[styles.resultTitle, { color: '#f59e0b' }]}>Saved — No Match</Text>
                </View>
                <Text style={styles.resultNote}>
                  The number was saved but did not match any active worker. The call log is stored for reference.
                </Text>
              </>
            )}
          </Animated.View>
        )}

        {/* ── Submit Button ── */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Send size={18} color="#fff" strokeWidth={2.5} />
              <Text style={styles.submitText}>Submit Call Log</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const createStyles = (isDark) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: isDark ? '#060913' : '#f8fafc',
  },
  bgAccent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 200,
    backgroundColor: isDark ? '#0c0a1e' : '#e0e7ff',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  bgCircle: {
    position: 'absolute',
    top: -60, right: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: isDark ? 'rgba(109, 40, 217, 0.08)' : 'rgba(99, 102, 241, 0.06)',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.select({ ios: 8, default: 16 }),
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '700',
    color: isDark ? '#f9fafb' : '#1e1b4b',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11, color: isDark ? '#6b7280' : '#64748b', fontWeight: '500',
  },
  adminBadge: {
    backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#ede9fe',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(139,92,246,0.3)' : '#c4b5fd',
    borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  adminBadgeText: {
    color: isDark ? '#a78bfa' : '#7c3aed',
    fontSize: 11, fontWeight: '800', letterSpacing: 0.8,
  },

  scrollContent: {
    paddingHorizontal: 20,
  },

  // ── Info Banner ──
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: isDark ? 'rgba(139,92,246,0.08)' : '#f5f3ff',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(139,92,246,0.2)' : '#ddd6fe',
    borderRadius: 14, padding: 14, marginBottom: 20,
  },
  infoText: {
    flex: 1, color: isDark ? '#c4b5fd' : '#5b21b6',
    fontSize: 13, lineHeight: 18,
  },

  // ── Form Card ──
  card: {
    backgroundColor: isDark ? '#111827' : '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700',
    color: isDark ? '#9ca3af' : '#64748b',
    letterSpacing: 0.6, textTransform: 'uppercase',
    marginBottom: 18,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 8,
  },
  labelText: {
    fontSize: 13, fontWeight: '600',
    color: isDark ? '#d1d5db' : '#374151',
  },
  input: {
    backgroundColor: isDark ? '#1f2937' : '#f8fafc',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15,
    color: isDark ? '#f3f4f6' : '#0f172a',
    fontWeight: '500',
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },

  // ── Error ──
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : '#fef2f2',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239,68,68,0.18)' : '#fecaca',
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  errorText: {
    color: isDark ? '#fca5a5' : '#ef4444',
    fontSize: 13, flex: 1,
  },

  // ── Result Card ──
  resultCard: {
    borderRadius: 18, padding: 18, marginBottom: 20,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: isDark ? 'rgba(16,185,129,0.07)' : '#f0fdf4',
    borderColor: isDark ? 'rgba(16,185,129,0.2)' : '#bbf7d0',
  },
  resultWarning: {
    backgroundColor: isDark ? 'rgba(245,158,11,0.07)' : '#fffbeb',
    borderColor: isDark ? 'rgba(245,158,11,0.2)' : '#fde68a',
  },
  resultHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  resultTitle: {
    fontSize: 16, fontWeight: '700',
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  resultLabel: {
    fontSize: 13, color: isDark ? '#9ca3af' : '#64748b', fontWeight: '500',
  },
  resultValue: {
    fontSize: 14, fontWeight: '700',
    color: isDark ? '#f3f4f6' : '#0f172a', flex: 1,
  },
  shortageBadge: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  shortageBadgeText: {
    fontSize: 13, fontWeight: '700',
  },
  resultNote: {
    fontSize: 12, color: isDark ? '#9ca3af' : '#64748b',
    marginTop: 8, lineHeight: 16,
  },

  // ── Submit Button ──
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10,
    backgroundColor: '#7c3aed',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 4,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnDisabled: {
    backgroundColor: isDark ? '#374151' : '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2,
  },
});
