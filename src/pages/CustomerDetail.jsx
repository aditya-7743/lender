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
import EditTransactionModal from '../components/EditTransactionModal';
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
  const [editingTx, setEditingTx] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
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
      // LOGIC UPDATE:
      // Credit (You Gave/Lena) -> Negative Balance
      // Debit (You Got/Dena/Payment) -> Positive Balance

      const isCredit = type === 'credit';
      const finalAmount = isCredit ? -Math.abs(amount) : Math.abs(amount);

      const txRef = await addDoc(collection(db, 'users', user.uid, 'customers', id, 'transactions'), {
        type,
        amount: Math.abs(amount), // Store absolute amount for display
        netAmount: finalAmount,   // Store signed amount for calculations
        note: note.trim(),
        date,
        createdAt: serverTimestamp()
      });

      const newBalance = (customer.balance || 0) + finalAmount;
      await updateDoc(doc(db, 'users', user.uid, 'customers', id), { balance: newBalance, lastActivity: serverTimestamp() });

      // Setup undo
      setLastTx({ id: txRef.id, type, amount, change: finalAmount });
      setShowUndo(true);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => { setShowUndo(false); setLastTx(null); }, 8000);

      showToast(type === 'credit' ? `₹${amount} Udhaari Diya! 🔴` : `₹${amount} Payment Aayi! 🟢`);
      setTxModalType(null);
    } catch { showToast('Kuch gadbad. Try again.', 'error'); }
  }

  async function updateTransaction(txId, newData) {
    try {
      const oldTx = transactions.find(t => t.id === txId);
      if (!oldTx) return;

      // Calculate balance difference
      const oldVal = oldTx.type === 'credit' ? -Math.abs(oldTx.amount) : Math.abs(oldTx.amount);
      // If newData.amount is present, use it, else use old amount
      const newAmountAbs = newData.amount ? Math.abs(newData.amount) : Math.abs(oldTx.amount);
      // If newData.date is present use it

      // We assume type doesn't change in current edit modal, only amount/date/note
      const newVal = oldTx.type === 'credit' ? -newAmountAbs : newAmountAbs;

      const diff = newVal - oldVal;

      await updateDoc(doc(db, 'users', user.uid, 'customers', id, 'transactions', txId), {
        ...newData,
        amount: newAmountAbs,
        netAmount: newVal
      });

      if (diff !== 0) {
        await updateDoc(doc(db, 'users', user.uid, 'customers', id), {
          balance: (customer.balance || 0) + diff
        });
      }

      showToast('Transaction updated! ✅');
      setEditingTx(null);
    } catch (e) {
      console.error(e);
      showToast('Update fail hua', 'error');
    }
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
      // Logic: Credit was Negative, Debit was Positive
      // To reverse, we subtract the netAmount
      // If old format (no netAmount), derive it from type
      const val = tx.netAmount !== undefined ? tx.netAmount : (tx.type === 'credit' ? -tx.amount : tx.amount);

      await deleteDoc(doc(db, 'users', user.uid, 'customers', id, 'transactions', tx.id));
      await updateDoc(doc(db, 'users', user.uid, 'customers', id), { balance: (customer.balance || 0) - val });
      showToast('Transaction delete ho gaya');
    } catch { showToast('Delete nahi hua', 'error'); }
  }

  async function editCustomer(name, phone, tag, dueDate) {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'customers', id), {
        name: name.trim(), phone: phone.trim(), tag: tag || 'regular', dueDate: dueDate || null
      });
      showToast('Customer update! ✅');
      setShowEditModal(false);
    } catch { showToast('Update nahi hua', 'error'); }
  }

  async function handlePDFExport() {
    setExporting(true);
    try {
      const bizName = localStorage.getItem('udhaari_bizname') || user?.displayName || 'Udhaari App';
      await exportCustomerPDF(customer, transactions, bizName);
    } catch (e) { showToast('PDF export fail hua', 'error'); }
    setExporting(false);
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

  const filteredTx = transactions.filter(tx =>
    !txSearch || tx.note?.toLowerCase().includes(txSearch.toLowerCase()) ||
    String(tx.amount).includes(txSearch)
  );

  // Group transactions by date
  const groupedTx = filteredTx.reduce((groups, tx) => {
    const date = formatDate(tx);
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
    return groups;
  }, {});

  return (
    <div className="page" style={{ paddingBottom: 80, background: '#f8fafc' }}>
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
            <div className="header-status">View Settings ›</div>
          </div>
        </div>
        <div className="header-actions">
          {customer.phone && (
            <button className="icon-btn" onClick={() => window.open(`tel:${customer.phone}`)}>📞</button>
          )}
        </div>
      </div>

      <div className="page-content" style={{ padding: '12px' }}>
        {/* Balance Summary Card */}
        <div className="balance-summary-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="bs-label">Net Balance</span>
            <span className={`bs-amount ${bal < 0 ? 'negative' : 'positive'}`}>
              {bal < 0 ? '-' : '+'}₹{Math.abs(bal).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bs-footer">
            {bal < 0 ? 'You will get (Lena hai)' : bal > 0 ? 'You will give (Dena hai)' : 'Settled'}
          </div>
        </div>

        {/* Transaction Search */}
        <div className="search-container">
          <div className="search-bar" style={{ marginBottom: '16px' }}>
            <span className="search-icon">🔍</span>
            <input className="input" type="text" placeholder="Search transactions..." value={txSearch} onChange={e => setTxSearch(e.target.value)} style={{ fontSize: '0.9rem' }} />
            {txSearch && <button onClick={() => setTxSearch('')} className="search-clear">×</button>}
          </div>
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
                  <TxItem
                    key={tx.id}
                    tx={tx}
                    index={i}
                    onDelete={() => deleteTransaction(tx)}
                    onEdit={() => setEditingTx(tx)}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        {/* Extra Action Buttons */}
        <div className="quick-actions-grid">
          <button className="extra-btn" onClick={() => setShowUPIModal(true)}>
            <span>📲</span><span>UPI QR</span>
          </button>
          <button className="extra-btn" onClick={() => setShowInterestModal(true)}>
            <span>🧮</span><span>Interest</span>
          </button>
          <button className="extra-btn" onClick={handlePDFExport} disabled={exporting}>
            <span>{exporting ? '⏳' : '📄'}</span><span>PDF</span>
          </button>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="bottom-action-bar">
        <button className="action-btn btn-given" onClick={() => setTxModalType('credit')}>
          <span className="action-icon">🔴</span>
          <div className="action-text">
            <span className="action-title">You Gave</span>
            <span className="action-sub">Udhaari Di</span>
          </div>
        </button>
        <button className="action-btn btn-received" onClick={() => setTxModalType('debit')}>
          <span className="action-icon">🟢</span>
          <div className="action-text">
            <span className="action-title">You Got</span>
            <span className="action-sub">Payment Aayi</span>
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
      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={updateTransaction}
        />
      )}
      {showEditModal && <EditCustomerModal onClose={() => setShowEditModal(false)} onSave={editCustomer} customer={customer} />}
      {showUPIModal && <UPIQRModal onClose={() => setShowUPIModal(false)} customerName={customer.name} amount={Math.abs(bal) > 0 ? Math.abs(bal) : ''} />}
      {showInterestModal && <InterestModal onClose={() => setShowInterestModal(false)} defaultPrincipal={Math.abs(bal) > 0 ? Math.abs(bal) : ''} />}

      <style>{`
        .chat-header {
          display: flex; align-items: center; padding: 12px 16px;
          background: white; border-bottom: 1px solid var(--border);
          position: sticky; top: 0; z-index: 10;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .header-user { display: flex; align-items: center; flex: 1; margin-left: 12px; cursor: pointer; }
        .header-avatar {
          width: 42px; height: 42px; border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #4338ca); color: white;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; margin-right: 12px; font-size: 1.1rem;
          box-shadow: 0 4px 10px rgba(79,70,229,0.3);
        }
        .header-name { font-weight: 700; font-size: 1.05rem; color: #1e293b; }
        .header-status { font-size: 0.8rem; color: #64748b; margin-top: 2px; font-weight: 500; }

        .balance-summary-card {
          background: white; padding: 20px; border-radius: 16px; margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.02);
          transition: transform 0.2s;
        }
        .balance-summary-card:active { transform: scale(0.98); }
        .bs-label { font-size: 0.95rem; color: #64748b; font-weight: 600; }
        .bs-amount { font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; }
        .bs-amount.positive { color: #16a34a; }
        .bs-amount.negative { color: #dc2626; }
        .bs-footer { font-size: 0.9rem; color: #64748b; margin-top: 8px; font-weight: 600; }

        .date-pill { display: flex; justify-content: center; margin: 24px 0; }
        .date-pill span {
          background: #e2e8f0; color: #475569; padding: 6px 14px;
          border-radius: 20px; font-size: 0.8rem; font-weight: 600;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .chat-bubble {
          max-width: 85%; padding: 14px 18px; margin-bottom: 16px;
          border-radius: 16px; position: relative; font-size: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          animation: slideIn 0.3s ease-out forwards;
          cursor: pointer; transition: transform 0.1s;
        }
        .chat-bubble:active { transform: scale(0.98); }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .chat-bubble.given {
           margin-left: auto; 
           background: #fef2f2; border: 1px solid #fee2e2;
           color: #991b1b; border-bottom-right-radius: 4px;
        }
        .chat-bubble.received {
           margin-right: auto; 
           background: #f0fdf4; border: 1px solid #dcfce7;
           color: #166534; border-bottom-left-radius: 4px;
        }
        
        .chat-amount { font-weight: 800; font-size: 1.25rem; display: block; margin-bottom: 6px; }
        .chat-meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; opacity: 0.8; font-weight: 500; }
        
        .bottom-action-bar {
          position: fixed; bottom: 0; left: 0; right: 0;
          background: white; border-top: 1px solid var(--border);
          padding: 12px 16px; display: flex; gap: 12px;
          z-index: 20; box-shadow: 0 -4px 24px rgba(0,0,0,0.1);
        }
        .action-btn {
          flex: 1; border: none; padding: 14px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          cursor: pointer; transition: transform 0.1s, box-shadow 0.1s;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .action-btn:active { transform: scale(0.96); box-shadow: none; }
        
        .btn-given { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
        .btn-received { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
        
        .action-text { text-align: left; line-height: 1.25; }
        .action-title { display: block; font-weight: 800; font-size: 1rem; }
        .action-sub { display: block; font-size: 0.75rem; font-weight: 600; opacity: 0.9; }
        .action-icon { font-size: 1.6rem; }

        .quick-actions-grid {
          display: grid; gridTemplateColumns: '1fr 1fr 1fr'; gap: 12px; margin-bottom: 20px;
        }
        .extra-btn {
          background: white; border: 1px solid var(--border);
          border-radius: 12px; padding: 12px;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          font-size: 0.8rem; font-weight: 600; color: #475569;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.03);
        }
        .extra-btn:active { transform: scale(0.95); background: #f8fafc; }
      `}</style>
    </div>
  );
}

function TxItem({ tx, index, onDelete, onEdit }) {
  const isGiven = tx.type === 'credit';
  return (
    <div className={`chat-bubble ${isGiven ? 'given' : 'received'}`} onClick={() => onEdit(tx)}>
      <span className="chat-amount">₹{tx.amount?.toLocaleString('en-IN')}</span>
      <div className="chat-content">
        {tx.note && <div style={{ marginBottom: 6 }}>{tx.note}</div>}
      </div>
      <div className="chat-meta">
        <span>{new Date(tx.createdAt?.toDate ? tx.createdAt.toDate() : tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
        <div onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ opacity: 0.7, cursor: 'pointer', padding: '4px' }}>🗑️</div>
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
