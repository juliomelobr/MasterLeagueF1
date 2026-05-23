import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const AUTH_KEY = 'ml:narrador:auth';
const normalizeRole = (role) => (String(role || '').trim().toLowerCase() === 'admin' ? 'admin' : 'narrador');

async function sha256Hex(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text || '');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function Narrador() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState('');
    const [senha, setSenha] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [auth, setAuth] = useState(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(AUTH_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.usuario && parsed?.email) {
                setAuth(parsed);
            }
        } catch {
            localStorage.removeItem(AUTH_KEY);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem(AUTH_KEY);
        setAuth(null);
        setUsuario('');
        setSenha('');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userInput = usuario.trim().toLowerCase();
            if (!userInput || !senha) {
                setError('Informe usuário/e-mail e senha.');
                return;
            }

            const { data, error: fetchErr } = await supabase
                .from('narradores')
                .select('*')
                .eq('ativo', true);

            if (fetchErr) throw fetchErr;

            const candidato = (data || []).find((row) => {
                const email = String(row?.email || '').trim().toLowerCase();
                const usuarioRow = String(row?.usuario || '').trim().toLowerCase();
                const fallbackUser = email.includes('@') ? email.split('@')[0] : '';
                return userInput === email || userInput === usuarioRow || userInput === fallbackUser;
            });

            if (!candidato) {
                setError('Usuário não encontrado ou inativo.');
                return;
            }
            if (!candidato?.senha_hash) {
                setError('Conta sem senha definida. Solicite ajuste no painel Admin > Narradores.');
                return;
            }

            const senhaHash = await sha256Hex(senha);
            if (senhaHash !== candidato.senha_hash) {
                setError('Usuário ou senha inválidos.');
                return;
            }

            const payload = {
                id: candidato.id,
                usuario: candidato.usuario || (candidato.email ? candidato.email.split('@')[0] : ''),
                nome: candidato.nome || 'Narrador',
                email: candidato.email,
                papel: normalizeRole(candidato.papel),
                at: new Date().toISOString()
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
            setAuth(payload);
            setSenha('');
        } catch (err) {
            setError(err?.message || 'Falha ao autenticar.');
        } finally {
            setLoading(false);
        }
    };

    if (!auth) {
        return (
            <div className="page-wrapper">
                <div style={{
                    maxWidth: '430px',
                    margin: '100px auto',
                    background: '#1E293B',
                    padding: '32px',
                    borderRadius: '14px',
                    border: '1px solid #06B6D4'
                }}>
                    <h1 style={{ color: '#06B6D4', margin: 0, marginBottom: '8px', textAlign: 'center' }}>ÁREA NARRADOR</h1>
                    <p style={{ color: '#94A3B8', marginTop: 0, marginBottom: '18px', textAlign: 'center' }}>
                        Login com usuário (ou e-mail) e senha.
                    </p>

                    <form onSubmit={handleLogin}>
                        <input
                            type="text"
                            value={usuario}
                            onChange={(e) => setUsuario(e.target.value)}
                            placeholder="Usuário ou e-mail"
                            autoComplete="username"
                            style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F8FAFC' }}
                        />
                        <input
                            type="password"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            placeholder="Senha"
                            autoComplete="current-password"
                            style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F8FAFC' }}
                        />
                        {error && <p style={{ color: '#FCA5A5', marginTop: 0, marginBottom: '10px', fontSize: '0.9rem' }}>{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                            style={{ width: '100%', background: '#06B6D4', color: '#0F172A', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? 'ENTRANDO...' : 'ENTRAR'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="page-wrapper">
            <div style={{
                maxWidth: '760px',
                margin: '80px auto',
                background: '#1E293B',
                borderRadius: '14px',
                border: '1px solid #0EA5E9',
                padding: '24px'
            }}>
                <h2 style={{ marginTop: 0, color: '#06B6D4' }}>Central do Narrador</h2>
                <p style={{ color: '#94A3B8' }}>
                    Logado como <strong>{auth.nome}</strong> ({auth.usuario}) - perfil <strong>{auth.papel}</strong>
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                    <button
                        onClick={() => navigate('/motorhome-master')}
                        className="btn-primary"
                        style={{ background: '#06B6D4', color: '#0F172A' }}
                    >
                        Abrir Página Mestre do Motorhome
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="btn-outline"
                        style={{ borderColor: '#64748B', color: '#94A3B8' }}
                    >
                        Ir para Home
                    </button>
                    <button
                        onClick={handleLogout}
                        className="btn-outline"
                        style={{ borderColor: '#EF4444', color: '#EF4444' }}
                    >
                        Sair
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Narrador;
