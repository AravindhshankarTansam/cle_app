import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import {
  Shield,
  Lock,
  User,
  LogIn,
  AlertCircle,
  Wifi,
  X,
  Info,
  ChevronRight,
  Eye,
  EyeOff,
  Moon,
  Sun,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function LoginScreen({ apiUrl, setApiUrl, onLoginSuccess, isDarkMode, toggleTheme }) {
  const styles = createStyles(isDarkMode);

  // Config Modal States
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [ipInput, setIpInput] = useState(
    apiUrl.replace('http://', '').replace(':5000', '')
  );

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for the shield icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    setLoginError('');
    if (!email.trim() || !password.trim()) {
      setLoginError('Both fields are required to continue.');
      triggerShake();
      return;
    }

    setLoginLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          username: email.trim(),
          userId: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        onLoginSuccess(data.user);
      } else {
        setLoginError(data.error || 'Authentication failed. Please try again.');
        triggerShake();
      }
    } catch (err) {
      console.error(err);
      setLoginError('Cannot reach server. Check your IP configuration.');
      triggerShake();
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSaveConfig = () => {
    const formatted = ipInput.trim();
    if (formatted) {
      setApiUrl(formatted.startsWith('http') ? formatted : `http://${formatted}:5000`);
    }
    setShowConfigModal(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background layered decoration */}
      <View style={styles.bgLayer1} />
      <View style={styles.bgLayer2} />
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Theme Toggle Button */}
      <TouchableOpacity style={styles.themeToggleBtn} onPress={toggleTheme}>
        {isDarkMode ? <Sun size={20} color="#fcd34d" /> : <Moon size={20} color="#4b5563" />}
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.wrapper,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* ── TOP BRAND SECTION ── */}
          <View style={styles.brandSection}>
            <Animated.View
              style={[styles.shieldWrap, { transform: [{ scale: pulseAnim }] }]}
            >
              <View style={styles.shieldGlow} />
              <Shield size={34} color="#fff" strokeWidth={1.5} />
            </Animated.View>

            <Text style={[styles.brandTitle, { fontSize: 22, textAlign: 'center', marginBottom: 14 }]}>
              Smart Attendance Control Centre
            </Text>
          </View>

          {/* ── LOGIN CARD ── */}
          <Animated.View
            style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}
          >
            <Text style={styles.cardHeading}>Sign In</Text>
            <Text style={styles.cardSub}>
              Restricted to Line Supervisors, Supervisors, Managers &amp; Admins
            </Text>

            {/* Error Banner */}
            {loginError ? (
              <View style={styles.errorBox}>
                <AlertCircle size={15} color="#f87171" />
                <Text style={styles.errorMsg}>{loginError}</Text>
              </View>
            ) : null}

            {/* User ID / Email Input */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>USER ID / EMAIL ADDRESS</Text>
              <View
                style={[
                  styles.inputRow,
                  emailFocused && styles.inputRowFocused,
                ]}
              >
                <User
                  size={16}
                  color={emailFocused ? '#7c3aed' : (isDarkMode ? '#6b7280' : '#9ca3af')}
                  strokeWidth={2}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter User ID or Email"
                  placeholderTextColor={isDarkMode ? "#4b5563" : "#9ca3af"}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View
                style={[
                  styles.inputRow,
                  passwordFocused && styles.inputRowFocused,
                ]}
              >
                <Lock
                  size={16}
                  color={passwordFocused ? '#7c3aed' : (isDarkMode ? '#6b7280' : '#9ca3af')}
                  strokeWidth={2}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor={isDarkMode ? "#4b5563" : "#9ca3af"}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword ? (
                    <EyeOff size={16} color={isDarkMode ? "#6b7280" : "#9ca3af"} />
                  ) : (
                    <Eye size={16} color={isDarkMode ? "#6b7280" : "#9ca3af"} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loginLoading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loginLoading}
              activeOpacity={0.85}
            >
              {loginLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <LogIn size={20} color="#fff" strokeWidth={2} />
                  <Text style={styles.loginBtnText}>Log In</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Status pill */}
            <View style={[styles.statusPill, { alignSelf: 'center', marginTop: 16 }]}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Secure Access</Text>
            </View>

          </Animated.View>

          {/* ── FOOTER ── */}
          <View style={{ alignItems: 'center', marginTop: 14 }}>
            <Text style={{ color: isDarkMode ? '#6b7280' : '#9ca3af', fontSize: 12, letterSpacing: 0.8 }}>
              Developed by
            </Text>
            <Image 
              source={require('../assets/images/sova_logo.png')} 
              style={{ width: 260, height: 160, marginTop: -40 }} 
              resizeMode="contain" 
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── SERVER CONFIG MODAL ── */}
      <Modal
        animationType="slide"
        transparent
        visible={showConfigModal}
        onRequestClose={() => setShowConfigModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Server Configuration</Text>
                <Text style={styles.modalSub}>Set your backend API host</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowConfigModal(false)}
                style={styles.modalClose}
              >
                <X size={18} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
              </TouchableOpacity>
            </View>

            {/* Info box */}
            <View style={styles.infoBox}>
              <Info size={14} color="#60a5fa" />
              <Text style={styles.infoText}>
                Simulators use{' '}
                <Text style={{ color: '#3b82f6', fontWeight: '700' }}>localhost</Text>.
                Physical devices need your PC's local IP (e.g.{' '}
                <Text style={{ color: '#3b82f6', fontWeight: '700' }}>192.168.1.10</Text>
                ) on the same Wi-Fi.
              </Text>
            </View>

            <Text style={styles.fieldLabel}>HOST / IP ADDRESS</Text>
            <View style={[styles.inputRow, { marginBottom: 20 }]}>
              <Wifi size={16} color={isDarkMode ? "#4b5563" : "#9ca3af"} />
              <TextInput
                style={styles.textInput}
                value={ipInput}
                onChangeText={setIpInput}
                placeholder="localhost or 192.168.x.x"
                placeholderTextColor={isDarkMode ? "#374151" : "#9ca3af"}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowConfigModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveConfig}>
                <Text style={styles.modalSaveText}>Save & Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────
