import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  Clock,
  Briefcase,
  FileSpreadsheet,
  Wifi,
  WifiOff,
  PhoneCall,
  Bell,
  Wrench,
  ArrowRightLeft,
  Layers,
  Lock,
  LogOut,
  User,
  Key,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Database,
  Shield,
  GitPullRequest,
  Radio,
  Building2
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import WorkerManagement from './components/WorkerManagement';
import ShiftPlanning from './components/ShiftPlanning';
import AllocationBoard from './components/AllocationBoard';
import Reporting from './components/Reporting';
import MobileCallLogsView from './components/MobileCallLogsView';
import SkillMaster from './components/SkillMaster';
import HRDashboard from './components/HRDashboard';
import HierarchyMaster from './components/HierarchyMaster';
import RoleMaster from './components/RoleMaster';
import ResourceRequests from './components/ResourceRequests';
import Profile from './components/Profile';
import IEDashboard from './components/IEDashboard';
import LiveActivityFeed from './components/LiveActivityFeed';

const API_URL = 'http://localhost:5000';

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname.replace(/^\//, '');
    const validTabs = ['dashboard', 'activity-feed', 'hr-dashboard', 'ie-dashboard', 'hierarchy-master', 'workers', 'shifts', 'skills', 'allocations', 'reports', 'mobile-logs', 'resource-requests', 'profile'];
    return validTabs.includes(path) ? path : 'dashboard';
  });

  const changeTab = (tabId) => {
    setActiveTab(tabId);
    window.history.pushState(null, '', `/${tabId}`);
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, '');
      const validTabs = ['dashboard', 'activity-feed', 'hr-dashboard', 'ie-dashboard', 'hierarchy-master', 'workers', 'shifts', 'skills', 'allocations', 'reports', 'mobile-logs', 'resource-requests', 'profile'];
      setActiveTab(validTabs.includes(path) ? path : 'dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [connected, setConnected] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState([]);
  const [stats, setStats] = useState({
    total_workers: 0,
    coming: 0,
    present: 0,
    absent: 0,
    unconfirmed: 0
  });
  const [departments, setDepartments] = useState([]);
  const [notification, setNotification] = useState(null);
  const [mobileCallLogs, setMobileCallLogs] = useState([]);
  const [shortageByNumber, setShortageByNumber] = useState([]);
  const [isMasterMenuOpen, setIsMasterMenuOpen] = useState(() => {
    const path = window.location.pathname.replace(/^\//, '');
    return ['shifts', 'skills', 'hierarchy-master', 'roles'].includes(path);
  });

  // Keep Master Table submenu expanded whenever a child tab is active
  useEffect(() => {
    if (['shifts', 'skills', 'hierarchy-master', 'roles'].includes(activeTab)) {
      setIsMasterMenuOpen(true);
    }
  }, [activeTab]);

  // Master data and session simulation states
  const [workers, setWorkers] = useState([]);
  const [assemblyLines, setAssemblyLines] = useState([]);
  const [sessionUserId, setSessionUserId] = useState('all');

  // Authenticated User & Session states
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  const [loadingPercent, setLoadingPercent] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      let percent = 0;
      const interval = setInterval(() => {
        percent += Math.floor(Math.random() * 15) + 5;
        if (percent >= 100) {
          percent = 100;
          clearInterval(interval);
          setTimeout(() => setAppLoading(false), 500);
        }
        setLoadingPercent(percent);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAppLoading(false);
    }
  }, [currentUser]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCurrentUser(data.user);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        if (data.user.role === 'IE') {
          setActiveTab('ie-dashboard');
          window.history.pushState(null, '', '/ie-dashboard');
        }
      } else {
        setLoginError(data.error || 'Invalid email or password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('Could not connect to authentication server.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    window.location.href = '/';
  };

  useEffect(() => {
    if (currentUser) {
      if (['HR', 'Admin', 'Manager', 'IE', 'CEO'].includes(currentUser.role)) {
        setSessionUserId('all');
      } else if (currentUser.id) {
        setSessionUserId(currentUser.id);
      } else {
        setSessionUserId('all');
      }

      if (currentUser.role === 'IE') {
        const path = window.location.pathname.replace(/^\//, '');
        if (!path || path === 'dashboard' || path === 'index.html') {
          setActiveTab('ie-dashboard');
          window.history.replaceState(null, '', '/ie-dashboard');
        }
      }
    }
  }, [currentUser]);

  // Fetch all live statistics and summaries
  const fetchDashboardStats = async () => {
    const todayDate = getLocalDateString();
    const response = await fetch(`${API_URL}/api/dashboard-summary?date=${todayDate}`);
    if (!response.ok) {
      throw new Error(`Dashboard summary fetch failed with status ${response.status}`);
    }
    const data = await response.json();
    setStats(data.stats);
    setDepartments(data.departments);
    setRecentLogs(data.recent_activity);
  };

  const fetchMobileCallData = async () => {
    const [logsRes, shortageRes] = await Promise.all([
      fetch(`${API_URL}/api/mobile/call-log?limit=50`),
      fetch(`${API_URL}/api/mobile/shortage-by-number`),
    ]);
    if (!logsRes.ok || !shortageRes.ok) {
      throw new Error('Mobile call log or shortage fetch failed');
    }
    const logs = await logsRes.json();
    const shortage = await shortageRes.json();
    setMobileCallLogs(logs);
    setShortageByNumber(shortage);
  };

  const fetchAllData = async () => {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      const [statsRes, logsRes, shortageRes, reqRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard-summary?date=${getLocalDateString()}`),
        fetch(`${API_URL}/api/mobile/call-log?limit=50`),
        fetch(`${API_URL}/api/mobile/shortage-by-number`),
        fetch(`${API_URL}/api/requests?date=${getLocalDateString()}`)
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
        setDepartments(data.departments);
        setRecentLogs(data.recent_activity);
      }

      if (logsRes.ok && shortageRes.ok) {
        setMobileCallLogs(await logsRes.json());
        setShortageByNumber(await shortageRes.json());
      }

      if (reqRes.ok) {
        const requests = await reqRes.json();
        const pendingIncoming = requests.filter(r => r.requester_id !== user.id && r.status === 'Pending');
        setPendingRequestsCount(pendingIncoming.length);
      }

      setConnected(true);
    } catch (err) {
      console.error('Error fetching backend data:', err);
      setConnected(false);
    }
  };

  const triggerNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchMasterData = async () => {
    try {
      const userStr = localStorage.getItem('currentUser');
      const user = userStr ? JSON.parse(userStr) : null;
      const headers = user ? {
        'x-user-id': String(user.id),
        'x-user-role': user.role || 'Admin',
        'x-user-username': user.name || ''
      } : {};

      const [workersRes, linesRes, meRes] = await Promise.all([
        fetch(`${API_URL}/api/workers`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/api/assembly-lines`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/api/auth/me`, { headers }).then(r => r.json())
      ]);
      if (Array.isArray(workersRes)) setWorkers(workersRes);
      if (Array.isArray(linesRes)) setAssemblyLines(linesRes);
      if (meRes && !meRes.error) {
        setCurrentUserProfile(meRes);
      }
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
    fetchMasterData();
    // Auto-refresh stats and logs every 5 seconds to keep the Live Dashboard updated
    const interval = setInterval(fetchAllData, 5000);
    const masterInterval = setInterval(fetchMasterData, 15000);
    return () => {
      clearInterval(interval);
      clearInterval(masterInterval);
    };
  }, []);

  const sessionUser = workers.find(w => String(w.id) === String(sessionUserId)) || null;

  // Auto-switch away from unauthorized tabs when role changes
  useEffect(() => {
    if (sessionUser) {
      const allowedTabsForRole = {
        'Block Manager': ['dashboard', 'activity-feed', 'ie-dashboard', 'resource-requests', 'profile'],
        'Block Supervisor': ['dashboard', 'activity-feed', 'ie-dashboard', 'resource-requests', 'profile'],
        'Floor Manager': ['dashboard', 'activity-feed', 'ie-dashboard', 'resource-requests', 'profile'],
        'Floor Supervisor': ['dashboard', 'activity-feed', 'ie-dashboard', 'resource-requests', 'profile'],
        'Line Supervisor': ['dashboard', 'activity-feed', 'ie-dashboard', 'resource-requests', 'profile'],
        'Assembly Line Supervisor': ['dashboard', 'activity-feed', 'ie-dashboard', 'resource-requests', 'profile'],
        'HR': ['dashboard', 'activity-feed', 'hr-dashboard', 'ie-dashboard', 'workers', 'mobile-logs', 'resource-requests', 'profile'],
        'Admin': ['dashboard', 'activity-feed', 'hr-dashboard', 'ie-dashboard', 'hierarchy-master', 'roles', 'workers', 'shifts', 'skills', 'allocations', 'reports', 'mobile-logs', 'resource-requests', 'profile'],
        'CEO': ['dashboard', 'activity-feed', 'hr-dashboard', 'ie-dashboard', 'hierarchy-master', 'roles', 'workers', 'shifts', 'skills', 'allocations', 'reports', 'mobile-logs', 'resource-requests', 'profile'],
        'IE': ['ie-dashboard', 'profile']
      };
      const allowed = allowedTabsForRole[sessionUser.proficiency] || [];
      if (allowed.length > 0 && !allowed.includes(activeTab)) {
        const fallbackTab = sessionUser.proficiency === 'IE' ? 'ie-dashboard' : 'dashboard';
        setActiveTab(fallbackTab);
        window.history.replaceState(null, '', `/${fallbackTab}`);
      }
    }
  }, [sessionUserId, sessionUser, activeTab]);


  // Format today's human-readable header date
  const getTodayHeaderDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  // Render navigation-specific view
  const renderActiveView = () => {
    switch (activeTab) {
      case 'profile':
        return <Profile currentUser={currentUser} sessionUser={currentUserProfile} />;
      case 'dashboard':
        return (
          <Dashboard
            recentLogs={recentLogs}
            stats={stats}
            departments={departments}
            refreshData={fetchAllData}
            API_URL={API_URL}
            shortageByNumber={shortageByNumber}
            mobileCallLogs={mobileCallLogs}
            sessionUser={sessionUser}
            workers={workers}
            assemblyLines={assemblyLines}
          />
        );
      case 'activity-feed':
        return (
          <LiveActivityFeed
            recentLogs={recentLogs}
            shortageByNumber={shortageByNumber}
            mobileCallLogs={mobileCallLogs}
            onRefresh={fetchAllData}
            sessionUser={sessionUser}
            workers={workers}
            assemblyLines={assemblyLines}
          />
        );
      case 'hr-dashboard':
        return <HRDashboard API_URL={API_URL} sessionUser={sessionUser} />;
      case 'hierarchy-master':
        return <HierarchyMaster API_URL={API_URL} />;
      case 'roles':
        return <RoleMaster API_URL={API_URL} />;
      case 'workers':
        return (
          <WorkerManagement
            API_URL={API_URL}
            sessionUser={sessionUser}
            sessionUserId={sessionUserId}
            setSessionUserId={setSessionUserId}
            currentUser={currentUser}
          />
        );
      case 'shifts':
        return <ShiftPlanning API_URL={API_URL} />;
      case 'skills':
        return <SkillMaster API_URL={API_URL} />;
      case 'allocations':
        return <AllocationBoard API_URL={API_URL} />;
      case 'reports':
        return <Reporting API_URL={API_URL} />;
      case 'mobile-logs':
        return (
          <MobileCallLogsView
            mobileCallLogs={mobileCallLogs}
            shortageByNumber={shortageByNumber}
            onRefresh={fetchAllData}
          />
        );
      case 'ie-dashboard':
        return <IEDashboard API_URL={API_URL} currentUser={currentUser} sessionUser={sessionUser} />;
      case 'resource-requests':
        return <ResourceRequests API_URL={API_URL} currentUser={currentUser} workers={workers} sessionUser={sessionUser} />;
      default:
        return <div>View not implemented.</div>;
    }
  };

  if (!currentUser) {
    return (
      <div className="login-screen-container" style={{ overflow: 'hidden' }}>
        {/* Glow backdrop lights */}
        <div className="login-glow-light-1" />
        <div className="login-glow-light-2" />

        <div className="login-glass-card" style={{
          background: appLoading ? 'transparent' : '',
          boxShadow: appLoading ? 'none' : '',
          border: appLoading ? 'none' : '',
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <div className="login-brand-header" style={{
            transform: appLoading ? 'translateY(120px) scale(1.3)' : 'translateY(0) scale(1)',
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div className="login-brand-logo" style={{ background: 'transparent', boxShadow: 'none' }}>
              <img src="https://khindia.com/assets/icons/icon-144x144.png" alt="KH India Group" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} />
            </div>

            {/* Loading Counter */}
            <div style={{
              opacity: appLoading ? 1 : 0,
              height: appLoading ? 'auto' : 0,
              overflow: 'hidden',
              transition: 'opacity 0.4s ease',
              marginTop: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '500', color: '#1e3a8a' }}>{loadingPercent}%</div>
              <div style={{ width: '160px', height: '4px', background: 'rgba(0, 0, 0, 0.1)', marginTop: '12px', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${loadingPercent}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 0.1s ease-out' }} />
              </div>
            </div>

            <h2 className="login-brand-title" style={{ opacity: appLoading ? 0 : 1, transition: 'opacity 0.6s ease 0.4s' }}>Control Room Login</h2>
            <p className="login-brand-tagline" style={{ opacity: appLoading ? 0 : 1, transition: 'opacity 0.6s ease 0.4s' }}>Enter your credentials to access the system</p>
          </div>

          <div style={{
            opacity: appLoading ? 0 : 1,
            transform: appLoading ? 'translateY(20px)' : 'translateY(0)',
            transition: 'all 0.6s ease 0.4s',
            pointerEvents: appLoading ? 'none' : 'auto'
          }}>
            {loginError && (
              <div className="login-alert-banner">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="login-input-group">
                <label className="login-input-label">Email / User ID</label>
                <div className="login-input-field-wrapper">
                  <input
                    type="text"
                    required
                    className="login-input-field"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. admin@khgroup.com or User ID"
                  />
                  <User size={16} className="login-input-icon" />
                </div>
              </div>

              <div className="login-input-group">
                <label className="login-input-label">Password</label>
                <div className="login-input-field-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="login-input-field password-field"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <Key size={16} className="login-input-icon" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(15, 23, 42, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      outline: 'none',
                      padding: '0'
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-submit-btn">
                Sign In to Control Room
              </button>
            </form>

            <div className="login-page-footer">
              <div className="login-footer-divider">
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>TRUSTED ENTERPRISE SYSTEM</span>
              </div>

              {/* <div className="login-footer-badges">
                <div className="login-footer-badge">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span>SSL Secured</span>
                </div>
                <div className="login-footer-badge">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>Role-Based Access</span>
                </div>
                <div className="login-footer-badge">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                  <span>Live Sync</span>
                </div>
              </div> */}

              <div className="login-footer-dev">
                <span>Developed by</span>
                <h2>Zova Technologies</h2>
                <img src="/sova_logo.png" alt="Zova Technology" style={{ height: '28px', objectFit: 'contain', opacity: 0.85 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">

        {/* Brand Logo Card */}
        <div className="sidebar-brand">
          <div className="brand-icon-wrap" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
            <img src="https://khindia.com/assets/icons/icon-144x144.png" alt="KH India" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }} />
          </div>
          <div className="brand-text">
            <span className="brand-name">CLE Call AP</span>
            <span className="brand-tagline">Smart Attendance System</span>
          </div>
        </div>

        {/* Nav Section Label */}
        <div className="nav-section-label">MAIN MENU</div>

        <nav className="nav-links">
          {[
            { id: 'dashboard', icon: <LayoutDashboard size={17} />, label: 'Live Dashboard', badge: null, roles: ['Admin', 'HR', 'CEO', 'Block Manager', 'Block Supervisor', 'Floor Manager', 'Floor Supervisor', 'Line Supervisor', 'Assembly Line Supervisor'] },
            { id: 'activity-feed', icon: <Radio size={17} />, label: 'Live Activity Feed', badge: recentLogs.length > 0 ? recentLogs.length : null, roles: ['Admin', 'HR', 'CEO', 'Block Manager', 'Block Supervisor', 'Floor Manager', 'Floor Supervisor', 'Line Supervisor', 'Assembly Line Supervisor'] },
            { id: 'ie-dashboard', icon: <FileSpreadsheet size={17} />, label: 'IE Headcount Plan', badge: null, roles: ['Admin', 'HR', 'CEO', 'IE', 'Block Manager', 'Block Supervisor', 'Floor Manager', 'Floor Supervisor', 'Line Supervisor', 'Assembly Line Supervisor'] },
            { id: 'resource-requests', icon: <GitPullRequest size={17} />, label: 'Resource Requests', badge: null, roles: ['Admin', 'HR', 'CEO', 'Block Manager', 'Block Supervisor', 'Floor Manager', 'Floor Supervisor', 'Line Supervisor', 'Assembly Line Supervisor'] },
            { id: 'hr-dashboard', icon: <ArrowRightLeft size={17} />, label: 'HR Reassignment', badge: null, roles: ['Admin', 'HR'] },
            { id: 'workers', icon: <Users size={17} />, label: 'Employee Roster', badge: null, roles: ['Admin', 'HR'] },
            {
              id: 'master-table',
              icon: <Database size={17} />,
              label: 'Master Table',
              badge: null,
              roles: ['Admin'],
              subItems: [
                { id: 'shifts', icon: <Building2 size={15} />, label: 'Assembly Lines Roster' },
                { id: 'skills', icon: <Wrench size={15} />, label: 'Skill Master' },
                { id: 'hierarchy-master', icon: <Layers size={15} />, label: 'Hierarchy Master' },
                { id: 'roles', icon: <Shield size={15} />, label: 'Role Master' }
              ]
            },
            { id: 'allocations', icon: <Briefcase size={17} />, label: 'Allocations', badge: null, roles: ['Admin'] },
            { id: 'reports', icon: <FileSpreadsheet size={17} />, label: 'Ledger & Reports', badge: null, roles: ['Admin'] },
            { id: 'mobile-logs', icon: <PhoneCall size={17} />, label: 'Mobile Call Logs', badge: mobileCallLogs.length > 0 ? mobileCallLogs.length : null, roles: ['Admin', 'HR'] },
          ]
            .filter(item => {
              const role = currentUser ? currentUser.role : 'Admin';
              return item.roles.includes(role);
            })
            .map(({ id, icon, label, badge, subItems }) => {
              if (subItems) {
                const isChildActive = subItems.some(sub => activeTab === sub.id);
                return (
                  <li key={id} className={`nav-item ${isChildActive ? 'active' : ''}`}>
                    <button onClick={() => {
                      if (!isMasterMenuOpen) {
                        setIsMasterMenuOpen(true);
                        if (!isChildActive) {
                          changeTab(subItems[0].id);
                        }
                      } else {
                        setIsMasterMenuOpen(!isMasterMenuOpen);
                      }
                    }}>
                      <span className="nav-icon-pill">{icon}</span>
                      <span className="nav-label">{label}</span>
                      {isMasterMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {isMasterMenuOpen && (
                      <ul className="nav-submenu">
                        {subItems.map(sub => (
                          <li key={sub.id} className={`nav-submenu-item ${activeTab === sub.id ? 'active' : ''}`}>
                            <button onClick={() => changeTab(sub.id)}>
                              <span style={{ marginRight: '0.65rem', display: 'flex', alignItems: 'center', opacity: activeTab === sub.id ? 1 : 0.7 }}>{sub.icon}</span>
                              {sub.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={id} className={`nav-item ${activeTab === id ? 'active' : ''}`}>
                  <button onClick={() => changeTab(id)}>
                    <span className="nav-icon-pill">{icon}</span>
                    <span className="nav-label">{label}</span>
                    {badge && <span className="nav-badge">{badge}</span>}
                    {activeTab === id && <span className="nav-active-bar" />}
                  </button>
                </li>
              );
            })}
        </nav>

        {/* Sidebar Footer: Connection Status */}
        <div className="sidebar-footer">
          <div className={`connection-card ${connected ? 'connected' : 'disconnected'}`}>
            <div className="connection-left">
              <div className="connection-dot-wrap">
                {connected
                  ? <Wifi size={15} />
                  : <WifiOff size={15} />
                }
              </div>
              <div className="connection-info">
                <span className="connection-label">Telephony Link</span>
                <span className="connection-status">{connected ? 'Live & Syncing' : 'Reconnecting…'}</span>
              </div>
            </div>
            <div className={`connection-pill ${connected ? 'on' : 'off'}`}>
              {connected ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="header-title">
            <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Control Room</h2>
            <p>{getTodayHeaderDate()}</p>
          </div>

          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', transition: 'background 0.2s' }}
              onClick={() => changeTab('resource-requests')}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              title="Resource Requests"
            >
              <Bell size={18} color="#9ca3af" />
              {pendingRequestsCount >= 0 && (
                <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: pendingRequestsCount > 0 ? '#ef4444' : '#64748b', color: 'white', fontSize: '10px', fontWeight: 'bold', minWidth: '18px', height: '18px', padding: '0 4px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0f172a' }}>
                  {pendingRequestsCount}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>User:</span>
                <strong style={{ fontSize: '0.85rem', color: '#01596fff' }}>{currentUser.username}</strong>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  fontWeight: '600'
                }}>
                  {currentUser.role}
                </span>
                <ChevronDown size={14} style={{ color: '#9ca3af', transform: showProfileDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {showProfileDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  minWidth: '160px',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  <button
                    style={{
                      width: '100%', padding: '0.75rem 1rem', textAlign: 'left', background: 'none', border: 'none',
                      cursor: 'pointer', color: '#f1f5f9', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}
                    onClick={() => { setShowProfileDropdown(false); changeTab('profile'); }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <User size={14} /> My Profile
                  </button>
                  <button
                    style={{
                      width: '100%', padding: '0.75rem 1rem', textAlign: 'left', background: 'none', border: 'none',
                      cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                    onClick={() => { setShowProfileDropdown(false); handleLogout(); }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>

            <div className={`date-badge ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? (
                <Wifi size={14} color="var(--color-success)" />
              ) : (
                <WifiOff size={14} color="var(--color-danger)" />
              )}
              <span>{connected ? 'LIVE CONNECTION ACTIVE' : 'LIVE CONNECTION INACTIVE'}</span>
            </div>
          </div>
        </header>

        {/* Global Toast Alert Notifications */}
        {notification && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)',
            border: '1px solid var(--accent-color)',
            boxShadow: '0 10px 30px rgba(124, 58, 237, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.5rem',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            zIndex: 10000,
            animation: 'slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <Bell size={18} color="var(--accent-color)" />
            <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{notification}</span>
          </div>
        )}

        {/* Dynamic View Section */}
        {renderActiveView()}
      </main>
    </div>
  );
}
