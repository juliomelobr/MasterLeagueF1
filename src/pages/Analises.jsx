// INFORMAÇÕES DE LOGIN:
// - O login é feito via Supabase (ver supabase.auth.getUser())
// - O painel verifica se há usuário logado e busca o piloto pelo e-mail.
// - Se não estiver logado, mostra aviso e botão para /login.
// - O login em si é realizado na página /login.
//
// COMO O SUPABASE VALIDA O ACESSO AO PAINEL DO PILOTO:
// - Após login, o e-mail do usuário autenticado é obtido via supabase.auth.getUser().
// - O código busca na tabela 'pilotos' um registro cujo campo 'email' (normalizado) seja igual ao do usuário.
// - Se encontrar, carrega os dados do piloto (incluindo 'is_steward' para acesso especial).
// - O acesso a funcionalidades de Steward é controlado pelo campo 'is_steward' na tabela 'pilotos'.

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLeagueData } from '../hooks/useLeagueData';
import { supabase } from '../supabaseClient';
import { generateLanceCode, calculatePenaltyPoints, getBRTDeadline, isDeadlineExceeded, calcLightDate } from '../hooks/useAnalises';
import { sendEmailNotification, getEmailTemplate } from '../utils/emailService';
import { syncPilotosFromSheet } from '../utils/syncPilotosFromSheet';
import VideoEmbed from '../components/VideoEmbed';
import '../index.css';

