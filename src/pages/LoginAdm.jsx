import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getRedirectUrl } from '../utils/urlHelpers';

function LoginAdm() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    useEffect(() => {
        // Se já estiver logado, manda pro Painel ADM (que criaremos depois)
        // Por enquanto manda pro dashboard mesmo pra testar
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate('/dashboard'); 
        });
    }, [navigate]);

    const handleMagicLink = async (e) => {
        e.preventDefault();
        setLoading(true);
        // SEMPRE usar a URL atual dinamicamente (resolve problema mobile localhost)
        // Redireciona para dashboard (ou dashboard-adm no futuro)
        const redirectUrl = getRedirectUrl('/dashboard');
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: redirectUrl }, 
        });
        if (error) alert('Erro: ' + error.message);
        else setSent(true);
        setLoading(false);
    };

    return (
        <div className="page-wrapper">
            <div className="login-section">
                <div className="login-card" style={{borderColor: '#FFD700'}}> {/* Borda dourada pra diferenciar */}
                    <h1 style={{color: '#FFD700'}}>ÁREA ADM</h1>
                    <p className="login-subtitle">Acesso restrito à administração da liga.</p>

                    {sent ? (
                        <div className="login-success">
                            <h3>Verifique seu E-mail</h3>
                            <p>Link de acesso enviado para <strong>{email}</strong>.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleMagicLink} className="login-form">
                            <div className="input-group">
                                <label>E-mail Administrativo</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                            <button className="btn-primary" disabled={loading} style={{width: '100%', background: '#FFD700', color: 'black'}}>
                                {loading ? 'ENVIANDO...' : 'ENVIAR LINK DE ACESSO'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LoginAdm;