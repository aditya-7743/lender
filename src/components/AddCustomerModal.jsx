import { useState } from 'react';

export default function AddCustomerModal({ onClose, onAdd, editData }) {
  const [name, setName] = useState(editData?.name || '');
  const [phone, setPhone] = useState(editData?.phone || '');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onAdd(name, phone);
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">
          {editData ? '✏️ Customer Edit Karo' : '➕ Naya Customer'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Customer Ka Naam *</label>
            <input
              className="input"
              type="text"
              placeholder="Jaise: Rahul Sharma"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="input-group">
            <label>Phone Number (Optional)</label>
            <input
              className="input"
              type="tel"
              placeholder="98XXXXXXXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading || !name.trim()}>
              {loading ? <span className="spinner" /> : (editData ? 'Update Karo' : 'Add Karo')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
