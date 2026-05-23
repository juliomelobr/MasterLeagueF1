import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import VideoEmbed from '../components/VideoEmbed';
import { isMobileDevice } from '../utils/deviceDetection';
import '../index.css';

function ConsultarAnalises() {
    const navigate = useNavigate();
    const [analises, setAnalises] = useState([]);
    const [loading, setLoading] = useState(true);

    // Detectar dispositivo para responsividade
    const [isMobile, setIsMobile] = useState(isMobileDevice());
    useEffect(() => {
        const handleResize = () => setIsMobile(isMobileDevice());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Estados para filtros
    const [filtroGrid, setFiltroGrid] = useState('todos'); // 'todos', 'carreira', 'light'
    const [filtroEtapa, setFiltroEtapa] = useState('todas'); // 'todas' ou número da etapa
    const [mostrarTodos, setMostrarTodos] = useState(false); // false = mostra só 5

    // Função para separar nome e sobrenome (primeira letra maiúscula)
    const separarNomeSobrenome = (nomeCompleto) => {
        if (!nomeCompleto || nomeCompleto === '-') {
            return { nome: '-', sobrenome: '' };
        }
        const partes = nomeCompleto.trim().split(/\s+/);
        
        // Função auxiliar para capitalizar (primeira letra maiúscula, resto minúsculo)
        const capitalizar = (palavra) => {
            if (!palavra) return '';
            return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
        };
        
        if (partes.length === 1) {
            return { nome: capitalizar(partes[0]), sobrenome: '' };
        }
        const nome = capitalizar(partes[0]);
        const sobrenome = partes.slice(1).map(capitalizar).join(' ');
        return { nome, sobrenome };
    };

    useEffect(() => {
        fetchAnalises();
    }, []);

    const handleTribunalClick = async () => {
        try {
            // Verificar se há sessão Google
            const { data: sessionData } = await supabase.auth.getSession();
            
            if (!sessionData.session) {
                // Sem sessão, ir direto para login
                navigate('/login-jurado');
                return;
            }

            // Verificar se o email está vinculado a um jurado ativo
            const email = sessionData.session.user.email?.toLowerCase();
            const { data: jurado } = await supabase
                .from('jurados')
                .select('*')
                .eq('email_google', email)
                .eq('ativo', true)
                .single();

            if (jurado) {
                // Jurado válido, ir direto para o tribunal
                navigate('/veredito');
            } else {
                // Email não vinculado a jurado, ir para login
                navigate('/login-jurado');
            }
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            // Em caso de erro, ir para login
            navigate('/login-jurado');
        }
    };

    const fetchAnalises = async () => {
        setLoading(true);
        try {
            // Buscar todas as acusações e filtrar no frontend
            const { data, error } = await supabase
                .from('notificacoes_admin')
                .select('*')
                .eq('tipo', 'nova_acusacao')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Filtrar lances decididos (status analise_realizada OU 3+ votos)
            const analisesDecididas = (data || []).filter(item => {
                const dados = item.dados || {};
                const votos = dados.votos || [];
                const votosCulpado = votos.filter(v => v.culpado).length;
                const votosInocente = votos.filter(v => !v.culpado).length;
                const decidido = votosCulpado >= 3 || votosInocente >= 3;
                
                return dados.status === 'analise_realizada' || decidido;
            });
            
            console.log('📦 Análises carregadas:', analisesDecididas.length);
            // Debug: verificar grids
            const gridsEncontrados = analisesDecididas.map(a => {
                const grid = a.dados?.grid || a.dados?.acusador?.grid || 'N/A';
                return { codigo: a.dados?.codigoLance || 'N/A', grid };
            });
            console.log('🔍 Grids encontrados nas análises:', gridsEncontrados);
            setAnalises(analisesDecididas);
        } catch (err) {
            console.error('Erro ao buscar análises:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="analises-page" style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
            paddingBottom: '60px',
            paddingTop: '80px'
        }}>
            {/* ===== HERO BANNER ===== */}
            <div style={{
                background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 50%, #1E293B 100%)',
                borderBottom: '3px solid #F59E0B',
                padding: '30px 20px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Background Pattern */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F59E0B' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    opacity: 0.5
                }} />

                <div className="analises-header-inner" style={{ 
                    position: 'relative', 
                    zIndex: 1,
                    maxWidth: '1400px',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '20px'
                }}>
                    {/* Título com ícone à esquerda e contador */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '40px' }}>⚖️</span>
                        <div>
                            <h1 style={{
                                fontSize: '1.8rem',
                                fontWeight: '900',
                                color: '#F8FAFC',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                margin: 0
                            }}>
                                Central de Análises
                            </h1>
                            <span style={{ color: '#94A3B8', fontSize: '14px' }}>
                                {analises.length} análise{analises.length !== 1 ? 's' : ''} registrada{analises.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    {/* Botões de ação no lado direito */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {/* Botão para pedir análise */}
                        <button
                            className="btn-enviar-analise"
                            onClick={() => navigate('/dashboard')}
                            style={{
                                padding: '10px 20px',
                                width: '180px',
                                height: '44px',
                                background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                                transition: 'all 0.3s ease',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
                            }}
                        >
                            <span className="btn-text-desktop">📝 Enviar Análise</span>
                            <span className="btn-text-mobile" style={{ display: 'none' }}>📝 ENVIAR</span>
                        </button>

                        {/* Botão Tribunal do Júri (para jurados) */}
                        <button
                            className="btn-tribunal"
                            onClick={handleTribunalClick}
                            style={{
                                padding: '10px 20px',
                                width: '180px',
                                height: '44px',
                                background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                                transition: 'all 0.3s ease',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.3)';
                            }}
                        >
                            <span className="btn-text-desktop">👨‍⚖️ Tribunal do Júri</span>
                            <span className="btn-text-mobile" style={{ display: 'none' }}>👨‍⚖️ TRIBUNAL</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ===== GRID DE ANÁLISES ===== */}
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                padding: '20px'
            }}>
                {/* Filtros */}
                <div style={{ 
                    display: 'flex', 
                    gap: '15px', 
                    marginBottom: '25px', 
                    flexWrap: 'wrap',
                    padding: '15px',
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {/* Filtro por Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ color: '#94A3B8', fontSize: '12px', textTransform: 'uppercase' }}>Grid</label>
                        <select
                            value={filtroGrid}
                            onChange={(e) => {
                                setFiltroGrid(e.target.value);
                                setFiltroEtapa('todas');
                                setMostrarTodos(false);
                            }}
                            style={{
                                padding: '10px 15px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '14px',
                                cursor: 'pointer',
                                minWidth: '150px'
                            }}
                        >
                            <option value="todos" style={{ background: '#1E293B' }}>🏁 Todos os Grids</option>
                            <option value="carreira" style={{ background: '#1E293B' }}>🏆 Carreira</option>
                            <option value="light" style={{ background: '#1E293B' }}>💡 Light</option>
                        </select>
                    </div>

                    {/* Filtro por Etapa (só aparece se um grid específico for selecionado) */}
                    {filtroGrid !== 'todos' && (() => {
                        // Extrair etapas únicas do grid selecionado
                        const etapasDoGrid = [...new Set(
                            analises
                                .filter(l => {
                                    const gridLance = l.dados?.grid || l.dados?.acusador?.grid || 'light';
                                    return gridLance === filtroGrid;
                                })
                                .map(l => l.dados?.etapa?.round)
                                .filter(Boolean)
                        )].sort((a, b) => a - b);

                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ color: '#94A3B8', fontSize: '12px', textTransform: 'uppercase' }}>Etapa</label>
                                <select
                                    value={filtroEtapa}
                                    onChange={(e) => {
                                        setFiltroEtapa(e.target.value);
                                        setMostrarTodos(false);
                                    }}
                                    style={{
                                        padding: '10px 15px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        minWidth: '180px'
                                    }}
                                >
                                    <option value="todas" style={{ background: '#1E293B' }}>📋 Todas as Etapas</option>
                                    {etapasDoGrid.map(round => (
                                        <option key={round} value={round} style={{ background: '#1E293B' }}>
                                            Round {round}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        );
                    })()}

                    {/* Botão Limpar Filtros */}
                    {(filtroGrid !== 'todos' || filtroEtapa !== 'todas') && (
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setFiltroGrid('todos');
                                    setFiltroEtapa('todas');
                                    setMostrarTodos(false);
                                }}
                                style={{
                                    padding: '10px 15px',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid #EF4444',
                                    borderRadius: '8px',
                                    color: '#EF4444',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                ✕ Limpar Filtros
                            </button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '80px 20px',
                        color: '#94A3B8'
                    }}>
                        <div style={{ fontSize: '50px', marginBottom: '20px' }}>⏳</div>
                        <p>Carregando análises...</p>
                    </div>
                ) : (() => {
                    // Aplicar filtros
                    let analisesFiltradas = [...analises];
                    
                    if (filtroGrid !== 'todos') {
                        analisesFiltradas = analisesFiltradas.filter(l => {
                            const gridLance = l.dados?.grid || l.dados?.acusador?.grid || 'light';
                            return gridLance === filtroGrid;
                        });
                    }
                    
                    if (filtroEtapa !== 'todas') {
                        analisesFiltradas = analisesFiltradas.filter(l => String(l.dados?.etapa?.round) === String(filtroEtapa));
                    }

                    // Ordenar por data da decisão (mais recente primeiro)
                    analisesFiltradas.sort((a, b) => {
                        const dateA = new Date(a.dados?.veredito?.dataVeredito || a.updated_at || a.created_at || 0);
                        const dateB = new Date(b.dados?.veredito?.dataVeredito || b.updated_at || b.created_at || 0);
                        return dateB.getTime() - dateA.getTime();
                    });
                    
                    // Limitar a 5 se não estiver mostrando todos
                    const totalFiltradas = analisesFiltradas.length;
                    const analisesParaMostrar = mostrarTodos ? analisesFiltradas : analisesFiltradas.slice(0, 5);
                    const temMais = totalFiltradas > 5 && !mostrarTodos;

                    if (totalFiltradas === 0) {
                        return (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '80px 20px',
                                color: '#64748B',
                                background: '#1E293B',
                                borderRadius: '12px',
                                border: '1px dashed #475569'
                            }}>
                                <div style={{ fontSize: '60px', marginBottom: '20px' }}>📭</div>
                                <h3 style={{ color: '#94A3B8', marginBottom: '10px' }}>
                                    {analises.length === 0 ? 'Nenhuma análise encontrada' : 'Nenhuma análise com os filtros selecionados'}
                                </h3>
                                <p>{analises.length === 0 ? 'Ainda não há análises concluídas.' : 'Tente ajustar os filtros para ver mais resultados.'}</p>
                            </div>
                        );
                    }

                    return (
                        <>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '40px'
                            }}>
                                {analisesParaMostrar.map((analise) => {
                                    const dados = analise.dados || {};
                            const etapa = dados.etapa || {};
                            const acusador = dados.acusador || {};
                            const acusado = dados.acusado || {};
                            const defesa = dados.defesa || null;
                            const codigoLance = dados.codigoLance || dados.codigo || 'N/A';

                            // Usar veredito se existir, senão calcular a partir dos votos
                            const votos = dados.votos || [];
                            const veredito = dados.veredito || null;
                            const isRetiradaBug = dados?.tipoSolicitacao === 'retirada_bug' || dados?.acusado?.nome === 'Administração Master League F1';
                            
                            let decisao, votosCulpado, votosInocente;
                            
                            if (veredito) {
                                // Usar dados do veredito finalizado
                                votosCulpado = votos.filter(v => v.culpado).length;
                                votosInocente = votos.filter(v => !v.culpado).length;
                                
                                // Normalizar decisão do veredito (pode ser INOCENTADO ou INOCENTE)
                                const decisaoVeredito = veredito.decisao || (veredito.culpado ? 'CULPADO' : 'INOCENTE');
                                
                                // Ajustar texto para retirada de bug
                                if (isRetiradaBug) {
                                    decisao = veredito.culpado ? 'RETIRAR PUNIÇÃO' : 'MANTER PUNIÇÃO';
                                } else {
                                    // Normalizar INOCENTADO para INOCENTE para consistência
                                    decisao = decisaoVeredito === 'INOCENTADO' ? 'INOCENTE' : decisaoVeredito;
                                }
                            } else {
                                // Calcular a partir dos votos (lance ainda não finalizado)
                                votosCulpado = votos.filter(v => v.culpado).length;
                                votosInocente = votos.filter(v => !v.culpado).length;
                                const decisaoBase = votosCulpado >= 3 ? 'CULPADO' : (votosInocente >= 3 ? 'INOCENTE' : 'EM ANÁLISE');
                                
                                // Ajustar texto para retirada de bug
                                if (isRetiradaBug) {
                                    decisao = decisaoBase === 'CULPADO' ? 'RETIRAR PUNIÇÃO' : (decisaoBase === 'INOCENTE' ? 'MANTER PUNIÇÃO' : decisaoBase);
                                } else {
                                    decisao = decisaoBase;
                                }
                            }
                            
                            // Calcular punição se culpado (usar veredito se existir)
                            let punicaoFinal = null;
                            let pontosDeducted = 0;
                            let raceBan = false;
                            let temAgravante = false;
                            let semVideoDefesa = false;
                            let pontosSemVideo = 0;
                            
                            // Sem vídeo de defesa: regra oficial
                            // 1) veredito.semVideo já calculado, OU
                            // 2) ausência de link na defesa (fallback para legados)
                            const semVideoAutomatico = !isRetiradaBug && !String(dados?.defesa?.videoLinkDefesa || '').trim();
                            if (veredito && veredito.semVideo && !isRetiradaBug) {
                                semVideoDefesa = true;
                                pontosSemVideo = 5; // Sempre 5 pontos por não enviar vídeo
                            } else if (semVideoAutomatico) {
                                semVideoDefesa = true;
                                pontosSemVideo = 5;
                            }
                            
                            if (veredito && veredito.culpado && !isRetiradaBug && veredito.labelPunicao) {
                                // Usar dados do veredito
                                const punicoes = {
                                    'advertencia': { label: '⚠️ Advertência (Alerta Disciplinar!)', pontos: 0 },
                                    'leve': { label: '🟡 Leve', pontos: 5 },
                                    'media': { label: '🟠 Média', pontos: 10 },
                                    'grave': { label: '🔴 Grave', pontos: 15 },
                                    'gravissima': { label: '⛔ Gravíssima', pontos: 20, raceBan: true }
                                };
                                
                                const punicaoBase = veredito.punicao || '';
                                const baseInfo = punicoes[punicaoBase] || { label: veredito.labelPunicao, pontos: veredito.pontosPerdidos || 0 };
                                
                                // Usar label atualizado da tabela (não do banco que pode estar desatualizado)
                                punicaoFinal = {
                                    label: baseInfo.label,
                                    pontos: baseInfo.pontos
                                };
                                pontosDeducted = veredito.pontosPerdidos || 0;
                                raceBan = veredito.raceBan || false;
                                temAgravante = veredito.agravante || false;
                            } else if (!isRetiradaBug && (decisao === 'CULPADO' || decisao === 'RETIRAR PUNIÇÃO')) {
                                const votosCulpadosList = votos.filter(v => v.culpado);
                                const punicoes = {
                                    'advertencia': { label: '⚠️ Advertência (Alerta Disciplinar!)', pontos: 0 },
                                    'leve': { label: '🟡 Leve', pontos: 5 },
                                    'media': { label: '🟠 Média', pontos: 10 },
                                    'grave': { label: '🔴 Grave', pontos: 15 },
                                    'gravissima': { label: '⛔ Gravíssima', pontos: 20, raceBan: true }
                                };
                                
                                // Contar punições
                                const contagemPunicoes = {};
                                votosCulpadosList.forEach(v => {
                                    const key = v.punicao;
                                    contagemPunicoes[key] = (contagemPunicoes[key] || 0) + 1;
                                    if (v.agravante) temAgravante = true;
                                });
                                
                                // Encontrar punição mais votada
                                let punicaoMaisVotada = null;
                                let maxVotos = 0;
                                Object.entries(contagemPunicoes).forEach(([punicao, count]) => {
                                    if (count > maxVotos) {
                                        maxVotos = count;
                                        punicaoMaisVotada = punicao;
                                    }
                                });
                                
                                if (punicaoMaisVotada && punicoes[punicaoMaisVotada]) {
                                    punicaoFinal = punicoes[punicaoMaisVotada];
                                    pontosDeducted = punicaoFinal.pontos + (temAgravante ? 5 : 0);
                                    raceBan = punicaoFinal.raceBan || false;
                                }
                            }

                            return (
                                <div
                                    key={analise.id}
                                    style={{
                                        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        border: '1px solid #334155',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                                    }}
                                >
                                    {/* Header do Lance */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)',
                                        padding: isMobile ? '12px 15px' : '20px 25px',
                                        borderBottom: '2px solid #F59E0B',
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: isMobile ? '8px' : '15px'
                                    }}>
                                        {/* Código do Lance e Grid Badge na mesma linha */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                background: '#E5E7EB',
                                                color: '#1F2937',
                                                padding: isMobile ? '6px 12px' : '8px 16px',
                                                borderRadius: '8px',
                                                fontSize: isMobile ? '13px' : '16px',
                                                fontWeight: 'bold',
                                                fontFamily: 'monospace'
                                            }}>
                                                🔖 {codigoLance}
                                            </span>

                                            {/* Grid Badge - na mesma linha do código */}
                                            {(() => {
                                                const gridLance = dados.grid || dados.acusador?.grid || 'light';
                                                return (
                                                    <span className="grid-badge-inline" style={{
                                                        background: gridLance === 'carreira' ? '#8B0000' : '#06B6D4',
                                                        color: 'white',
                                                        padding: isMobile ? '3px 10px' : '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: isMobile ? '10px' : '12px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {gridLance === 'carreira' ? '🏆 CARREIRA' : '💡 LIGHT'}
                                                    </span>
                                                );
                                            })()}
                                        </div>

                                        {/* Temporada */}
                                        <span style={{ color: '#F59E0B', fontSize: isMobile ? '11px' : '14px', fontWeight: 'bold' }}>
                                            📊 Temporada {etapa.season || etapa.temporada || dados.season || dados.temporada || '-'}
                                        </span>

                                        {/* Etapa */}
                                        <span style={{ color: '#F8FAFC', fontSize: isMobile ? '13px' : '16px', fontWeight: 'bold' }}>
                                            🏁 Round {etapa.round || '-'} - {etapa.circuit || '-'}
                                        </span>

                                        {/* Data */}
                                        <span style={{ color: '#94A3B8', fontSize: isMobile ? '11px' : '14px' }}>
                                            📅 {etapa.date || dados.dataCorrida || '-'}
                                        </span>
                                    </div>

                                    {/* Pilotos envolvidos */}
                                    <div className="pilotos-envolvidos-container" style={{
                                        padding: isMobile ? '10px 15px' : '15px 25px',
                                        background: '#0F172A',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: isMobile ? '20px' : '40px',
                                        flexWrap: 'wrap'
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <span style={{ color: '#EF4444', fontSize: isMobile ? '10px' : '12px' }}>ACUSADOR</span>
                                            <div className="piloto-nome-2linhas" style={{ color: '#F8FAFC', fontWeight: 'bold' }}>
                                                {(() => {
                                                    const { nome, sobrenome } = separarNomeSobrenome(acusador.nome || '-');
                                                    return (
                                                        <>
                                                            <div>{nome}</div>
                                                            <div>{sobrenome || '\u00A0'}</div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div style={{ color: '#64748B', fontSize: isMobile ? '18px' : '24px', alignSelf: 'center' }}>⚔️</div>
                                        <div style={{ textAlign: 'center' }}>
                                            <span style={{ color: '#F59E0B', fontSize: isMobile ? '10px' : '12px' }}>ACUSADO</span>
                                            <div className="piloto-nome-2linhas" style={{ color: '#F8FAFC', fontWeight: 'bold' }}>
                                                {(() => {
                                                    // Se for retirada de bug, mostrar "ADM MLF1" ao invés do nome completo
                                                    const nomeAcusado = acusado.nome || '-';
                                                    if (isRetiradaBug && nomeAcusado === 'Administração Master League F1') {
                                                        return (
                                                            <>
                                                                <div>ADM</div>
                                                                <div>MLF1</div>
                                                            </>
                                                        );
                                                    }
                                                    const { nome, sobrenome } = separarNomeSobrenome(nomeAcusado);
                                                    return (
                                                        <>
                                                            <div>{nome}</div>
                                                            <div>{sobrenome || '\u00A0'}</div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vídeos lado a lado */}
                                    <div className="videos-grid-analises" style={{
                                        padding: isMobile ? '15px' : '25px',
                                        display: 'grid',
                                        gridTemplateColumns: isMobile ? '1fr' : (defesa ? '1fr 1fr' : '1fr'),
                                        gap: isMobile ? '15px' : '20px'
                                    }}>
                                        {/* Vídeo Acusação */}
                                        <div>
                                            <div style={{
                                                color: '#EF4444',
                                                fontSize: isMobile ? '0.9rem' : '13px',
                                                fontWeight: 'bold',
                                                marginBottom: isMobile ? '8px' : '10px',
                                                textAlign: 'center',
                                                textTransform: 'uppercase',
                                                letterSpacing: isMobile ? '0.5px' : '1px',
                                                textShadow: '0 2px 10px rgba(239, 68, 68, 0.3)'
                                            }}>
                                                👤 VISÃO DO ACUSADOR
                                            </div>
                                            <VideoEmbed
                                                videoLink={dados.videoLink || dados.video_link}
                                                title={`Vídeo acusação ${codigoLance}`}
                                                borderColor="#EF4444"
                                                isMobile={isMobile}
                                            />
                                        </div>

                                        {/* Vídeo Defesa */}
                                        {defesa && (
                                            <div>
                                                <div style={{
                                                    color: '#22C55E',
                                                    fontSize: isMobile ? '0.9rem' : '13px',
                                                    fontWeight: 'bold',
                                                    marginBottom: isMobile ? '8px' : '10px',
                                                    textAlign: 'center',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: isMobile ? '0.5px' : '1px',
                                                    textShadow: '0 2px 10px rgba(34, 197, 94, 0.3)'
                                                }}>
                                                    🛡️ VISÃO DO DEFENSOR
                                                </div>
                                                <VideoEmbed
                                                    videoLink={defesa.videoLinkDefesa || defesa.video_link_defesa}
                                                    title={`Vídeo defesa ${codigoLance}`}
                                                    borderColor="#22C55E"
                                                    isMobile={isMobile}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Parecer da Comissão */}
                                    <div style={{
                                        margin: isMobile ? '0 10px 15px' : '0 20px 20px',
                                        background: '#0F172A',
                                        borderRadius: '10px',
                                        border: '1px solid #8B5CF6',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Header do Parecer */}
                                        <div style={{
                                            background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                                            padding: isMobile ? '8px 12px' : '10px 15px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: isMobile ? '6px' : '8px'
                                        }}>
                                            <span style={{ fontSize: isMobile ? '14px' : '16px' }}>👨‍⚖️</span>
                                            <span style={{
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: isMobile ? '11px' : '12px',
                                                textTransform: 'uppercase',
                                                letterSpacing: isMobile ? '0.5px' : '1px'
                                            }}>
                                                Veredito do Júri
                                            </span>
                                        </div>

                                        {/* Conteúdo do Parecer */}
                                        <div style={{ padding: isMobile ? '12px' : '15px' }}>
                                            {/* Decisão */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: isMobile ? '6px' : '10px',
                                                flexWrap: 'wrap',
                                                marginBottom: isMobile ? '10px' : '12px'
                                            }}>
                                                <span style={{
                                                    background: (decisao === 'CULPADO' || decisao === 'RETIRAR PUNIÇÃO') ? '#EF4444' : '#22C55E',
                                                    color: 'white',
                                                    padding: isMobile ? '5px 10px' : '6px 14px',
                                                    borderRadius: '6px',
                                                    fontWeight: 'bold',
                                                    fontSize: isMobile ? '11px' : '13px'
                                                }}>
                                                    {(decisao === 'CULPADO' || decisao === 'RETIRAR PUNIÇÃO') ? `❌ ${decisao}` : `✅ ${decisao === 'INOCENTE' ? 'INOCENTADO' : decisao}`}
                                                </span>

                                                {(decisao === 'CULPADO' || decisao === 'RETIRAR PUNIÇÃO') && punicaoFinal && !isRetiradaBug && (
                                                    <span style={{
                                                        background: '#F59E0B',
                                                        color: '#1F2937',
                                                        padding: isMobile ? '4px 8px' : '5px 10px',
                                                        borderRadius: '5px',
                                                        fontWeight: 'bold',
                                                        fontSize: isMobile ? '10px' : '11px'
                                                    }}>
                                                        {punicaoFinal.label} {punicaoFinal.pontos > 0 && `(-${punicaoFinal.pontos}pts)`}
                                                        {temAgravante && ' (+5pts Agravante)'}
                                                    </span>
                                                )}

                                                {raceBan && (
                                                    <span style={{
                                                        background: '#7C3AED',
                                                        color: 'white',
                                                        padding: isMobile ? '4px 8px' : '5px 10px',
                                                        borderRadius: '5px',
                                                        fontWeight: 'bold',
                                                        fontSize: isMobile ? '10px' : '11px'
                                                    }}>
                                                        🚫 BAN
                                                    </span>
                                                )}

                                                {/* Perda de pontos por não enviar vídeo de defesa - SEMPRE exibir quando aplicável */}
                                                {semVideoDefesa && !isRetiradaBug && (
                                                    <span style={{
                                                        background: '#DC2626',
                                                        color: 'white',
                                                        padding: isMobile ? '4px 8px' : '5px 10px',
                                                        borderRadius: '5px',
                                                        fontWeight: 'bold',
                                                        fontSize: isMobile ? '10px' : '11px'
                                                    }}>
                                                        📹 Sem vídeo de defesa (-{pontosSemVideo}pts)
                                                    </span>
                                                )}
                                            </div>

                                            {/* Descrição da Decisão */}
                                            {(() => {
                                                // Função para criar resumo coerente das justificativas
                                                const criarResumoJustificativas = (justificativas) => {
                                                    if (justificativas.length === 0) return '';
                                                    if (justificativas.length === 1) return justificativas[0].trim();
                                                    
                                                    // Limpar e normalizar justificativas
                                                    const textosLimpos = justificativas
                                                        .map(j => j.trim())
                                                        .filter(j => j.length > 0)
                                                        .map(j => {
                                                            // Remove pontuação final duplicada e espaços extras
                                                            return j.replace(/[.!?]+$/, '').replace(/\s+/g, ' ').trim();
                                                        });
                                                    
                                                    if (textosLimpos.length === 0) return '';
                                                    
                                                    // Extrair frases principais de cada justificativa
                                                    const todasFrases = [];
                                                    textosLimpos.forEach(texto => {
                                                        // Dividir por pontuação, mantendo apenas frases significativas
                                                        const partes = texto
                                                            .split(/[.!?]+/)
                                                            .map(p => p.trim())
                                                            .filter(p => p.length > 15); // Frases com pelo menos 15 caracteres
                                                        todasFrases.push(...partes);
                                                    });
                                                    
                                                    if (todasFrases.length === 0) {
                                                        // Se não conseguiu dividir, usar os textos originais
                                                        return textosLimpos.join(' ');
                                                    }
                                                    
                                                    // Remover duplicatas exatas
                                                    const frasesUnicas = [];
                                                    todasFrases.forEach(frase => {
                                                        const normalizada = frase.toLowerCase().trim();
                                                        if (!frasesUnicas.some(f => f.toLowerCase().trim() === normalizada)) {
                                                            frasesUnicas.push(frase);
                                                        }
                                                    });
                                                    
                                                    // Remover duplicatas aproximadas (conteúdo muito similar)
                                                    const frasesFinais = [];
                                                    frasesUnicas.forEach(frase => {
                                                        const palavrasFrase = frase.toLowerCase()
                                                            .replace(/[^\w\s]/g, ' ')
                                                            .split(/\s+/)
                                                            .filter(w => w.length > 2);
                                                        
                                                        const jaExiste = frasesFinais.some(f => {
                                                            const palavrasF = f.toLowerCase()
                                                                .replace(/[^\w\s]/g, ' ')
                                                                .split(/\s+/)
                                                                .filter(w => w.length > 2);
                                                            
                                                            if (palavrasF.length === 0 || palavrasFrase.length === 0) return false;
                                                            
                                                            // Calcular similaridade: palavras em comum
                                                            const palavrasComuns = palavrasF.filter(w => palavrasFrase.includes(w)).length;
                                                            const totalPalavras = Math.max(palavrasF.length, palavrasFrase.length);
                                                            return palavrasComuns / totalPalavras > 0.6; // 60% de similaridade
                                                        });
                                                        
                                                        if (!jaExiste) {
                                                            frasesFinais.push(frase);
                                                        }
                                                    });
                                                    
                                                    // Combinar as frases em um resumo coerente
                                                    if (frasesFinais.length === 0) {
                                                        return textosLimpos.join(' ');
                                                    }
                                                    
                                                    // Ordenar por tamanho (frases maiores primeiro, geralmente mais completas)
                                                    frasesFinais.sort((a, b) => b.length - a.length);
                                                    
                                                    // Pegar as 3-4 frases mais relevantes
                                                    const frasesSelecionadas = frasesFinais.slice(0, Math.min(4, frasesFinais.length));
                                                    
                                                    // Combinar em um texto fluido
                                                    let resumo = '';
                                                    if (frasesSelecionadas.length === 1) {
                                                        resumo = frasesSelecionadas[0];
                                                    } else {
                                                        // Juntar as frases de forma natural
                                                        resumo = frasesSelecionadas.join('. ');
                                                    }
                                                    
                                                    // Garantir que termina com pontuação
                                                    resumo = resumo.trim();
                                                    if (resumo && !/[.!?]$/.test(resumo)) {
                                                        resumo += '.';
                                                    }
                                                    
                                                    return resumo;
                                                };
                                                
                                                // Pegar justificativas dos votos majoritários
                                                const isCulpado = (decisao === 'CULPADO' || decisao === 'RETIRAR PUNIÇÃO');
                                                const votosMajoritarios = isCulpado 
                                                    ? votos.filter(v => v.culpado) 
                                                    : votos.filter(v => !v.culpado);
                                                const justificativas = votosMajoritarios
                                                    .map(v => v.justificativa)
                                                    .filter(j => j && j.trim());
                                                
                                                if (justificativas.length > 0) {
                                                    const resumo = criarResumoJustificativas(justificativas);
                                                    
                                                    return (
                                                        <div style={{
                                                            background: '#1E293B',
                                                            padding: '12px 15px',
                                                            borderRadius: '8px',
                                                            borderLeft: `3px solid ${(decisao === 'CULPADO' || decisao === 'RETIRAR PUNIÇÃO') ? '#EF4444' : '#22C55E'}`
                                                        }}>
                                                            <div style={{
                                                                color: '#94A3B8',
                                                                fontSize: '11px',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.5px',
                                                                marginBottom: '8px'
                                                            }}>
                                                                📝 Fundamentação da Decisão
                                                            </div>
                                                            <p style={{
                                                                color: '#E2E8F0',
                                                                fontSize: '13px',
                                                                lineHeight: '1.6',
                                                                margin: 0,
                                                                fontStyle: 'italic',
                                                                textAlign: 'justify'
                                                            }}>
                                                                "{resumo}"
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Botão Ver Mais / Ver Menos */}
                    {temMais && (
                        <div style={{ 
                            textAlign: 'center', 
                            marginTop: '25px',
                            padding: '20px',
                            background: 'rgba(30, 41, 59, 0.5)',
                            borderRadius: '12px',
                            border: '1px dashed rgba(139, 92, 246, 0.5)'
                        }}>
                            <p style={{ color: '#94A3B8', marginBottom: '15px', fontSize: '14px' }}>
                                📊 Mostrando 5 de {totalFiltradas} análises
                            </p>
                            <button
                                onClick={() => setMostrarTodos(true)}
                                style={{
                                    padding: '12px 30px',
                                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                🔍 Ver Todas as Análises ({totalFiltradas})
                            </button>
                        </div>
                    )}

                    {mostrarTodos && totalFiltradas > 5 && (
                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            <button
                                onClick={() => setMostrarTodos(false)}
                                style={{
                                    padding: '10px 25px',
                                    background: 'transparent',
                                    color: '#94A3B8',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                ↑ Mostrar menos
                            </button>
                        </div>
                    )}
                </>
                );
            })()}
            </div>

            {/* Botão Voltar ao Topo */}
            <div style={{
                position: 'fixed',
                bottom: '30px',
                right: '30px',
                zIndex: 100
            }}>
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                        border: 'none',
                        color: '#1F2937',
                        fontSize: '20px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Voltar ao topo"
                >
                    ↑
                </button>
            </div>
        </div>
    );
}

export default ConsultarAnalises;
