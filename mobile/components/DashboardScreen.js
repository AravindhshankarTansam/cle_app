import React, { useState, useEffect, useRef } from 'react';
import useCallLogMonitor from '../hooks/useCallLogMonitor';
import AutoCallLogStatus from './AutoCallLogStatus';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  LogOut,
  TrendingUp,
  TrendingDown,
  Zap,
  Building2,
  Shield,
  Sun,
  Moon,
  PhoneCall,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 3;

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DashboardScreen({ currentUser, apiUrl, onLogout, isDarkMode, toggleTheme, onGoToUserInfo, onGoToMissedCallForm }) {
  const isAdmin = currentUser?.role === 'Admin';
  const styles = createStyles(isDarkMode);

  // ── Auto Call Log Monitor (Admin only) ──
  const {
    permissionGranted,
    isSupported,
    isSimulated,
    isPolling,
    recentAutoLogs,
    lastCheckedAt,
    pollNow,
  } = useCallLogMonitor({
    apiUrl,
    submittedBy: currentUser?.username,
    enabled: isAdmin,
  });

  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({
    total_workers: 0,
    coming: 0,
    present: 0,
    absent: 0,
    unconfirmed: 0,
  });
  const [loadingData, setLoadingData] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const metricsAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(Array.from({ length: 10 }, () => new Animated.Value(0))).current;

  const startSpinning = () => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true })
    ).start();
  };
  const stopSpinning = () => {
    spinAnim.stopAnimation();
    spinAnim.setValue(0);
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const animateIn = () => {
    Animated.stagger(60, [
      Animated.spring(headerAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.spring(metricsAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
      ...cardAnims.map(a =>
        Animated.spring(a, { toValue: 1, tension: 70, friction: 12, useNativeDriver: true })
      ),
    ]).start();
  };

  const fetchAvailabilityData = async () => {
    setLoadingData(true);
    setRefreshError('');
    startSpinning();
    try {
      const todayDate = getLocalDateString();
      const response = await fetch(`${apiUrl}/api/dashboard-summary?date=${todayDate}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        const sorted = (data.departments || []).sort((a, b) => {
          if (a.shortage && !b.shortage) return -1;
          if (!a.shortage && b.shortage) return 1;
          return 0;
        });
        setDepartments(sorted);
        setLastUpdated(new Date());
        // Reset and re-animate cards
        cardAnims.forEach(a => a.setValue(0));
        animateIn();
      } else {
        setRefreshError('Failed to fetch department data.');
      }
    } catch (err) {
      console.error(err);
      setRefreshError('Network error — check your server connection.');
    } finally {
      setLoadingData(false);
      stopSpinning();
    }
  };

  useEffect(() => {
    animateIn();
    fetchAvailabilityData();

    // Keep stats synchronized automatically (match web dashboard real-time updates)
    const interval = setInterval(fetchAvailabilityData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Instantly sync stats when a new call log is auto-detected
  useEffect(() => {
    if (recentAutoLogs.length > 0) {
      fetchAvailabilityData();
    }
  }, [recentAutoLogs]);

  const shortageDepts = departments.filter(d => d.shortage);
  const available = (stats.coming || 0) + (stats.present || 0);
  const attendanceRate = stats.total_workers > 0
    ? Math.round((available / stats.total_workers) * 100)
    : 0;

  const formatTime = (date) => {
    if (!date) return '—';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.root}>

      {/* ── Background Decoration ── */}
      <View style={styles.bgAccent} />
      <View style={styles.bgCircle} />

      {/* ── Header ── */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          },
        ]}
      >
        <TouchableOpacity style={styles.headerLeft} onPress={onGoToUserInfo} activeOpacity={0.75}>
          <View style={styles.avatarBadge}>
            <Shield size={16} color={isDarkMode ? "#a78bfa" : "#8b5cf6"} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.headerGreeting}>Welcome back</Text>
            <Text style={styles.headerUsername}>
              {currentUser.username}
              <Text style={styles.headerRoleTag}> · {currentUser.role}</Text>
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.themeBtn} onPress={toggleTheme} activeOpacity={0.75}>
            {isDarkMode ? <Sun size={15} color="#fcd34d" /> : <Moon size={15} color="#4b5563" />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.75}>
            <LogOut size={15} color="#ef4444" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Attendance Rate Hero ── */}
        <Animated.View
          style={[
            styles.heroCard,
            {
              opacity: metricsAnim,
              transform: [{ scale: metricsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
            },
          ]}
        >
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>Today's Attendance Rate</Text>
            <Text style={styles.heroRate}>{attendanceRate}%</Text>
            <View style={styles.heroMeta}>
              {attendanceRate >= 80 ? (
                <TrendingUp size={13} color="#34d399" />
              ) : (
                <TrendingDown size={13} color={isDarkMode ? "#f87171" : "#ef4444"} />
              )}
              <Text style={[styles.heroMetaText, { color: attendanceRate >= 80 ? '#34d399' : (isDarkMode ? '#f87171' : '#ef4444') }]}>
                {available} of {stats.total_workers} workers present
              </Text>
            </View>
          </View>

          {/* Circular ring indicator */}
          <View style={styles.ringWrap}>
            <View style={styles.ringOuter}>
              <View style={styles.ringInner}>
                <Text style={styles.ringPct}>{attendanceRate}</Text>
                <Text style={styles.ringPctSymbol}>%</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── 3 Metric Chips ── */}
        <Animated.View
          style={[
            styles.metricsRow,
            {
              opacity: metricsAnim,
              transform: [{ translateY: metricsAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          {/* Available */}
          <View style={[styles.chip, styles.chipGreen]}>
            <View style={[styles.chipIcon, { backgroundColor: isDarkMode ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
              <CheckCircle2 size={16} color="#10b981" strokeWidth={2} />
            </View>
            <Text style={[styles.chipVal, { color: isDarkMode ? '#34d399' : '#059669' }]}>{available}</Text>
            <Text style={styles.chipLbl}>Available</Text>
          </View>

          {/* Shortages */}
          <View style={[styles.chip, shortageDepts.length > 0 ? styles.chipAmber : styles.chipNeutral]}>
            <View style={[styles.chipIcon, { backgroundColor: shortageDepts.length > 0 ? (isDarkMode ? 'rgba(245,158,11,0.15)' : '#fffbeb') : (isDarkMode ? 'rgba(100,116,139,0.15)' : '#f1f5f9') }]}>
              <AlertTriangle size={16} color={shortageDepts.length > 0 ? (isDarkMode ? '#fbbf24' : '#d97706') : (isDarkMode ? '#64748b' : '#94a3b8')} strokeWidth={2} />
            </View>
            <Text style={[styles.chipVal, { color: shortageDepts.length > 0 ? (isDarkMode ? '#fbbf24' : '#d97706') : (isDarkMode ? '#64748b' : '#94a3b8') }]}>
              {shortageDepts.length}
            </Text>
            <Text style={styles.chipLbl}>Shortages</Text>
          </View>

          {/* Pending */}
          <View style={[styles.chip, styles.chipBlue]}>
            <View style={[styles.chipIcon, { backgroundColor: isDarkMode ? 'rgba(14,165,233,0.15)' : '#f0f9ff' }]}>
              <Clock size={16} color="#0ea5e9" strokeWidth={2} />
            </View>
            <Text style={[styles.chipVal, { color: isDarkMode ? '#38bdf8' : '#0284c7' }]}>{stats.unconfirmed}</Text>
            <Text style={styles.chipLbl}>Pending</Text>
          </View>
        </Animated.View>

        {/* ── Auto Missed Call Monitor (Admin only) ── */}
        {isAdmin && (
          <AutoCallLogStatus
            isDarkMode={isDarkMode}
            isSupported={isSupported}
            isSimulated={isSimulated}
            permissionGranted={permissionGranted}
            isPolling={isPolling}
            lastCheckedAt={lastCheckedAt}
            recentAutoLogs={recentAutoLogs}
            pollNow={pollNow}
          />
        )}

        {/* ── Shortage Alert Banner ── */}
        {shortageDepts.length > 0 && (
          <View style={styles.alertBanner}>
            <View style={styles.alertIconWrap}>
              <Zap size={16} color={isDarkMode ? "#f59e0b" : "#d97706"} />
            </View>
            <Text style={styles.alertText}>
              <Text style={styles.alertBold}>{shortageDepts.length} department{shortageDepts.length > 1 ? 's' : ''}</Text>
              {' '}below minimum staffing threshold
            </Text>
          </View>
        )}

        {/* ── Error Banner ── */}
        {refreshError ? (
          <View style={styles.errorBanner}>
            <AlertTriangle size={14} color={isDarkMode ? "#f87171" : "#ef4444"} />
            <Text style={styles.errorText}>{refreshError}</Text>
          </View>
        ) : null}

        {/* ── Section Title Row ── */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionLeft}>
            <Building2 size={15} color={isDarkMode ? "#6b7280" : "#94a3b8"} />
            <Text style={styles.sectionTitle}>Department Roster</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchAvailabilityData}
            disabled={loadingData}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RefreshCw size={14} color={loadingData ? (isDarkMode ? '#6b7280' : '#9ca3af') : (isDarkMode ? '#a78bfa' : '#8b5cf6')} strokeWidth={2} />
            </Animated.View>
            <Text style={[styles.refreshText, { color: loadingData ? (isDarkMode ? '#4b5563' : '#9ca3af') : (isDarkMode ? '#a78bfa' : '#8b5cf6') }]}>
              {lastUpdated ? formatTime(lastUpdated) : 'Sync'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Department Cards ── */}
        {loadingData && departments.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.emptyText}>Syncing roster data...</Text>
          </View>
        ) : (
          departments.map((dept, index) => {
            const available = dept.confirmed_today;
            const min = dept.min_workers;
            const ratio = min > 0 ? Math.min(1, available / min) : 0;
            const pct = Math.round(ratio * 100);
            const isShort = dept.shortage;
            const missing = Math.max(0, min - available);

            return (
              <Animated.View
                key={dept.id}
                style={{
                  opacity: cardAnims[index] || 1,
                  transform: [
                    {
                      translateY: cardAnims[index]
                        ? cardAnims[index].interpolate({ inputRange: [0, 1], outputRange: [24, 0] })
                        : 0,
                    },
                  ],
                }}
              >
                <View style={[styles.deptCard, isShort && styles.deptCardShort]}>
                  {/* Left accent bar */}
                  <View style={[styles.accentBar, { backgroundColor: isShort ? (isDarkMode ? '#f59e0b' : '#f59e0b') : '#10b981' }]} />

                  <View style={styles.deptCardInner}>
                    {/* Top row */}
                    <View style={styles.deptTop}>
                      <View style={styles.deptNameWrap}>
                        <Text style={styles.deptName} numberOfLines={1}>{dept.name}</Text>
                        {isShort && (
                          <View style={styles.missingTag}>
                            <Text style={styles.missingTagText}>−{missing} short</Text>
                          </View>
                        )}
                      </View>
                      <View style={[styles.pctBadge, { backgroundColor: isShort ? (isDarkMode ? 'rgba(245,158,11,0.12)' : '#fffbeb') : (isDarkMode ? 'rgba(16,185,129,0.12)' : '#ecfdf5') }]}>
                        <Text style={[styles.pctBadgeText, { color: isShort ? (isDarkMode ? '#fbbf24' : '#d97706') : (isDarkMode ? '#34d399' : '#059669') }]}>
                          {pct}%
                        </Text>
                      </View>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: isShort ? '#f59e0b' : '#10b981',
                          },
                        ]}
                      />
                    </View>

                    {/* Bottom stats */}
                    <View style={styles.deptStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statVal}>{available}</Text>
                        <Text style={styles.statLbl}>Confirmed</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statVal}>{min}</Text>
                        <Text style={styles.statLbl}>Required</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statVal}>{dept.total_workers}</Text>
                        <Text style={styles.statLbl}>Roster</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statVal}>{dept.allocated_today}</Text>
                        <Text style={styles.statLbl}>Allocated</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Animated.View>
            );
          })
        )}

        <View style={{ height: 90 }} />
      </ScrollView>


    </View>
  );
}

// ─────────────────────────────────────────────
const createStyles = (isDark) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: isDark ? '#060913' : '#f8fafc',
  },
  bgAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: isDark ? '#0c0a1e' : '#e0e7ff',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  bgCircle: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: isDark ? 'rgba(109, 40, 217, 0.1)' : 'rgba(99, 102, 241, 0.08)',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.select({ ios: 8, default: 16 }),
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(167, 139, 250, 0.1)' : '#ffffff',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(167, 139, 250, 0.2)' : '#c7d2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGreeting: {
    fontSize: 11,
    color: isDark ? '#6b7280' : '#4b5563',
    fontWeight: '500',
  },
  headerUsername: {
    fontSize: 15,
    fontWeight: '700',
    color: isDark ? '#f9fafb' : '#1e1b4b',
    letterSpacing: -0.3,
  },
  headerRoleTag: {
    fontWeight: '400',
    color: isDark ? '#a78bfa' : '#6366f1',
    fontSize: 13,
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // ── Hero Card ──
  heroCard: {
    backgroundColor: isDark ? '#1a1040' : '#ffffff',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#e0e7ff',
    shadowColor: isDark ? '#7c3aed' : '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  heroLeft: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 11,
    color: isDark ? '#7c3aed' : '#6366f1',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroRate: {
    fontSize: 42,
    fontWeight: '800',
    color: isDark ? '#f9fafb' : '#1e1b4b',
    letterSpacing: -2,
    lineHeight: 48,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  heroMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ringWrap: {
    marginLeft: 12,
  },
  ringOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : '#e0e7ff',
    borderWidth: 3,
    borderColor: isDark ? 'rgba(139, 92, 246, 0.4)' : '#818cf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    alignItems: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  ringPct: {
    fontSize: 22,
    fontWeight: '800',
    color: isDark ? '#a78bfa' : '#4f46e5',
    lineHeight: 26,
  },
  ringPctSymbol: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#7c3aed' : '#6366f1',
    marginBottom: 2,
  },

  // ── Metric Chips ──
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    gap: 6,
    backgroundColor: isDark ? 'transparent' : '#ffffff',
  },
  chipGreen: {
    backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : '#ffffff',
    borderColor: isDark ? 'rgba(16,185,129,0.15)' : '#d1fae5',
  },
  chipAmber: {
    backgroundColor: isDark ? 'rgba(245,158,11,0.06)' : '#ffffff',
    borderColor: isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7',
  },
  chipNeutral: {
    backgroundColor: isDark ? 'rgba(100,116,139,0.06)' : '#ffffff',
    borderColor: isDark ? 'rgba(100,116,139,0.15)' : '#e2e8f0',
  },
  chipBlue: {
    backgroundColor: isDark ? 'rgba(14,165,233,0.06)' : '#ffffff',
    borderColor: isDark ? 'rgba(14,165,233,0.15)' : '#e0f2fe',
  },
  chipIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipVal: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  chipLbl: {
    fontSize: 10,
    color: isDark ? '#6b7280' : '#64748b',
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // ── Alert Banner ──
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245,158,11,0.2)' : '#fde68a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  alertIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: {
    color: isDark ? '#d97706' : '#b45309',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  alertBold: {
    color: isDark ? '#fbbf24' : '#d97706',
    fontWeight: '700',
  },

  // ── Error Banner ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: isDark ? 'rgba(239,68,68,0.07)' : '#fef2f2',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239,68,68,0.18)' : '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: isDark ? '#fca5a5' : '#ef4444',
    fontSize: 12,
    flex: 1,
  },

  // ── Section Header ──
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#e5e7eb' : '#1e293b',
    letterSpacing: -0.2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? 'rgba(167,139,250,0.08)' : '#f5f3ff',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(167,139,250,0.15)' : '#ede9fe',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Department Cards ──
  deptCard: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#111827' : '#ffffff',
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  deptCardShort: {
    borderColor: isDark ? 'rgba(245,158,11,0.2)' : '#fde68a',
    shadowColor: '#f59e0b',
    shadowOpacity: isDark ? 0.08 : 0.1,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  deptCardInner: {
    flex: 1,
    padding: 16,
  },
  deptTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deptNameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  deptName: {
    fontSize: 15,
    fontWeight: '700',
    color: isDark ? '#f3f4f6' : '#0f172a',
    flex: 1,
  },
  missingTag: {
    backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : '#fef3c7',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  missingTagText: {
    color: isDark ? '#fbbf24' : '#d97706',
    fontSize: 10,
    fontWeight: '700',
  },
  pctBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pctBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBg: {
    height: 5,
    backgroundColor: isDark ? '#1f2937' : '#e2e8f0',
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  deptStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: isDark ? '#1f2937' : '#e2e8f0',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '700',
    color: isDark ? '#e5e7eb' : '#1e293b',
  },
  statLbl: {
    fontSize: 9,
    color: isDark ? '#6b7280' : '#64748b',
    fontWeight: '500',
    letterSpacing: 0.3,
    marginTop: 2,
  },

  // ── Admin FAB ──
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#7c3aed',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 28,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // ── Empty / Loading ──
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 14,
  },
  emptyText: {
    color: isDark ? '#4b5563' : '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
});
