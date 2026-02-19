import { useLang } from '../context/LangContext';

export default function MyPlan() {
    const { t } = useLang();

    return (
        <div className="page">
            <div className="page-header">
                <h1>My Plan</h1>
            </div>
            <div className="page-content">
                <div className="card">
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: '4rem', marginBottom: 20 }}>💎</div>
                        <h2>Premium Plan</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Unlock all features with our premium plan.</p>
                        <button className="btn btn-primary" style={{ marginTop: 20 }}>Upgrade Now</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
