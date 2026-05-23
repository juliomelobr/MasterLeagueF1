import { useState, useEffect } from 'react';
import { useLeagueData } from '../hooks/useLeagueData';
import { supabase } from '../supabaseClient';
import { generateLanceCode, calculatePenaltyPoints, getBRTDeadline, isDeadlineExceeded } from '../hooks/useAnalises';
import { sendEmailNotification, getEmailTemplate } from '../utils/emailService';
import '../index.css';

function Analises() {
    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const { rawCarreira, rawLight, seasons, loading } = useLeagueData();
    const [activeTab, setActiveTab] = useState('acusacao'); // 'acusacao', 'defesa', 'consulta', 'stewards'
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
    const [loadingPage, setLoadingPage] = useState(true);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [lances, setLances] = useState([]);
    const [verdicts, setVerdicts] = useState([]);
    const [verdictForm, setVerdictForm] = useState({
        lanceId: '',
        resultado: 'absolvido',
        penaltyType: '',
        agravante: false,
        explanation: ''
    });
    const [lancesStewards, setLancesStewards] = useState([]);
    const [isSteward, setIsSteward] = useState(false);

    // Validar autenticação e carregar dados do piloto
    useEffect(() => {
        const verificarAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                
                // Se houver usuário, carrega dados do piloto
                if (user) {
                    // Buscar dados do piloto logado
                    const { data: pilotoData, error } = await supabase
                        .from('pilotos')
                        .select('*')
                        .eq('email', user.email)
                        .single();

                    if (pilotoData) {
                        setPilotoLogado(pilotoData);
                    } else {
                        console.error('Piloto não encontrado:', error);
                    }
                } else {
                    // Sem usuário, apenas marca como carregado
                    setPilotoLogado(null);
                }
            } catch (err) {
                console.error('Erro ao verificar autenticação:', err);
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
            const date = row[0];

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

    if (loadingPage || loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-dark-main)', color: 'white', padding: '100px 20px', textAlign: 'center' }}>
                Carregando Análises...
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-dark-main)', color: 'white', padding: '80px 20px 40px', fontFamily: "'Montserrat', sans-serif" }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '3rem', fontWeight: '900', fontStyle: 'italic', marginBottom: '10px' }}>ANÁLISES</h1>
                    <p style={{ color: '#94A3B8', fontSize: '1rem', margin: 0 }}>Painel Stewards</p>
                </div>

                {/* Info Piloto - Mostrar apenas se logado */}
                {pilotoLogado && (
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
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setActiveTab('acusacao')}
                        style={{
                            padding: '10px 20px',
                            background: activeTab === 'acusacao' ? 'var(--carreira-wine)' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem'
                        }}
                    >
                        ⚖️ Enviar Acusação
                    </button>
                    <button
                        onClick={() => setActiveTab('defesa')}
                        style={{
                            padding: '10px 20px',
                            background: activeTab === 'defesa' ? 'var(--light-blue)' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem'
                        }}
                    >
                        🛡️ Enviar Defesa
                    </button>
                    <button
                        onClick={() => setActiveTab('consulta')}
                        style={{
                            padding: '10px 20px',
                            background: activeTab === 'consulta' ? '#22C55E' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem'
                        }}
                    >
                        📋 Consultar Lances
                    </button>
                    <button
                        onClick={() => setActiveTab('stewards')}
                        style={{
                            padding: '10px 20px',
                            background: activeTab === 'stewards' ? '#3B82F6' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem'
                        }}
                    >
                        👨‍⚖️ Stewards ADM
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
                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
                        border: '1px solid rgba(6, 182, 212, 0.2)',
                        borderRadius: '12px',
                        padding: '30px',
                        maxWidth: '800px'
                    }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '25px', color: 'white' }}>Enviar Acusação</h2>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Piloto Acusado</label>
                            <select
                                value={acusacaoForm.pilotoAcusado}
                                onChange={(e) => setAcusacaoForm({ ...acusacaoForm, pilotoAcusado: e.target.value })}
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
                                <option value="">Selecione um piloto...</option>
                                {pilotos.map(p => (
                                    <option key={p} value={p} style={{ background: '#0f172a', color: 'white' }}>{p}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Temporada</label>
                            <select
                                value={selectedSeason}
                                onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
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
                                <option value="">Selecione uma temporada...</option>
                                {seasons.map(s => (
                                    <option key={s} value={s} style={{ background: '#0f172a', color: 'white' }}>Temporada {s}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Etapa</label>
                            <select
                                value={acusacaoForm.etapa}
                                onChange={(e) => setAcusacaoForm({ ...acusacaoForm, etapa: e.target.value })}
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
                                <option value="">Selecione uma etapa...</option>
                                {etapas.map(e => (
                                    <option key={e.round} value={`${e.round}`} style={{ background: '#0f172a', color: 'white' }}>
                                        Etapa {e.round.toString().padStart(2, '0')} - {e.gpName} ({e.date})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Descrição do Lance</label>
                            <textarea
                                value={acusacaoForm.descricao}
                                onChange={(e) => setAcusacaoForm({ ...acusacaoForm, descricao: e.target.value })}
                                placeholder="Descreva o que ocorreu no lance..."
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
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Link do Vídeo (YouTube/Streamable/etc)</label>
                            <input
                                type="url"
                                value={acusacaoForm.videoLink}
                                onChange={(e) => setAcusacaoForm({ ...acusacaoForm, videoLink: e.target.value })}
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
                            onClick={handleSubmitAcusacao}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'var(--carreira-wine)',
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
                            Enviar Acusação
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

                {/* TAB: CONSULTA */}
                {activeTab === 'consulta' && (
                    <div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '25px', color: 'white' }}>Consultar Lances</h2>
                        {lancesStewards.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94A3B8', padding: '40px' }}>Nenhum lance disponível para consulta.</p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))', gap: '20px' }}>
                                {lancesStewards.map(lance => (
                                    <div key={lance.id} style={{
                                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
                                        border: '1px solid rgba(6, 182, 212, 0.2)',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        overflow: 'hidden'
                                    }}>
                                        <h3 style={{ color: '#06B6D4', fontWeight: '700', marginBottom: '15px' }}>{lance.codigo}</h3>
                                        {lance.acusacoes && lance.acusacoes.length > 0 && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                                {lance.acusacoes.map((acc, idx) => (
                                                    <div key={idx}>
                                                        <p style={{ fontSize: '0.75rem', color: '#FF6B35', margin: '0 0 5px 0', fontWeight: '700', textTransform: 'uppercase' }}>Acusação</p>
                                                        {acc.video_link && (
                                                            <iframe
                                                                width="100%"
                                                                height="180"
                                                                src={acc.video_link.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                                                                title="Vídeo Acusação"
                                                                frameBorder="0"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                                style={{ borderRadius: '8px' }}
                                                            ></iframe>
                                                        )}
                                                        <p style={{ fontSize: '0.8rem', color: '#CBD5E1', margin: '8px 0 0 0' }}>{acc.descricao}</p>
                                                    </div>
                                                ))}
                                                {lance.acusacoes[0]?.defesas && lance.acusacoes[0].defesas.length > 0 && (
                                                    <div>
                                                        <p style={{ fontSize: '0.75rem', color: '#06B6D4', margin: '0 0 5px 0', fontWeight: '700', textTransform: 'uppercase' }}>Defesa</p>
                                                        {lance.acusacoes[0].defesas[0].video_link && (
                                                            <iframe
                                                                width="100%"
                                                                height="180"
                                                                src={lance.acusacoes[0].defesas[0].video_link.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                                                                title="Vídeo Defesa"
                                                                frameBorder="0"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                                style={{ borderRadius: '8px' }}
                                                            ></iframe>
                                                        )}
                                                        <p style={{ fontSize: '0.8rem', color: '#CBD5E1', margin: '8px 0 0 0' }}>{lance.acusacoes[0].defesas[0].descricao}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', marginTop: '15px' }}>
                                            <p style={{ fontSize: '0.85rem', color: '#FFD700', margin: 0 }}>📋 Etapa {lance.round} • {lance.status === 'fechado' ? '✅ FECHADO' : '⏳ ABERTO'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: STEWARDS (ADM ONLY) */}
                {activeTab === 'stewards' && (
                    <div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '25px', color: 'white' }}>Painel Stewards</h2>
                        
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
                                                <option value="advertencia" style={{ background: '#0f172a', color: 'white' }}>Advertência (0 pts)</option>
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
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Analises;

