import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import {
  FileSpreadsheet,
  MapPin,
  Package,
  Target,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function IEHeadcountSection({ apiUrl, currentUser, isDarkMode }) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState({});

  const styles = createStyles(isDarkMode);

  const fetchIEHeadcount = async () => {
    setLoading(true);
    setError('');
    try {
      const todayDate = getLocalDateString();
      const headers = currentUser ? {
        'x-user-id': String(currentUser.id),
        'x-user-role': currentUser.role || '',
        'x-user-username': currentUser.username || currentUser.name || ''
      } : {};

      const res = await fetch(`${apiUrl}/api/ie/headcount?from_date=${todayDate}&to_date=${todayDate}`, { headers });
      if (!res.ok) {
        throw new Error('Failed to load IE headcount plan.');
      }
      const data = await res.json();
      setReportData(data.report || []);
      setLastUpdated(new Date());

      // Expand all by default
      const initialExpanded = {};
      (data.report || []).forEach(row => {
        const key = `${row.block_id}_${row.floor_id}_${row.line_id}_${row.product_name}_${row.style_number || ''}_${row.from_date}_${row.to_date}`;
        initialExpanded[key] = true;
      });
      setExpandedKeys(initialExpanded);
    } catch (err) {
      console.error(err);
      setError('Could not connect to IE headcount plan service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIEHeadcount();
    const interval = setInterval(fetchIEHeadcount, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (key) => {
    setExpandedKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Group report data into target scope cards
  const groupedLineScopes = [];
  reportData.forEach(row => {
    if (row.ie_manpower <= 0) return; // Only show active manpower targets
    const groupKey = `${row.block_id}_${row.floor_id}_${row.line_id}_${row.product_name}_${row.style_number || ''}_${row.from_date}_${row.to_date}`;
    let group = groupedLineScopes.find(g => g.key === groupKey);
    if (!group) {
      group = {
        key: groupKey,
        block_name: row.block_name,
        floor_name: row.floor_name,
        line_name: row.line_name,
        product_name: row.product_name,
        style_number: row.style_number || '',
        production_target: row.production_target,
        from_date: row.from_date,
        to_date: row.to_date,
        skills: []
      };
      groupedLineScopes.push(group);
    }
    group.skills.push(row);
  });

  const formatTime = (date) => {
    if (!date) return '—';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionRow}>
        <View style={styles.sectionLeft}>
          <FileSpreadsheet size={16} color={isDarkMode ? "#a78bfa" : "#7c3aed"} />
          <Text style={styles.sectionTitle}>IE Headcount Plan</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={fetchIEHeadcount}
          disabled={loading}
          activeOpacity={0.7}
        >
          <RefreshCw size={13} color={isDarkMode ? "#a78bfa" : "#7c3aed"} />
          <Text style={styles.refreshText}>
            {lastUpdated ? formatTime(lastUpdated) : 'Sync'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <AlertTriangle size={14} color={isDarkMode ? "#f87171" : "#ef4444"} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Loading State */}
      {loading && groupedLineScopes.length === 0 ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color="#7c3aed" />
          <Text style={styles.emptyText}>Loading IE headcount plan...</Text>
        </View>
      ) : groupedLineScopes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Layers size={24} color={isDarkMode ? "#475569" : "#cbd5e1"} />
          <Text style={styles.emptyCardTitle}>No Target Scopes Set</Text>
          <Text style={styles.emptyCardSub}>
            No IE headcount target scopes have been planned for today.
          </Text>
        </View>
      ) : (
        groupedLineScopes.map((group) => {
          const totalTargetManpower = group.skills.reduce((sum, s) => sum + (parseInt(s.ie_manpower) || 0), 0);
          const totalRosterCount = group.skills.reduce((sum, s) => sum + (parseInt(s.roster_count) || 0), 0);
          const totalPresent = group.skills.reduce((sum, s) => sum + (parseInt(s.present_count) || 0), 0);
          const rosterShortage = Math.max(0, totalTargetManpower - totalRosterCount);
          const presentShortage = Math.max(0, totalTargetManpower - totalPresent);
          const isExpanded = expandedKeys[group.key] !== false;

          return (
            <View key={group.key} style={styles.card}>
              {/* Card Header Bar */}
              <TouchableOpacity 
                style={styles.cardHeader} 
                onPress={() => toggleExpand(group.key)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.iconChip}>
                    <MapPin size={14} color="#7c3aed" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationTitle} numberOfLines={1}>
                      {group.block_name} · {group.floor_name}
                    </Text>
                    <Text style={styles.lineSubTitle} numberOfLines={1}>
                      {group.line_name}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.cardHeaderRight}>
                  <View style={styles.targetBadge}>
                    <Target size={11} color="#2563eb" />
                    <Text style={styles.targetBadgeText}>{group.production_target} units</Text>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={16} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                  ) : (
                    <ChevronDown size={16} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Product Info Bar */}
              <View style={styles.productBar}>
                <View style={styles.productPill}>
                  <Package size={12} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                  <Text style={styles.productText}>
                    Product: <Text style={styles.productVal}>{group.product_name || 'General'}</Text>
                  </Text>
                </View>
                {group.style_number ? (
                  <View style={styles.stylePill}>
                    <Text style={styles.styleText}>
                      Style: <Text style={styles.styleVal}>{group.style_number}</Text>
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Overall Group Summary Bar */}
              <View style={styles.summaryBar}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLbl}>Target Manpower</Text>
                  <Text style={[styles.summaryVal, { color: isDarkMode ? '#60a5fa' : '#2563eb' }]}>
                    {totalTargetManpower}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLbl}>Overall Count</Text>
                  <Text style={[styles.summaryVal, { color: isDarkMode ? '#e2e8f0' : '#0f172a' }]}>
                    {totalRosterCount}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLbl}>Present</Text>
                  <Text style={[styles.summaryVal, { color: isDarkMode ? '#34d399' : '#059669' }]}>
                    {totalPresent}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLbl}>Shortage</Text>
                  <Text style={[styles.summaryVal, { color: rosterShortage > 0 ? (isDarkMode ? '#f87171' : '#dc2626') : (isDarkMode ? '#34d399' : '#059669') }]}>
                    {rosterShortage > 0 ? `-${rosterShortage}` : '0'}
                  </Text>
                </View>
              </View>

              {/* Skill Breakdown List */}
              {isExpanded && (
                <View style={styles.skillsList}>
                  <Text style={styles.skillsListHeader}>SKILL MASTER DESIGNATIONS ({group.skills.length})</Text>
                  {group.skills.map((skill, sIdx) => {
                    const rosterCount = skill.roster_count || 0;
                    const presentCount = skill.present_count || 0;
                    const target = skill.ie_manpower || 0;
                    const shortage = Math.max(0, target - rosterCount);
                    const isShortage = shortage > 0;

                    return (
                      <View 
                        key={sIdx} 
                        style={[
                          styles.skillRow,
                          sIdx < group.skills.length - 1 && styles.skillRowBorder
                        ]}
                      >
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.skillName}>{skill.designation}</Text>
                        </View>

                        <View style={styles.skillMetrics}>
                          <View style={styles.skillMetricItem}>
                            <Text style={styles.skillMetricLbl}>Target</Text>
                            <Text style={styles.skillMetricVal}>{target}</Text>
                          </View>
                          <View style={styles.skillMetricItem}>
                            <Text style={styles.skillMetricLbl}>Overall</Text>
                            <Text style={styles.skillMetricVal}>{rosterCount}</Text>
                          </View>
                          <View style={styles.skillMetricItem}>
                            <Text style={styles.skillMetricLbl}>Pres</Text>
                            <Text style={styles.skillMetricVal}>{presentCount}</Text>
                          </View>
                          <View style={[styles.gapChip, isShortage ? styles.gapChipRed : styles.gapChipGreen]}>
                            <Text style={[styles.gapChipText, isShortage ? styles.gapTextRed : styles.gapTextGreen]}>
                              {isShortage ? `-${shortage} Short` : 'OK'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

const createStyles = (isDark) => StyleSheet.create({
  container: {
    marginTop: 18,
    marginBottom: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: isDark ? '#f8fafc' : '#0f172a',
    letterSpacing: -0.2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#a78bfa' : '#7c3aed',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2',
    borderColor: isDark ? '#7f1d1d' : '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: isDark ? '#f87171' : '#dc2626',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: isDark ? '#94a3b8' : '#64748b',
  },
  emptyCard: {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderWidth: 1,
    borderColor: isDark ? '#1e293b' : '#e2e8f0',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#e2e8f0' : '#334155',
  },
  emptyCardSub: {
    fontSize: 12,
    color: isDark ? '#64748b' : '#94a3b8',
    textAlign: 'center',
  },
  card: {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#1e293b' : '#e2e8f0',
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: isDark ? '#182234' : '#faf5ff',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#1e293b' : '#f3e8ff',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#f1f5f9' : '#1e293b',
  },
  lineSubTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#a78bfa' : '#6d28d9',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : '#eff6ff',
    borderColor: isDark ? '#1e40af' : '#bfdbfe',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  targetBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#60a5fa' : '#1d4ed8',
  },
  productBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#1e293b' : '#f1f5f9',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
  },
  productPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productText: {
    fontSize: 11,
    color: isDark ? '#94a3b8' : '#64748b',
  },
  productVal: {
    fontWeight: '700',
    color: isDark ? '#e2e8f0' : '#0f172a',
  },
  stylePill: {
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  styleText: {
    fontSize: 11,
    color: isDark ? '#94a3b8' : '#64748b',
  },
  styleVal: {
    fontWeight: '700',
    color: isDark ? '#cbd5e1' : '#334155',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#131c2e' : '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#1e293b' : '#e2e8f0',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 22,
    backgroundColor: isDark ? '#334155' : '#cbd5e1',
  },
  summaryLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#94a3b8' : '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  skillsList: {
    padding: 12,
  },
  skillsListHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: isDark ? '#64748b' : '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  skillRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#1e293b' : '#f1f5f9',
  },
  skillName: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#cbd5e1' : '#334155',
  },
  skillMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skillMetricItem: {
    alignItems: 'center',
  },
  skillMetricLbl: {
    fontSize: 9,
    color: isDark ? '#64748b' : '#94a3b8',
  },
  skillMetricVal: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#e2e8f0' : '#1e293b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  gapChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  gapChipRed: {
    backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2',
    borderWidth: 1,
    borderColor: isDark ? '#7f1d1d' : '#fecaca',
  },
  gapChipGreen: {
    backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5',
    borderWidth: 1,
    borderColor: isDark ? '#065f46' : '#a7f3d0',
  },
  gapTextRed: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#f87171' : '#dc2626',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  gapTextGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#34d399' : '#059669',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
