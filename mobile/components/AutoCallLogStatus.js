/**
 * AutoCallLogStatus.js
 *
 * A Dashboard widget that shows the real-time status of the automatic
 * missed call detector, and lists all calls auto-detected this session.
 *
 * Only rendered for Admin users.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import {
  PhoneCall,
  PhoneMissed,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Clock,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

export default function AutoCallLogStatus({
  isDarkMode,
  isSupported,
  isSimulated,
  permissionGranted,
  isPolling,
  lastCheckedAt,
  recentAutoLogs = [],
  pollNow,
}) {
  const styles = createStyles(isDarkMode);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [recentAutoLogs.length]);

  const formatTime = (date) => {
    if (!date) return '—';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Sort logs: Latest on top
  const sortedLogs = [...recentAutoLogs].sort((a, b) => {
    const timeA = a.timestamp || a.rawTimestamp || (a.id ? parseInt(a.id) : 0);
    const timeB = b.timestamp || b.rawTimestamp || (b.id ? parseInt(b.id) : 0);
    if (timeA && timeB) return timeB - timeA;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * itemsPerPage;
  const currentLogs = sortedLogs.slice(startIndex, startIndex + itemsPerPage);

  // ── Unsupported (Expo Go) state ───────────────────────────────────────────
  if (!isSupported) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <PhoneMissed size={16} color={isDarkMode ? '#f87171' : '#ef4444'} />
          <Text style={styles.headerTitle}>Auto Missed Call Monitor</Text>
          <View style={styles.statusPill(false)}>
            <Text style={styles.statusPillText(false)}>INACTIVE</Text>
          </View>
        </View>
        <View style={styles.warningBox}>
          <Shield size={16} color="#f59e0b" />
          <Text style={styles.warningText}>
            Auto-detection requires a{' '}
            <Text style={{ fontWeight: '800' }}>Custom Dev Build</Text>.
            {'\n'}Run:{' '}
            <Text style={styles.code}>npx expo run:android</Text>
            {'\n'}(Expo Go does not support native call log access)
          </Text>
        </View>
      </View>
    );
  }

  // ── Permission denied state ────────────────────────────────────────────────
  if (permissionGranted === false) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <PhoneMissed size={16} color={isDarkMode ? '#f87171' : '#ef4444'} />
          <Text style={styles.headerTitle}>Auto Missed Call Monitor</Text>
          <View style={styles.statusPill(false)}>
            <Text style={styles.statusPillText(false)}>NO PERMISSION</Text>
          </View>
        </View>
        <View style={styles.warningBox}>
          <AlertTriangle size={16} color="#f59e0b" />
          <Text style={styles.warningText}>
            READ_CALL_LOG permission was denied. Please enable it in{' '}
            <Text style={{ fontWeight: '700' }}>Android Settings → Apps → CLE Call AP → Permissions</Text>.
          </Text>
        </View>
      </View>
    );
  }

  // ── Active monitoring state ────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Header row */}
      <View style={styles.header}>
        <PhoneMissed size={16} color={isDarkMode ? '#a78bfa' : '#7c3aed'} />
        <Text style={styles.headerTitle}>Auto Missed Call Monitor</Text>
        <View style={[styles.statusPill(true, isSimulated), { flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
          {isPolling ? (
            <RefreshCw size={9} color={isSimulated ? "#f59e0b" : "#10b981"} />
          ) : (
            <Wifi size={9} color={isSimulated ? "#f59e0b" : "#10b981"} />
          )}
          <Text style={styles.statusPillText(true, isSimulated)}>
            {isPolling ? 'SCANNING…' : isSimulated ? 'SIMULATOR' : 'LIVE'}
          </Text>
        </View>
      </View>

      {/* Simulation Info Banner */}
      {isSimulated && (
        <View style={styles.simBanner}>
          <Shield size={13} color={isDarkMode ? "#f59e0b" : "#d97706"} />
          <Text style={styles.simBannerText}>
            Running in <Text style={{ fontWeight: '700' }}>Expo Go Simulation</Text>. Simulating incoming calls from your employee roster every 5s.
          </Text>
        </View>
      )}

      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Clock size={12} color={isDarkMode ? '#9ca3af' : '#64748b'} />
          <Text style={styles.statusLabel}>Last scan:</Text>
          <Text style={styles.statusValue}>{formatTime(lastCheckedAt)}</Text>
        </View>
        <View style={styles.statusItem}>
          <PhoneCall size={12} color={isDarkMode ? '#9ca3af' : '#64748b'} />
          <Text style={styles.statusLabel}>Auto-logged:</Text>
          <Text style={styles.statusValue}>{sortedLogs.length} call(s)</Text>
        </View>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={pollNow}
          disabled={isPolling}
          activeOpacity={0.75}
        >
          <RefreshCw size={12} color={isDarkMode ? '#a78bfa' : '#7c3aed'} strokeWidth={2.5} />
          <Text style={styles.scanBtnText}>Scan Now</Text>
        </TouchableOpacity>
      </View>

      {/* Auto-detected call list */}
      {sortedLogs.length === 0 ? (
        <View style={styles.emptyFeed}>
          <PhoneMissed size={20} color={isDarkMode ? '#374151' : '#d1d5db'} />
          <Text style={styles.emptyText}>
            Listening for missed calls…{'\n'}New calls will appear here automatically.
          </Text>
        </View>
      ) : (
        <View style={styles.feed}>
          {currentLogs.map((log, i) => {
            const globalIndex = startIndex + i;
            return (
              <View key={log.id || globalIndex} style={[styles.logRow, globalIndex === 0 && styles.logRowNew]}>
                <View style={[styles.logIcon, { backgroundColor: log.matched ? (isDarkMode ? 'rgba(16,185,129,0.12)' : '#ecfdf5') : (isDarkMode ? 'rgba(245,158,11,0.1)' : '#fffbeb') }]}>
                  {log.matched ? (
                    <CheckCircle2 size={14} color="#10b981" />
                  ) : (
                    <AlertTriangle size={14} color="#f59e0b" />
                  )}
                </View>
                <View style={styles.logBody}>
                  <Text style={styles.logPhone}>{log.phoneNumber}</Text>
                  <Text style={styles.logMeta}>
                    {log.matched ? (
                      <>
                        <Text style={{ color: '#10b981', fontWeight: '700' }}>{log.workerName}</Text>
                        {log.departmentName && (
                          <Text style={{ color: isDarkMode ? '#9ca3af' : '#64748b' }}>  ·  {log.departmentName}</Text>
                        )}
                      </>
                    ) : (
                      <Text style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>Unregistered number</Text>
                    )}
                  </Text>
                </View>
                <Text style={styles.logTime}>{log.timeStr}</Text>
                {globalIndex === 0 && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Pagination Controls */}
      {sortedLogs.length > itemsPerPage && (
        <View style={styles.paginationRow}>
          <TouchableOpacity
            style={[styles.pageBtn, validPage === 1 && styles.pageBtnDisabled]}
            onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={validPage === 1}
            activeOpacity={0.7}
          >
            <ChevronLeft size={14} color={validPage === 1 ? (isDarkMode ? '#4b5563' : '#9ca3af') : (isDarkMode ? '#a78bfa' : '#7c3aed')} />
            <Text style={[styles.pageBtnText, validPage === 1 && styles.pageBtnTextDisabled]}>Previous</Text>
          </TouchableOpacity>

          <Text style={styles.pageInfoText}>
            Page <Text style={{ fontWeight: '700', color: isDarkMode ? '#f3f4f6' : '#111827' }}>{validPage}</Text> of {totalPages}
          </Text>

          <TouchableOpacity
            style={[styles.pageBtn, validPage === totalPages && styles.pageBtnDisabled]}
            onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={validPage === totalPages}
            activeOpacity={0.7}
          >
            <Text style={[styles.pageBtnText, validPage === totalPages && styles.pageBtnTextDisabled]}>Next</Text>
            <ChevronRight size={14} color={validPage === totalPages ? (isDarkMode ? '#4b5563' : '#9ca3af') : (isDarkMode ? '#a78bfa' : '#7c3aed')} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (isDark) =>
  StyleSheet.create({
    root: {
      backgroundColor: isDark ? '#111827' : '#ffffff',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(139,92,246,0.15)' : '#e0e7ff',
      overflow: 'hidden',
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
    },
    headerTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#e5e7eb' : '#1e293b',
      letterSpacing: -0.2,
    },
    statusPill: (active, isSim = false) => ({
      backgroundColor: active
        ? isSim
          ? isDark ? 'rgba(245,158,11,0.12)' : '#fef3c7'
          : isDark ? 'rgba(16,185,129,0.12)' : '#d1fae5'
        : isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: active
        ? isSim
          ? isDark ? 'rgba(245,158,11,0.25)' : '#fde68a'
          : isDark ? 'rgba(16,185,129,0.25)' : '#a7f3d0'
        : isDark ? 'rgba(239,68,68,0.2)' : '#fecaca',
    }),
    statusPillText: (active, isSim = false) => ({
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: active
        ? isSim
          ? '#d97706'
          : '#10b981'
        : '#ef4444',
    }),

    simBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(245,158,11,0.06)' : '#fffbeb',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(245,158,11,0.12)' : '#fde68a',
    },
    simBannerText: {
      fontSize: 11,
      color: isDark ? '#d97706' : '#92400e',
      flex: 1,
      lineHeight: 15,
    },

    // Status bar
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
    },
    statusItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statusLabel: {
      fontSize: 11,
      color: isDark ? '#6b7280' : '#94a3b8',
      fontWeight: '500',
    },
    statusValue: {
      fontSize: 11,
      color: isDark ? '#d1d5db' : '#374151',
      fontWeight: '700',
    },
    scanBtn: {
      marginLeft: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : '#f5f3ff',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(139,92,246,0.2)' : '#ede9fe',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    scanBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#a78bfa' : '#7c3aed',
    },

    // Warning box
    warningBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: isDark ? 'rgba(245,158,11,0.06)' : '#fffbeb',
      margin: 12,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245,158,11,0.18)' : '#fde68a',
    },
    warningText: {
      flex: 1,
      color: isDark ? '#d97706' : '#92400e',
      fontSize: 12,
      lineHeight: 18,
    },
    code: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 11,
      color: isDark ? '#a78bfa' : '#7c3aed',
      backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : '#ede9fe',
    },

    // Feed
    emptyFeed: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    emptyText: {
      fontSize: 12,
      color: isDark ? '#4b5563' : '#94a3b8',
      textAlign: 'center',
      lineHeight: 18,
    },
    feed: {
      padding: 12,
      gap: 8,
    },
    logRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#e2e8f0',
    },
    logRowNew: {
      borderColor: isDark ? 'rgba(139,92,246,0.3)' : '#c4b5fd',
      backgroundColor: isDark ? 'rgba(139,92,246,0.05)' : '#faf5ff',
    },
    logIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logBody: {
      flex: 1,
    },
    logPhone: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#f3f4f6' : '#0f172a',
      letterSpacing: -0.2,
    },
    logMeta: {
      fontSize: 11,
      marginTop: 2,
    },
    logTime: {
      fontSize: 11,
      color: isDark ? '#6b7280' : '#94a3b8',
      fontWeight: '500',
    },
    newBadge: {
      backgroundColor: '#7c3aed',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    newBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.5,
    },
    paginationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
      backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : '#fafafa',
    },
    pageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : '#f5f3ff',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(139,92,246,0.2)' : '#ede9fe',
    },
    pageBtnDisabled: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f1f5f9',
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
    },
    pageBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#a78bfa' : '#7c3aed',
    },
    pageBtnTextDisabled: {
      color: isDark ? '#4b5563' : '#9ca3af',
    },
    pageInfoText: {
      fontSize: 11,
      color: isDark ? '#9ca3af' : '#64748b',
    },
  });