const createStyles = (isDark) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: isDark ? '#060913' : '#f8fafc',
  },
  themeToggleBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0 : 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bgLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: isDark ? '#0e0b20' : '#e0e7ff',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  bgLayer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '22%',
    backgroundColor: isDark ? '#130e2e' : '#c7d2fe',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  bgCircle1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: isDark ? 'rgba(109, 40, 217, 0.12)' : 'rgba(99, 102, 241, 0.1)',
  },
  bgCircle2: {
    position: 'absolute',
    top: 100,
    left: -80,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: isDark ? 'rgba(79, 70, 229, 0.08)' : 'rgba(79, 70, 229, 0.05)',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 32,
  },
  wrapper: {
    flex: 1,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  shieldWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  shieldGlow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(167, 139, 250, 0.25)',
    transform: [{ scale: 1.3 }],
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: isDark ? '#ffffff' : '#0f095dff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandSub: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusText: {
    color: isDark ? '#6ee7b7' : '#059669',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: isDark ? '#111827' : '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 24,
    elevation: 14,
  },
  cardHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: isDark ? '#f9fafb' : '#0f172a',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: isDark ? '#6b7280' : '#64748b',
    marginBottom: 20,
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorMsg: {
    color: isDark ? '#fca5a5' : '#ef4444',
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#4b5563' : '#64748b',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    borderWidth: 1,
    borderColor: isDark ? '#1f2937' : '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 14, default: 11 }),
    gap: 10,
  },
  inputRowFocused: {
    borderColor: '#7c3aed',
    backgroundColor: isDark ? 'rgba(124, 58, 237, 0.04)' : '#f5f3ff',
  },
  textInput: {
    flex: 1,
    color: isDark ? '#f1f5f9' : '#0f172a',
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
    gap: 8,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.4 : 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  configLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 18,
  },
  configLinkText: {
    color: isDark ? '#6b7280' : '#94a3b8',
    fontSize: 11,
  },
  credsCard: {
    backgroundColor: isDark ? '#0d1117' : '#ffffff',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#e2e8f0',
    borderRadius: 20,
    padding: 16,
  },
  credsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  credsDivider: {
    flex: 1,
    height: 1,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
  },
  credsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: isDark ? '#4b5563' : '#94a3b8',
    letterSpacing: 1.5,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.03)' : '#f1f5f9',
  },
  credRowDenied: {
    opacity: 0.5,
    borderBottomWidth: 0,
  },
  credLeft: {
    gap: 2,
  },
  credUser: {
    color: isDark ? '#e5e7eb' : '#1e293b',
    fontSize: 13,
    fontWeight: '600',
  },
  credPass: {
    color: isDark ? '#6b7280' : '#64748b',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  roleBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: isDark ? '#111827' : '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.select({ ios: 36, default: 24 }),
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
    borderBottomWidth: 0,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: isDark ? '#374151' : '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#f9fafb' : '#0f172a',
    marginBottom: 3,
  },
  modalSub: {
    fontSize: 12,
    color: isDark ? '#6b7280' : '#64748b',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: isDark ? '#1f2937' : '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#eff6ff',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(59,130,246,0.18)' : '#bfdbfe',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    color: isDark ? '#93c5fd' : '#2563eb',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalCancelText: {
    color: isDark ? '#9ca3af' : '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSaveBtn: {
    flex: 2,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
