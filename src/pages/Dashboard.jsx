import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, onSnapshot, addDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useToast } from '../hooks/useToast';
import AddCustomerModal from '../components/AddCustomerModal';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const { showToast, Toast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'customers'),
      orderBy('lastActivity', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCustomers(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  async function addCustomer(name, phone) {
    try {
      await addDoc(collection(db, 'users', user.uid, 'customers'), {
        name: name.trim(),
        phone: phone.trim(),
        balance: 0,
        tag: 'regular',
        dueDate: null,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp()
      });
      showToast(`${name} add ho gaya! ✅`);
      setShowAddModal(false);
    } catch {
      showToast('Kuch gadbad hui. Try again.', 'error');
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const overdueCustomers = customers.filter(c => c.dueDate && c.dueDate < today && c.balance > 0);

  function applyFilter(list) {
    if (filter === 'lena') return list.filter(c => c.balance > 0);
    if (filter === 'dena') return list.filter(c => c.balance < 0);
    if (filter === 'overdue') return list.filter(c => c.dueDate && c.dueDate < today && c.balance > 0);
    if (filter === 'vip') return list.filter(c => c.tag === 'vip');
    if (filter === 'defaulter') return list.filter(c => c.tag === 'defaulter');
    return list;
  }

  const filtered = applyFilter(
    customers.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    )
  );

  const totalLena = customers.reduce((s, c) => c.balance > 0 ? s + c.balance : s, 0);
  const totalDena = customers.reduce((s, c) => c.balance < 0 ? s + Math.abs(c.balance) : s, 0);
  const netBalance = totalLena - totalDena;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t.goodMorning;
    if (h < 17) return t.goodAfternoon;
    return t.goodEvening;
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Dost';

  return (
    <div className="page">
      {Toast}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{greeting()}</p>
          <h1 style={{ fontSize: '1.3rem', fontWeight: '800', lineHeight: 1 }}>{displayName} 👋</h1>
        </div>
        <button onClick={() => navigate('/settings')} className="icon-btn">⚙️</button>
      </div>

      <div className="page-content">
        {overdueCustomers.length > 0 && (
          <div className="overdue-banner fade-in" onClick={() => setFilter('overdue')}>
            ⚠️ <strong>{overdueCustomers.length} customer</strong> ki due date nikal gayi! Tap karke dekho.
          </div>
        )}

        <div className="hero-balance fade-in">
          <p className="hero-label">{t.netBalance}</p>
          <p className={`hero-amount ${netBalance >= 0 ? 'positive' : 'negative'}`}>
            {netBalance >= 0 ? '+' : '-'}₹{Math.abs(netBalance).toLocaleString('en-IN')}
          </p>
          <p className="hero-sub">
            {netBalance > 0 ? 'Tumhare paas aana hai 💰' : netBalance < 0 ? 'Tumhe dena hai 📤' : 'Sab barabar hai ✅'}
          </p>
        </div>

        <div className="summary-grid fade-in-2">
          <div className="summary-card lena" onClick={() => setFilter('lena')} style={{ cursor: 'pointer' }}>
            <div className="s-label">🟢 {t.toReceive}</div>
            <span className="s-amount">₹{totalLena.toLocaleString('en-IN')}</span>
            <div className="s-sub">{customers.filter(c => c.balance > 0).length} {t.people}</div>
          </div>
          <div className="summary-card dena" onClick={() => setFilter('dena')} style={{ cursor: 'pointer' }}>
            <div className="s-label">🔴 {t.toGive}</div>
            <span className="s-amount">₹{totalDena.toLocaleString('en-IN')}</span>
            <div className="s-sub">{customers.filter(c => c.balance < 0).length} {t.people}</div>
          </div>
        </div>

        <div className="filter-scroll fade-in-2">
          {[
            { key: 'all', label: 'Sab' },
            { key: 'lena', label: `🟢 ${t.toReceive}` },
            { key: 'dena', label: `🔴 ${t.toGive}` },
            { key: 'overdue', label: `⚠️ ${t.overdue}` },
            { key: 'vip', label: `⭐ ${t.vip}` },
            { key: 'defaulter', label: `🚩 ${t.defaulter}` },
          ].map(f => (
            <button key={f.key} className={`filter-pill ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="search-bar fade-in-3">
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input className="input" type="text" placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} className="search-clear">×</button>}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            {t.allAccounts} ({filtered.length})
          </h2>

          {loading ? (
            <div className="empty-state"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📒</div>
              <h3>{search ? 'Koi nahi mila' : t.noCustomers}</h3>
              <p>{search ? 'Alag naam se search karo' : t.addFirstCustomer}</p>
            </div>
          ) : (
            filtered.map((c, i) => (
              <CustomerItem key={c.id} customer={c} index={i} today={today} onClick={() => navigate(`/customer/${c.id}`)} />
            ))
          )}
        </div>
      </div>

      <button className="fab" onClick={() => setShowAddModal(true)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a0533" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {showAddModal && <AddCustomerModal onClose={() => setShowAddModal(false)} onAdd={addCustomer} />}
    </div>
  );
}

const COLORS = [
  'linear-gradient(135deg, #7C3AED, #9F5FFF)',
  'linear-gradient(135deg, #2563EB, #60A5FA)',
  'linear-gradient(135deg, #059669, #34D399)',
  'linear-gradient(135deg, #DC2626, #F87171)',
  'linear-gradient(135deg, #D97706, #FCD34D)',
  'linear-gradient(135deg, #7C3AED, #EC4899)',
];

function CustomerItem({ customer, index, today, onClick }) {
  const initials = customer.name?.slice(0, 2).toUpperCase() || '??';
  const bal = customer.balance || 0;
  const isOverdue = customer.dueDate && customer.dueDate < today && bal > 0;

  return (
    <div className={`customer-item ${isOverdue ? 'overdue-item' : ''}`} style={{ animationDelay: `${index * 0.04}s` }} onClick={onClick}>
      <div className="customer-avatar" style={{ background: COLORS[index % COLORS.length] }}>{initials}</div>
      <div className="customer-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <div className="customer-name">{customer.name}</div>
          {customer.tag && customer.tag !== 'regular' && (
            <span className={`badge badge-${customer.tag === 'vip' ? 'gold' : customer.tag === 'defaulter' ? 'red' : 'purple'}`} style={{ padding: '1px 6px', fontSize: '0.6rem' }}>
              {customer.tag}
            </span>
          )}
        </div>
        <div className="customer-meta">
          {isOverdue
            ? <span style={{ color: 'var(--red-soft)', fontWeight: '600', fontSize: '0.72rem' }}>⚠️ Overdue: {new Date(customer.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            : customer.dueDate && bal > 0
              ? <span style={{ color: 'var(--gold)', fontSize: '0.72rem' }}>📅 Due: {new Date(customer.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              : customer.phone ? `📞 ${customer.phone}` : 'No phone'
          }
        </div>
      </div>
      <div className="customer-balance">
        <span className={`amount ${bal >= 0 ? 'amount-get' : 'amount-give'}`}>₹{Math.abs(bal).toLocaleString('en-IN')}</span>
        <span className="label">{bal > 0 ? 'Lena' : bal < 0 ? 'Dena' : 'Barabar'}</span>
      </div>
    </div>
  );
}
