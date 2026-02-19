import { useState } from 'react';

export default function EditTransactionModal({ onClose, onSave, transaction, type }) {
    const [amount, setAmount] = useState(transaction.amount);
    const [note, setNote] = useState(transaction.note || '');

    // Format date for datetime-local input
    const getFormattedDate = (dateVal) => {
        if (!dateVal) return new Date().toISOString().slice(0, 16);
        const d = new Date(dateVal.toDate ? dateVal.toDate() : dateVal);
        // Adjust for timezone offset to show local time
        const offset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d - offset)).toISOString().slice(0, 16);
        return localISOTime;
    };

    const [date, setDate] = useState(getFormattedDate(transaction.date || transaction.createdAt));
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        await onSave(transaction.id, {
            amount: parseFloat(amount),
            note,
            date: new Date(date).toISOString()
        });
        setLoading(false);
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-handle" />
                <h2 className="modal-title">✏️ Edit Transaction</h2>

                <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
                    <div className="input-group">
                        <label>Amount (₹)</label>
                        <input
                            className="input amount-input"
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <label>Note</label>
                        <input
                            className="input"
                            type="text"
                            value={note}
                            onChange={e => setNote(e.target.value)}
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
                        <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ flex: 2 }}
                            disabled={loading || !amount}
                        >
                            {loading ? <span className="spinner" /> : 'Update'}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`
        .amount-input { font-size: 1.5rem; font-weight: 700; text-align: center; color: #1f2937; }
      `}</style>
        </div>
    );
}
