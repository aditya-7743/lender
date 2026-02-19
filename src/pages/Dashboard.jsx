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
    <div className="page" style={{ paddingBottom: 80 }}>
      {Toast}

      {/* Top Header */}
      <div className="dashboard-header">
        <div className="biz-profile">
          <div className="biz-avatar">M</div>
          <div className="biz-info">
            <div className="biz-name">Magadh Library</div>
            <div className="biz-status">🟢 Online</div>
          </div>
        </div>
        <div className="header-actions">
          {/* Search Icon Toggle could go here */}
        </div>
      </div>

      <div className="page-content">
        {/* Search Bar - Permanent */}
        <div className="search-bar fade-in" style={{ marginBottom: 16 }}>
          <span className="search-icon">🔍</span>
          <input
            className="input"
            type="text"
            placeholder="Search Customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Net Balance Card */}
        <div className="net-balance-card fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span className="nb-label">Net Balance</span>
            <span className="nb-count">{customers.length} Accounts</span>
          </div>
          <div className="nb-amount-row">
            <span className={`nb-amount ${netBalance >= 0 ? 'positive' : 'negative'}`}>
              {netBalance >= 0 ? '+' : '-'}₹{Math.abs(netBalance).toLocaleString('en-IN')}
            </span>
            <span className="nb-arrow">›</span>
          </div>
          <div className="nb-footer">
            {netBalance >= 0 ? 'You Get' : 'You Give'}
          </div>
        </div>

        {/* Customer List */}
        <div className="customer-list fade-in-2">
          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <h3>No Customers Found</h3>
              <p>Add your first customer to start tracking.</p>
            </div>
          ) : (
            filtered.map((c, i) => (
              <CustomerItem key={c.id} customer={c} index={i} onClick={() => navigate(`/customer/${c.id}`)} />
            ))
          )}
        </div>
      </div>

      {/* Floating Add Button with Text */}
      <button className="fab-extended" onClick={() => setShowAddModal(true)}>
        <span style={{ fontSize: '1.2rem', marginRight: 4 }}>+</span> Add Customer
      </button>

      {showAddModal && <AddCustomerModal onClose={() => setShowAddModal(false)} onAdd={addCustomer} />}

      <style>{`
        .dashboard-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; background: var(--bg-deep);
          position: sticky; top: 0; z-index: 10;
        }
        .biz-profile { display: flex; align-items: center; gap: 10px; }
        .biz-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, var(--purple-primary), var(--purple-light));
          color: white; display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 1.2rem;
        }
        .biz-name { font-weight: 700; font-size: 1rem; color: var(--text-primary); }
        .biz-status { font-size: 0.75rem; color: var(--green-light); }
        
        .net-balance-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 16px; padding: 20px; margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .nb-label { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
        .nb-count { font-size: 0.8rem; color: var(--text-muted); }
        .nb-amount-row { display: flex; align-items: center; justify-content: space-between; margin: 8px 0; }
        .nb-amount { font-size: 1.8rem; font-weight: 700; }
        .nb-amount.positive { color: var(--green-light); }
        .nb-amount.negative { color: var(--red-soft); }
        .nb-arrow { color: var(--text-muted); font-size: 1.5rem; }
        .nb-footer { font-size: 0.8rem; color: var(--text-muted); text-align: right; }

        .fab-extended {
          position: fixed; bottom: 90px; right: 20px;
          background: var(--green-light); color: #000;
          padding: 12px 20px; border-radius: 30px;
          font-weight: 600; box-shadow: 0 4px 14px rgba(34,197,94,0.4);
          display: flex; align-items: center; border: none; cursor: pointer;
          z-index: 20;
        }
      `}</style>
    </div>
  );
}

function CustomerItem({ customer, index, onClick }) {
  const initials = customer.name?.slice(0, 2).toUpperCase() || '??';
  const bal = customer.balance || 0;

  return (
    <div className="customer-item-new" onClick={onClick} style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="ci-avatar">{initials}</div>
      <div className="ci-info">
        <div className="ci-name">{customer.name}</div>
        <div className="ci-status">
          {/* Mock status for now, ideally fetch last tx */}
          Tap to view details
        </div>
      </div>
      <div className="ci-balance">
        <div className={`ci-amount ${bal > 0 ? 'green' : bal < 0 ? 'red' : ''}`}>
          ₹{Math.abs(bal).toLocaleString('en-IN')}
        </div>
        <div className="ci-due">Due</div>
      </div>

      <style>{`
        .customer-item-new {
          display: flex; align-items: center; padding: 16px 0;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
        }
        .ci-avatar {
          width: 48px; height: 48px; border-radius: 50%;
          background: var(--bg-surface); color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
          font-weight: 600; margin-right: 14px;
        }
        .ci-info { flex: 1; }
        .ci-name { font-weight: 600; font-size: 1rem; color: var(--text-primary); marginBottom: 2px; }
        .ci-status { font-size: 0.8rem; color: var(--text-muted); }
        .ci-balance { text-align: right; }
        .ci-amount { font-weight: 700; font-size: 1rem; color: var(--text-primary); }
        .ci-amount.green { color: var(--green-light); }
        .ci-amount.red { color: var(--red-soft); }
        .ci-due { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
      `}</style>
    </div>
  );
}
