import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';

export default function CustomerProfile() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showToast, Toast } = useToast();

    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid, 'customers', id), (snap) => {
            if (snap.exists()) setCustomer({ id: snap.id, ...snap.data() });
            else navigate('/');
            setLoading(false);
        });
        return unsub;
    }, [user, id]);

    async function handleTogglePermission() {
        try {
            await updateDoc(doc(db, 'users', user.uid, 'customers', id), {
                denyAddTransaction: !customer.denyAddTransaction
            });
            showToast('Permission updated');
        } catch { showToast('Update failed', 'error'); }
    }

    async function handleDelete() {
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'customers', id));
            navigate('/');
            showToast('Customer deleted');
        } catch { showToast('Delete failed', 'error'); }
    }

    if (loading || !customer) return <div className="page-content"><div className="spinner" /></div>;

    const initials = customer.name?.slice(0, 2).toUpperCase() || '??';

    return (
        <div className="page">
            {Toast}
            <div className="page-header">
                <button onClick={() => navigate(-1)} className="icon-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Profile</h1>
                <div style={{ width: 40 }} />
            </div>

            <div className="page-content">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, padding: '20px 0' }}>
                    <div className="cust-avatar-lg" style={{ width: 80, height: 80, fontSize: '2rem', marginBottom: 16, position: 'relative' }}>
                        {initials}
                        <div className="camera-icon-overlay">📷</div>
                    </div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{customer.name}</h2>
                    <span className="badge badge-purple" style={{ marginTop: 8 }}>{customer.tag || 'Regular'}</span>
                </div>

                <div className="section-title" style={{ paddingLeft: 16 }}>Contact Information</div>
                <div className="card" style={{ padding: 0, borderRadius: 12, overflow: 'hidden' }}>
                    <div className="list-item">
                        <div className="icon-box">📱</div>
                        <div className="list-content">
                            <div className="list-subtitle">Mobile Number</div>
                            <div className="list-title">{customer.phone || 'No Phone'}</div>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                    <div className="list-item" style={{ borderTop: '1px solid var(--border)' }}>
                        <div className="icon-box">📍</div>
                        <div className="list-content">
                            <div className="list-subtitle">Address</div>
                            <div className="list-title">{customer.address || 'Add Address'}</div>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                </div>

                <div className="section-title" style={{ paddingLeft: 16 }}>Communications</div>
                <div className="card" style={{ padding: 0, borderRadius: 12, overflow: 'hidden' }}>
                    <div className="list-item">
                        <div className="icon-box">💬</div>
                        <div className="list-content">
                            <div className="list-title">SMS Settings</div>
                            <div className="list-subtitle">Transactions SMS, Language</div>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                </div>

                <div className="section-title" style={{ paddingLeft: 16 }}>Customer Permission</div>
                <div className="card" style={{ padding: '12px 16px', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="icon-box" style={{ border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red-soft)' }}>🚫</div>
                            <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>Deny to Add Transaction</span>
                        </div>
                        <label className="switch">
                            <input type="checkbox" checked={!!customer.denyAddTransaction} onChange={handleTogglePermission} />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                <div className="card" style={{ padding: 0, marginTop: 24, borderRadius: 12, overflow: 'hidden' }}>
                    <div className="list-item" style={{ color: 'var(--red-soft)' }}>
                        <div className="icon-box" style={{ borderColor: 'rgba(239, 68, 68, 0.1)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red-soft)', border: 'none' }}>🚫</div>
                        <div className="list-content">
                            <div className="list-title">Block</div>
                        </div>
                    </div>
                    <div className="list-item" style={{ borderTop: '1px solid var(--border)', color: 'var(--red-soft)' }} onClick={() => setShowDeleteConfirm(true)}>
                        <div className="icon-box" style={{ borderColor: 'rgba(239, 68, 68, 0.1)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red-soft)', border: 'none' }}>🗑️</div>
                        <div className="list-content">
                            <div className="list-title">Delete</div>
                        </div>
                    </div>
                </div>

                {showDeleteConfirm && (
                    <div className="card" style={{ marginTop: 16, borderColor: 'var(--red-soft)', textAlign: 'center' }}>
                        <p style={{ color: 'var(--red-soft)', marginBottom: 12 }}>Are you sure you want to delete this customer?</p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1 }}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleDelete} style={{ flex: 1 }}>Delete</button>
                        </div>
                    </div>
                )}

            </div>

            <style>{`
        .section-title {
          font-size: 0.9rem; font-weight: 600; color: var(--text-muted);
          margin: 24px 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .list-item {
          display: flex; alignItems: center; gap: 16px;
          padding: 16px; cursor: pointer; background: var(--bg-card);
        }
        .list-item:active { background: var(--bg-surface); }
        .icon-box {
          width: 40px; height: 40px; border-radius: 50%;
          border: 1px solid var(--border);
          display: flex; alignItems: center; justifyContent: center;
          color: var(--purple-primary); font-size: 1.2rem;
        }
        .list-content { flex: 1; }
        .list-title { font-weight: 600; font-size: 1rem; color: var(--text-primary); }
        .list-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 2px; }
        .camera-icon-overlay {
          position: absolute; bottom: 0; right: 0;
          background: #22c55e; color: white;
          width: 28px; height: 28px; border-radius: 50%;
          font-size: 0.9rem; display: flex; alignItems: center; justifyContent: center;
          border: 3px solid var(--bg-deep);
        }
        /* Switch */
        .switch { position: relative; display: inline-block; width: 50px; height: 28px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
          background-color: #e5e7eb; transition: .4s; border-radius: 28px;
        }
        .slider:before {
          position: absolute; content: ""; height: 22px; width: 22px; left: 3px; bottom: 3px;
          background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        input:checked + .slider { background-color: #22c55e; }
        input:checked + .slider:before { transform: translateX(22px); }
      `}</style>
        </div>
    );
}
