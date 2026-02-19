import { createContext, useContext, useState, useEffect } from 'react';

const PinContext = createContext();

export function usePin() {
  return useContext(PinContext);
}

export function PinProvider({ children }) {
  const [pinEnabled, setPinEnabled] = useState(() => !!localStorage.getItem('udhaari_pin'));
  const [unlocked, setUnlocked] = useState(false);

  function setPin(pin) {
    localStorage.setItem('udhaari_pin', btoa(pin));
    setPinEnabled(true);
    setUnlocked(true);
  }

  function removePin() {
    localStorage.removeItem('udhaari_pin');
    setPinEnabled(false);
    setUnlocked(true);
  }

  function checkPin(pin) {
    const stored = localStorage.getItem('udhaari_pin');
    if (stored && atob(stored) === pin) {
      setUnlocked(true);
      return true;
    }
    return false;
  }

  function lockApp() {
    if (pinEnabled) setUnlocked(false);
  }

  return (
    <PinContext.Provider value={{ pinEnabled, unlocked, setPin, removePin, checkPin, lockApp }}>
      {children}
    </PinContext.Provider>
  );
}

export function PinLockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const { checkPin } = usePin();

  function handleKey(num) {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => {
          if (checkPin(newPin)) {
            onUnlock();
          } else {
            setError('PIN galat hai!');
            setShake(true);
            setPin('');
            setTimeout(() => setShake(false), 500);
          }
        }, 100);
      }
    }
  }

  function handleDel() {
    setPin(p => p.slice(0, -1));
    setError('');
  }

  return (
    <div className="pin-screen">
      <div className="pin-content">
        <div className="pin-logo">₹</div>
        <h2 className="pin-title">Udhaari</h2>
        <p className="pin-sub">PIN daalo app kholne ke liye</p>

        {/* Dots */}
        <div className={`pin-dots ${shake ? 'shake' : ''}`}>
          {[0,1,2,3].map(i => (
            <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        {error && <p className="pin-error">{error}</p>}

        {/* Keypad */}
        <div className="pin-keypad">
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k, i) => (
            <button
              key={i}
              className={`pin-key ${k === '' ? 'empty' : ''}`}
              onClick={() => k === '⌫' ? handleDel() : k !== '' && handleKey(String(k))}
              disabled={k === ''}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .pin-screen {
          position: fixed; inset: 0; z-index: 9999;
          background: var(--bg-deep);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .pin-content {
          display: flex; flex-direction: column; align-items: center;
          gap: 0; width: 100%; max-width: 320px;
        }
        .pin-logo {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, var(--purple-primary), var(--purple-light));
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; font-weight: 800; color: white;
          box-shadow: 0 8px 32px rgba(124,58,237,0.4);
          margin-bottom: 16px;
        }
        .pin-title { font-size: 1.6rem; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; }
        .pin-sub { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 32px; }
        .pin-dots {
          display: flex; gap: 16px; margin-bottom: 12px;
          transition: transform 0.1s;
        }
        .pin-dots.shake {
          animation: shake 0.4s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-8px); }
          40%,80% { transform: translateX(8px); }
        }
        .pin-dot {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid var(--purple-light);
          background: transparent;
          transition: all 0.15s;
        }
        .pin-dot.filled {
          background: var(--purple-light);
          box-shadow: 0 0 10px rgba(124,58,237,0.5);
          transform: scale(1.1);
        }
        .pin-error {
          color: var(--red-soft); font-size: 0.82rem; margin-bottom: 8px;
          height: 20px;
        }
        .pin-keypad {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 12px; width: 100%; margin-top: 20px;
        }
        .pin-key {
          aspect-ratio: 1;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-primary);
          font-family: var(--font);
          font-size: 1.4rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          display: flex; align-items: center; justify-content: center;
        }
        .pin-key:active { transform: scale(0.9); background: var(--bg-elevated); }
        .pin-key.empty { background: transparent; border: none; cursor: default; }
        .pin-key:disabled { opacity: 0; }
      `}</style>
    </div>
  );
}
