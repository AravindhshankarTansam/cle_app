import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import {
  ChevronLeft,
  User,
  Shield,
  Mail,
  Phone,
  LogOut,
  Settings,
  Lock
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function UserInfoScreen({ currentUser, isDarkMode, onBack, onLogout }) {
  const styles = createStyles(isDarkMode);
  
  // Animations
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      {/* ── Background Decoration ── */}
      <View style={styles.bgAccent} />
      <View style={styles.bgCircle} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.75}>
          <ChevronLeft size={24} color={isDarkMode ? '#f9fafb' : '#1e1b4b'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <User size={46} color={isDarkMode ? '#a78bfa' : '#8b5cf6'} strokeWidth={1.5} />
            </View>
            <View style={styles.roleBadge}>
              <Shield size={12} color="#fff" strokeWidth={2.5} />
              <Text style={styles.roleBadgeText}>{currentUser.role}</Text>
            </View>
          </View>
          <Text style={styles.username}>{currentUser.username}</Text>
          <Text style={styles.userId}>ID: {currentUser.id || Math.floor(Math.random() * 9000) + 1000}</Text>
        </View>

        {/* ── Info Section ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe' }]}>
                <Mail size={18} color={isDarkMode ? '#38bdf8' : '#0284c7'} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowLabel}>Email Address</Text>
                <Text style={styles.rowValue}>{currentUser.email || 'Not provided'}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5' }]}>
                <Phone size={18} color={isDarkMode ? '#34d399' : '#059669'} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowLabel}>Phone Number</Text>
                <Text style={styles.rowValue}>{currentUser.phone || 'Not provided'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Actions Section ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: isDarkMode ? 'rgba(156, 163, 175, 0.1)' : '#f1f5f9' }]}>
                <Settings size={18} color={isDarkMode ? '#9ca3af' : '#64748b'} />
              </View>
              <Text style={styles.actionText}>Preferences</Text>
              <ChevronLeft size={16} color={isDarkMode ? '#6b7280' : '#94a3b8'} style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: isDarkMode ? 'rgba(156, 163, 175, 0.1)' : '#f1f5f9' }]}>
                <Lock size={18} color={isDarkMode ? '#9ca3af' : '#64748b'} />
              </View>
              <Text style={styles.actionText}>Security & Privacy</Text>
              <ChevronLeft size={16} color={isDarkMode ? '#6b7280' : '#94a3b8'} style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Logout Button ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
          <LogOut size={18} color="#ef4444" strokeWidth={2.5} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
        
      </Animated.View>
    </View>
  );
}

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
    height: 220,
    backgroundColor: isDark ? '#0c0a1e' : '#e0e7ff',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  bgCircle: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: isDark ? 'rgba(109, 40, 217, 0.08)' : 'rgba(99, 102, 241, 0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.select({ ios: 8, default: 16 }),
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#f9fafb' : '#1e1b4b',
    letterSpacing: -0.3,
  },
  headerRightSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: isDark ? '#1a1040' : '#ffffff',
    borderRadius: 24,
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#e0e7ff',
    shadowColor: isDark ? '#7c3aed' : '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: isDark ? 'rgba(167, 139, 250, 0.1)' : '#f5f3ff',
    borderWidth: 2,
    borderColor: isDark ? 'rgba(167, 139, 250, 0.3)' : '#ddd6fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    position: 'absolute',
    bottom: 0,
    right: -10,
    backgroundColor: isDark ? '#7c3aed' : '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: isDark ? '#1a1040' : '#ffffff',
    gap: 4,
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  username: {
    fontSize: 24,
    fontWeight: '800',
    color: isDark ? '#f9fafb' : '#1e1b4b',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  userId: {
    fontSize: 13,
    color: isDark ? '#9ca3af' : '#64748b',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#e5e7eb' : '#1e293b',
    letterSpacing: -0.2,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: isDark ? '#111827' : '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#64748b',
    fontWeight: '500',
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 15,
    color: isDark ? '#f3f4f6' : '#0f172a',
    fontWeight: '600',
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    color: isDark ? '#f3f4f6' : '#0f172a',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: isDark ? '#1f2937' : '#f1f5f9',
    marginLeft: 70,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fecaca',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 40,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
