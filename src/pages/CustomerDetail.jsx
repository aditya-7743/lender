import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, updateDoc, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useToast } from '../hooks/useToast';
import { exportCustomerPDF } from '../utils/pdfExport';
import AddTransactionModal from '../components/AddTransactionModal';
import AddCustomerModal from '../components/AddCustomerModal';
import UPIQRModal from '../components/UPIQRModal';
import InterestModal from '../components/InterestModal';

export default function CustomerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const { showToast, Toast } = useToast();

  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [lastTx, setLastTx] = useState(null); // for undo
  const [showUndo, setShowUndo] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const undoTimerRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid, 'customers', id), (snap) => {
      if (snap.exists()) setCustomer({ id: snap.id, ...snap.data() });
      else navigate('/');
    });
    return unsub;
  }, [user, id]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'customers', id, 'transactions'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user, id]);

  async function addTransaction({ type, amount, note, date }) {
    try {
      const change = type === 'credit' ? amount : -amount;
      const txRef = await addDoc(collection(db, 'users', user.uid, 'customers', id, 'transactions'), {
        type, amount, note: note.trim(), date, createdAt: serverTimestamp()
      });
      const newBalance = (customer.balance || 0) + change;
      await updateDoc(doc(db, 'users', user.uid, 'customers', id), { balance: newBalance, lastActivity: serverTimestamp() });

      // Setup undo
      setLastTx({ id: txRef.id, type, amount, change });
      setShowUndo(true);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => { setShowUndo(false); setLastTx(null); }, 8000);

      showToast(type === 'credit' ? `₹${amount} lena record! ✅` : `₹${amount} dena record! ✅`);
      setShowTxModal(false);
    } catch { showToast('Kuch gadbad. Try again.', 'error'); }
  }

  async function undoLastTx() {
    if (!lastTx) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'customers', id, 'transactions', lastTx.id));
      const newBalance = (customer.balance || 0) - lastTx.change;
      await updateDoc(doc(db, 'users', user.uid, 'customers', id), { balance: newBalance });
      setShowUndo(false);
      setLastTx(null);
      clearTimeout(undoTimerRef.current);
      showToast('Transaction undo ho gaya! ↩️');
    } catch { showToast('Undo nahi hua', 'error'); }
  }

  async function deleteTransaction(tx) {
    try {
      const change = tx.type === 'credit' ? -tx.amount : tx.amount;
      await deleteDoc(doc(db, 'users', user.uid, 'customers', id, 'transactions', tx.id));
      await updateDoc(doc(db, 'users', user.uid, 'customers', id), { balance: (customer.balance || 0) + change });
      showToast('Transaction delete ho gaya');
    } catch { showToast('Delete nahi hua', 'error'); }
  }

  async function editCustomer(name, phone, tag, dueDate) {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'customers', id), {
        name: name.trim(), phone: phone.trim(),
        tag: tag || 'regular',
        dueDate: dueDate || null
      });
      showToast('Customer update! ✅');
      setShowEditModal(false);
    } catch { showToast('Update nahi hua', 'error'); }
  }

  async function deleteCustomer() {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'customers', id));
      navigate('/');
    } catch { showToast('Delete nahi hua', 'error'); }
  }

  async function handlePDFExport() {
    setExporting(true);
    try {
      const bizName = localStorage.getItem('udhaari_bizname') || user?.displayName || 'Udhaari App';
      await exportCustomerPDF(customer, transactions, bizName);
    } catch (e) { showToast('PDF export fail hua', 'error'); }
    setExporting(false);
  }

  function sendWhatsApp() {
    if (!customer?.phone) { showToast('Phone number nahi hai!', 'error'); return; }
    const bal = customer.balance || 0;
    const msg = bal > 0
      ? `Namaste ${customer.name} ji! 🙏\n\nAapka ₹${Math.abs(bal).toLocaleString('en-IN')} hamara baaki hai.\n\nKripya jaldi bhejna. 🙏\n\n— Udhaari App`
      : `Namaste ${customer.name} ji! 🙏\n\nHamne aapka ₹${Math.abs(bal).toLocaleString('en-IN')} dena hai. Jald milenge!\n\n— Udhaari App`;
    const phone = customer.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function sendSMS() {
    if (!customer?.phone) { showToast('Phone number nahi hai!', 'error'); return; }
    const bal = customer.balance || 0;
    const msg = bal > 0
      ? `${customer.name} ji, aapka Rs.${Math.abs(bal)} baaki hai. -Udhaari App`
      : `${customer.name} ji, hum aapko Rs.${Math.abs(bal)} denge. -Udhaari App`;
    window.open(`sms:${customer.phone}?body=${encodeURIComponent(msg)}`);
  }

  function formatDate(tx) {
    if (tx.date) return new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (tx.createdAt?.toDate) return tx.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return '';
  }

  if (!customer) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  const bal = customer.balance || 0;
  const initials = customer.name?.slice(0, 2).toUpperCase() || '??';
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = customer.dueDate && customer.dueDate < today && bal > 0;

  const filteredTx = transactions.filter(tx =>
    !txSearch || tx.note?.toLowerCase().includes(txSearch.toLowerCase()) ||
    String(tx.amount).includes(txSearch)
  );

  // Running balance
  let running = bal;
  const txWithRunning = filteredTx.map(tx => {
    const snapshot = running;
    running = running - (tx.type === 'credit' ? tx.amount : -tx.amount);
    return { ...tx, runningBalance: snapshot };
  });

  return (
    <div className="page">
      {Toast}

      {/* Undo Bar */}
      {showUndo && (
        <div className="undo-bar">
          <span>Transaction add ho gaya!</span>
          <button className="undo-btn" onClick={undoLastTx}>↩️ Undo</button>
        </div>
      )}

      <div className="page-header">
        <button onClick={() => navigate('/')} className="icon-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: '1.1rem', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {customer.name}
          </h1>
          {customer.phone && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{customer.phone}</p>}
        </div>
        <button onClick={() => setShowEditModal(true)} className="icon-btn">✏️</button>
      </div>

      <div className="page-content">
        {/* Balance Card */}
        <div className={`cust-balance-card fade-in ${isOverdue ? 'overdue-card' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {customer.tag && customer.tag !== 'regular' && (
              <span className={`badge badge-${customer.tag === 'vip' ? 'gold' : customer.tag === 'defaulter' ? 'red' : 'purple'}`}>
                {customer.tag === 'vip' ? '⭐ VIP' : customer.tag === 'defaulter' ? '🚩 Defaulter' : customer.tag}
              </span>
            )}
            {isOverdue && <span className="badge badge-red">⚠️ Overdue</span>}
            {customer.dueDate && !isOverdue && bal > 0 && (
              <span className="badge badge-gold">📅 Due: {new Date(customer.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            )}
          </div>

          <div className="cust-avatar-lg">{initials}</div>
          <div className={`cust-balance-amount ${bal >= 0 ? 'positive' : 'negative'}`}>
            {bal >= 0 ? '+' : '-'}₹{Math.abs(bal).toLocaleString('en-IN')}
          </div>
          <div className="cust-balance-status">
            {bal > 0 ? `${customer.name} ko dena hai tumhe`
              : bal < 0 ? `Tumhe dena hai ${customer.name} ko`
              : 'Barabar hai — koi balance nahi'}
          </div>

          <div className="cust-actions">
            <button className="cust-action-btn whatsapp" onClick={sendWhatsApp} disabled={!customer.phone}>
              <span>💬</span> WhatsApp
            </button>
            <button className="cust-action-btn sms" onClick={sendSMS} disabled={!customer.phone}>
              <span>📱</span> SMS
            </button>
            <button className="cust-action-btn call"
              onClick={() => customer.phone && window.open(`tel:${customer.phone}`)}
              disabled={!customer.phone}>
              <span>📞</span> Call
            </button>
          </div>
        </div>

        {/* Extra Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <button
            className="extra-btn"
            onClick={() => setShowUPIModal(true)}
          >
            <span>📲</span>
            <span>UPI QR</span>
          </button>
          <button
            className="extra-btn"
            onClick={() => setShowInterestModal(true)}
          >
            <span>🧮</span>
            <span>Interest</span>
          </button>
          <button
            className="extra-btn"
            onClick={handlePDFExport}
            disabled={exporting}
          >
            <span>{exporting ? '⏳' : '📄'}</span>
            <span>PDF</span>
          </button>
        </div>

        {/* Transaction Search */}
        <div className="search-bar" style={{ marginBottom: '12px' }}>
          <span className="search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input className="input" type="text" placeholder="Transaction search..." value={txSearch} onChange={e => setTxSearch(e.target.value)} style={{ fontSize: '0.875rem' }} />
          {txSearch && <button onClick={() => setTxSearch('')} className="search-clear">×</button>}
        </div>

        {/* Transaction History */}
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            {t.txHistory} ({filteredTx.length})
          </h2>

          {loading ? (
            <div className="empty-state"><div className="spinner" style={{ width: 28, height: 28 }} /></div>
          ) : filteredTx.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>{t.noTx}</h3>
              <p>{t.addFirstTx}</p>
            </div>
          ) : (
            <div className="card">
              {txWithRunning.map((tx, i) => (
                <TxItem key={tx.id} tx={tx} index={i} onDelete={() => deleteTransaction(tx)} formatDate={formatDate} />
              ))}
            </div>
          )}
        </div>

        {/* Delete Customer */}
        <div style={{ paddingBottom: '20px' }}>
          {!showDeleteConfirm ? (
            <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={() => setShowDeleteConfirm(true)}>
              🗑️ {t.deleteCustomer}
            </button>
          ) : (
            <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', textAlign: 'center' }}>
              <p style={{ color: 'var(--red-soft)', marginBottom: '14px', fontSize: '0.875rem' }}>
                {t.deleteCustomerConfirm}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1 }}>{t.no}</button>
                <button className="btn btn-danger" onClick={deleteCustomer} style={{ flex: 1 }}>{t.yes}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button className="fab" onClick={() => setShowTxModal(true)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a0533" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {showTxModal && <AddTransactionModal onClose={() => setShowTxModal(false)} onAdd={addTransaction} customerName={customer.name} />}
      {showEditModal && <EditCustomerModal onClose={() => setShowEditModal(false)} onSave={editCustomer} customer={customer} />}
      {showUPIModal && <UPIQRModal onClose={() => setShowUPIModal(false)} customerName={customer.name} amount={Math.abs(bal) > 0 ? Math.abs(bal) : ''} />}
      {showInterestModal && <InterestModal onClose={() => setShowInterestModal(false)} defaultPrincipal={Math.abs(bal) > 0 ? Math.abs(bal) : ''} />}
    </div>
  );
}

function TxItem({ tx, index, onDelete, formatDate }) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="tx-item" style={{ animationDelay: `${index * 0.03}s` }}>
      <div className={`tx-icon ${tx.type}`}>
        {tx.type === 'credit' ? '⬇️' : '⬆️'}
      </div>
      <div className="tx-details">
        <div className="tx-note">{tx.note || (tx.type === 'credit' ? 'Unhone diya' : 'Tumne diya')}</div>
        <div className="tx-date">{formatDate(tx)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ textAlign: 'right' }}>
          <div className={`tx-amount ${tx.type === 'credit' ? 'amount-get' : 'amount-give'}`}>
            {tx.type === 'credit' ? '+' : '-'}₹{tx.amount?.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            Bal: ₹{tx.runningBalance?.toLocaleString('en-IN') || 0}
          </div>
        </div>
        {!showConfirm ? (
          <button onClick={() => setShowConfirm(true)} className="del-btn" title="Delete">🗑️</button>
        ) : (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => setShowConfirm(false)} className="del-btn" style={{ background: 'var(--bg-surface)' }}>✗</button>
            <button onClick={onDelete} className="del-btn" style={{ background: 'rgba(239,68,68,0.2)' }}>✓</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Enhanced Edit Modal with tag + dueDate
function EditCustomerModal({ onClose, onSave, customer }) {
  const [name, setName] = useState(customer.name || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [tag, setTag] = useState(customer.tag || 'regular');
  const [dueDate, setDueDate] = useState(customer.dueDate || '');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await onSave(name, phone, tag, dueDate);
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">✏️ Customer Edit Karo</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Naam *</label>
            <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </div>
          <div className="input-group">
            <label>Phone</label>
            <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Tag</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['regular', 'vip', 'defaulter'].map(tg => (
                <button
                  key={tg}
                  type="button"
                  className={`btn btn-sm ${tag === tg ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setTag(tg)}
                  style={{ textTransform: 'capitalize', flex: 1 }}
                >
                  {tg === 'vip' ? '⭐ VIP' : tg === 'defaulter' ? '🚩 Defaulter' : '👤 Regular'}
                </button>
              ))}
            </div>
          </div>
          <div className="input-group">
            <label>Due Date (Optional)</label>
            <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            {dueDate && <button type="button" onClick={() => setDueDate('')} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}>× Remove due date</button>}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading || !name.trim()}>
              {loading ? <span className="spinner" /> : 'Save Karo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
