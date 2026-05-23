import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../index.css';

function LoginJuradoTeste() {
    const navigate = useNavigate();
    const [juradosTeste, setJuradosTeste] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Carregar jurados de teste (jurado1, jurado2, jurado3)
        const fetchJuradosTeste = async () => {
            const { data, error } = await supabase
                .from('jurados')
                .select('*')
                .in('usuario', ['jurado1', 'jurado2', 'jurado3'])
                .eq('ativo', true)
                .order('usuario');

            if (!error && data) {
                setJuradosTeste(data);
            }
            setLoading(false);
        };
        fetchJuradosTeste();
    }, []);

    const handleLoginDireto = (jurado) => {
        // Salvar sessão do jurado de teste (acesso direto, sem senha)
        localStorage.setItem('ml_juri_auth', 'true');
        localStorage.setItem('ml_juri_nome', jurado.nome);
        localStorage.setItem('ml_juri_email', jurado.email_google);

        // Redirecionar para o painel do júri
        navigate('/veredito');
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                borderRadius: '20px',
                padding: '40px',
                maxWidth: '450px',
                width: '100%',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                border: '1px solid rgba(245, 158, 11, 0.3)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ fontSize: '60px', marginBottom: '15px' }}>🧪</div>
                    <h2 style={{ color: '#F59E0B', margin: 0, fontSize: '1.5rem' }}>Login de Teste</h2>
                    <p style={{ color: '#94A3B8', fontSize: '14px', marginTop: '10px' }}>
                        Clique em um jurado para acessar
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #EF4444',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '20px',
                        color: '#EF4444',
                        fontSize: '14px',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px' }}>
                        ⏳ Carregando jurados...
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {juradosTeste.map(jurado => (
                            <button
                                key={jurado.id}
                                onClick={() => handleLoginDireto(jurado)}
                                style={{
                                    padding: '20px',
                                    background: 'rgba(139, 92, 246, 0.1)',
                                    border: '2px solid #8B5CF6',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(139, 92, 246, 0.3)';
                                    e.target.style.transform = 'scale(1.02)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                                    e.target.style.transform = 'scale(1)';
                                }}
                            >
                                👨‍⚖️ {jurado.nome}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '25px' }}>
                    <button
                        onClick={() => navigate('/login-jurado')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#8B5CF6',
                            fontSize: '14px',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        ← Login normal (Google)
                    </button>
                </div>

                <div style={{
                    marginTop: '30px',
                    padding: '15px',
                    background: 'rgba(139, 92, 246, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(139, 92, 246, 0.3)'
                }}>
                    <p style={{ color: '#A78BFA', fontSize: '12px', margin: 0, textAlign: 'center' }}>
                        ⚠️ Este acesso é apenas para testes.<br/>
                        Clique diretamente no jurado desejado.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LoginJuradoTeste;
