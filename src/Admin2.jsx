import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../index.css';

function Admin() {
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Verifica se é ADM (Segurança Básica)
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                navigate('/login'); // Manda logar se não estiver
            } else {
                setSession(session);
                // Opcional: Aqui você poderia verificar se o email é o seu (ex: jmbr.diretoria@gmail.com)
                // if (session.user.email !== 'seu_email_adm') navigate('/');
                fetchPendingUsers();
            }
        });
    }, [navigate]);

    // 2. Busca usuários pendentes
    const fetchPendingUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('status', 'pending'); // Filtra só quem está travado

        if (error) console.error('Erro ao buscar:', error);
        else setPendingUsers(data || []);
        setLoading(false);
    };

    // 3. Função de Aprovar
    const handleApprove = async (userId, nome) => {
        const confirm = window.confirm(`Tem certeza que deseja liberar o acesso para ${nome}?`);
        if (!confirm) return;

        const { error } = await supabase
            .from('profiles')
            .update({ status: 'active' }) // Libera o acesso
            .eq('id', userId);

        if (error) {
            alert('Erro ao aprovar: ' + error.message);
        } else {
            alert(`${nome} foi aprovado com sucesso!`);
            fetchPendingUsers(); // Atualiza a lista
        }
    };

    // 4. Função de Excluir (Caso seja spam/erro)
    const handleReject = async (userId) => {
        if (!window.confirm("Isso vai apagar o cadastro. Tem certeza?")) return;
        
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (!error) fetchPendingUsers();
    };

    if (loading) return <div style={{padding:'100px', textAlign:'center', color:'white'}}>Carregando solicitações...</div>;

    return (
        <div className="page-wrapper">
            <div style={{maxWidth:'1000px', margin:'40px auto', padding:'0 20px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'40px', borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:'20px'}}>
                    <h1 style={{fontSize:'2rem', fontWeight:'900', color:'#FFD700', fontStyle:'italic'}}>PAINEL <span style={{color:'white'}}>ADM</span></h1>
                    <button onClick={() => navigate('/')} className="btn-outline" style={{fontSize:'0.8rem', padding:'8px 20px'}}>VOLTAR PRO SITE</button>
                </div>

                <h2 style={{color:'white', marginBottom:'20px'}}>Solicitações Pendentes ({pendingUsers.length})</h2>

                {pendingUsers.length === 0 ? (
                    <div style={{padding:'40px', background:'#1E293B', borderRadius:'12px', textAlign:'center', color:'#94A3B8'}}>
                        Nenhuma solicitação pendente no momento.
                    </div>
                ) : (
                    <div className="admin-grid">
                        {pendingUsers.map(user => (
                            <div key={user.id} className="admin-card">
                                <div className="adm-card-header">
                                    <span className="adm-date">{new Date(user.created_at).toLocaleDateString()}</span>
                                    <span className="adm-grid-tag">{user.grid_preferencia || 'N/A'}</span>
                                </div>
                                
                                <div className="adm-info-row">
                                    <label>Nome Piloto:</label>
                                    <div className="adm-value highlight">{user.nome_piloto}</div>
                                </div>
                                <div className="adm-info-row">
                                    <label>Nome Real:</label>
                                    <div className="adm-value">{user.nome_completo || '-'}</div>
                                </div>
                                <div className="adm-info-row">
                                    <label>Gamertag:</label>
                                    <div className="adm-value">{user.gamertag || '-'}</div>
                                </div>
                                <div className="adm-info-row">
                                    <label>WhatsApp:</label>
                                    <div className="adm-value">{user.whatsapp}</div>
                                </div>
                                <div className="adm-info-row">
                                    <label>Email:</label>
                                    <div className="adm-value" style={{fontSize:'0.8rem'}}>{user.email}</div>
                                </div>

                                <div className="adm-actions">
                                    <button onClick={() => handleReject(user.id)} className="btn-reject">REJEITAR</button>
                                    <button onClick={() => handleApprove(user.id, user.nome_piloto)} className="btn-approve">APROVAR</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Admin;