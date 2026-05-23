import { useNavigate } from 'react-router-dom';
import '../index.css';

function ExPilotoEscolha() {
    const navigate = useNavigate();

    return (
        <div className="page-wrapper">
            <div className="login-section">
                <div className="login-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                    <h1 style={{ color: 'var(--highlight-cyan)', marginBottom: '10px' }}>
                        📜 EX-PILOTO
                    </h1>
                    <p className="login-subtitle" style={{ marginBottom: '30px' }}>
                        Escolha uma opção:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <button
                            onClick={() => navigate('/ex-piloto/login')}
                            className="btn-primary"
                            style={{
                                width: '100%',
                                padding: '20px',
                                fontSize: '1.1rem',
                                background: 'rgba(6, 182, 212, 0.1)',
                                border: '2px solid rgba(6, 182, 212, 0.3)',
                                color: 'var(--highlight-cyan)',
                                transition: 'all 0.3s'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.background = 'var(--highlight-cyan)';
                                e.target.style.color = '#0F172A';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.background = 'rgba(6, 182, 212, 0.1)';
                                e.target.style.color = 'var(--highlight-cyan)';
                            }}
                        >
                            🔐 FAZER LOGIN
                        </button>

                        <button
                            onClick={() => navigate('/ex-piloto/cadastro')}
                            className="btn-primary"
                            style={{
                                width: '100%',
                                padding: '20px',
                                fontSize: '1.1rem',
                                background: 'rgba(6, 182, 212, 0.1)',
                                border: '2px solid rgba(6, 182, 212, 0.3)',
                                color: 'var(--highlight-cyan)',
                                transition: 'all 0.3s'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.background = 'var(--highlight-cyan)';
                                e.target.style.color = '#0F172A';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.background = 'rgba(6, 182, 212, 0.1)';
                                e.target.style.color = 'var(--highlight-cyan)';
                            }}
                        >
                            📝 SOLICITAR ACESSO
                        </button>
                    </div>

                    <p style={{ 
                        marginTop: '30px', 
                        fontSize: '0.9rem', 
                        color: '#94A3B8', 
                        textAlign: 'center' 
                    }}>
                        <strong>Fazer Login:</strong> Para ex-pilotos já aprovados<br/>
                        <strong>Solicitar Acesso:</strong> Para solicitar novo acesso ao painel
                    </p>

                    <button
                        onClick={() => navigate('/dashboard/escolher-tipo')}
                        style={{
                            marginTop: '30px',
                            width: '100%',
                            padding: '12px 20px',
                            fontSize: '0.95rem',
                            background: 'rgba(71, 85, 105, 0.2)',
                            border: '1px solid #64748B',
                            color: '#E2E8F0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            fontWeight: '500'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.background = 'rgba(71, 85, 105, 0.4)';
                            e.target.style.borderColor = '#94A3B8';
                            e.target.style.color = '#F1F5F9';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.background = 'rgba(71, 85, 105, 0.2)';
                            e.target.style.borderColor = '#64748B';
                            e.target.style.color = '#E2E8F0';
                        }}
                    >
                        ← Voltar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ExPilotoEscolha;




































