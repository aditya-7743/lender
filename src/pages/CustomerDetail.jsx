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
  const [txModalType, setTxModalType] = useState(null);
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
      setTxModalType(null);
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

  // Group transactions by date
  const groupedTx = txWithRunning.reduce((groups, tx) => {
    const date = formatDate(tx);
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
    return groups;
  }, {});

  return (
    <div className="page" style={{ paddingBottom: 80, background: '#f0f2f5' }}>
      {Toast}

      {/* Undo Bar */}
      {showUndo && (
        <div className="undo-bar">
          <span>Transaction add ho gaya!</span>
          <button className="undo-btn" onClick={undoLastTx}>↩️ Undo</button>
        </div>
      )}

      {/* Header */}
      <div className="chat-header">
        <button onClick={() => navigate('/')} className="icon-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="header-user" onClick={() => navigate(`/customer/${id}/profile`)}>
          <div className="header-avatar">{initials}</div>
          <div className="header-info">
            <div className="header-name">{customer.name}</div>
            <div className="header-status">View Profile ›</div>
          </div>
        </div>
        <div className="header-actions">
          {customer.phone && (
            <button className="icon-btn" onClick={() => window.open(`tel:${customer.phone}`)}>📞</button>
          )}
        </div>
      </div>

      <div className="page-content" style={{ padding: '10px' }}>
        {/* Balance Summary Card - Simplified */}
        <div className="balance-summary-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="bs-label">Net Balance</span>
            <span className={`bs-amount ${bal >= 0 ? 'positive' : 'negative'}`}>
              {bal >= 0 ? '+' : '-'}₹{Math.abs(bal).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bs-footer">
            {bal > 0 ? 'You will get' : bal < 0 ? 'You will give' : 'Settled'}
          </div>
        </div>

        {/* Transaction Search */}
        <div className="search-bar" style={{ marginBottom: '12px' }}>
          <span className="search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input className="input" type="text" placeholder="Transaction search..." value={txSearch} onChange={e => setTxSearch(e.target.value)} style={{ fontSize: '0.875rem' }} />
          {txSearch && <button onClick={() => setTxSearch('')} className="search-clear">×</button>}
        </div>

        {/* Transaction List (Chat Style) */}
        <div className="chat-container">
          {loading ? (
            <div className="spinner" style={{ margin: '20px auto' }} />
          ) : filteredTx.length === 0 ? (
            <div className="empty-state-chat">
              <p>No transactions yet.</p>
              <p>Start by adding a transaction below.</p>
            </div>
          ) : (
            Object.entries(groupedTx).map(([date, txs]) => (
              <div key={date}>
                <div className="date-pill"><span>{date}</span></div>
                {txs.map((tx, i) => (
                  <TxItem key={tx.id} tx={tx} index={i} onDelete={() => deleteTransaction(tx)} />
                ))}
              </div>
            ))
          )}
        </div>

        {/* Extra Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px', marginTop: '20px' }}>
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
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="bottom-action-bar">
        <button className="action-btn btn-given" onClick={() => setTxModalType('debit')}>
          <span className="action-icon">🔴</span>
          <div className="action-text">
            <span className="action-title">You Gave</span>
            <span className="action-sub">Customer Got</span>
          </div>
        </button>
        <button className="action-btn btn-received" onClick={() => setTxModalType('credit')}>
          <span className="action-icon">🟢</span>
          <div className="action-text">
            <span className="action-title">You Got</span>
            <span className="action-sub">Customer Gave</span>
          </div>
        </button>
      </div>

      {/* Modals */}
      {txModalType && (
        <AddTransactionModal
          onClose={() => setTxModalType(null)}
          onAdd={addTransaction}
          customerName={customer.name}
          defaultType={txModalType}
        />
      )}
      {showEditModal && <EditCustomerModal onClose={() => setShowEditModal(false)} onSave={editCustomer} customer={customer} />}
      {showUPIModal && <UPIQRModal onClose={() => setShowUPIModal(false)} customerName={customer.name} amount={Math.abs(bal) > 0 ? Math.abs(bal) : ''} />}
      {showInterestModal && <InterestModal onClose={() => setShowInterestModal(false)} defaultPrincipal={Math.abs(bal) > 0 ? Math.abs(bal) : ''} />}

      <style>{`
        .chat-header {
          display: flex; align-items: center; padding: 10px 16px;
          background: white; border-bottom: 1px solid var(--border);
          position: sticky; top: 0; z-index: 10;
        }
        .header-user { display: flex; align-items: center; flex: 1; margin-left: 10px; cursor: pointer; }
        .header-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--bg-surface); color: var(--text-primary);
          display: flex; align-items: center; justify-content: center;
          font-weight: 600; margin-right: 10px;
        }
        .header-name { font-weight: 700; font-size: 1rem; }
        .header-status { font-size: 0.75rem; color: var(--text-muted); }

        .balance-summary-card {
          background: white; padding: 16px; border-radius: 12px; margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .bs-label { font-size: 0.9rem; color: var(--text-muted); }
        .bs-amount { font-size: 1.2rem; font-weight: 700; }
        .bs-amount.positive { color: var(--green-light); }
        .bs-amount.negative { color: var(--red-soft); }
        .bs-footer { font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; }

        /* Chat Styles */
        .date-pill { display: flex; justify-content: center; margin: 16px 0; }
        .date-pill span {
          background: #e5e7eb; color: #555; padding: 4px 12px;
          border-radius: 12px; font-size: 0.75rem; font-weight: 600;
        }

        .chat-bubble {
          max-width: 80%; padding: 10px 14px; margin-bottom: 12px;
          border-radius: 12px; position: relative; font-size: 0.9rem;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .chat-bubble.given {
           margin-left: auto; background: #fee2e2; color: #7f1d1d;
           border-bottom-right-radius: 2px;
        }
        .chat-bubble.received {
           margin-right: auto; background: #dcfce7; color: #14532d;
           border-bottom-left-radius: 2px;
        }
        
        .chat-amount { font-weight: 700; font-size: 1.1rem; display: block; margin-bottom: 4px; }
        .chat-meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; opacity: 0.8; }
        
        .bottom-action-bar {
          position: fixed; bottom: 0; left: 0; right: 0;
          background: white; border-top: 1px solid var(--border);
          padding: 12px 16px; display: flex; gap: 12px;
          z-index: 20; box-shadow: 0 -4px 12px rgba(0,0,0,0.05);
        }
        .action-btn {
          flex: 1; border: none; padding: 10px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          cursor: pointer; transition: transform 0.1s;
        }
        .action-btn:active { transform: scale(0.98); }
        .btn-given { background: #fee2e2; color: #ef4444; }
        .btn-received { background: #dcfce7; color: #22c55e; }
        .action-text { text-align: left; line-height: 1.2; }
        .action-title { display: block; font-weight: 700; font-size: 0.9rem; }
        .action-sub { display: block; font-size: 0.7rem; opacity: 0.8; }
        .action-icon { font-size: 1.2rem; }

      `}</style>
    </div>
  );
}

function TxItem({ tx, index, onDelete }) {
  const isGiven = tx.type === 'credit';
  return (
    <div className={`chat-bubble ${isGiven ? 'given' : 'received'}`} onClick={onDelete}>
      <span className="chat-amount">₹{tx.amount?.toLocaleString('en-IN')}</span>
      <div className="chat-content">
        {tx.note && <div style={{ marginBottom: 4 }}>{tx.note}</div>}
      </div>
      <div className="chat-meta">
        <span>{new Date(tx.createdAt?.toDate ? tx.createdAt.toDate() : tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>{isGiven ? '↗' : '↙'}</span>
      </div>
    </div>
  );
}

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