function Analises() {
    const [searchParams] = useSearchParams();
    const tabFromURL = searchParams.get('tab');
    
    const [activeTab, setActiveTab] = useState(tabFromURL || 'acusacao');
    
    // Atualizar aba quando URL mudar
    useEffect(() => {
        if (tabFromURL) {
            setActiveTab(tabFromURL);
        }
    }, [tabFromURL]);

    // Detectar tamanho da tela
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Pegar a tab da URL se existir
    const tabFromUrl = searchParams.get('tab');
    const initialTab = ['acusacao', 'defesa', 'consulta', 'stewards'].includes(tabFromUrl) ? tabFromUrl : 'acusacao';

    const { rawCarreira, rawLight, seasons, loading } = useLeagueData();
    const [pilotoLogado, setPilotoLogado] = useState(null);
    const [gridType, setGridType] = useState('carreira');
    const [selectedSeason, setSelectedSeason] = useState(0);

    // Estado do formulário de Acusação
    const [acusacaoForm, setAcusacaoForm] = useState({
        pilotoAcusado: '',
        etapa: '',
        descricao: '',
        videoLink: ''
    });

    // Estado do formulário de Defesa
    const [defesaForm, setDefesaForm] = useState({
        descricao: '',
        videoLink: ''
    });

    const [pilotos, setPilotos] = useState([]);
    const [etapas, setEtapas] = useState([]);
    const [lances, setLances] = useState([]);
    const [verdicts, setVerdicts] = useState([]);
    const [lancesDecididos, setLancesDecididos] = useState([]); // Lances decididos pelo júri (3 votos)
    const [loadingPage, setLoadingPage] = useState(true);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [verdictForm, setVerdictForm] = useState({
        lanceId: '',
        resultado: 'absolvido',
        penaltyType: '',
        agravante: false,
        explanation: ''
    });
    const [lancesStewards, setLancesStewards] = useState([]);
    const [isSteward, setIsSteward] = useState(false);
    const [pilotosAdm, setPilotosAdm] = useState([]);
    const [syncLoading, setSyncLoading] = useState(false);
    const [syncMessage, setSyncMessage] = useState('');

    // Estados para filtros da aba Consulta
    const [filtroGrid, setFiltroGrid] = useState('todos'); // 'todos', 'carreira', 'light'
    const [filtroEtapa, setFiltroEtapa] = useState('todas'); // 'todas' ou número da etapa
    const [mostrarTodos, setMostrarTodos] = useState(false); // false = mostra só 5

    // Validar autenticação e carregar dados do piloto (opcional)
    useEffect(() => {
        const verificarAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoadingPage(false);
                    return;
                }

                console.log('👤 Usuário autenticado:', user.email);

                // Buscar todos os pilotos para comparar e-mail de forma case-insensitive e sem espaços
                const { data: pilotosData, error } = await supabase
                    .from('pilotos')
                    .select('*');

                if (error) {
                    console.error('❌ Erro ao buscar pilotos:', error);
                    setLoadingPage(false);
                    return;
                }

                console.log('📋 Total de pilotos cadastrados:', pilotosData?.length);

                // Normalizar e comparar e-mails (remover espaços e lowercase)
                const userEmail = (user.email || '').trim().toLowerCase();
                const pilotoData = (pilotosData || []).find(p =>
                    (p.email || '').trim().toLowerCase() === userEmail
                );

                if (pilotoData) {
                    console.log('✅ Piloto encontrado:', pilotoData.nome);
                    setPilotoLogado(pilotoData);
                } else {
                    // Log detalhado para depuração
                    console.error('❌ Piloto não encontrado para o e-mail:', user.email);
                    console.log('🔍 E-mail normalizado:', userEmail);
                    console.log('📧 E-mails cadastrados no sistema:');
                    (pilotosData || []).forEach(p => {
                        console.log(`   - ${p.email} (normalizado: ${(p.email || '').trim().toLowerCase()})`);
                    });
                    
                    // Mostrar mensagem de erro mais detalhada
                    alert(`❌ Inscrição não encontrada!\n\nSeu e-mail: ${user.email}\n\nPossíveis causas:\n• E-mail não cadastrado na tabela de pilotos\n• Diferença de espaços ou maiúsculas/minúsculas\n• Cadastro pendente de aprovação\n\nContate o administrador.`);
                }
            } catch (err) {
                console.error('❌ Erro ao verificar autenticação:', err);
            } finally {
                setLoadingPage(false);
            }
        };

        verificarAuth();
    }, []);

    // Carregar pilotos do mesmo grid
    useEffect(() => {
        if (!pilotoLogado || !rawCarreira || !rawLight) return;

        const rawData = pilotoLogado.grid === 'carreira' ? rawCarreira : rawLight;
        const pilotosUnicos = new Set();

        rawData.forEach(row => {
            const nome = row[9];
            if (nome && nome !== '-' && nome !== pilotoLogado.nome) {
                pilotosUnicos.add(nome);
            }
        });

        setPilotos(Array.from(pilotosUnicos).sort());
    }, [pilotoLogado, rawCarreira, rawLight]);

    // Carregar etapas da temporada selecionada
    useEffect(() => {
        if (!pilotoLogado || !selectedSeason) return;

        const rawData = pilotoLogado.grid === 'carreira' ? rawCarreira : rawLight;
        const etapasMap = new Map();

        rawData.forEach(row => {
            const season = parseInt(row[3]);
            const round = parseInt(row[4]);
            const gpName = row[5];
            let date = row[0];

            // Ajuste para Grid Light: se o piloto for light, converte quinta em segunda
            if (pilotoLogado.grid === 'light') {
                date = calcLightDate(date);
            }

            if (season === selectedSeason && round && gpName && date) {
                etapasMap.set(round, { round, gpName, date });
            }
        });

        const etapasOrdenadas = Array.from(etapasMap.values()).sort((a, b) => a.round - b.round);
        setEtapas(etapasOrdenadas);
    }, [pilotoLogado, selectedSeason, rawCarreira, rawLight]);

    // Carregar lances e verdicts
    useEffect(() => {
        const carregarLances = async () => {
            try {
                const { data: lancesData } = await supabase
                    .from('lances')
                    .select('*')
                    .order('created_at', { ascending: false });

                const { data: verdictsData } = await supabase
                    .from('verdicts')
                    .select('*');

                setLances(lancesData || []);
                setVerdicts(verdictsData || []);

                // Verificar se piloto é steward
                if (pilotoLogado) {
                    const { data: pilotoCheck } = await supabase
                        .from('pilotos')
                        .select('is_steward')
                        .eq('nome', pilotoLogado.nome)
                        .single();

                    if (pilotoCheck?.is_steward) {
                        setIsSteward(true);
                        // Carregar lances para stewards (sem defesa, aguardando análise)
                        const { data: lancesComAcusacoes } = await supabase
                            .from('lances')
                            .select(`
                                id, codigo, season, round, grid, status,
                                acusacoes(
                                    id, piloto_acusador_id, piloto_acusado_id,
                                    descricao, video_link, status,
                                    defesas(id, descricao, video_link, status)
                                )
                            `)
                            .order('created_at', { ascending: false });

                        setLancesStewards(lancesComAcusacoes || []);
                    }
                }
            } catch (err) {
                console.error('Erro ao carregar lances:', err);
            }
        };

        carregarLances();
    }, [pilotoLogado]);

    // Carregar lances decididos pelo júri (independente de login)
    useEffect(() => {
        const carregarLancesDecididos = async () => {
            try {
                console.log('🔍 Carregando lances decididos...');
                
                // Buscar todos os lances de acusação e filtrar no frontend
                const { data: todosLances, error } = await supabase
                    .from('notificacoes_admin')
                    .select('*')
                    .eq('tipo', 'nova_acusacao')
                    .order('created_at', { ascending: false });

                console.log('📦 Total de lances encontrados:', todosLances?.length);
                
                if (error) {
                    console.error('❌ Erro ao carregar lances:', error);
                } else {
                    // Filtrar lances com status analise_realizada OU com 3+ votos decididos
                    const lancesDecididosFiltrados = (todosLances || []).filter(lance => {
                        const dados = lance.dados || {};
                        const votos = dados.votos || [];
                        const votosCulpado = votos.filter(v => v.culpado).length;
                        const votosInocente = votos.filter(v => !v.culpado).length;
                        const decidido = votosCulpado >= 3 || votosInocente >= 3;
                        
                        return dados.status === 'analise_realizada' || decidido;
                    });
                    
                    console.log('✅ Lances decididos:', lancesDecididosFiltrados.length);
                    lancesDecididosFiltrados.forEach(l => {
                        console.log(`   - ${l.dados?.codigo}: status=${l.dados?.status}, votos=${l.dados?.votos?.length || 0}`);
                    });
                    
                    setLancesDecididos(lancesDecididosFiltrados);
                }
            } catch (err) {
                console.error('❌ Erro:', err);
            }
        };

        carregarLancesDecididos();
    }, []); // Executa ao montar o componente

    const handleSubmitVeredicto = async () => {
        if (!verdictForm.lanceId || !verdictForm.resultado) {
            alert('Selecione um lance e resultado');
            return;
        }

        try {
            // Buscar dados do lance
            const { data: lanceData } = await supabase
                .from('lances')
                .select('codigo, season, round')
                .eq('id', verdictForm.lanceId)
                .single();

            // Calcular pontos descontados
            const pontos = verdictForm.penaltyType 
                ? calculatePenaltyPoints(verdictForm.penaltyType, verdictForm.agravante)
                : 0;

            // Buscar steward atual
            const { data: stewardData } = await supabase
                .from('pilotos')
                .select('id')
                .eq('nome', pilotoLogado.nome)
                .single();

            // Criar veredito
            const { data: verdictData, error: verdictError } = await supabase
                .from('verdicts')
                .insert([{
                    lance_id: verdictForm.lanceId,
                    resultado: verdictForm.resultado,
                    penalty_type: verdictForm.penaltyType,
                    agravante: verdictForm.agravante,
                    pontos_deducted: pontos,
                    race_ban: pontos > 20,
                    explanation: verdictForm.explanation,
                    steward_id: stewardData.id
                }])
                .select()
                .single();

            if (verdictError) throw verdictError;

            // Atualizar status do lance para fechado
            await supabase
                .from('lances')
                .update({ status: 'fechado' })
                .eq('id', verdictForm.lanceId);

            // Buscar dados da acusação para notificações
            const { data: acusacoes } = await supabase
                .from('acusacoes')
                .select('piloto_acusador_id, piloto_acusado_id, piloto_acusador:pilotos(email), piloto_acusado:pilotos(email)')
                .eq('lance_id', verdictForm.lanceId)
                .limit(1);

            if (acusacoes && acusacoes.length > 0) {
                const acusacao = acusacoes[0];
                const emailDataVeredicto = {
                    codigo_lance: lanceData.codigo,
                    piloto: acusacao.piloto_acusado?.nome,
                    resultado: verdictForm.resultado,
                    penalty_type: verdictForm.penaltyType,
                    pontos_deducted: pontos,
                    race_ban: pontos > 20,
                    explanation: verdictForm.explanation
                };

                // Notificar acusador e acusado
                const templateVeredito = getEmailTemplate('veredito_notificacao', emailDataVeredicto);
                if (acusacao.piloto_acusador?.email) {
                    await sendEmailNotification(acusacao.piloto_acusador.email, templateVeredito.subject, templateVeredito.html, 'veredito');
                }
                if (acusacao.piloto_acusado?.email) {
                    await sendEmailNotification(acusacao.piloto_acusado.email, templateVeredito.subject, templateVeredito.html, 'veredito');
                }
            }

            setConfirmationMessage(`✅ Veredito publicado! ${pontos > 20 ? '🚫 Race Ban aplicado!' : ''}`);
            setShowConfirmation(true);
            setVerdictForm({ lanceId: '', resultado: 'absolvido', penaltyType: '', agravante: false, explanation: '' });

            setTimeout(() => setShowConfirmation(false), 5000);
        } catch (err) {
            console.error('Erro ao emitir veredito:', err);
            alert(`Erro ao emitir veredito: ${err.message}`);
        }
    };

    const handleSubmitAcusacao = async () => {
        if (!acusacaoForm.pilotoAcusado || !acusacaoForm.etapa || !acusacaoForm.descricao || !acusacaoForm.videoLink) {
            alert('Preencha todos os campos');
            return;
        }

        try {
            // Validar deadline para Grid Light
            if (pilotoLogado.grid === 'light') {
                const deadline = getBRTDeadline(1);
                if (isDeadlineExceeded(deadline)) {
                    alert('❌ Deadline excedido para Grid Light! Acusações devem ser feitas até o próximo dia 20:00 BRT.');
                    return;
                }
            }

            // 1. Encontrar últimas acusações para gerar código de lance
            const { data: lastLances } = await supabase
                .from('lances')
                .select('codigo')
                .eq('season', selectedSeason)
                .eq('round', parseInt(acusacaoForm.etapa))
                .eq('grid', pilotoLogado.grid)
                .order('created_at', { ascending: false })
                .limit(1);

            const orderNumber = (lastLances?.length ? parseInt(lastLances[0].codigo.slice(-2)) : 0) + 1;
            const lanceCode = generateLanceCode(pilotoLogado.grid, selectedSeason, parseInt(acusacaoForm.etapa), orderNumber);

            // 2. Criar registro de LANCE
            const { data: lanceData, error: lanceError } = await supabase
                .from('lances')
                .insert([{
                    codigo: lanceCode,
                    season: selectedSeason,
                    round: parseInt(acusacaoForm.etapa),
                    grid: pilotoLogado.grid,
                    order_number: orderNumber,
                    status: 'aberto'
                }])
                .select()
                .single();

            if (lanceError) throw lanceError;

            // 3. Encontrar IDs dos pilotos
            const { data: pilotoAcusadorData } = await supabase
                .from('pilotos')
                .select('id, email')
                .eq('nome', pilotoLogado.nome)
                .single();

            const { data: pilotoAcusadoData } = await supabase
                .from('pilotos')
                .select('id, email')
                .eq('nome', acusacaoForm.pilotoAcusado)
                .single();

            // 4. Criar registro de ACUSAÇÃO
            const deadline = pilotoLogado.grid === 'light' ? getBRTDeadline(1) : null;
            const { data: acusacaoData, error: acusacaoError } = await supabase
                .from('acusacoes')
                .insert([{
                    lance_id: lanceData.id,
                    piloto_acusador_id: pilotoAcusadorData.id,
                    piloto_acusado_id: pilotoAcusadoData.id,
                    descricao: acusacaoForm.descricao,
                    video_link: acusacaoForm.videoLink,
                    status: 'recebida',
                    deadline_brt: deadline
                }])
                .select()
                .single();

            if (acusacaoError) throw acusacaoError;

            // 5. Buscar dados da etapa
            const rawData = pilotoLogado.grid === 'carreira' ? rawCarreira : rawLight;
            const etapaData = etapas.find(e => e.round === parseInt(acusacaoForm.etapa));

            // 6. Enviar EMAILS
            const emailData = {
                codigo_lance: lanceCode,
                piloto_acusador: pilotoLogado.nome,
                piloto_acusado: acusacaoForm.pilotoAcusado,
                etapa_nome: etapaData?.gpName || `Etapa ${acusacaoForm.etapa}`,
                etapa_data: etapaData?.date || '',
                grid: pilotoLogado.grid,
                descricao: acusacaoForm.descricao,
                video_link: acusacaoForm.videoLink
            };

            // Email para acusador (confirmação)
            const templateAcusador = getEmailTemplate('acusacao_enviada', emailData);
            await sendEmailNotification(pilotoLogado.email, templateAcusador.subject, templateAcusador.html, 'acusacao');

            // Email para acusado (notificação)
            const templateAcusado = getEmailTemplate('acusacao_recebida_acusado', emailData);
            await sendEmailNotification(pilotoAcusadoData.email, templateAcusado.subject, templateAcusado.html, 'acusacao');

            // Email para Stewards (admin alert)
            const { data: stewardsData } = await supabase
                .from('pilotos')
                .select('email')
                .eq('is_steward', true);

            if (stewardsData && stewardsData.length > 0) {
                const templateAdmin = getEmailTemplate('admin_nova_acusacao', emailData);
                for (const steward of stewardsData) {
                    await sendEmailNotification(steward.email, templateAdmin.subject, templateAdmin.html, 'acusacao_admin');
                }
            }

            setConfirmationMessage(`✅ Acusação enviada! Código: ${lanceCode}`);
            setShowConfirmation(true);
            setAcusacaoForm({ pilotoAcusado: '', etapa: '', descricao: '', videoLink: '' });

            setTimeout(() => setShowConfirmation(false), 5000);
        } catch (err) {
            console.error('Erro ao enviar acusação:', err);
            alert(`Erro ao enviar acusação: ${err.message}`);
        }
    };

    const handleSubmitDefesa = async () => {
        if (!defesaForm.descricao || !defesaForm.videoLink) {
            alert('Preencha todos os campos');
            return;
        }

        try {
            // Encontrar última acusação pendente contra este piloto
            const { data: pilotoData } = await supabase
                .from('pilotos')
                .select('id, email')
                .eq('nome', pilotoLogado.nome)
                .single();

            const { data: acusacoes } = await supabase
                .from('acusacoes')
                .select('id, lance_id, piloto_acusador_id, descricao')
                .eq('piloto_acusado_id', pilotoData.id)
                .eq('status', 'recebida')
                .order('created_at', { ascending: false })
                .limit(1);

            if (!acusacoes || acusacoes.length === 0) {
                alert('Nenhuma acusação pendente encontrada.');
                return;
            }

            const acusacaoId = acusacoes[0].id;
            const lanceId = acusacoes[0].lance_id;

            // Criar registro de DEFESA
            const { data: defesaData, error: defesaError } = await supabase
                .from('defesas')
                .insert([{
                    acusacao_id: acusacaoId,
                    piloto_acusado_id: pilotoData.id,
                    descricao: defesaForm.descricao,
                    video_link: defesaForm.videoLink,
                    status: 'recebida'
                }])
                .select()
                .single();

            if (defesaError) throw defesaError;

            // Atualizar status da acusação
            await supabase
                .from('acusacoes')
                .update({ status: 'contestada' })
                .eq('id', acusacaoId);

            // Buscar dados do lance
            const { data: lanceData } = await supabase
                .from('lances')
                .select('codigo, season, round')
                .eq('id', lanceId)
                .single();

            // Enviar emails
            const { data: pilotoAcusadorData } = await supabase
                .from('pilotos')
                .select('email')
                .eq('id', acusacoes[0].piloto_acusador_id)
                .single();

            const emailData = {
                codigo_lance: lanceData.codigo,
                piloto_acusado: pilotoLogado.nome,
                piloto_acusador: pilotoAcusadorData.email
            };

            const templateDefesa = getEmailTemplate('defesa_enviada', emailData);
            await sendEmailNotification(pilotoLogado.email, templateDefesa.subject, templateDefesa.html, 'defesa');

            // Notificar acusador da defesa
            const templateNotif = getEmailTemplate('defesa_enviada', emailData);
            await sendEmailNotification(pilotoAcusadorData.email, templateNotif.subject, templateNotif.html, 'defesa_notif');

            setConfirmationMessage(`✅ Defesa enviada! Lance: ${lanceData.codigo}`);
            setShowConfirmation(true);
            setDefesaForm({ descricao: '', videoLink: '' });

            setTimeout(() => setShowConfirmation(false), 5000);
        } catch (err) {
            console.error('Erro ao enviar defesa:', err);
            alert(`Erro ao enviar defesa: ${err.message}`);
        }
    };

    // Carregar lista de pilotos para área ADM (Stewards)
    useEffect(() => {
        const carregarPilotosAdm = async () => {
            if (!isSteward) return;
            const { data, error } = await supabase
                .from('pilotos')
                .select('id, nome, email, is_steward');
            if (!error) setPilotosAdm(data || []);
        };
        carregarPilotosAdm();
    }, [isSteward, showConfirmation]);

    // Função para alternar acesso painel do piloto
    const toggleAcessoPainel = async (pilotoId, atual) => {
        const { error } = await supabase
            .from('pilotos')
            .update({ is_steward: !atual })
            .eq('id', pilotoId);
        if (!error) {
            setConfirmationMessage(!atual ? '✅ Acesso concedido ao painel!' : '❌ Acesso removido do painel!');
            setShowConfirmation(true);
            setTimeout(() => setShowConfirmation(false), 3000);
            // Atualiza lista
            setPilotosAdm(pilotosAdm.map(p => p.id === pilotoId ? { ...p, is_steward: !atual } : p));
        }
    };

    // Função para sincronizar pilotos
    const handleSyncPilotos = async () => {
        setSyncLoading(true);
        setSyncMessage('');
        
        try {
            const result = await syncPilotosFromSheet();
            
            if (result.success) {
                setSyncMessage(`✅ ${result.count} pilotos sincronizados com sucesso!`);
                // Recarregar lista de pilotos
                const { data, error } = await supabase
                    .from('pilotos')
                    .select('id, nome, email, is_steward');
                if (!error) setPilotosAdm(data || []);
            } else {
                setSyncMessage(`❌ Erro: ${result.error || 'Nenhum piloto encontrado'}`);
            }
        } catch (error) {
            setSyncMessage(`❌ Erro: ${error.message}`);
        } finally {
            setSyncLoading(false);
            setTimeout(() => setSyncMessage(''), 5000);
        }
    };

    if (loadingPage || loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-dark-main)', color: 'white', padding: '100px 20px', textAlign: 'center' }}>
                Carregando Análises...
            </div>
        );
    }

    return (
        <div className="analises-page" style={{ minHeight: '100vh', background: 'var(--bg-dark-main)', color: 'white', padding: '80px 20px 40px', fontFamily: "'Montserrat', sans-serif" }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Header com gradiente */}
                <div style={{ 
                    marginBottom: '40px', 
                    textAlign: 'center',
                    padding: '30px',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
                    borderRadius: '16px',
                    border: '1px solid rgba(6, 182, 212, 0.2)'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚖️</div>
                    <h1 style={{ 
                        fontSize: '3rem', 
                        fontWeight: '900', 
                        fontStyle: 'italic', 
                        marginBottom: '10px',
                        background: 'linear-gradient(90deg, #06B6D4, #3B82F6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>ANÁLISES</h1>
                    <p style={{ color: '#94A3B8', fontSize: '1.1rem', margin: 0 }}>Painel de Stewards • Sistema de Julgamento</p>
                </div>

                {/* Info Piloto */}
                {pilotoLogado ? (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '30px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <p style={{ fontSize: '0.9rem', color: '#94A3B8', margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Piloto Logado</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', margin: '0', color: 'white' }}>{pilotoLogado.nome}</h3>
                            <p style={{ fontSize: '0.85rem', color: '#06B6D4', margin: '5px 0 0 0' }}>{pilotoLogado.equipe} • {pilotoLogado.grid === 'carreira' ? 'Grid Carreira' : 'Grid Light'}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '1.2rem', fontWeight: '700', color: '#FFD700', margin: 0 }}>🛡️ Stewards</p>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%)',
                        border: '1px solid rgba(255, 107, 53, 0.4)',
                        borderRadius: '12px',
                        padding: '25px',
                        marginBottom: '30px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '15px'
                    }}>
                        <div style={{ fontSize: '2.5rem' }}>🔒</div>
                        <p style={{ fontSize: '1.1rem', color: '#FF6B35', margin: 0, fontWeight: '600' }}>
                            Você não está logado
                        </p>
                        <p style={{ fontSize: '0.9rem', color: '#94A3B8', margin: 0 }}>
                            Faça login para enviar acusações, defesas ou acessar funcionalidades de Steward.
                        </p>
                        <a 
                            href="/login"
                            style={{
                                padding: '12px 30px',
                                background: 'linear-gradient(135deg, #FF6B35 0%, #EF4444 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                textDecoration: 'none',
                                fontSize: '0.95rem',
                                transition: 'all 0.3s',
                                boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
                            }}
                        >
                            🔐 Fazer Login
                        </a>
                    </div>
                )}

                {/* Tabs */}
                <div className="analises-tabs" style={{ 
                    display: isMobile ? 'grid' : 'flex',
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : undefined,
                    gap: isMobile ? '8px' : '12px', 
                    marginBottom: '30px', 
                    padding: isMobile ? '10px' : '15px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={() => setActiveTab('acusacao')}
                        style={{
                            padding: isMobile ? '12px 8px' : '14px 24px',
                            background: activeTab === 'acusacao' 
                                ? 'linear-gradient(135deg, #8B1538 0%, #6B0F2B 100%)' 
                                : 'rgba(255,255,255,0.05)',
                            color: 'white',
                            border: activeTab === 'acusacao' ? '1px solid rgba(139, 21, 56, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: isMobile ? '8px' : '10px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            fontSize: isMobile ? '0.7rem' : '0.9rem',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: isMobile ? '4px' : '8px',
                            minHeight: isMobile ? '60px' : 'auto',
                            boxShadow: activeTab === 'acusacao' ? '0 4px 15px rgba(139, 21, 56, 0.4)' : 'none'
                        }}
                    >
                        <span style={{ fontSize: isMobile ? '1.2rem' : '1.1rem' }}>⚖️</span> {isMobile ? 'Acusação' : 'Enviar Acusação'}
                    </button>
                    <button
                        onClick={() => setActiveTab('defesa')}
                        style={{
                            padding: isMobile ? '12px 8px' : '14px 24px',
                            background: activeTab === 'defesa' 
                                ? 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' 
                                : 'rgba(255,255,255,0.05)',
                            color: 'white',
                            border: activeTab === 'defesa' ? '1px solid rgba(6, 182, 212, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: isMobile ? '8px' : '10px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            fontSize: isMobile ? '0.7rem' : '0.9rem',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: isMobile ? '4px' : '8px',
                            minHeight: isMobile ? '60px' : 'auto',
                            boxShadow: activeTab === 'defesa' ? '0 4px 15px rgba(6, 182, 212, 0.4)' : 'none'
                        }}
                    >
                        <span style={{ fontSize: isMobile ? '1.2rem' : '1.1rem' }}>🛡️</span> {isMobile ? 'Defesa' : 'Enviar Defesa'}
                    </button>
                    <button
                        onClick={() => setActiveTab('consulta')}
                        style={{
                            padding: isMobile ? '12px 8px' : '14px 24px',
                            background: activeTab === 'consulta' 
                                ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' 
                                : 'rgba(255,255,255,0.05)',
                            color: 'white',
                            border: activeTab === 'consulta' ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: isMobile ? '8px' : '10px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            fontSize: isMobile ? '0.7rem' : '0.9rem',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: isMobile ? '4px' : '8px',
                            minHeight: isMobile ? '60px' : 'auto',
                            boxShadow: activeTab === 'consulta' ? '0 4px 15px rgba(34, 197, 94, 0.4)' : 'none'
                        }}
                    >
                        <span style={{ fontSize: isMobile ? '1.2rem' : '1.1rem' }}>📋</span> {isMobile ? 'Consulta' : 'Consultar Lances'}
                    </button>
                    <button
                        onClick={() => setActiveTab('stewards')}
                        style={{
                            padding: isMobile ? '12px 8px' : '14px 24px',
                            background: activeTab === 'stewards' 
                                ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' 
                                : 'rgba(255,255,255,0.05)',
                            color: 'white',
                            border: activeTab === 'stewards' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: isMobile ? '8px' : '10px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            fontSize: isMobile ? '0.7rem' : '0.9rem',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: isMobile ? '4px' : '8px',
                            minHeight: isMobile ? '60px' : 'auto',
                            boxShadow: activeTab === 'stewards' ? '0 4px 15px rgba(59, 130, 246, 0.4)' : 'none'
                        }}
                    >
                        <span style={{ fontSize: isMobile ? '1.2rem' : '1.1rem' }}>👨‍⚖️</span> {isMobile ? 'Stewards' : 'Stewards ADM'}
                    </button>
                </div>

                {/* Confirmation Modal */}
                {showConfirmation && (
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
                        border: '2px solid #22C55E',
                        borderRadius: '12px',
                        padding: '30px',
                        textAlign: 'center',
                        zIndex: 1000,
                        minWidth: '400px',
                        boxShadow: '0 10px 40px rgba(34, 197, 94, 0.3)'
                    }}>
                        <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#22C55E', margin: 0 }}>{confirmationMessage}</p>
                    </div>
                )}

                {/* Conteúdo das Tabs */}

                {/* TAB: ACUSAÇÃO */}
                {activeTab === 'acusacao' && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(139, 21, 56, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
                        border: '1px solid rgba(139, 21, 56, 0.3)',
                        borderRadius: '16px',
                        padding: '35px',
                        maxWidth: '800px',
                        margin: '0 auto'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
                            <span style={{ fontSize: '2rem' }}>⚖️</span>
                            <div>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, color: 'white' }}>Enviar Acusação</h2>
                                <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: '5px 0 0 0' }}>Registre um incidente para análise dos Stewards</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94A3B8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Piloto Acusado</label>
                            <select
                                value={acusacaoForm.pilotoAcusado}
                                onChange={(e) => setAcusacaoForm({ ...acusacaoForm, pilotoAcusado: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    background: 'rgba(15, 23, 42, 0.8)',
                                    border: '1px solid rgba(139, 21, 56, 0.3)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontFamily: "'Montserrat', sans-serif",
                                    fontSize: '1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">Selecione um piloto...</option>
                                {pilotos.map(p => (
                                    <option key={p} value={p} style={{ background: '#0f172a', color: 'white' }}>{p}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94A3B8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Temporada</label>
                            <select
                                value={selectedSeason}
                                onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    background: 'rgba(15, 23, 42, 0.8)',
                                    border: '1px solid rgba(139, 21, 56, 0.3)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontFamily: "'Montserrat', sans-serif",
                                    fontSize: '1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">Selecione uma temporada...</option>
                                {seasons.map(s => (
                                    <option key={s} value={s} style={{ background: '#0f172a', color: 'white' }}>Temporada {s}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94A3B8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Etapa</label>
                            <select
                                value={acusacaoForm.etapa}
                                onChange={(e) => setAcusacaoForm({ ...acusacaoForm, etapa: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    background: 'rgba(15, 23, 42, 0.8)',
                                    border: '1px solid rgba(139, 21, 56, 0.3)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontFamily: "'Montserrat', sans-serif",
                                    fontSize: '1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">Selecione uma etapa...</option>
                                {etapas.map(e => (
                                    <option key={e.round} value={`${e.round}`} style={{ background: '#0f172a', color: 'white' }}>
                                        Etapa {e.round.toString().padStart(2, '0')} - {e.gpName} ({e.date})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94A3B8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Descrição do Lance</label>
                            <textarea
                                value={acusacaoForm.descricao}
                                onChange={(e) => setAcusacaoForm({ ...acusacaoForm, descricao: e.target.value })}
                                placeholder="Descreva detalhadamente o que ocorreu no lance..."
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    background: 'rgba(15, 23, 42, 0.8)',
                                    border: '1px solid rgba(139, 21, 56, 0.3)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontFamily: "'Montserrat', sans-serif",
                                    fontSize: '1rem',
                                    minHeight: '140px',
                                    resize: 'vertical',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94A3B8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                📹 Link do Vídeo (YouTube/Streamable/etc)
                            </label>
                            <input
                                type="url"
                                value={acusacaoForm.videoLink}
                                onChange={(e) => setAcusacaoForm({ ...acusacaoForm, videoLink: e.target.value })}
                                placeholder="https://youtube.com/watch?v=..."
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    background: 'rgba(15, 23, 42, 0.8)',
                                    border: '1px solid rgba(139, 21, 56, 0.3)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontFamily: "'Montserrat', sans-serif",
                                    fontSize: '1rem',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <button
                            onClick={handleSubmitAcusacao}
                            disabled={!pilotoLogado}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: pilotoLogado 
                                    ? 'linear-gradient(135deg, #8B1538 0%, #6B0F2B 100%)' 
                                    : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: '700',
                                cursor: pilotoLogado ? 'pointer' : 'not-allowed',
                                fontSize: '1.05rem',
                                transition: 'all 0.3s',
                                boxShadow: pilotoLogado ? '0 4px 20px rgba(139, 21, 56, 0.4)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>⚖️</span>
                            {pilotoLogado ? 'Enviar Acusação' : 'Faça login para enviar'}
                        </button>
                    </div>
                )}

                {/* TAB: DEFESA */}
                {activeTab === 'defesa' && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
                        border: '1px solid rgba(6, 182, 212, 0.2)',
                        borderRadius: '12px',
                        padding: '30px',
                        maxWidth: '800px'
                    }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '25px', color: 'white' }}>Enviar Defesa</h2>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Descrição da Defesa</label>
                            <textarea
                                value={defesaForm.descricao}
                                onChange={(e) => setDefesaForm({ ...defesaForm, descricao: e.target.value })}
                                placeholder="Descreva sua defesa..."
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontFamily: "'Montserrat', sans-serif",
                                    fontSize: '1rem',
                                    minHeight: '120px',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Link do Vídeo de Defesa</label>
                            <input
                                type="url"
                                value={defesaForm.videoLink}
                                onChange={(e) => setDefesaForm({ ...defesaForm, videoLink: e.target.value })}
                                placeholder="https://youtube.com/watch?v=..."
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontFamily: "'Montserrat', sans-serif",
                                    fontSize: '1rem',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <button
                            onClick={handleSubmitDefesa}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'var(--light-blue)',
                                color: '#0f172a',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                transition: 'all 0.3s'
                            }}
                            onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                            onMouseLeave={(e) => e.target.style.opacity = '1'}
                        >
                            Enviar Defesa
                        </button>
                    </div>
                )}

                {/* TAB: CONSULTA - Resultados do Júri */}
                {activeTab === 'consulta' && (
                    <div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '25px', color: 'white' }}>
                            ⚖️ Resultados das Análises
                        </h2>

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
                                    lancesDecididos
                                        .filter(l => l.dados?.grid === filtroGrid)
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
                        
                        {(() => {
                            // Aplicar filtros
                            let lancesFiltrados = [...lancesDecididos];
                            
                            if (filtroGrid !== 'todos') {
                                lancesFiltrados = lancesFiltrados.filter(l => l.dados?.grid === filtroGrid);
                            }
                            
                            if (filtroEtapa !== 'todas') {
                                lancesFiltrados = lancesFiltrados.filter(l => String(l.dados?.etapa?.round) === String(filtroEtapa));
                            }

                            // Ordenar por data da decisão (mais recente primeiro)
                            // Usar dados.veredito.dataVeredito ou updated_at como fallback
                            lancesFiltrados.sort((a, b) => {
                                const dateA = new Date(a.dados?.veredito?.dataVeredito || a.updated_at || a.created_at || 0);
                                const dateB = new Date(b.dados?.veredito?.dataVeredito || b.updated_at || b.created_at || 0);
                                return dateB.getTime() - dateA.getTime();
                            });
                            
                            // Limitar a 5 se não estiver mostrando todos
                            const totalFiltrados = lancesFiltrados.length;
                            const lancesParaMostrar = mostrarTodos ? lancesFiltrados : lancesFiltrados.slice(0, 5);
                            const temMais = totalFiltrados > 5 && !mostrarTodos;

                            if (lancesFiltrados.length === 0) {
                                return (
                                    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.2)' }}>
                                        <div style={{ fontSize: '50px', marginBottom: '15px' }}>📋</div>
                                        <p style={{ color: '#94A3B8', fontSize: '1.1rem' }}>
                                            {lancesDecididos.length === 0 
                                                ? 'Nenhum lance foi decidido ainda.' 
                                                : 'Nenhum lance encontrado com os filtros selecionados.'}
                                        </p>
                                        <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
                                            {lancesDecididos.length === 0 
                                                ? 'Os resultados aparecerão aqui após a votação do júri.'
                                                : 'Tente ajustar os filtros para ver mais resultados.'}
                                        </p>
                                    </div>
                                );
                            }

                            return (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {lancesParaMostrar.map(lance => {
                                    const dados = lance.dados || {};
                                    const votos = dados.votos || [];
                                    const veredito = dados.veredito || null;
                                    const isRetiradaBug = dados.tipoSolicitacao === 'retirada_bug' || dados.acusado?.nome === 'Administração Master League F1';
                                    
                                    // Usar veredito se existir, senão calcular a partir dos votos
                                    let decisao, votosCulpado, votosInocente, punicaoInfo = null;
                                    
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
                                        
                                        // Se culpado e não for retirada de bug, montar punicaoInfo do veredito
                                        if (veredito.culpado && !isRetiradaBug && veredito.labelPunicao) {
                                            const punicoes = {
                                                'advertencia': { label: '⚠️ Advertência (Alerta Disciplinar!)', pontos: 0 },
                                                'leve': { label: '🟡 Leve - 5 pontos', pontos: 5 },
                                                'media': { label: '🟠 Média - 10 pontos', pontos: 10 },
                                                'grave': { label: '🔴 Grave - 15 pontos', pontos: 15 },
                                                'gravissima': { label: '⛔ Gravíssima - 20 pontos + Race BAN', pontos: 20, raceBan: true }
                                            };
                                            
                                            const punicaoBase = veredito.punicao || '';
                                            const baseInfo = punicoes[punicaoBase] || { label: veredito.labelPunicao, pontos: veredito.pontosPerdidos || 0 };
                                            
                                            // Usar label atualizado da tabela (não do banco que pode estar desatualizado)
                                            punicaoInfo = {
                                                label: baseInfo.label,
                                                pontos: baseInfo.pontos,
                                                agravante: veredito.agravante || false,
                                                pontosTotal: veredito.pontosPerdidos || 0,
                                                raceBan: veredito.raceBan || false
                                            };
                                        }
                                    } else {
                                        // Calcular a partir dos votos (lance ainda não finalizado)
                                        votosCulpado = votos.filter(v => v.culpado).length;
                                        votosInocente = votos.filter(v => !v.culpado).length;
                                        decisao = votosCulpado >= 3 ? 'CULPADO' : (votosInocente >= 3 ? 'INOCENTE' : 'EM ANÁLISE');
                                        
                                        // Ajustar texto para retirada de bug
                                        if (isRetiradaBug) {
                                            decisao = votosCulpado >= 3 ? 'RETIRAR PUNIÇÃO' : (votosInocente >= 3 ? 'MANTER PUNIÇÃO' : 'EM ANÁLISE');
                                        }
                                        
                                        // Calcular punição (se culpado e não for retirada de bug)
                                        if (decisao === 'CULPADO' && !isRetiradaBug) {
                                            const votosCulpadosList = votos.filter(v => v.culpado);
                                            const punicoes = {
                                                'advertencia': { label: '⚠️ Advertência (Alerta Disciplinar!)', pontos: 0 },
                                                'leve': { label: '🟡 Leve - 5 pontos', pontos: 5 },
                                                'media': { label: '🟠 Média - 10 pontos', pontos: 10 },
                                                'grave': { label: '🔴 Grave - 15 pontos', pontos: 15 },
                                                'gravissima': { label: '⛔ Gravíssima - 20 pontos + Race BAN', pontos: 20, raceBan: true }
                                            };
                                            
                                            // Contar punições
                                            const contagemPunicoes = {};
                                            votosCulpadosList.forEach(v => {
                                                const key = v.punicao;
                                                contagemPunicoes[key] = (contagemPunicoes[key] || 0) + 1;
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
                                            
                                            // Verificar agravantes
                                            const temAgravante = votosCulpadosList.filter(v => v.agravante).length > votosCulpadosList.length / 2;
                                            
                                            if (punicaoMaisVotada && punicoes[punicaoMaisVotada]) {
                                                punicaoInfo = {
                                                    ...punicoes[punicaoMaisVotada],
                                                    agravante: temAgravante,
                                                    pontosTotal: punicoes[punicaoMaisVotada].pontos + (temAgravante ? 5 : 0)
                                                };
                                            }
                                        }
                                    }
                                    
                                    const acusador = dados.acusador || {};
                                    const acusado = dados.acusado || {};
                                    const etapa = dados.etapa || {};
                                    const defesa = dados.defesa || null;

                                    return (
                                        <div key={lance.id} style={{
                                            background: (decisao === 'CULPADO' || decisao === 'RETIRAR PUNIÇÃO') 
                                                ? 'linear-gradient(135deg, rgba(127, 29, 29, 0.4) 0%, rgba(15, 23, 42, 0.9) 100%)'
                                                : 'linear-gradient(135deg, rgba(22, 101, 52, 0.4) 0%, rgba(15, 23, 42, 0.9) 100%)',
                                            border: `2px solid ${(decisao === 'CULPADO' || decisao === 'RETIRAR PUNIÇÃO') ? '#EF4444' : '#22C55E'}`,
                                            borderRadius: '16px',
                                            overflow: 'hidden'
                                        }}>
                                            {/* Header do Card */}
                                            <div style={{ 
                                                padding: '20px', 
                                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: '15px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <span style={{ 
                                                        background: '#E5E7EB', 
                                                        color: '#1F2937', 
                                                        padding: '8px 15px', 
                                                        borderRadius: '8px', 
                                                        fontSize: '14px', 
                                                        fontWeight: 'bold', 
                                                        fontFamily: 'monospace' 
                                                    }}>
                                                        🔖 {dados.codigoLance || 'N/A'}
                                                    </span>
                                                    <span style={{ 
                                                        background: dados.grid === 'carreira' ? '#8B5CF6' : '#06B6D4', 
                                                        color: 'white', 
                                                        padding: '6px 12px', 
                                                        borderRadius: '6px', 
                                                        fontSize: '12px', 
                                                        fontWeight: 'bold' 
                                                    }}>
                                                        {dados.grid === 'carreira' ? '🏆 Carreira' : '💡 Light'}
                                                    </span>
                                                </div>
                                                
                                                {/* Badge de Decisão */}
                                                <div style={{
                                                    background: (decisao === 'CULPADO' || decisao === 'RETIRAR PUNIÇÃO') ? '#EF4444' : '#22C55E',
                                                    color: (decisao === 'CULPADO' || decisao === 'RETIRAR PUNIÇÃO') ? 'white' : '#0F172A',
                                                    padding: '10px 20px',
                                                    borderRadius: '8px',
                                                    fontWeight: '900',
                                                    fontSize: '16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}>
                                                    {(decisao === 'CULPADO' || decisao === 'RETIRAR PUNIÇÃO') ? '❌' : '✅'} {decisao}
                                                    {votosCulpado !== undefined && votosInocente !== undefined && (
                                                        <span style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.9 }}>
                                                            ({votosCulpado} x {votosInocente})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Corpo do Card */}
                                            <div style={{ padding: '25px' }}>
                                                {/* Info da Etapa e Pilotos */}
                                                {isMobile ? (
                                                    <>
                                                        {/* Mobile: Etapa e Volta */}
                                                        <div style={{ 
                                                            display: 'grid', 
                                                            gridTemplateColumns: '1fr 1fr', 
                                                            gap: '15px', 
                                                            marginBottom: '20px',
                                                            padding: '15px',
                                                            background: 'rgba(0,0,0,0.3)',
                                                            borderRadius: '12px'
                                                        }}>
                                                            <div>
                                                                <span style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Etapa</span>
                                                                <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: '15px' }}>
                                                                    Round {etapa.round} - {etapa.circuit}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Volta</span>
                                                                <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: '15px' }}>
                                                                    {dados.volta || '-'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* Mobile: Acusador e Acusado com espadas X */}
                                                        <div style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: '10px',
                                                            marginBottom: '25px',
                                                            padding: '20px',
                                                            background: 'rgba(0,0,0,0.3)',
                                                            borderRadius: '12px'
                                                        }}>
                                                            <div style={{ 
                                                                display: 'flex', 
                                                                flexDirection: 'column', 
                                                                alignItems: 'center',
                                                                flex: 1
                                                            }}>
                                                                <span style={{ color: '#EF4444', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>Acusador</span>
                                                                <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: '12px', textAlign: 'center' }}>
                                                                    {acusador.nome || '-'}
                                                                </div>
                                                            </div>
                                                            <div style={{ 
                                                                fontSize: '20px',
                                                                transform: 'rotate(45deg)',
                                                                color: '#94A3B8',
                                                                flexShrink: 0,
                                                                padding: '0 10px'
                                                            }}>
                                                                ⚔️
                                                            </div>
                                                            <div style={{ 
                                                                display: 'flex', 
                                                                flexDirection: 'column', 
                                                                alignItems: 'center',
                                                                flex: 1
                                                            }}>
                                                                <span style={{ color: '#F59E0B', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>Acusado</span>
                                                                <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: '12px', textAlign: 'center' }}>
                                                                    {acusado.nome || '-'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div style={{ 
                                                        display: 'grid', 
                                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                                        gap: '20px', 
                                                        marginBottom: '25px',
                                                        padding: '20px',
                                                        background: 'rgba(0,0,0,0.3)',
                                                        borderRadius: '12px'
                                                    }}>
                                                        <div>
                                                            <span style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Etapa</span>
                                                            <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: '15px' }}>
                                                                Round {etapa.round} - {etapa.circuit}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Volta</span>
                                                            <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: '15px' }}>
                                                                {dados.volta || '-'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#EF4444', fontSize: '11px', textTransform: 'uppercase' }}>Acusador</span>
                                                            <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: '15px' }}>
                                                                {acusador.nome || '-'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#F59E0B', fontSize: '11px', textTransform: 'uppercase' }}>Acusado</span>
                                                            <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: '15px' }}>
                                                                {acusado.nome || '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Vídeos lado a lado */}
                                                <div className="videos-grid-analises" style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: isMobile ? '1fr' : (defesa ? '1fr 1fr' : '1fr'),
                                                    gap: isMobile ? '15px' : '20px',
                                                    marginBottom: isMobile ? '20px' : '25px'
                                                }}>
                                                    <div>
                                                        <div style={{
                                                            color: '#EF4444',
                                                            fontSize: isMobile ? '0.9rem' : '13px',
                                                            fontWeight: 'bold',
                                                            marginBottom: isMobile ? '8px' : '10px',
                                                            textTransform: 'uppercase',
                                                            textAlign: 'center',
                                                            letterSpacing: isMobile ? '0.5px' : '1px',
                                                            textShadow: '0 2px 10px rgba(239, 68, 68, 0.3)'
                                                        }}>
                                                            👤 VISÃO DO ACUSADOR
                                                        </div>
                                                        <VideoEmbed
                                                            videoLink={dados.videoLink}
                                                            title="Vídeo da acusação"
                                                            borderColor="#EF4444"
                                                            isMobile={isMobile}
                                                        />
                                                        <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: '3px solid #EF4444' }}>
                                                            <p style={{ color: '#E2E8F0', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                                                                {dados.descricao || 'Sem descrição'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {defesa && (
                                                        <div>
                                                            <div style={{
                                                                color: '#22C55E',
                                                                fontSize: isMobile ? '0.9rem' : '13px',
                                                                fontWeight: 'bold',
                                                                marginBottom: isMobile ? '8px' : '10px',
                                                                textTransform: 'uppercase',
                                                                textAlign: 'center',
                                                                letterSpacing: isMobile ? '0.5px' : '1px',
                                                                textShadow: '0 2px 10px rgba(34, 197, 94, 0.3)'
                                                            }}>
                                                                🛡️ VISÃO DO DEFENSOR
                                                            </div>
                                                            <VideoEmbed
                                                                videoLink={defesa.videoLinkDefesa}
                                                                title="Vídeo da defesa"
                                                                borderColor="#22C55E"
                                                                isMobile={isMobile}
                                                            />
                                                            <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: '3px solid #22C55E' }}>
                                                                <p style={{ color: '#E2E8F0', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                                                                    {defesa.descricaoDefesa || defesa.argumentos || 'Sem argumentos'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Resultado da Punição (se culpado e não for retirada de bug) */}
                                                {(decisao === 'CULPADO' || decisao === 'RETIRAR PUNIÇÃO') && punicaoInfo && !isRetiradaBug && (
                                                    <div style={{
                                                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(0,0,0,0.3) 100%)',
                                                        border: '2px solid #EF4444',
                                                        borderRadius: '12px',
                                                        padding: '20px',
                                                        marginTop: '20px'
                                                    }}>
                                                        <h4 style={{ color: '#EF4444', margin: '0 0 15px', fontSize: '14px', textTransform: 'uppercase' }}>
                                                            ⚖️ Punição Aplicada
                                                        </h4>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
                                                            <span style={{ 
                                                                background: '#EF4444', 
                                                                color: 'white', 
                                                                padding: '8px 15px', 
                                                                borderRadius: '8px', 
                                                                fontWeight: 'bold',
                                                                fontSize: '14px'
                                                            }}>
                                                                {punicaoInfo.label}
                                                            </span>
                                                            {punicaoInfo.agravante && (
                                                                <span style={{ 
                                                                    background: '#F59E0B', 
                                                                    color: '#1F2937', 
                                                                    padding: '6px 12px', 
                                                                    borderRadius: '6px', 
                                                                    fontWeight: 'bold',
                                                                    fontSize: '12px'
                                                                }}>
                                                                    ➕ Agravante (+5 pts)
                                                                </span>
                                                            )}
                                                            <span style={{ 
                                                                color: '#F8FAFC', 
                                                                fontWeight: 'bold',
                                                                fontSize: '16px'
                                                            }}>
                                                                📉 -{punicaoInfo.pontosTotal} pontos
                                                            </span>
                                                            {punicaoInfo.raceBan && (
                                                                <span style={{ 
                                                                    background: '#7F1D1D', 
                                                                    color: '#FCA5A5', 
                                                                    padding: '6px 12px', 
                                                                    borderRadius: '6px', 
                                                                    fontWeight: 'bold',
                                                                    fontSize: '12px'
                                                                }}>
                                                                    ⛔ RACE BAN
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Votos dos Jurados */}
                                                <div style={{ marginTop: '20px' }}>
                                                    <h4 style={{ color: '#94A3B8', margin: '0 0 12px', fontSize: '12px', textTransform: 'uppercase' }}>
                                                        👨‍⚖️ Votos do Júri
                                                    </h4>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                        {votos.map((voto, idx) => (
                                                            <span key={idx} style={{
                                                                padding: '6px 12px',
                                                                borderRadius: '20px',
                                                                fontSize: '12px',
                                                                fontWeight: 'bold',
                                                                background: voto.culpado ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                                                color: voto.culpado ? '#EF4444' : '#22C55E',
                                                                border: `1px solid ${voto.culpado ? '#EF4444' : '#22C55E'}`
                                                            }}>
                                                                {voto.jurado}: {voto.culpado ? '❌ Culpado' : '✅ Inocente'}
                                                            </span>
                                                        ))}
                                                    </div>
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
                                        📊 Mostrando 5 de {totalFiltrados} análises
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
                                        🔍 Ver Todas as Análises ({totalFiltrados})
                                    </button>
                                </div>
                            )}

                            {mostrarTodos && totalFiltrados > 5 && (
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
                )}

                {/* TAB: STEWARDS (ADM ONLY) */}
                {activeTab === 'stewards' && (
                    <div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '25px', color: 'white' }}>Painel Stewards</h2>
                        
                        {/* DEBUG INFO - Para ajudar a identificar problemas de permissão */}
                        <div style={{ background: 'rgba(51, 65, 85, 0.5)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #475569' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#94A3B8', fontSize: '0.9rem' }}>🔧 Debug Info</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9rem' }}>
                                <div>Status Login: <span style={{ color: pilotoLogado ? '#4ADE80' : '#EF4444' }}>{pilotoLogado ? 'Logado' : 'Deslogado'}</span></div>
                                <div>É Steward: <span style={{ color: isSteward ? '#4ADE80' : '#EF4444' }}>{isSteward ? 'SIM' : 'NÃO'}</span></div>
                                <div>Email: <span style={{ color: '#E2E8F0' }}>{pilotoLogado?.email || '-'}</span></div>
                            </div>
                        </div>

                        {/* Botão de Sincronização - Movido para o topo para facilitar acesso */}
                        <div style={{ 
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(15, 23, 42, 0.4) 100%)', 
                            border: '1px solid rgba(139, 92, 246, 0.3)', 
                            borderRadius: '12px', 
                            padding: '20px', 
                            marginBottom: '30px' 
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#8B5CF6', margin: '0 0 5px 0' }}>
                                        🔄 Sincronização de Pilotos
                                    </h3>
                                    <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: 0 }}>
                                        Atualizar base de dados via Planilha Google
                                    </p>
                                </div>
                                <button
                                    onClick={handleSyncPilotos}
                                    disabled={syncLoading}
                                    style={{
                                        padding: '10px 20px',
                                        background: syncLoading ? 'rgba(139, 92, 246, 0.5)' : '#8B5CF6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: '700',
                                        cursor: syncLoading ? 'not-allowed' : 'pointer',
                                        fontSize: '0.9rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {syncLoading ? '⏳ Sincronizando...' : 'Sincronizar Agora'}
                                </button>
                            </div>
                            {syncMessage && (
                                <div style={{ 
                                    marginTop: '15px',
                                    padding: '10px', 
                                    background: syncMessage.includes('✅') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                    border: `1px solid ${syncMessage.includes('✅') ? '#22C55E' : '#EF4444'}`, 
                                    borderRadius: '6px', 
                                    color: syncMessage.includes('✅') ? '#4ADE80' : '#F87171',
                                    fontSize: '0.9rem'
                                }}>
                                    {syncMessage}
                                </div>
                            )}
                        </div>

                        {!isSteward ? (
                            <p style={{ color: '#94A3B8', textAlign: 'center', padding: '40px' }}>
                                ⛔ Acesso exclusivo para Stewards/Admin.
                            </p>
                        ) : (
                            <div>
                                {/* Formulário de Veredito */}
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
                                    border: '1px solid rgba(6, 182, 212, 0.2)',
                                    borderRadius: '12px',
                                    padding: '30px',
                                    marginBottom: '30px',
                                    maxWidth: '900px'
                                }}>
                                    <h3 style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '25px', color: '#3B82F6' }}>Emitir Veredito</h3>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Lance</label>
                                        <select
                                            value={verdictForm.lanceId}
                                            onChange={(e) => setVerdictForm({ ...verdictForm, lanceId: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontFamily: "'Montserrat', sans-serif",
                                                fontSize: '1rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="">Selecione um lance...</option>
                                            {lancesStewards.map(lance => (
                                                <option key={lance.id} value={lance.id} style={{ background: '#0f172a', color: 'white' }}>
                                                    {lance.codigo} - {lance.acusacoes?.length > 0 ? `${lance.acusacoes[0].piloto_acusador_id} vs ${lance.acusacoes[0].piloto_acusado_id}` : 'Sem acusação'} {lance.status === 'fechado' ? '✅ FECHADO' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Resultado</label>
                                            <select
                                                value={verdictForm.resultado}
                                                onChange={(e) => setVerdictForm({ ...verdictForm, resultado: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '8px',
                                                    color: 'white',
                                                    fontFamily: "'Montserrat', sans-serif",
                                                    fontSize: '1rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="absolvido" style={{ background: '#0f172a', color: 'white' }}>✅ Absolvido</option>
                                                <option value="culpado" style={{ background: '#0f172a', color: 'white' }}>❌ Culpado</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Penalidade</label>
                                            <select
                                                value={verdictForm.penaltyType}
                                                onChange={(e) => setVerdictForm({ ...verdictForm, penaltyType: e.target.value })}
                                                disabled={verdictForm.resultado === 'absolvido'}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    background: verdictForm.resultado === 'absolvido' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '8px',
                                                    color: 'white',
                                                    fontFamily: "'Montserrat', sans-serif",
                                                    fontSize: '1rem',
                                                    cursor: verdictForm.resultado === 'absolvido' ? 'not-allowed' : 'pointer',
                                                    opacity: verdictForm.resultado === 'absolvido' ? 0.5 : 1
                                                }}
                                            >
                                                <option value="" style={{ background: '#0f172a', color: 'white' }}>Nenhuma</option>
                                                <option value="advertencia" style={{ background: '#0f172a', color: 'white' }}>Advertência (Alerta Disciplinar!)</option>
                                                <option value="leve" style={{ background: '#0f172a', color: 'white' }}>Leve (5 pts)</option>
                                                <option value="media" style={{ background: '#0f172a', color: 'white' }}>Média (10 pts)</option>
                                                <option value="grave" style={{ background: '#0f172a', color: 'white' }}>Grave (15 pts)</option>
                                                <option value="gravissima" style={{ background: '#0f172a', color: 'white' }}>Gravíssima (20 pts)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '700', color: '#FFD700' }}>
                                            <input
                                                type="checkbox"
                                                checked={verdictForm.agravante}
                                                onChange={(e) => setVerdictForm({ ...verdictForm, agravante: e.target.checked })}
                                                disabled={verdictForm.resultado === 'absolvido' || !verdictForm.penaltyType}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            ⚠️ Agravante (+5 pts)
                                        </label>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Explicação</label>
                                        <textarea
                                            value={verdictForm.explanation}
                                            onChange={(e) => setVerdictForm({ ...verdictForm, explanation: e.target.value })}
                                            placeholder="Descreva o motivo do veredito..."
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontFamily: "'Montserrat', sans-serif",
                                                fontSize: '1rem',
                                                minHeight: '120px',
                                                resize: 'vertical'
                                            }}
                                        />
                                    </div>

                                    <button
                                        onClick={handleSubmitVeredicto}
                                        style={{
                                            width: '100%',
                                            padding: '14px',
                                            background: '#3B82F6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            fontSize: '1rem',
                                            transition: 'all 0.3s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                                    >
                                        ⚖️ Emitir Veredito
                                    </button>
                                </div>

                                {/* Lista de Lances Pendentes */}
                                <div>
                                    <h3 style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '25px', color: '#06B6D4' }}>Lances Pendentes</h3>
                                    {lancesStewards.filter(l => l.status !== 'fechado').length === 0 ? (
                                        <p style={{ textAlign: 'center', color: '#94A3B8', padding: '40px' }}>✅ Nenhum lance aguardando análise.</p>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))', gap: '20px' }}>
                                            {lancesStewards.filter(l => l.status !== 'fechado').map(lance => (
                                                <div key={lance.id} style={{
                                                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
                                                    border: '2px solid rgba(6, 182, 212, 0.3)',
                                                    borderRadius: '12px',
                                                    padding: '20px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <h4 style={{ color: '#FFD700', fontWeight: '700', marginBottom: '15px', fontSize: '1.1rem' }}>
                                                        {lance.codigo}
                                                    </h4>
                                                    {lance.acusacoes && lance.acusacoes.length > 0 && (
                                                        <div>
                                                            {lance.acusacoes.map(acc => (
                                                                <div key={acc.id} style={{ marginBottom: '15px' }}>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                                        <div style={{ padding: '10px', background: 'rgba(255,107,53,0.1)', borderRadius: '8px' }}>
                                                                            <p style={{ fontSize: '0.75rem', color: '#FF6B35', margin: '0 0 5px 0', fontWeight: '700', textTransform: 'uppercase' }}>Acusação</p>
                                                                            <p style={{ fontSize: '0.85rem', color: '#CBD5E1', margin: 0 }}>{acc.descricao}</p>
                                                                            {acc.video_link && (
                                                                                <a href={acc.video_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#06B6D4', textDecoration: 'underline' }}>
                                                                                    Ver vídeo →
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                        <div style={{ padding: '10px', background: acc.defesas?.length > 0 ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                                                            <p style={{ fontSize: '0.75rem', color: acc.defesas?.length > 0 ? '#06B6D4' : '#94A3B8', margin: '0 0 5px 0', fontWeight: '700', textTransform: 'uppercase' }}>
                                                                                {acc.defesas?.length > 0 ? '🛡️ Defesa Recebida' : '⏳ Aguardando Defesa'}
                                                                            </p>
                                                                            {acc.defesas && acc.defesas.length > 0 && (
                                                                                <>
                                                                                    <p style={{ fontSize: '0.85rem', color: '#CBD5E1', margin: '0 0 5px 0' }}>{acc.defesas[0].descricao}</p>
                                                                                    {acc.defesas[0].video_link && (
                                                                                        <a href={acc.defesas[0].video_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#06B6D4', textDecoration: 'underline' }}>
                                                                                            Ver vídeo →
                                                                                        </a>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* GERENCIAR PILOTOS (DRIVERS) */}
                                <div style={{ marginTop: 40 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '15px' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#FFD700', margin: 0 }}>
                                            👥 Gerenciar Pilotos (Drivers)
                                        </h3>
                                    </div>
                                    
                                    {/* Tabela de pilotos */}
                                    <div style={{ background: 'rgba(30,41,59,0.7)', borderRadius: 10, padding: 20 }}>
                                        {pilotosAdm.length === 0 ? (
                                            <p style={{ color: '#94A3B8' }}>Nenhum piloto encontrado.</p>
                                        ) : (
                                            <table style={{ width: '100%', color: 'white', fontSize: 14, borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid #334155' }}>
                                                        <th style={{ textAlign: 'left', padding: 8 }}>Nome</th>
                                                        <th style={{ textAlign: 'left', padding: 8 }}>E-mail</th>
                                                        <th style={{ textAlign: 'center', padding: 8 }}>Acesso Painel</th>
                                                        <th style={{ textAlign: 'center', padding: 8 }}>Ação</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pilotosAdm.map(p => (
                                                        <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                                            <td style={{ padding: 8 }}>{p.nome}</td>
                                                            <td style={{ padding: 8 }}>{p.email}</td>
                                                            <td style={{ padding: 8, textAlign: 'center' }}>
                                                                {p.is_steward ? <span style={{ color: '#22C55E', fontWeight: 700 }}>✔️</span> : <span style={{ color: '#EF4444', fontWeight: 700 }}>❌</span>}
                                                            </td>
                                                            <td style={{ padding: 8, textAlign: 'center' }}>
                                                                <button
                                                                    onClick={() => toggleAcessoPainel(p.id, p.is_steward)}
                                                                    style={{
                                                                        padding: '6px 18px',
                                                                        background: p.is_steward
                                                                            ? 'linear-gradient(90deg, #EF4444 0%, #F87171 100%)'
                                                                            : 'linear-gradient(90deg, #22C55E 0%, #4ADE80 100%)',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer',
                                                                        fontSize: 13,
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    {p.is_steward ? 'Remover acesso' : 'Conceder acesso'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Analises;
