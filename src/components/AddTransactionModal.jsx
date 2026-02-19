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

        <h2 className="modal-title">
          {type === 'credit' ? '🔴 You Gave (Udhaari)' : '🟢 You Got (Payment)'}
        </h2>

        {/* Type Toggle */}
        <div className="tx-type-toggle">
          <button
            type="button"
            className={`type-btn ${type === 'credit' ? 'active credit' : ''}`}
            onClick={() => setType('credit')}
          >
            🔴 You Gave
          </button>
          <button
            type="button"
            className={`type-btn ${type === 'debit' ? 'active debit' : ''}`}
            onClick={() => setType('debit')}
          >
            🟢 You Got
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <div className="input-group">
            <label>Amount (₹)</label>
            <input
              className="input amount-input"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label>Note (Optional)</label>
            <input
              className="input"
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={type === 'credit' ? "Kya diya? (e.g. Chai, Samosa)" : "Kis cheez ka payment? (e.g. Cash, UPI)"}
            />
          </div>

          <div className="input-group">
            <label>Date</label>
            <input
              className="input"
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Close</button>
            <button
              type="submit"
              className={`btn ${type === 'credit' ? 'btn-red-tx' : 'btn-green'}`}
              style={{ flex: 2 }}
              disabled={loading || !amount}
            >
              {loading ? <span className="spinner" /> : `Save ${type === 'credit' ? 'Udhaari' : 'Payment'}`}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .tx-type-toggle {
          display: flex; background: #f3f4f6; padding: 4px; border-radius: 12px;
          margin-bottom: 20px;
        }
        .type-btn {
          flex: 1; border: none; padding: 10px; border-radius: 8px;
          background: transparent; color: #6b7280; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .type-btn.active { background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05); color: #1f2937; }
        .type-btn.active.credit { color: #dc2626; border: 1px solid #fecaca; background: #fef2f2; }
        .type-btn.active.debit { color: #16a34a; border: 1px solid #bbf7d0; background: #f0fdf4; }
        
        .amount-input { font-size: 1.5rem; font-weight: 700; text-align: center; color: #1f2937; }
        
        .btn-red-tx { background: #fee2e2; color: #dc2626; border: none; font-weight: 700; }
        .btn-green { background: #dcfce7; color: #16a34a; border: none; font-weight: 700; }
      `}</style>
    </div>
  );
}
