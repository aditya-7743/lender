import { useState } from 'react';
import { useLang } from '../context/LangContext';

export default function InterestModal({ onClose, defaultPrincipal = '' }) {
  const { t } = useLang();
  const [principal, setPrincipal] = useState(String(defaultPrincipal));
  const [rate, setRate] = useState('2');
  const [months, setMonths] = useState('6');
  const [result, setResult] = useState(null);

  function calculate() {
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const m = parseInt(months);
    if (!p || !r || !m) return;

    const interest = p * (r / 100) * m;
    const total = p + interest;
    setResult({ interest, total, p, r, m });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">🧮 {t.interestCalc}</h2>

        <div className="input-group">
          <label>{t.principal} (₹)</label>
          <input className="input" type="number" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="10000" style={{ fontSize: '1.2rem', fontWeight: '600' }} />
        </div>
        <div className="input-group">
          <label>{t.interestRate}</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1,2,3,5].map(r => (
              <button key={r} className={`btn btn-sm ${rate == r ? 'btn-primary' : 'btn-outline'}`} onClick={() => setRate(String(r))}>
                {r}%
              </button>
            ))}
          </div>
          <input className="input" type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="2" step="0.5" style={{ marginTop: '8px' }} />
        </div>
        <div className="input-group">
          <label>{t.months}</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[3,6,12,24].map(m => (
              <button key={m} className={`btn btn-sm ${months == m ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMonths(String(m))}>
                {m}
              </button>
            ))}
          </div>
          <input className="input" type="number" value={months} onChange={e => setMonths(e.target.value)} placeholder="6" style={{ marginTop: '8px' }} />
        </div>

        <button className="btn btn-primary" onClick={calculate} disabled={!principal || !rate || !months}>
          🧮 {t.calculate}
        </button>

        {result && (
          <div className="interest-result">
            <div className="ir-row">
              <span>{t.principal}</span>
              <span>₹{result.p.toLocaleString('en-IN')}</span>
            </div>
            <div className="ir-row">
              <span>{t.interestRate}</span>
              <span>{result.r}% × {result.m} months</span>
            </div>
            <div className="divider" />
            <div className="ir-row gold">
              <span style={{ fontWeight: '700' }}>{t.totalInterest}</span>
              <span style={{ color: 'var(--gold)', fontWeight: '700' }}>₹{result.interest.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="ir-row total">
              <span style={{ fontWeight: '800', fontSize: '1rem' }}>{t.totalAmount}</span>
              <span style={{ color: 'var(--green)', fontWeight: '800', fontSize: '1.1rem' }}>₹{result.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        )}

        <button className="btn btn-ghost" style={{ marginTop: '12px' }} onClick={onClose}>
          Close
        </button>

        <style>{`
          .interest-result {
            margin-top: 20px;
            background: var(--bg-surface);
            border: 1px solid var(--border-gold);
            border-radius: var(--radius);
            padding: 16px;
            animation: scaleIn 0.3s ease;
          }
          .ir-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 8px 0;
            font-size: 0.875rem;
            color: var(--text-secondary);
            border-bottom: 1px solid rgba(124,58,237,0.08);
          }
          .ir-row:last-child { border-bottom: none; }
          .ir-row.total { padding-top: 12px; }
        `}</style>
      </div>
    </div>
  );
}
