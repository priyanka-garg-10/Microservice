import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Settings from './components/Settings';
import SendEmail from './components/SendEmail';
import History from './components/History';
import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './components/Profile';
import EmailDoc from './components/EmailDoc';
function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <div className="brand-icon">🚀</div>
          <div>
            <div className="brand-name">MicroService Hub</div>
          </div>
        </div>
        <div className="brand-tagline">by MicroService Hub Inc.</div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Email Service</div>

        <NavLink to="/send" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-icon">✉️</span> Send Email
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-icon">📋</span> History
        </NavLink>
        <NavLink to="/credentials" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-icon">🔐</span> SMTP Credentials
        </NavLink>
        <NavLink to="/email-doc" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-icon">📚</span> API Documentation
        </NavLink>
        <div className="sidebar-divider" />
        <div className="sidebar-label">Account</div>

        <NavLink to="/profile" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-icon">👤</span> My Profile
        </NavLink>

        <div className="sidebar-divider" />
        <div className="sidebar-label">Coming Soon</div>

        <div className="nav-item">
          <span className="nav-icon">🔑</span> OTP Service
          <span className="coming-soon-badge">SOON</span>
        </div>
        <div className="nav-item">
          <span className="nav-icon">🔗</span> Signed URL
          <span className="coming-soon-badge">SOON</span>
        </div>
        <div className="nav-item">
          <span className="nav-icon">📱</span> SMS Service
          <span className="coming-soon-badge">SOON</span>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ username, onLogout }) {
  const location = useLocation();
  const titles = {
    '/send': 'Send Email',
    '/history': 'Email History',
    '/credentials': 'SMTP Credentials',
    '/profile': 'My Profile',
    '/email-doc': 'Email API Documentation',
  };
  return (
    <div className="topbar">
      <span className="topbar-title">{titles[location.pathname] || 'Email Service'}</span>
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {username && <span className="topbar-user" style={{ fontSize: '0.875rem', fontWeight: 600 }}>👤 {username}</span>}
        <span className="topbar-badge">Email Service v2.0</span>
        {username && (
          <button
            onClick={onLogout}
            className="btn btn-ghost"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#EF4444' }}
          >
            🚪 Logout
          </button>
        )}
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [token, setToken] = useState(null);
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedApiKey = localStorage.getItem('api_key');
    const savedUsername = localStorage.getItem('username');
    if (savedToken && savedUsername) {
      setToken(savedToken);
      setApiKey(savedApiKey);
      setUser({ username: savedUsername });
      setIsAuthenticated(true);
      const path = window.location.pathname;
      if (path === '/' || path === '/login' || path === '/signup') {
        navigate('/send');
      }
    } else {
      navigate('/login');
    }
    setLoading(false);
  }, [navigate]);

  const handleLoginSuccess = (userData, userToken) => {
    setUser(userData);
    setApiKey(userData.api_key);
    setToken(userToken);
    setIsAuthenticated(true);
    navigate('/send');
  };

  const handleSignupSuccess = (userData, userToken) => {
    setUser(userData);
    setApiKey(userData.api_key);
    setToken(userToken);
    setIsAuthenticated(true);
    navigate('/send');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('api_key');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    setApiKey(null);
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text-muted)' }}>
        <span className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={
          currentPage === 'login' ? (
            <div>
              <Login onLoginSuccess={handleLoginSuccess} />
              <div style={{ textAlign: 'center', marginTop: '2rem', color: '#666' }}>
                Don't have an account? <button onClick={() => setCurrentPage('signup')} style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', textDecoration: 'underline' }}>Sign up</button>
              </div>
            </div>
          ) : (
            <div>
              <Signup onSignupSuccess={handleSignupSuccess} />
              <div style={{ textAlign: 'center', marginTop: '2rem', color: '#666' }}>
                Already have an account? <button onClick={() => setCurrentPage('login')} style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', textDecoration: 'underline' }}>Login</button>
              </div>
            </div>
          )
        } />
      </Routes>
    );
  }

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <Topbar username={user?.username} onLogout={handleLogout} />
        <div className="page-content">
          <Routes>
            <Route path="/send" element={<SendEmail token={token} />} />
            <Route path="/history" element={<History token={token} />} />
            <Route path="/email-doc" element={<EmailDoc />} />
            <Route path="/credentials" element={<Settings token={token} />} />
            <Route path="/profile" element={<Profile token={token} apiKey={apiKey} onLogout={handleLogout} />} />
            <Route path="/" element={<SendEmail token={token} />} />
            <Route path="*" element={<SendEmail token={token} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
