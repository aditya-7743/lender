import { useState } from 'react';

export default function AddTransactionModal({ onClose, onAdd, customerName, defaultType }) {
  const [type, setType] = useState(defaultType || 'credit'); // credit = unhone diya, debit = humne diya
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    await onAdd({ type, amount: parseFloat(amount), note, date });
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">💸 Naya Transaction</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '-12px', marginBottom: '20px' }}>
          {customerName} ke saath
        </p>

        {/* Type Toggle */}
        <div className="tx-type-toggle">
          <button
            type="button"
            className={`tx-type-btn credit ${type === 'credit' ? 'active' : ''}`}
            onClick={() => setType('credit')}
          >
            <span className="tx-type-icon">⬇️</span>
            <span className="tx-type-label">Unhone Diya</span>
            <span className="tx-type-sub">(Tumhara Lena)</span>
          </button>
          <button
            type="button"
            className={`tx-type-btn debit ${type === 'debit' ? 'active' : ''}`}
            onClick={() => setType('debit')}
          >
            <span className="tx-type-icon">⬆️</span>
            <span className="tx-type-label">Tumne Diya</span>
            <span className="tx-type-sub">(Tumhara Dena)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginTop: '20px' }}>
            <label>Amount (₹) *</label>
            <input
              className="input"
              type="number"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="1"
              step="0.01"
              required
              autoFocus
              style={{ fontSize: '1.4rem', fontWeight: '700', textAlign: 'center' }}
            />
          </div>
          <div className="input-group">
            <label>Note (Optional)</label>
            <input
              className="input"
              type="text"
              placeholder="Jaise: grocery ka, rent ka, udhaar..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${type === 'credit' ? 'btn-green' : 'btn-red-tx'}`}
              style={{ flex: 2 }}
              disabled={loading || !amount}
            >
              {loading ? <span className="spinner" /> : `₹${amount || '0'} ${type === 'credit' ? 'Lena Record' : 'Dena Record'}`}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .tx-type-toggle {
          display: flex;
          gap: 10px;
        }
        .tx-type-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 14px 10px;
          border-radius: var(--radius);
          border: 2px solid var(--border);
          background: var(--bg-surface);
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: var(--font);
        }
        .tx-type-btn.credit.active {
          border-color: var(--green);
          background: rgba(16,185,129,0.1);
        }
        .tx-type-btn.debit.active {
          border-color: var(--red);
          background: rgba(239,68,68,0.1);
        }
        .tx-type-icon { font-size: 1.3rem; }
        .tx-type-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .tx-type-sub {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .btn-green {
          background: linear-gradient(135deg, #059669, #10B981);
          color: white;
          border: none;
          box-shadow: 0 4px 16px rgba(16,185,129,0.3);
          cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px 20px; border-radius: var(--radius-sm);
          font-family: var(--font); font-size: 0.95rem; font-weight: 600;
          transition: all 0.2s; width: 100%;
        }
        .btn-red-tx {
          background: linear-gradient(135deg, #DC2626, #EF4444);
          color: white;
          border: none;
          box-shadow: 0 4px 16px rgba(239,68,68,0.3);
          cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px 20px; border-radius: var(--radius-sm);
          font-family: var(--font); font-size: 0.95rem; font-weight: 600;
          transition: all 0.2s; width: 100%;
        }
        .btn-green:disabled, .btn-red-tx:disabled { opacity: 0.5; }
        .btn-green:active, .btn-red-tx:active { transform: scale(0.97); }
      `}</style>
    </div>
  );
}
