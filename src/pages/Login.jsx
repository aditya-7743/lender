import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [mode, setMode] = useState('email'); // 'email' | 'phone'
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmResult, setConfirmResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, signup, setupRecaptcha, sendOTP, updateUserProfile } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        const cred = await signup(email, password);
        if (name) await updateUserProfile(name);
      }
      navigate('/');
    } catch (err) {
      console.error("Login/Signup Error:", err);
      setError(getFriendlyError(err.code) + ` (${err.code})`);
    }
    setLoading(false);
  }

  async function handleSendOTP(e) {
    e.preventDefault();
    setError('');
    if (!phone.startsWith('+')) {
      setError('Phone number mein country code daalo, jaise +91XXXXXXXXXX');
      return;
    }
    setLoading(true);
    try {
      setupRecaptcha('recaptcha-container');
      const result = await sendOTP(phone);
      setConfirmResult(result);
      setStep('otp');
    } catch (err) {
      setError(getFriendlyError(err.code));
    }
    setLoading(false);
  }

  async function handleVerifyOTP(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmResult.confirm(otp);
      navigate('/');
    } catch (err) {
      setError('OTP galat hai. Dobara try karo.');
    }
    setLoading(false);
  }

  function getFriendlyError(code) {
    const map = {
      'auth/user-not-found': 'Yeh account exist nahi karta.',
      'auth/wrong-password': 'Password galat hai.',
      'auth/email-already-in-use': 'Yeh email already registered hai.',
      'auth/weak-password': 'Password kam se kam 6 characters ka ho.',
      'auth/invalid-email': 'Email format galat hai.',
      'auth/invalid-phone-number': 'Phone number galat hai.',
      'auth/too-many-requests': 'Bahut zyada attempts. Thodi der baad try karo.',
    };
    return map[code] || 'Kuch galat hua. Dobara try karo.';
  }

  return (
    <div className="login-page">
      <div id="recaptcha-container" ref={recaptchaRef}></div>

      {/* Header */}
      <div className="login-header">
        <div className="login-logo">
          <div className="logo-icon">₹</div>
          <div>
            <h1 className="logo-title">Udhaari</h1>
            <p className="logo-sub">Smart Khata App</p>
          </div>
        </div>
        <p className="login-tagline">Apna udhaar track karo, <br />tension-free raho 💜</p>
      </div>

      {/* Card */}
      <div className="login-card">
        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'email' ? 'active' : ''}`}
            onClick={() => { setMode('email'); setStep('form'); setError(''); }}
          >
            📧 Email
          </button>
          <button
            className={`mode-btn ${mode === 'phone' ? 'active' : ''}`}
            onClick={() => { setMode('phone'); setStep('form'); setError(''); }}
          >
            📱 Phone
          </button>
        </div>

        {/* Email Form */}
        {mode === 'email' && (
          <form onSubmit={handleEmailSubmit}>
            <div className="login-tabs">
              <button type="button" className={`login-tab ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>Login</button>
              <button type="button" className={`login-tab ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>Sign Up</button>
            </div>

            {!isLogin && (
              <div className="input-group fade-in">
                <label>Aapka Naam</label>
                <input className="input" type="text" placeholder="Ramesh Kumar" value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div className="input-group">
              <label>Email</label>
              <input className="input" type="email" placeholder="aap@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : (isLogin ? 'Login Karo' : 'Account Banao')}
            </button>
          </form>
        )}

        {/* Phone Form */}
        {mode === 'phone' && step === 'form' && (
          <form onSubmit={handleSendOTP}>
            <div className="input-group" style={{ marginTop: '16px' }}>
              <label>Phone Number</label>
              <input
                className="input"
                type="tel"
                placeholder="+91XXXXXXXXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'OTP Bhejo'}
            </button>
          </form>
        )}

        {/* OTP Verify */}
        {mode === 'phone' && step === 'otp' && (
          <form onSubmit={handleVerifyOTP}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px', marginTop: '16px', textAlign: 'center' }}>
              OTP bheja gaya hai <strong>{phone}</strong> par
            </p>
            <div className="input-group">
              <label>OTP Daalo</label>
              <input
                className="input otp-input"
                type="number"
                placeholder="••••••"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                maxLength="6"
                required
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Verify Karo'}
            </button>
            <button type="button" className="btn btn-ghost" style={{ marginTop: '10px' }} onClick={() => { setStep('form'); setError(''); }}>
              Wapas Jao
            </button>
          </form>
        )}
      </div>

      <style>{`
        .login-page {
          min-height: 100dvh;
          background: var(--bg-deep);
          display: flex;
          flex-direction: column;
          padding: 0 20px 40px;
          position: relative;
          overflow: hidden;
        }
        .login-page::before {
          content: '';
          position: absolute;
          top: -100px;
          left: -100px;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-page::after {
          content: '';
          position: absolute;
          bottom: -50px;
          right: -50px;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-header {
          padding-top: calc(60px + env(safe-area-inset-top));
          margin-bottom: 40px;
          animation: fadeInUp 0.5s ease;
        }
        .login-logo {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
        }
        .logo-icon {
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg, var(--purple-primary), var(--purple-light));
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          font-weight: 800;
          color: white;
          box-shadow: 0 6px 24px rgba(124,58,237,0.4);
        }
        .logo-title {
          font-size: 1.8rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff 30%, var(--purple-light));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1.1;
        }
        .logo-sub {
          font-size: 0.78rem;
          color: var(--text-muted);
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .login-tagline {
          font-size: 1.15rem;
          color: var(--text-secondary);
          line-height: 1.6;
          font-weight: 400;
        }
        .login-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px 20px;
          animation: fadeInUp 0.5s ease 0.1s both;
          position: relative;
          z-index: 1;
        }
        .mode-toggle {
          display: flex;
          gap: 8px;
          background: var(--bg-surface);
          border-radius: var(--radius-sm);
          padding: 4px;
          margin-bottom: 20px;
        }
        .mode-btn {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-family: var(--font);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mode-btn.active {
          background: var(--purple-primary);
          color: white;
          box-shadow: 0 2px 12px rgba(124,58,237,0.35);
        }
        .login-tabs {
          display: flex;
          gap: 0;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border);
        }
        .login-tab {
          flex: 1;
          padding: 10px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-family: var(--font);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
        }
        .login-tab.active {
          color: var(--purple-light);
          border-bottom-color: var(--purple-light);
        }
        .otp-input {
          font-size: 1.4rem;
          letter-spacing: 0.4em;
          text-align: center;
        }
        .error-msg {
          color: var(--red-soft);
          font-size: 0.82rem;
          margin-bottom: 12px;
          padding: 10px 14px;
          background: rgba(239,68,68,0.1);
          border-radius: 8px;
          border: 1px solid rgba(239,68,68,0.2);
        }
      `}</style>
    </div>
  );
}
