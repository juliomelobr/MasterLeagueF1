import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { is2FAValidatedForDevice } from '../utils/deviceDetection';
import '../index.css';

function PilotoAtivoOuEx() {
    const navigate = useNavigate();
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    // Verificar se já está logado (piloto ativo ou ex-piloto)
    useEffect(() => {
        const checkAuth = async () => {
            // Verificar sessão de ex-piloto primeiro
            const exPilotoSession = sessionStorage.getItem('ex_piloto_session');
            if (exPilotoSession) {
                try {
                    const exPilotoData = JSON.parse(exPilotoSession);
                    // Verificar se a sessão não expirou (24 horas)
                    if (Date.now() - exPilotoData.timestamp < 24 * 60 * 60 * 1000) {
                        console.log('✅ Ex-piloto já logado. Redirecionando para dashboard...');
                        navigate('/dashboard');
                        return;
                    } else {
                        // Sessão expirada
                        sessionStorage.removeItem('ex_piloto_session');
                    }
                } catch (err) {
                    console.error('Erro ao parsear sessão ex-piloto:', err);
                    sessionStorage.removeItem('ex_piloto_session');
                }
            }

            // Verificar sessão de piloto ativo
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email) {
                // Verificar se tem 2FA validado usando detecção de dispositivo
                const has2FA = is2FAValidatedForDevice(session.user.email);
                
                if (has2FA) {
                    console.log('✅ Piloto ativo já logado com 2FA validado. Redirecionando para dashboard...');
                    navigate('/dashboard');
                    return;
                } else {
                    console.log('⚠️ Sessão encontrada mas 2FA não validado. Mantendo na tela de escolha.');
                }
            }

            // Se chegou aqui, não está logado
            setLoading(false);
        };

        checkAuth();
    }, [navigate]);

    const handleSelect = (tipo) => {
        setSelected(tipo);
        if (tipo === 'ativo') {
            // Redireciona para login normal
            navigate('/login');
        } else if (tipo === 'ex-piloto') {
            // Ex-piloto vai para tela de escolha (Fazer login ou Solicitar acesso)
            navigate('/ex-piloto/escolha');
        }
    };

    // Mostrar loading enquanto verifica autenticação
    if (loading) {
        return (
            <div className="page-wrapper">
                <div className="login-section">
                    <div className="login-card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
                        <div style={{ color: 'white', padding: '40px' }}>Verificando autenticação...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-wrapper">
            <div className="login-section">
                <div className="login-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                    <h1 style={{ color: 'var(--highlight-cyan)', marginBottom: '10px' }}>
                        ÁREA DO PILOTO
                    </h1>
                    <p className="login-subtitle" style={{ marginBottom: '30px' }}>
                        Selecione o tipo de acesso:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <button
                            onClick={() => handleSelect('ativo')}
                            className="btn-primary"
                            style={{
                                width: '100%',
                                padding: '20px',
                                fontSize: '1.1rem',
                                background: selected === 'ativo' ? 'var(--highlight-cyan)' : 'rgba(6, 182, 212, 0.1)',
                                border: `2px solid ${selected === 'ativo' ? 'var(--highlight-cyan)' : 'rgba(6, 182, 212, 0.3)'}`,
                                color: selected === 'ativo' ? '#0F172A' : 'var(--highlight-cyan)',
                                transition: 'all 0.3s'
                            }}
                        >
                            🏎️ PILOTO ATIVO
                        </button>

                        <button
                            onClick={() => handleSelect('ex-piloto')}
                            className="btn-primary"
                            style={{
                                width: '100%',
                                padding: '20px',
                                fontSize: '1.1rem',
                                background: selected === 'ex-piloto' ? 'var(--highlight-cyan)' : 'rgba(6, 182, 212, 0.1)',
                                border: `2px solid ${selected === 'ex-piloto' ? 'var(--highlight-cyan)' : 'rgba(6, 182, 212, 0.3)'}`,
                                color: selected === 'ex-piloto' ? '#0F172A' : 'var(--highlight-cyan)',
                                transition: 'all 0.3s'
                            }}
                        >
                            📜 EX-PILOTO
                        </button>
                    </div>

                    <p style={{ 
                        marginTop: '30px', 
                        fontSize: '0.9rem', 
                        color: '#94A3B8', 
                        textAlign: 'center' 
                    }}>
                        Pilotos ativos: acesso completo ao painel<br/>
                        Ex-pilotos: acesso somente leitura ao histórico
                    </p>

                    <button
                        onClick={() => navigate('/')}
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
                        ← Voltar para Home
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PilotoAtivoOuEx;

