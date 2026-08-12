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
  FileSpreadsheet,
  Layers,
  User,
  MapPin,
  ChevronDown,
  ChevronUp,
  XCircle
} from 'lucide-react-native';
import IEHeadcountSection from './IEHeadcountSection';

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
  const [hierarchyData, setHierarchyData] = useState([]);
  const [expandedLines, setExpandedLines] = useState({});
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
  const [activeSectionTab, setActiveSectionTab] = useState('all');

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

  const toggleLineExpand = (lineId) => {
    setExpandedLines(prev => ({
      ...prev,
      [lineId]: prev[lineId] === false ? true : false
    }));
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
        setHierarchyData(data.hierarchy || []);

        // Expand all lines initially
        const initialExpanded = {};
        (data.hierarchy || []).forEach(block => {
          (block.floors || []).forEach(floor => {
            (floor.lines || []).forEach(line => {
              initialExpanded[line.id] = true;
            });
          });
        });
        setExpandedLines(initialExpanded);

        setLastUpdated(new Date());
        // Reset and re-animate cards
        cardAnims.forEach(a => a.setValue(0));
        animateIn();
      } else {
        setRefreshError('Failed to fetch summary data.');
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

  const lineSummariesData = React.useMemo(() => {
    if (!hierarchyData || hierarchyData.length === 0) {
      return { lines: [], overall: { totalLines: 0, totalRoster: 0, totalPresent: 0, totalAbsent: 0, rate: 0 } };
    }

    const lines = [];
    hierarchyData.forEach(block => {
      (block.floors || []).forEach(floor => {
        (floor.lines || []).forEach(line => {
          const totalRoster = line.workers ? line.workers.length : 0;
          const presentCount = line.present_count || 0;
          const absentCount = line.absent_count !== undefined ? line.absent_count : Math.max(0, totalRoster - presentCount);
          const rate = totalRoster > 0 ? Math.round((presentCount / totalRoster) * 100) : 0;

          lines.push({
            id: line.id,
            name: line.name,
            blockName: block.name,
            floorName: floor.name,
            totalRoster,
            presentCount,
            absentCount,
            rate
          });
        });
      });
    });

    const totalLines = lines.length;
    const totalRoster = lines.reduce((sum, l) => sum + l.totalRoster, 0);
    const totalPresent = lines.reduce((sum, l) => sum + l.presentCount, 0);
    const totalAbsent = lines.reduce((sum, l) => sum + l.absentCount, 0);
    const rate = totalRoster > 0 ? Math.round((totalPresent / totalRoster) * 100) : 0;

    return {
      lines,
      overall: { totalLines, totalRoster, totalPresent, totalAbsent, rate }
    };
  }, [hierarchyData]);

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

        {/* ── Section Navigation Switcher ── */}
        <View style={styles.sectionTabRow}>
          <TouchableOpacity
            style={[styles.sectionTabBtn, activeSectionTab === 'roster' && styles.sectionTabActive]}
            onPress={() => setActiveSectionTab('roster')}
            activeOpacity={0.8}
          >
            <Building2 size={13} color={activeSectionTab === 'roster' ? (isDarkMode ? '#a78bfa' : '#6d28d9') : (isDarkMode ? '#64748b' : '#94a3b8')} />
            <Text 
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              style={[styles.sectionTabText, activeSectionTab === 'roster' && styles.sectionTabTextActive]}
            >
              Dept Roster
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionTabBtn, activeSectionTab === 'ie_headcount' && styles.sectionTabActive]}
            onPress={() => setActiveSectionTab('ie_headcount')}
            activeOpacity={0.8}
          >
            <FileSpreadsheet size={13} color={activeSectionTab === 'ie_headcount' ? (isDarkMode ? '#a78bfa' : '#6d28d9') : (isDarkMode ? '#64748b' : '#94a3b8')} />
            <Text 
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              style={[styles.sectionTabText, activeSectionTab === 'ie_headcount' && styles.sectionTabTextActive]}
            >
              IE Headcount
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionTabBtn, activeSectionTab === 'all' && styles.sectionTabActive]}
            onPress={() => setActiveSectionTab('all')}
            activeOpacity={0.8}
          >
            <Layers size={13} color={activeSectionTab === 'all' ? (isDarkMode ? '#a78bfa' : '#6d28d9') : (isDarkMode ? '#64748b' : '#94a3b8')} />
            <Text 
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              style={[styles.sectionTabText, activeSectionTab === 'all' && styles.sectionTabTextActive]}
            >
              All Views
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Assembly Line Hierarchy & Availability Section ── */}
        {(activeSectionTab === 'roster' || activeSectionTab === 'all') && (
          <>
            {/* ── Section Title Row ── */}
            <View style={styles.sectionRow}>
              <View style={styles.sectionLeft}>
                <Building2 size={15} color={isDarkMode ? "#a78bfa" : "#7c3aed"} />
                <Text style={styles.sectionTitle}>Assembly Line Hierarchy & Availability</Text>
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

            {/* ── Assembly Lines Overall Summary & Per-Line Breakdown ── */}
            {lineSummariesData.lines.length > 0 && (
              <View style={styles.summaryCardWrap}>
                <View style={styles.summaryCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Building2 size={16} color="#7c3aed" />
                    <Text style={styles.summaryCardTitle}>Assembly Lines Overall Summary</Text>
                  </View>
                  <View style={styles.summaryCountTag}>
                    <Text style={styles.summaryCountTagText}>{lineSummariesData.overall.totalLines} Lines</Text>
                  </View>
                </View>

                {/* Grid metrics */}
                <View style={styles.summaryGridRow}>
                  <View style={styles.summaryMetricItem}>
                    <Text style={styles.summaryMetricLbl}>Total Employees</Text>
                    <Text style={styles.summaryMetricVal}>{lineSummariesData.overall.totalRoster}</Text>
                  </View>
                  <View style={[styles.summaryMetricItem, { backgroundColor: isDarkMode ? 'rgba(16,185,129,0.1)' : '#ecfdf5', borderColor: isDarkMode ? 'rgba(16,185,129,0.25)' : '#a7f3d0' }]}>
                    <Text style={[styles.summaryMetricLbl, { color: '#10b981' }]}>Present</Text>
                    <Text style={[styles.summaryMetricVal, { color: '#10b981' }]}>{lineSummariesData.overall.totalPresent}</Text>
                  </View>
                  <View style={[styles.summaryMetricItem, { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: isDarkMode ? 'rgba(239,68,68,0.25)' : '#fecaca' }]}>
                    <Text style={[styles.summaryMetricLbl, { color: '#ef4444' }]}>Absent</Text>
                    <Text style={[styles.summaryMetricVal, { color: '#ef4444' }]}>{lineSummariesData.overall.totalAbsent}</Text>
                  </View>
                  <View style={[styles.summaryMetricItem, { backgroundColor: isDarkMode ? 'rgba(139,92,246,0.1)' : '#f5f3ff', borderColor: isDarkMode ? 'rgba(139,92,246,0.25)' : '#ddd6fe' }]}>
                    <Text style={[styles.summaryMetricLbl, { color: '#7c3aed' }]}>Attendance</Text>
                    <Text style={[styles.summaryMetricVal, { color: '#7c3aed' }]}>{lineSummariesData.overall.rate}%</Text>
                  </View>
                </View>

                {/* Per-Line Breakdown list */}
                <Text style={styles.lineBreakdownHeading}>ASSEMBLY LINE SUMMARY BREAKDOWN</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -12, paddingHorizontal: 12, marginTop: 6 }}>
                  {lineSummariesData.lines.map((l) => (
                    <View key={l.id} style={styles.lineSummaryItemCard}>
                      <Text style={styles.lineSummaryNameText}>Line {l.name}</Text>
                      <Text style={styles.lineSummaryLocText}>{l.blockName} · Floor {l.floorName}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>Total: {l.totalRoster}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>{l.presentCount} Pres</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: l.absentCount > 0 ? '#ef4444' : (isDarkMode ? '#9ca3af' : '#64748b') }}>{l.absentCount} Abs</Text>
                      </View>
                      <View style={[styles.ratePill, { backgroundColor: l.rate >= 90 ? '#10b981' : l.rate >= 75 ? '#f59e0b' : '#ef4444' }]}>
                        <Text style={styles.ratePillText}>{l.rate}% Attendance</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Assembly Line Hierarchy Cards ── */}
            {loadingData && hierarchyData.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#7c3aed" />
                <Text style={styles.emptyText}>Syncing line hierarchy data...</Text>
              </View>
            ) : hierarchyData.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No assembly line hierarchy configured.</Text>
              </View>
            ) : (
              hierarchyData.map((block) => {
                const blockTotalWorkers = (block.floors || []).reduce((sumF, f) => sumF + (f.lines || []).reduce((sumL, l) => sumL + (l.workers ? l.workers.length : 0), 0), 0);

                return (
                  <View key={block.id} style={styles.blockWrap}>
                    {/* Block Header */}
                    <View style={styles.blockHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Building2 size={15} color="#7c3aed" />
                        <Text style={styles.blockTitle}>{block.name}</Text>
                      </View>
                      <Text style={styles.blockMetaText}>
                        Overall: <Text style={{ fontWeight: '700', color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>{blockTotalWorkers}</Text>
                        {' · '}
                        Pres: <Text style={{ fontWeight: '700', color: '#10b981' }}>{block.present_count}</Text>
                      </Text>
                    </View>

                    {/* Floors under Block */}
                    {(block.floors || []).map((floor) => {
                      const floorTotalWorkers = (floor.lines || []).reduce((sumL, l) => sumL + (l.workers ? l.workers.length : 0), 0);

                      return (
                        <View key={floor.id} style={styles.floorWrap}>
                          <View style={styles.floorHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              <MapPin size={13} color={isDarkMode ? '#a78bfa' : '#6d28d9'} />
                              <Text style={styles.floorTitle}>{floor.name}</Text>
                            </View>
                            <Text style={styles.floorMetaText}>
                              Overall: <Text style={{ fontWeight: '700', color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>{floorTotalWorkers}</Text>
                              {' · '}
                              Pres: <Text style={{ fontWeight: '700', color: '#10b981' }}>{floor.present_count}</Text>
                            </Text>
                          </View>

                          {/* Assembly Lines under Floor */}
                          {(floor.lines || []).map((line) => {
                            const isExpanded = expandedLines[line.id] !== false;
                            const presentCount = line.present_count || 0;
                            const absentCount = line.absent_count !== undefined ? line.absent_count : (line.workers ? line.workers.filter(w => w.attendance_status === 'Absent').length : 0);
                            const totalWorkers = line.workers ? line.workers.length : 0;

                            return (
                              <View key={line.id} style={styles.lineCard}>
                                <TouchableOpacity
                                  style={styles.lineCardHeader}
                                  onPress={() => toggleLineExpand(line.id)}
                                  activeOpacity={0.8}
                                >
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.lineName}>{line.name}</Text>
                                    <Text style={styles.lineSub}>
                                      Overall Count: {totalWorkers} Employees
                                    </Text>
                                  </View>

                              <View style={styles.lineBadges}>
                                <View style={[styles.badgePill, styles.badgePillGreen]}>
                                  <Text style={styles.badgeTextGreen}>{presentCount} Pres</Text>
                                </View>
                                <View style={[styles.badgePill, absentCount > 0 ? styles.badgePillRed : styles.badgePillGray]}>
                                  <Text style={absentCount > 0 ? styles.badgeTextRed : styles.badgeTextGray}>{absentCount} Abs</Text>
                                </View>
                                {isExpanded ? (
                                  <ChevronUp size={16} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                                ) : (
                                  <ChevronDown size={16} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                                )}
                              </View>
                            </TouchableOpacity>

                              {/* Employees assigned under Assembly Line */}
                              {isExpanded && (
                                <View style={styles.workerListWrap}>
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={styles.workerListHeading}>ASSIGNED EMPLOYEES ({totalWorkers})</Text>
                                    {totalWorkers > 5 && (
                                      <Text style={{ fontSize: 10, color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: '500' }}>
                                        Scroll to view all ({totalWorkers})
                                      </Text>
                                    )}
                                  </View>

                                  {line.workers && line.workers.length > 0 ? (
                                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 260 }} showsVerticalScrollIndicator={true}>
                                      {line.workers.map((worker) => {
                                        const isPres = worker.attendance_status === 'Present' || worker.attendance_status === 'Coming';

                                        return (
                                          <View key={worker.id} style={styles.workerRow}>
                                            <View style={styles.workerLeft}>
                                              <View style={[styles.avatarDot, { backgroundColor: isPres ? '#10b981' : '#ef4444' }]}>
                                                <User size={11} color="#ffffff" />
                                              </View>
                                              <View style={{ flex: 1 }}>
                                                <Text style={styles.workerName}>{worker.name}</Text>
                                                <Text style={styles.workerSub}>
                                                  {worker.main_skill || 'General'} · {worker.proficiency || 'Skilled'}
                                                </Text>
                                              </View>
                                            </View>

                                            <View style={[styles.statusChip, isPres ? styles.chipPres : styles.chipAbs]}>
                                              <Text style={[styles.statusChipText, isPres ? styles.chipTextPres : styles.chipTextAbs]}>
                                                {isPres ? 'Present' : 'Absent'}
                                              </Text>
                                            </View>
                                          </View>
                                        );
                                      })}
                                    </ScrollView>
                                  ) : (
                                    <Text style={styles.noWorkersText}>No employees assigned to this line</Text>
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              );
            })
            )}
          </>
        )}

        {/* ── IE Headcount Plan Section ── */}
        {(activeSectionTab === 'ie_headcount' || activeSectionTab === 'all') && (
          <IEHeadcountSection
            apiUrl={apiUrl}
            currentUser={currentUser}
            isDarkMode={isDarkMode}
          />
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
  sectionTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
    borderRadius: 12,
    padding: 3,
    marginTop: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDark ? '#1e293b' : '#e2e8f0',
  },
  sectionTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 9,
  },
  // ── Summary Card Styles ──
  summaryCardWrap: {
    backgroundColor: isDark ? '#111827' : '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(139,92,246,0.2)' : '#e0e7ff',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#f3f4f6' : '#0f172a',
  },
  summaryCountTag: {
    backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  summaryCountTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#a78bfa' : '#7c3aed',
  },
  summaryGridRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  summaryMetricItem: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  summaryMetricLbl: {
    fontSize: 9,
    fontWeight: '600',
    color: isDark ? '#9ca3af' : '#64748b',
    marginBottom: 2,
  },
  summaryMetricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: isDark ? '#f3f4f6' : '#0f172a',
  },
  lineBreakdownHeading: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: isDark ? '#9ca3af' : '#64748b',
    marginBottom: 4,
  },
  lineSummaryItemCard: {
    width: 140,
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    marginRight: 10,
  },
  lineSummaryNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? '#a78bfa' : '#7c3aed',
  },
  lineSummaryLocText: {
    fontSize: 10,
    color: isDark ? '#9ca3af' : '#64748b',
    marginBottom: 4,
  },
  ratePill: {
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  ratePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  // ── Admin FAB ──
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 99,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  fabText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionTabActive: {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderColor: isDark ? 'rgba(167,139,250,0.3)' : '#ddd6fe',
    borderWidth: 1,
  },
  sectionTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#64748b' : '#64748b',
  },
  sectionTabTextActive: {
    fontWeight: '700',
    color: isDark ? '#a78bfa' : '#6d28d9',
  },
  blockWrap: {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#1e293b' : '#e2e8f0',
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#1e293b' : '#f1f5f9',
    marginBottom: 10,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: isDark ? '#f8fafc' : '#0f172a',
  },
  blockMetaText: {
    fontSize: 11,
    color: isDark ? '#94a3b8' : '#64748b',
  },
  floorWrap: {
    marginBottom: 10,
    paddingLeft: 4,
  },
  floorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  floorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#a78bfa' : '#6d28d9',
  },
  floorMetaText: {
    fontSize: 11,
    color: isDark ? '#94a3b8' : '#64748b',
  },
  lineCard: {
    backgroundColor: isDark ? '#182234' : '#faf5ff',
    borderColor: isDark ? '#26334d' : '#f3e8ff',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  lineCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  lineName: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? '#f1f5f9' : '#1e293b',
  },
  lineSub: {
    fontSize: 10,
    color: isDark ? '#94a3b8' : '#64748b',
    marginTop: 2,
  },
  lineBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillGreen: {
    backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5',
    borderColor: isDark ? '#065f46' : '#a7f3d0',
    borderWidth: 1,
  },
  badgePillRed: {
    backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2',
    borderColor: isDark ? '#7f1d1d' : '#fecaca',
    borderWidth: 1,
  },
  badgePillGray: {
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
  },
  badgeTextGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#34d399' : '#059669',
  },
  badgeTextRed: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#f87171' : '#dc2626',
  },
  badgeTextGray: {
    fontSize: 10,
    fontWeight: '600',
    color: isDark ? '#64748b' : '#94a3b8',
  },
  workerListWrap: {
    padding: 10,
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderTopWidth: 1,
    borderTopColor: isDark ? '#1e293b' : '#f1f5f9',
  },
  workerListHeading: {
    fontSize: 9,
    fontWeight: '800',
    color: isDark ? '#64748b' : '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#1e293b' : '#f8fafc',
  },
  workerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerName: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#e2e8f0' : '#1e293b',
  },
  workerSub: {
    fontSize: 10,
    color: isDark ? '#94a3b8' : '#64748b',
  },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipPres: {
    backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5',
    borderColor: isDark ? '#065f46' : '#a7f3d0',
    borderWidth: 1,
  },
  chipAbs: {
    backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2',
    borderColor: isDark ? '#7f1d1d' : '#fecaca',
    borderWidth: 1,
  },
  chipTextPres: {
    fontSize: 9,
    fontWeight: '700',
    color: isDark ? '#34d399' : '#059669',
  },
  chipTextAbs: {
    fontSize: 9,
    fontWeight: '700',
    color: isDark ? '#f87171' : '#dc2626',
  },
  noWorkersText: {
    fontSize: 11,
    color: isDark ? '#64748b' : '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 4,
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
