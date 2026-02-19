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

  // LOGIC UPDATE: 
  // Balance < 0 : Customer owes us (Lene hain) -> Red/Negative in DB but "Positive Asset" for us
  // Balance > 0 : We owe customer (Dene hain) -> Green/Positive in DB but "Liability" for us

  const totalLena = customers.reduce((s, c) => c.balance < 0 ? s + Math.abs(c.balance) : s, 0);
  const totalDena = customers.reduce((s, c) => c.balance > 0 ? s + c.balance : s, 0);
  // Net Balance: (Lene - Dene)
  // If result is Positive (More Lene than Dene) -> Good
  const netBalance = totalLena - totalDena;

  function applyFilter(list) {
    if (filter === 'lena') return list.filter(c => c.balance < 0);
    if (filter === 'dena') return list.filter(c => c.balance > 0);
    if (filter === 'overdue') return list.filter(c => c.dueDate && c.dueDate < today && c.balance < 0);
    return list;
  }

  const filtered = applyFilter(
    customers.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    )
  );

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
      </div>

      <div className="page-content">
        {/* Search Bar */}
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
              ₹{Math.abs(netBalance).toLocaleString('en-IN')}
            </span>
            <span className="nb-arrow">›</span>
          </div>
          <div className={`nb-footer ${netBalance >= 0 ? 'text-green' : 'text-red'}`}>
            {netBalance >= 0 ? 'You will get (Lena hai)' : 'You will give (Dena hai)'}
          </div>
        </div>

        {/* Filters */}
        <div className="filter-scroll fade-in">
          <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-chip ${filter === 'lena' ? 'active-red' : ''}`} onClick={() => setFilter('lena')}>Lene Hain (₹{totalLena.toLocaleString()})</button>
          <button className={`filter-chip ${filter === 'dena' ? 'active-green' : ''}`} onClick={() => setFilter('dena')}>Dene Hain (₹{totalDena.toLocaleString()})</button>
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

      <button className="fab-extended" onClick={() => setShowAddModal(true)}>
        <span style={{ fontSize: '1.2rem', marginRight: 4 }}>+</span> Add Customer
      </button>

      {showAddModal && <AddCustomerModal onClose={() => setShowAddModal(false)} onAdd={addCustomer} />}

      <style>{`
        .dashboard-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; background: white;
          position: sticky; top: 0; z-index: 10;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .biz-profile { display: flex; align-items: center; gap: 12px; }
        .biz-avatar {
          width: 42px; height: 42px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white; display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 1.2rem;
          box-shadow: 0 4px 10px rgba(99,102,241,0.3);
        }
        .biz-name { font-weight: 700; font-size: 1.05rem; color: #1f2937; }
        .biz-status { font-size: 0.75rem; color: #16a34a; font-weight: 500; }
        
        .net-balance-card {
          background: white; border: 1px solid var(--border);
          border-radius: 16px; padding: 20px; margin-bottom: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          transition: transform 0.2s;
        }
        .net-balance-card:active { transform: scale(0.99); }
        .nb-label { font-size: 0.95rem; font-weight: 600; color: #4b5563; }
        .nb-count { font-size: 0.8rem; color: #6b7280; font-weight: 500; }
        .nb-amount-row { display: flex; align-items: center; justify-content: space-between; margin: 8px 0; }
        .nb-amount { font-size: 1.8rem; font-weight: 800; }
        .nb-amount.positive { color: #16a34a; }
        .nb-amount.negative { color: #dc2626; }
        .nb-arrow { color: #9ca3af; font-size: 1.5rem; }
        .nb-footer { font-size: 0.85rem; text-align: right; font-weight: 600; }
        .text-green { color: #16a34a; }
        .text-red { color: #dc2626; }

        .filter-scroll {
          display: flex; gap: 10px; overflow-x: auto; padding-bottom: 12px; margin-bottom: 8px;
          scrollbar-width: none;
        }
        .filter-chip {
          white-space: nowrap; padding: 8px 16px; border-radius: 20px;
          border: 1px solid #e5e7eb; background: white; color: #4b5563;
          font-size: 0.85rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s;
        }
        .filter-chip.active { background: #1f2937; color: white; border-color: #1f2937; }
        .filter-chip.active-red { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
        .filter-chip.active-green { background: #dcfce7; color: #16a34a; border-color: #bbf7d0; }

        .fab-extended {
          position: fixed; bottom: 90px; right: 20px;
          background: #1f2937; color: white;
          padding: 14px 24px; border-radius: 30px;
          font-weight: 600; box-shadow: 0 4px 14px rgba(0,0,0,0.25);
          display: flex; align-items: center; border: none; cursor: pointer;
          z-index: 20; transition: transform 0.2s;
        }
        .fab-extended:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
}

function CustomerItem({ customer, index, onClick }) {
  const initials = customer.name?.slice(0, 2).toUpperCase() || '??';
  const bal = customer.balance || 0;
  // Logic: Bal < 0 -> Red (Due), Bal > 0 -> Green (Advance)

  return (
    <div className="customer-item-new" onClick={onClick} style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="ci-avatar">{initials}</div>
      <div className="ci-info">
        <div className="ci-name">{customer.name}</div>
        <div className="ci-status">
          {bal < 0 ? 'Payment Due' : bal > 0 ? 'Advance Paid' : 'Settled'}
        </div>
      </div>
      <div className="ci-balance">
        <div className={`ci-amount ${bal < 0 ? 'red' : bal > 0 ? 'green' : ''}`}>
          ₹{Math.abs(bal).toLocaleString('en-IN')}
        </div>
        <div className="ci-due">{bal < 0 ? 'LENA' : bal > 0 ? 'DENA' : ''}</div>
      </div>

      <style>{`
        .customer-item-new {
          display: flex; align-items: center; padding: 16px 0;
          border-bottom: 1px solid var(--border);
          cursor: pointer; animation: slideIn 0.3s ease-out forwards;
        }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .ci-avatar {
          width: 48px; height: 48px; border-radius: 50%;
          background: #f3f4f6; color: #4b5563;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; margin-right: 14px; font-size: 1.1rem;
        }
        .ci-info { flex: 1; }
        .ci-name { font-weight: 700; font-size: 1rem; color: #1f2937; marginBottom: 2px; }
        .ci-status { font-size: 0.8rem; color: #6b7280; font-weight: 500; }
        
        .ci-balance { text-align: right; }
        .ci-amount { font-weight: 800; font-size: 1.1rem; color: #1f2937; }
        .ci-amount.green { color: #16a34a; }
        .ci-amount.red { color: #dc2626; }
        .ci-due { font-size: 0.7rem; color: #9ca3af; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; margin-top: 2px; }
      `}</style>
    </div>
  );
}
