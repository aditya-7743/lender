import { useState, useEffect, useRef } from 'react';

export default function UPIQRModal({ onClose, customerName, amount }) {
  const [upiId, setUpiId] = useState(() => localStorage.getItem('udhaari_upi') || '');
  const [inputUpi, setInputUpi] = useState(upiId);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  async function generateQR() {
    if (!inputUpi.trim()) return;
    setGenerating(true);
    try {
      const QRCode = await import('qrcode');
      const upiLink = `upi://pay?pa=${inputUpi.trim()}&pn=${encodeURIComponent(customerName || 'Payment')}&am=${amount || ''}&cu=INR&tn=${encodeURIComponent(`Udhaari - ${customerName || 'Payment'}`)}`;
      const url = await QRCode.default.toDataURL(upiLink, {
        width: 300,
        margin: 2,
        color: { dark: '#1a0533', light: '#f5f0ff' }
      });
      setQrDataUrl(url);
      localStorage.setItem('udhaari_upi', inputUpi.trim());
      setUpiId(inputUpi.trim());
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  }

  useEffect(() => {
    if (upiId) generateQR();
  }, []);

  function downloadQR() {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `udhaari_qr_${customerName || 'payment'}.png`;
    a.click();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">📱 UPI QR Code</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '-12px', marginBottom: '20px' }}>
          {customerName} se payment lo
        </p>

        {!qrDataUrl ? (
          <div>
            <div className="input-group">
              <label>Aapka UPI ID</label>
              <input
                className="input"
                type="text"
                placeholder="yourname@upi"
                value={inputUpi}
                onChange={e => setInputUpi(e.target.value)}
                autoFocus
              />
            </div>
            {amount && (
              <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: '10px', textAlign: 'center', marginBottom: '16px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Amount: </span>
                <span style={{ color: 'var(--green)', fontWeight: '700', fontSize: '1.1rem' }}>₹{amount?.toLocaleString('en-IN')}</span>
              </div>
            )}
            <button className="btn btn-primary" onClick={generateQR} disabled={!inputUpi.trim() || generating}>
              {generating ? <><span className="spinner" /> Generate kar raha hai...</> : '🔲 QR Banao'}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div className="qr-container">
              <img src={qrDataUrl} alt="UPI QR" style={{ width: '220px', height: '220px', borderRadius: '16px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '10px' }}>
                {inputUpi} • {amount ? `₹${amount.toLocaleString('en-IN')}` : 'Any amount'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                className="btn btn-outline btn-sm"
                style={{ flex: 1 }}
                onClick={() => { setQrDataUrl(''); setInputUpi(upiId); }}
              >
                ✏️ UPI Change
              </button>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={downloadQR}>
                📥 Download
              </button>
            </div>
          </div>
        )}

        <button className="btn btn-ghost" style={{ marginTop: '12px' }} onClick={onClose}>
          Close
        </button>

        <style>{`
          .qr-container {
            background: var(--bg-surface);
            border: 1px solid var(--border-gold);
            border-radius: 20px;
            padding: 20px;
            display: inline-block;
          }
        `}</style>
      </div>
    </div>
  );
}
