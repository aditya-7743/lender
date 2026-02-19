import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { exportAllCustomersPDF } from '../utils/pdfExport';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

export default function Reports() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [allTx, setAllTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('monthly');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'customers'),
      async (snap) => {
        const custs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCustomers(custs);

        // Fetch all transactions from all customers
        const txPromises = custs.map(c =>
          getDocs(query(collection(db, 'users', user.uid, 'customers', c.id, 'transactions'), orderBy('createdAt', 'desc')))
        );
        const txSnaps = await Promise.all(txPromises);
        const txAll = [];
        txSnaps.forEach(snap => {
          snap.docs.forEach(d => txAll.push({ id: d.id, ...d.data() }));
        });
        setAllTx(txAll);
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  // Monthly chart data
  function getMonthlyData() {
    const months = {};
    allTx.forEach(tx => {
      const d = tx.date || (tx.createdAt?.toDate ? tx.createdAt.toDate().toISOString().split('T')[0] : null);
      if (!d) return;
      const key = d.slice(0, 7); // YYYY-MM
      if (!months[key]) months[key] = { month: key, in: 0, out: 0 };
      if (tx.type === 'credit') months[key].in += tx.amount || 0;
      else months[key].out += tx.amount || 0;
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-6).map(m => ({
      ...m,
      month: new Date(m.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      net: m.in - m.out,
    }));
  }

  // Weekly chart data (last 8 weeks)
  function getWeeklyData() {
    const weeks = {};
    allTx.forEach(tx => {
      const d = tx.date || (tx.createdAt?.toDate ? tx.createdAt.toDate().toISOString().split('T')[0] : null);
      if (!d) return;
      const date = new Date(d);
      const start = new Date(date);
      start.setDate(date.getDate() - date.getDay());
      const key = start.toISOString().split('T')[0];
      if (!weeks[key]) weeks[key] = { week: key, in: 0, out: 0 };
      if (tx.type === 'credit') weeks[key].in += tx.amount || 0;
      else weeks[key].out += tx.amount || 0;
    });
    return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week)).slice(-8).map(w => ({
      ...w,
      week: new Date(w.week).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      net: w.in - w.out,
    }));
  }

  // Top debtors
  const topDebtors = [...customers]
    .filter(c => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  // Pie data
  const totalLena = customers.reduce((s, c) => c.balance > 0 ? s + c.balance : s, 0);
  const totalDena = customers.reduce((s, c) => c.balance < 0 ? s + Math.abs(c.balance) : s, 0);
  const pieData = [
    { name: t.toReceive, value: totalLena },
    { name: t.toGive, value: totalDena },
  ];

  const chartData = activeChart === 'monthly' ? getMonthlyData() : getWeeklyData();

  async function handlePDFExport() {
    setExporting(true);
    try {
      const bizName = localStorage.getItem('udhaari_bizname') || user?.displayName || 'Udhaari App';
      await exportAllCustomersPDF(customers, bizName);
    } catch (e) { console.error(e); }
    setExporting(false);
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.78rem' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: '700' }}>
            {p.name}: ₹{Number(p.value).toLocaleString('en-IN')}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: '800' }}>📊 {t.analytics}</h1>
        </div>
        <button
          className="btn btn-gold btn-sm"
          onClick={handlePDFExport}
          disabled={exporting || customers.length === 0}
        >
          {exporting ? <span className="spinner" style={{ borderTopColor: '#1a0533' }} /> : '📄'} {t.exportPDF}
        </button>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : allTx.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <h3>Data nahi hai abhi</h3>
            <p>Transactions add karo toh graphs dikhengi!</p>
          </div>
        ) : (
          <>
            {/* Summary Row */}
            <div className="summary-grid fade-in">
              <div className="summary-card lena">
                <div className="s-label">🟢 {t.toReceive}</div>
                <span className="s-amount">₹{totalLena.toLocaleString('en-IN')}</span>
                <div className="s-sub">{customers.filter(c => c.balance > 0).length} {t.people}</div>
              </div>
              <div className="summary-card dena">
                <div className="s-label">🔴 {t.toGive}</div>
                <span className="s-amount">₹{totalDena.toLocaleString('en-IN')}</span>
                <div className="s-sub">{customers.filter(c => c.balance < 0).length} {t.people}</div>
              </div>
            </div>

            {/* Pie Chart */}
            {(totalLena > 0 || totalDena > 0) && (
              <div className="card fade-in-2" style={{ marginBottom: '16px' }}>
                <h3 className="chart-title">Balance Distribution</h3>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        <Cell fill="#10B981" />
                        <Cell fill="#EF4444" />
                      </Pie>
                      <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.78rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Cash Flow Chart */}
            <div className="card fade-in-2" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 className="chart-title">{t.cashflow}</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className={`btn btn-sm ${activeChart === 'monthly' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveChart('monthly')}>
                    {t.monthly}
                  </button>
                  <button className={`btn btn-sm ${activeChart === 'weekly' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveChart('weekly')}>
                    {t.weekly}
                  </button>
                </div>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer>
                  <AreaChart data={chartData} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                    <XAxis dataKey={activeChart === 'monthly' ? 'month' : 'week'} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="in" stroke="#10B981" fill="rgba(16,185,129,0.15)" strokeWidth={2} name={t.toReceive} />
                    <Area type="monotone" dataKey="out" stroke="#EF4444" fill="rgba(239,68,68,0.1)" strokeWidth={2} name={t.toGive} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Net Bar Chart */}
            {chartData.length > 0 && (
              <div className="card fade-in-3" style={{ marginBottom: '16px' }}>
                <h3 className="chart-title">Net Balance Trend</h3>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                      <XAxis dataKey={activeChart === 'monthly' ? 'month' : 'week'} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="net" name="Net" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.net >= 0 ? '#10B981' : '#EF4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top Debtors */}
            {topDebtors.length > 0 && (
              <div className="card fade-in-4" style={{ marginBottom: '16px' }}>
                <h3 className="chart-title" style={{ marginBottom: '14px' }}>🏆 {t.topDebtors}</h3>
                {topDebtors.map((c, i) => (
                  <div
                    key={c.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < topDebtors.length - 1 ? '1px solid rgba(124,58,237,0.08)' : 'none', cursor: 'pointer' }}
                    onClick={() => navigate(`/customer/${c.id}`)}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '10px', flexShrink: 0,
                      background: i === 0 ? 'linear-gradient(135deg, #D97706, #F59E0B)' : i === 1 ? 'linear-gradient(135deg, #6B7280, #9CA3AF)' : i === 2 ? 'linear-gradient(135deg, #92400E, #B45309)' : 'var(--bg-elevated)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.9rem', fontWeight: '800', color: 'white',
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.phone || 'No phone'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--green)', fontWeight: '700', fontSize: '0.95rem' }}>
                        ₹{c.balance.toLocaleString('en-IN')}
                      </div>
                      {c.tag && <span className={`badge badge-${c.tag === 'vip' ? 'gold' : c.tag === 'defaulter' ? 'red' : 'purple'}`}>{c.tag}</span>}
                    </div>
                    {/* Progress bar */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', width: `${Math.min((c.balance / (topDebtors[0]?.balance || 1)) * 100, 100)}%`, background: 'var(--green)', borderRadius: '1px', opacity: 0.3 }} />
                  </div>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="card fade-in-4" style={{ marginBottom: '16px' }}>
              <h3 className="chart-title" style={{ marginBottom: '14px' }}>📈 Quick Stats</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Total Customers', value: customers.length, icon: '👥' },
                  { label: 'Total Transactions', value: allTx.length, icon: '📋' },
                  { label: 'Settled Accounts', value: customers.filter(c => c.balance === 0).length, icon: '✅' },
                  { label: 'Active Dues', value: customers.filter(c => c.balance !== 0).length, icon: '⚡' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '1.3rem', marginBottom: '6px' }}>{s.icon}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>{s.value}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        .chart-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
      `}</style>
    </div>
  );
}
