import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { usePin } from '../context/PinContext';
import { useToast } from '../hooks/useToast';

export default function Settings() {
  const { user, logout, updateUserProfile } = useAuth();
  const { lang, toggleLang, t } = useLang();
  const { pinEnabled, setPin, removePin, lockApp } = usePin();
  const navigate = useNavigate();
  const { showToast, Toast } = useToast();

  const [name, setName] = useState(user?.displayName || '');
  const [bizName, setBizName] = useState(() => localStorage.getItem('udhaari_bizname') || '');
  const [loading, setLoading] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  // PIN setup
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinStep, setPinStep] = useState('set'); // 'set' | 'confirm'
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinError, setPinError] = useState('');

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (name.trim()) await updateUserProfile(name.trim());
      if (bizName.trim()) localStorage.setItem('udhaari_bizname', bizName.trim());
      showToast('Settings save ho gayi! ✅');
    } catch { showToast('Save nahi hua', 'error'); }
    setLoading(false);
  }

  function handlePinKey(num, isStep2) {
    if (isStep2) {
      if (pin2.length < 4) {
        const p = pin2 + num;
        setPin2(p);
        if (p.length === 4) {
          if (p === pin1) {
            setPin(p);
            setShowPinSetup(false);
            setPinStep('set');
            setPin1(''); setPin2('');
            showToast('PIN set ho gaya! 🔐');
          } else {
            setPinError('PIN mismatch!');
            setPin2('');
          }
        }
      }
    } else {
      if (pin1.length < 4) {
        const p = pin1 + num;
        setPin1(p);
        if (p.length === 4) { setPinStep('confirm'); setPinError(''); }
      }
    }
  }

  async function handleLogout() {
    lockApp();
    await logout();
    navigate('/login');
  }

  return (
    <div className="page">
      {Toast}
      <div className="page-header">
        <h1 style={{ fontSize: '1.3rem', fontWeight: '800' }}>⚙️ {t.settings}</h1>
      </div>

      <div className="page-content">
        {/* Profile Card */}
        <div className="card fade-in" style={{ marginBottom: '16px' }}>
          <div className="settings-section-title">👤 Profile</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <div className="profile-avatar">
              {(user?.displayName || user?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem' }}>{user?.displayName || 'Naam nahi hai'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email || user?.phoneNumber || ''}</div>
            </div>
          </div>
          <form onSubmit={handleSave}>
            <div className="input-group">
              <label>{t.profileName}</label>
              <input className="input" type="text" placeholder="Aapka naam..." value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Business / Shop Ka Naam</label>
              <input className="input" type="text" placeholder="Jaise: Sharma Kirana Store..." value={bizName} onChange={e => setBizName(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : `💾 ${t.save}`}
            </button>
          </form>
        </div>

        {/* Language Toggle */}
        <div className="card fade-in-2" style={{ marginBottom: '16px' }}>
          <div className="settings-section-title">🌐 {t.language}</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => lang !== 'en' && toggleLang()}
            >
              🇬🇧 English
            </button>
            <button
              className={`lang-btn ${lang === 'hi' ? 'active' : ''}`}
              onClick={() => lang !== 'hi' && toggleLang()}
            >
              🇮🇳 हिंदी
            </button>
          </div>
        </div>

        {/* PIN Lock */}
        <div className="card fade-in-2" style={{ marginBottom: '16px' }}>
          <div className="settings-section-title">🔐 {t.pinLock}</div>
          <div className="info-row">
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                {pinEnabled ? 'PIN Lock Chalu Hai 🟢' : 'PIN Lock Band Hai 🔴'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                App kholte waqt PIN maangega
              </div>
            </div>
          </div>

          {!showPinSetup ? (
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              {!pinEnabled ? (
                <button className="btn btn-primary" onClick={() => { setShowPinSetup(true); setPinStep('set'); setPin1(''); setPin2(''); setPinError(''); }}>
                  🔐 {t.enablePin}
                </button>
              ) : (
                <>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowPinSetup(true); setPinStep('set'); setPin1(''); setPin2(''); setPinError(''); }}>
                    🔄 PIN Change
                  </button>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { removePin(); showToast('PIN hata diya gaya'); }}>
                    🔓 {t.disablePin}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={{ marginTop: '16px' }}>
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px' }}>
                {pinStep === 'set' ? '4-digit PIN set karo' : 'PIN dobara daalo (confirm)'}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '12px' }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid var(--purple-light)',
                    background: (pinStep === 'set' ? pin1 : pin2).length > i ? 'var(--purple-light)' : 'transparent',
                    transition: 'all 0.15s'
                  }} />
                ))}
              </div>
              {pinError && <p style={{ color: 'var(--red-soft)', fontSize: '0.78rem', textAlign: 'center', marginBottom: '8px' }}>{pinError}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k, i) => (
                  <button
                    key={i}
                    style={{
                      padding: '14px', borderRadius: '12px', border: '1px solid var(--border)',
                      background: k === '' ? 'transparent' : 'var(--bg-surface)',
                      color: 'var(--text-primary)', fontFamily: 'var(--font)',
                      fontSize: '1.1rem', fontWeight: '600', cursor: k === '' ? 'default' : 'pointer',
                      opacity: k === '' ? 0 : 1, transition: 'all 0.15s',
                    }}
                    onClick={() => {
                      if (k === '⌫') {
                        if (pinStep === 'set') setPin1(p => p.slice(0,-1));
                        else setPin2(p => p.slice(0,-1));
                        setPinError('');
                      } else if (k !== '') {
                        handlePinKey(String(k), pinStep === 'confirm');
                      }
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
                    onMouseUp={e => e.currentTarget.style.transform = ''}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost" style={{ marginTop: '12px' }} onClick={() => { setShowPinSetup(false); setPinStep('set'); setPin1(''); setPin2(''); }}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* App Info */}
        <div className="card fade-in-3" style={{ marginBottom: '16px' }}>
          <div className="settings-section-title">ℹ️ App Info</div>
          {[
            { label: 'App Version', value: <span className="badge badge-purple">v2.0.0</span> },
            { label: t.dataSync, value: <span className="badge badge-green">{t.live}</span> },
            { label: t.accountType, value: <span style={{ color: 'var(--gold)', fontSize: '0.82rem', fontWeight: '600' }}>{user?.email ? '📧 Email' : '📱 Phone'}</span> },
          ].map((item, i) => (
            <div key={i} className="info-row">
              <span>{item.label}</span>
              {item.value}
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="card fade-in-3">
          {!showLogout ? (
            <button className="btn btn-danger" onClick={() => setShowLogout(true)}>
              🚪 {t.logout}
            </button>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--red-soft)', marginBottom: '14px', fontSize: '0.9rem' }}>
                Pakka logout karna hai?
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-outline" onClick={() => setShowLogout(false)} style={{ flex: 1 }}>Nahi</button>
                <button className="btn btn-danger" onClick={handleLogout} style={{ flex: 1 }}>Haan, Logout</button>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '24px', marginBottom: '12px' }}>
          {t.madeWith}
        </p>
      </div>

      <style>{`
        .settings-section-title {
          font-size: 0.78rem; font-weight: 700;
          color: var(--text-muted); text-transform: uppercase;
          letter-spacing: 0.08em; margin-bottom: 14px;
        }
        .profile-avatar {
          width: 54px; height: 54px; border-radius: '16px';
          background: linear-gradient(135deg, var(--purple-primary), var(--purple-light));
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; font-weight: 700; color: white;
          box-shadow: 0 4px 16px rgba(124,58,237,0.3);
        }
        .lang-btn {
          flex: 1; padding: 12px; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: var(--bg-surface);
          color: var(--text-muted); font-family: var(--font);
          font-size: 0.875rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s;
        }
        .lang-btn.active {
          background: var(--purple-primary); color: white;
          border-color: var(--purple-primary);
          box-shadow: 0 2px 12px rgba(124,58,237,0.3);
        }
        .info-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 0; border-bottom: 1px solid rgba(124,58,237,0.08);
          font-size: 0.875rem; color: var(--text-secondary);
        }
        .info-row:last-child { border-bottom: none; }
      `}</style>
    </div>
  );
}
