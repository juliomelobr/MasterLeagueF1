import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useLeagueData } from '../hooks/useLeagueData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import { 
    isMobileDevice, 
    is2FAValidatedForDevice, 
    clearAll2FAForEmail,
    getDeviceInfo 
} from '../utils/deviceDetection';
import '../index.css';
import { ADMIN_WHATSAPP, ADMIN_EMAIL_FALLBACK, sendWhatsappNotification } from '../utils/whatsappNotify';

// --- CONFIGURAÇÃO ---
// CADASTRO MLF1 (gid=1844400629)
const LINK_CONTROLE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1844400629&single=true&output=csv";
// Pilotos PR (gid=884534812) - Para buscar COD IDML
const LINK_PILOTOS_PR = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=884534812&single=true&output=csv";

// Mapeamento de GP para abreviação de país
const getCountryAbbreviation = (gpName) => {
    if (!gpName) return '';
    const name = gpName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    
    // Mapeamento direto
    if (name.includes('BAHREIN') || name.includes('BAHREIM')) return 'BAH';
    if (name.includes('ARÁBIA') || name.includes('ARABIA') || name.includes('SAUDI')) return 'ARA';
    if (name.includes('AUSTRÁLIA') || name.includes('AUSTRALIA')) return 'AUS';
    if (name.includes('CHINA')) return 'CHN';
    if (name.includes('JAPÃO') || name.includes('JAPAO') || name.includes('JAPAN')) return 'JAP';
    if (name.includes('MIAMI') || name.includes('AUSTIN') || name.includes('LAS VEGAS') || name.includes('VEGAS')) return 'EUA';
    if (name.includes('EMÍLIA') || name.includes('EMILIA') || name.includes('IMOLA')) return 'EMI';
    if (name.includes('MÔNACO') || name.includes('MONACO')) return 'MON';
    if (name.includes('CANADÁ') || name.includes('CANADA')) return 'CAN';
    if (name.includes('ESPANHA') || name.includes('SPAIN') || name.includes('BARCELONA')) return 'ESP';
    if (name.includes('ÁUSTRIA') || name.includes('AUSTRIA')) return 'AUT';
    if (name.includes('INGLATERRA') || name.includes('BRITAIN') || name.includes('SILVERSTONE')) return 'GBR';
    if (name.includes('HUNGRIA') || name.includes('HUNGARY')) return 'HUN';
    if (name.includes('BÉLGICA') || name.includes('BELGICA') || name.includes('BELGIUM') || name.includes('SPA')) return 'BEL';
    if (name.includes('HOLANDA') || name.includes('NETHERLANDS') || name.includes('ZANDVOORT')) return 'HOL';
    if (name.includes('ITÁLIA') || name.includes('ITALIA') || name.includes('ITALY') || name.includes('MONZA')) return 'ITA';
    if (name.includes('SINGAPURA') || name.includes('SINGAPORE')) return 'SIN';
    if (name.includes('CATAR') || name.includes('QATAR')) return 'QAT';
    if (name.includes('MÉXICO') || name.includes('MEXICO')) return 'MEX';
    if (name.includes('BRASIL') || name.includes('BRAZIL') || name.includes('INTERLAGOS')) return 'BRA';
    if (name.includes('ABU') || name.includes('EMIRATES') || name.includes('YAS MARINA')) return 'ABU';
    if (name.includes('PORTUGAL') || name.includes('PORTIMÃO') || name.includes('PORTIMAO')) return 'POR';
    
    return '';
};

const fetchWithProxy = async (url) => {
    const proxyUrl = "https://corsproxy.io/?";
    try {
        const response = await fetch(proxyUrl + encodeURIComponent(url));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        if (!text || text.trim().length === 0) {
            throw new Error('Resposta vazia do proxy');
        }
        // Verificar se não é HTML (erro de proxy)
        if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
            throw new Error('Proxy retornou HTML ao invés de CSV');
        }
        return text;
    } catch (error) {
        console.error('❌ Erro ao buscar planilha via proxy:', error);
        // Tentar buscar direto (pode funcionar se não houver CORS)
        try {
            const directResponse = await fetch(url);
            if (directResponse.ok) {
                return await directResponse.text();
            }
        } catch (directError) {
            console.error('❌ Erro ao buscar planilha direto:', directError);
        }
        throw error;
    }
};

// --- HELPERS VISUAIS ---
const getTeamColor = (teamName) => {
    if(!teamName || teamName === 'Sem Equipe') return "#94A3B8";
    const t = teamName.toLowerCase();
    if(t.includes("red bull")) return "var(--f1-redbull)"; 
    if(t.includes("ferrari")) return "var(--f1-ferrari)"; 
    if(t.includes("mercedes")) return "var(--f1-mercedes)"; 
    if(t.includes("mclaren")) return "var(--f1-mclaren)"; 
    if(t.includes("aston")) return "var(--f1-aston)"; 
    if(t.includes("alpine")) return "var(--f1-alpine)"; 
    if(t.includes("haas")) return "var(--f1-haas)"; 
    if(t.includes("williams")) return "var(--f1-williams)"; 
    if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "var(--f1-sauber)"; 
    if(t.includes("vcarb") || t.includes("racing") && t.includes("bulls")) return "var(--f1-vcarb)";
    return "#94A3B8";
};

const getTeamLogo = (teamName) => {
    if(!teamName || teamName === 'Sem Equipe') return null;
    const t = teamName.toLowerCase().replace(/\s/g, '');
    if(t.includes("ferrari")) return "/team-logos/f1-ferrari.png";
    if(t.includes("mercedes")) return "/team-logos/f1-mercedes.png";
    if(t.includes("alpine")) return "/team-logos/f1-alpine.png";
    if(t.includes("vcarb") || (t.includes("racing") && t.includes("bulls"))) return "/team-logos/f1-racingbulls.png";
    if(t.includes("redbull") || t.includes("oracle")) return "/team-logos/f1-redbull.png";
    if(t.includes("mclaren")) return "/team-logos/f1-mclaren.png";
    if(t.includes("aston")) return "/team-logos/f1-astonmartin.png";
    if(t.includes("haas")) return "/team-logos/f1-haas.png";
    if(t.includes("williams")) return "/team-logos/f1-williams.png";
    if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "/team-logos/f1-sauber.png";
    return null;
};

const getTeamGradient = (teamName) => {
    // Degradê padrão do dashboard: cor da equipe -> preto
    if(!teamName || teamName === 'Sem Equipe') return "linear-gradient(135deg, #334155 0%, #0B1220 100%)";
    const c = getTeamColor(teamName);
    // `c` pode ser uma CSS var, e isso é OK dentro do linear-gradient
    return `linear-gradient(135deg, ${c} 0%, #000000 100%)`;
};

// Função para obter wallpaper da equipe (estilo F1)
const getTeamWallpaper = (teamName) => {
    // Wallpaper padrão para pilotos sem equipe definida
    if (!teamName) return '/banner-masterleague.png';
    
    const t = teamName.toLowerCase().trim();
    if (t === 'sem equipe' || t.includes('reserva') || t === 'res') {
        return '/banner-masterleague.png';
    }
    
    // Mapeamento de equipes para wallpapers
    if(t.includes("red bull") || t.includes("oracle")) {
        return '/wallpapers/f1-redbull.png';
    }
    if(t.includes("ferrari")) {
        return '/wallpapers/f1-ferrari.png';
    }
    if(t.includes("mercedes")) {
        return '/wallpapers/f1-mercedes.png';
    }
    if(t.includes("mclaren")) {
        return '/wallpapers/f1-mclaren.png';
    }
    if(t.includes("aston")) {
        return '/wallpapers/f1-aston.png';
    }
    if(t.includes("alpine")) {
        return '/wallpapers/f1-alpine.png';
    }
    if(t.includes("haas")) {
        // Existe .png e .jpg; preferir .png
        return '/wallpapers/f1-haas.png';
    }
    if(t.includes("williams")) {
        return '/wallpapers/f1-williams.png';
    }
    if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) {
        return '/wallpapers/f1-sauber.png';
    }
    if(t.includes("vcarb") || (t.includes("racing") && t.includes("bulls"))) {
        return '/wallpapers/f1-vcarb.png';
    }
    
    // Fallback para equipe não mapeada
    return '/banner-masterleague.png'; // Usar imagem existente como fallback
};

const DriverImage = ({ name, gridType, season, isExPiloto = false }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    const s = season || '19';
    
    // Caminhos em ordem de prioridade
    const seasonSrc = `/pilotos/${gridType || 'carreira'}/s${s}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const fallbackS19Src = `/pilotos/${gridType || 'carreira'}/s19/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';

    const handleError = (e) => {
        // Se falhou a foto da temporada, tenta SML
        if (e.target.src.includes(`/s${s}/`)) {
            e.target.src = smlSrc;
        } 
        // Se falhou SML, tenta pasta s19 (caso não tenha s20 nem sml, mas tenha s19)
        else if (e.target.src.includes('/SML/')) {
            if (!e.target.src.includes(`/s19/`)) e.target.src = fallbackS19Src;
            else e.target.src = shadowSrc;
        }
        // Se falhou s19, tenta shadow
        else if (e.target.src.includes(`/s19/`)) {
            e.target.src = shadowSrc;
        }
    };

    // Prioridade: se não é ex-piloto OU se temos uma temporada específica (como de um contrato novo), tenta a pasta da temporada
    // Caso contrário, se for ex-piloto sem temporada nova, vai direto pra SML
    const initialSrc = (isExPiloto && !season) ? smlSrc : seasonSrc;
    
    return <img src={initialSrc} onError={handleError} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" />;
};

// --- TELA DE VALIDAÇÃO / ONBOARDING ---
const Onboarding = ({ session, onComplete }) => {
    const [mode, setMode] = useState('validate'); 
    const [whatsappInput, setWhatsappInput] = useState('');
    const [manualData, setManualData] = useState({ nome: '', gamertag: '', plataforma: 'Xbox', grid: 'Carreira', nomePiloto: '' });
    const [validating, setValidating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        if (value.length > 9) value = `${value.slice(0, 10)}-${value.slice(10)}`;
        setWhatsappInput(value);
    };
    const cleanPhone = (phone) => phone ? phone.replace(/\D/g, '') : '';

    const handleValidate = async () => {
        const clean = cleanPhone(whatsappInput);
        if (clean.length < 10) return setErrorMsg("WhatsApp inválido.");
        setValidating(true); setErrorMsg('');

        try {
            console.log('🔍 Iniciando validação...');
            console.log('📧 Email do usuário:', session.user.email);
            console.log('📱 WhatsApp digitado:', whatsappInput, '→ Limpo:', clean);
            
            const csvText = await fetchWithProxy(LINK_CONTROLE);
            console.log('✅ Planilha carregada, tamanho:', csvText.length, 'caracteres');
            
            Papa.parse(csvText, {
                header: false, skipEmptyLines: true,
                complete: async (results) => {
                    const rows = results.data.slice(1);
                    console.log('📋 Total de linhas na planilha:', rows.length);
                    
                    const myEmail = session.user.email.toLowerCase().trim();
                    console.log('🔍 Procurando por email:', myEmail);
                    
                    // NOVA ESTRUTURA - CADASTRO MLF1
                    // Coluna H (índice 7) = E-mail Login
                    // Coluna C (índice 2) = WhatsApp
                    // Coluna O (índice 14) = Nome Piloto
                    
                    // Debug: mostrar primeiras linhas
                    if (rows.length > 0) {
                        console.log('📋 Primeira linha da planilha:', rows[0]);
                        console.log('📋 Coluna C (WhatsApp) primeira linha:', rows[0][2]);
                        console.log('📋 Coluna H (Email) primeira linha:', rows[0][7]);
                        console.log('📋 Coluna O (Nome Piloto) primeira linha:', rows[0][14]);
                    }
                    
                    let foundByEmail = false;
                    let foundByPhone = false;
                    
                    const match = rows.find((row, index) => {
                        const sheetPhone = cleanPhone(row[2] || ''); // Coluna C
                        const sheetEmail = (row[7] || '').toLowerCase().trim(); // Coluna H - E-mail Login
                        
                        // Debug para primeiras 5 linhas
                        if (index < 5) {
                            console.log(`📋 Linha ${index + 1}:`, {
                                email: sheetEmail,
                                phone: sheetPhone,
                                emailMatch: sheetEmail === myEmail,
                                phoneMatch: sheetPhone.includes(clean) || clean.includes(sheetPhone)
                            });
                        }
                        
                        if (sheetEmail === myEmail) {
                            foundByEmail = true;
                            console.log('✅ Email encontrado na linha', index + 1, 'WhatsApp da planilha:', sheetPhone);
                        }
                        
                        if (sheetPhone && (sheetPhone.includes(clean) || clean.includes(sheetPhone))) {
                            foundByPhone = true;
                            console.log('✅ WhatsApp encontrado na linha', index + 1, 'Email da planilha:', sheetEmail);
                        }
                        
                        // Comparação mais flexível: email deve bater exatamente, WhatsApp pode bater parcialmente
                        const emailMatch = sheetEmail === myEmail;
                        const phoneMatch = sheetPhone && (sheetPhone.includes(clean) || clean.includes(sheetPhone));
                        
                        return emailMatch && phoneMatch;
                    });

                    if (match) {
                        console.log('✅ Match encontrado!', match);
                        const nomeOficial = match[14] || match[0]; // Coluna O (Nome Piloto) ou Coluna A (Nome Cadastrado)
                        if (!nomeOficial) { 
                            setErrorMsg("Nome de Piloto vazio na planilha."); 
                            setValidating(false); 
                            return; 
                        }
                        await saveProfile({ nome_piloto: nomeOficial, whatsapp: match[2], status: 'active' }, true);
                    } else {
                        console.log('❌ Match não encontrado');
                        console.log('📊 Estatísticas:', {
                            totalLinhas: rows.length,
                            encontradoPorEmail: foundByEmail,
                            encontradoPorPhone: foundByPhone,
                            emailProcurado: myEmail,
                            phoneProcurado: clean
                        });
                        setErrorMsg(`Inscrição não encontrada para ${myEmail}. Verifique se o email e WhatsApp estão corretos na planilha.`);
                    }
                    setValidating(false);
                },
                error: (error) => {
                    console.error('❌ Erro ao parsear CSV:', error);
                    setErrorMsg("Erro ao processar planilha. Tente novamente.");
                    setValidating(false);
                }
            });
        } catch (err) { 
            console.error('❌ Erro na validação:', err); 
            setErrorMsg(`Erro de conexão: ${err.message}. Tente novamente.`); 
            setValidating(false); 
        }
    };

    const handleManualSubmit = async () => {
        if (!manualData.nome || !manualData.nomePiloto || cleanPhone(whatsappInput).length < 10) {
            return setErrorMsg("Preencha todos os campos obrigatórios.");
        }
        setValidating(true);
        await saveProfile({
            nome_piloto: manualData.nomePiloto, 
            whatsapp: whatsappInput,
            plataforma: manualData.plataforma, 
            grid_preferencia: manualData.grid, 
            nome: manualData.nome
            // Removido 'status' e 'gamertag' pois não existem na tabela pilotos
        }, false);
    };

    const saveProfile = async (extraData, isActive) => {
        const updates = { 
            email: session.user.email,
            nome: extraData.nome_piloto || extraData.nome, // Campo 'nome' para consistência
            whatsapp: extraData.whatsapp,
            grid: extraData.grid_preferencia || extraData.grid || 'carreira',
            equipe: null,
            is_steward: false
            // Removido 'status', 'gamertag', 'plataforma', 'created_at' e 'updated_at' pois não existem na tabela pilotos
        };
        
        console.log('💾 Salvando no banco (tabela pilotos):', updates);
        
        const { error } = await supabase.from('pilotos').upsert(updates, { onConflict: 'email' });
        if (error) { 
            console.error('❌ Erro ao salvar:', error);
            setErrorMsg('Erro ao salvar: ' + error.message); 
            setValidating(false); 
        } else { 
            console.log('✅ Salvo com sucesso!');
            isActive ? onComplete(updates) : window.location.reload(); 
        }
    };

    return (
        <div style={containerStyle}>
            <h2 style={{marginBottom:'20px', color:'var(--highlight-cyan)', textTransform:'uppercase'}}>{mode === 'validate' ? 'VALIDAR IDENTIDADE' : 'INSCRIÇÃO MANUAL'}</h2>
            {errorMsg && <div style={{background:'rgba(220,38,38,0.2)', color:'#FECACA', padding:'10px', borderRadius:'8px', marginBottom:'20px', fontSize:'0.9rem'}}>{errorMsg}</div>}
            {mode === 'validate' && (
                <>
                    <p style={{color:'#94A3B8', marginBottom:'30px'}}>Confirme seus dados para liberar o acesso.</p>
                    <div style={{textAlign:'left', marginBottom:'20px'}}><label style={labelStyle}>E-MAIL</label><input type="text" value={session.user.email} disabled style={inputDisabledStyle} /></div>
                    <div style={{textAlign:'left', marginBottom:'30px'}}><label style={labelStyle}>WHATSAPP</label><input type="text" value={whatsappInput} onChange={handlePhoneChange} placeholder="(00) 00000-0000" style={inputStyle} /></div>
                    <button onClick={handleValidate} disabled={validating} className="btn-primary" style={{width:'100%', marginBottom:'20px'}}>{validating ? 'VERIFICANDO...' : 'VALIDAR'}</button>
                    <button onClick={() => { setMode('manual'); setErrorMsg(''); }} style={{background:'transparent', border:'1px solid #64748B', color:'white', padding:'8px 16px', borderRadius:'6px', cursor:'pointer', fontSize:'0.8rem'}}>REENVIAR INSCRIÇÃO</button>
                </>
            )}
            {mode === 'manual' && (
                <div style={{textAlign:'left', display:'flex', flexDirection:'column', gap:'15px'}}>
                    <div><label style={labelStyle}>NOME COMPLETO</label><input type="text" value={manualData.nome} onChange={e => setManualData({...manualData, nome: e.target.value})} style={inputStyle} /></div>
                    <div><label style={labelStyle}>NOME DE PILOTO (NA TRANSMISSÃO)</label><input type="text" value={manualData.nomePiloto} onChange={e => setManualData({...manualData, nomePiloto: e.target.value})} style={inputStyle} /></div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                        <div><label style={labelStyle}>GAMERTAG</label><input type="text" value={manualData.gamertag} onChange={e => setManualData({...manualData, gamertag: e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>WHATSAPP</label><input type="text" value={whatsappInput} onChange={handlePhoneChange} style={inputStyle} /></div>
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                        <div><label style={labelStyle}>PLATAFORMA</label><select value={manualData.plataforma} onChange={e => setManualData({...manualData, plataforma: e.target.value})} style={inputStyle}><option value="Xbox">Xbox</option><option value="PlayStation">PlayStation</option><option value="PC">PC</option></select></div>
                        <div><label style={labelStyle}>GRID</label><select value={manualData.grid} onChange={e => setManualData({...manualData, grid: e.target.value})} style={inputStyle}><option value="Carreira">Carreira</option><option value="Light">Light</option></select></div>
                    </div>
                    <button onClick={handleManualSubmit} disabled={validating} className="btn-primary" style={{width:'100%', marginTop:'10px'}}>{validating ? 'ENVIANDO...' : 'ENVIAR CADASTRO'}</button>
                    <button onClick={() => setMode('validate')} style={{background:'transparent', border:'none', color:'#64748B', fontSize:'0.8rem', width:'100%', marginTop:'10px', cursor:'pointer'}}>Cancelar</button>
                </div>
            )}
        </div>
    );
};

// --- DASHBOARD ---
function Dashboard({ isReadOnly: isReadOnlyProp = null, pilotoEmail: pilotoEmailProp = null }) {
    const navigate = useNavigate();
    const { rawCarreira, rawLight, tracks, datesCarreira, datesLight, seasons, loading: loadingData } = useLeagueData();
    
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [codIdml, setCodIdml] = useState(null); // COD IDML da planilha Pilotos PR
    const [statusPiloto, setStatusPiloto] = useState('ATIVO'); // Status da coluna J da planilha Pilotos PR
    const [historiaPiloto, setHistoriaPiloto] = useState(null); // Dados históricos do piloto da planilha Pilotos PR
    const [statsAdicionais, setStatsAdicionais] = useState(null); // Estatísticas adicionais calculadas
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [dashData, setDashData] = useState(null);
    const [acusacoesPendentes, setAcusacoesPendentes] = useState(0);
    const [propostas, setPropostas] = useState([]); // Propostas recebidas pelo piloto
    const [contratoFechado, setContratoFechado] = useState(null); // Contrato assinado
    const [showPropostaModal, setShowPropostaModal] = useState(false);
    const [propostaSelecionada, setPropostaSelecionada] = useState(null);
    const [lastNotifyOpenAt, setLastNotifyOpenAt] = useState(null);
    const [showContratoModal, setShowContratoModal] = useState(false);
    const [tempoRestante, setTempoRestante] = useState(null);
    const propostasExpiradasProcessadasRef = useRef(new Set());
    const cancelarPropostasExpiradasRef = useRef(null);
    const cronometroIntervalRef = useRef(null);
    const propostasRef = useRef([]);
    const painelPilotoUrl = 'https://masterleaguef1.com.br/dashboard';

    const [viewMode, setViewMode] = useState('telemetria');

    // Inicializar viewMode como 'objetivos' se houver contrato
    useEffect(() => {
        if (contratoFechado?.id) {
            setViewMode('objetivos');
        }
    }, [contratoFechado?.id]);

    const notifyAdminOpenInbox = async () => {
        const gridAtual = (dashData?.currentGrid || profile?.grid || 'carreira').toUpperCase();
        const message = [
            '📬 PILOTO ABRIU CAIXA DE MENSAGENS',
            '',
            `Piloto: ${profile?.nome || 'Desconhecido'}`,
            `Grid: ${gridAtual}`,
            `COD IDML: ${(profile?.cod_idml || codIdml || '-').toString()}`,
            `Email: ${profile?.email || session?.user?.email || '-'}`,
            `Horário: ${new Date().toLocaleString('pt-BR')}`,
        ].join('\n');

        const result = await sendWhatsappNotification({
            phone: ADMIN_WHATSAPP,
            email: ADMIN_EMAIL_FALLBACK,
            nome: 'Admin',
            message,
        });
        if (!result.success) {
            console.warn('⚠️ Falha ao notificar admin (caixa aberta):', result.error);
        }
    };

    const notifyAdminContrato = async (teamName) => {
        const gridAtual = (dashData?.currentGrid || profile?.grid || 'carreira').toUpperCase();
        const message = [
            '✅ CONTRATO FECHADO - MASTER LEAGUE F1',
            '',
            `Piloto: ${profile?.nome || 'Desconhecido'}`,
            `Grid: ${gridAtual}`,
            `Equipe escolhida: ${teamName || 'Equipe não informada'}`,
            `COD IDML: ${(profile?.cod_idml || codIdml || '-').toString()}`,
            `Horário: ${new Date().toLocaleString('pt-BR')}`,
        ].join('\n');

        const result = await sendWhatsappNotification({
            phone: ADMIN_WHATSAPP,
            email: ADMIN_EMAIL_FALLBACK,
            nome: 'Admin',
            message,
        });
        if (!result.success) {
            console.warn('⚠️ Falha ao notificar admin (contrato fechado):', result.error);
        }
    };

    const notifyPilotoContrato = async (teamName, pilotWhatsapp, pilotNome) => {
        if (!pilotWhatsapp) {
            console.warn('⚠️ WhatsApp do piloto não encontrado, não será enviada notificação');
            return;
        }

        const gridAtual = (dashData?.currentGrid || profile?.grid || 'carreira').toUpperCase();
        const message = [
            '🎉 PARABÉNS! CONTRATO FECHADO - MASTER LEAGUE F1',
            '',
            `Olá ${pilotNome || 'Piloto'}!`,
            '',
            `✅ Seu contrato foi fechado com sucesso!`,
            '',
            `Equipe: ${teamName || 'Equipe não informada'}`,
            `Grid: ${gridAtual}`,
            `Temporada: 20`,
            '',
            `Bem-vindo à sua nova equipe! 🏎️`,
            '',
            `Horário: ${new Date().toLocaleString('pt-BR')}`,
        ].join('\n');

        const result = await sendWhatsappNotification({
            phone: pilotWhatsapp,
            email: session?.user?.email || profile?.email,
            nome: pilotNome || 'Piloto',
            message,
        });
        if (!result.success) {
            console.warn('⚠️ Falha ao notificar piloto (contrato fechado):', result.error);
        } else {
            console.log('✅ Notificação enviada ao piloto com sucesso');
        }
    };

    // Função para cancelar propostas expiradas e enviar notificações
    const cancelarPropostasExpiradas = useCallback(async (propostasExpiradas) => {
        if (!propostasExpiradas || propostasExpiradas.length === 0) return;

        try {
            // Verificar quais propostas ainda não foram processadas
            const propostasParaProcessar = propostasExpiradas.filter(p => {
                const propostaId = p.id?.toString();
                return propostaId && !propostasExpiradasProcessadasRef.current.has(propostaId);
            });

            if (propostasParaProcessar.length === 0) return;

            console.log(`⏰ Cancelando ${propostasParaProcessar.length} proposta(s) expirada(s)...`);

            // Atualizar status das propostas para EXPIRED
            const idsParaCancelar = propostasParaProcessar.map(p => p.id).filter(Boolean);
            
            if (idsParaCancelar.length > 0) {
                const { error: updateError } = await supabase
                    .from('interests')
                    .update({ status: 'EXPIRED' })
                    .in('id', idsParaCancelar);

                if (updateError) {
                    console.error('❌ Erro ao cancelar propostas expiradas:', updateError);
                    return;
                }

                console.log(`✅ ${idsParaCancelar.length} proposta(s) marcada(s) como EXPIRED`);
                
                // Marcar propostas como processadas na ref
                idsParaCancelar.forEach(id => {
                    propostasExpiradasProcessadasRef.current.add(id.toString());
                });
            }

            // Coletar informações das equipes para a mensagem
            const equipesNomes = propostasParaProcessar
                .map(p => p.equipes?.name || 'Equipe desconhecida')
                .filter((nome, index, arr) => arr.indexOf(nome) === index); // Remover duplicatas

            const gridAtual = (dashData?.currentGrid || profile?.grid || 'carreira').toUpperCase();
            const nomePiloto = profile?.nome || 'Piloto';
            const codIdmlPiloto = (profile?.cod_idml || codIdml || '-').toString();

            // Notificar o administrador
            const messageAdmin = [
                '⏰ PROPOSTAS EXPIRADAS - MASTER LEAGUE F1',
                '',
                `Piloto: ${nomePiloto}`,
                `Grid: ${gridAtual}`,
                `COD IDML: ${codIdmlPiloto}`,
                `Email: ${profile?.email || session?.user?.email || '-'}`,
                `Quantidade de propostas expiradas: ${propostasParaProcessar.length}`,
                `Equipes: ${equipesNomes.join(', ')}`,
                `Horário: ${new Date().toLocaleString('pt-BR')}`,
                '',
                'As propostas foram automaticamente canceladas por falta de resposta dentro do prazo de 10 horas.'
            ].join('\n');

            const resultAdmin = await sendWhatsappNotification({
                phone: ADMIN_WHATSAPP,
                email: ADMIN_EMAIL_FALLBACK,
                nome: 'Admin',
                message: messageAdmin,
            });

            if (!resultAdmin.success) {
                console.warn('⚠️ Falha ao notificar admin (propostas expiradas):', resultAdmin.error);
            }

            // Notificar o piloto
            if (profile?.whatsapp) {
                const messagePiloto = [
                    '⏰ TEMPO ESGOTADO - MASTER LEAGUE F1',
                    '',
                    `Olá ${nomePiloto}!`,
                    '',
                    `O prazo de 10 horas para responder às propostas recebidas expirou.`,
                    `As propostas das seguintes equipes foram automaticamente canceladas:`,
                    '',
                    equipesNomes.map((nome, idx) => `${idx + 1}. ${nome}`).join('\n'),
                    '',
                    'Você ainda pode receber novas propostas de outras equipes.',
                    '',
                    `🔗 Painel do Piloto: ${painelPilotoUrl}`
                ].join('\n');

                const resultPiloto = await sendWhatsappNotification({
                    phone: profile.whatsapp,
                    email: profile?.email || `${codIdmlPiloto}@masterleaguef1.com`,
                    nome: nomePiloto,
                    message: messagePiloto,
                    tipo: 'notificacao_proposta',
                });

                if (!resultPiloto.success) {
                    console.warn('⚠️ Falha ao notificar piloto (propostas expiradas):', resultPiloto.error);
                }
            }

            // Recarregar propostas para atualizar a interface
            const pilotCodIdml = profile?.cod_idml || codIdml;
            if (pilotCodIdml) {
                const codIdmlNormalizado = String(pilotCodIdml).trim().toUpperCase();
                const { data: propostasAtualizadas } = await supabase
                    .from('interests')
                    .select(`*, equipes (*)`)
                    .eq('pilot_cod_idml', codIdmlNormalizado)
                    .eq('status', 'OFFER_SENT')
                    .order('created_at', { ascending: false });

                setPropostas(propostasAtualizadas || []);
            }

        } catch (error) {
            console.error('❌ Erro ao cancelar propostas expiradas:', error);
        }
    }, [profile, codIdml, dashData, painelPilotoUrl]);

    // Atualizar a ref sempre que a função mudar
    useEffect(() => {
        cancelarPropostasExpiradasRef.current = cancelarPropostasExpiradas;
    }, [cancelarPropostasExpiradas]);

    // Detectar dispositivo atual
    const [deviceInfo, setDeviceInfo] = useState(() => {
        const info = getDeviceInfo();
        console.log('📱 Dashboard - Device info inicial:', info);
        return info;
    });
    
    // Atualizar info do dispositivo quando a tela redimensionar
    useEffect(() => {
        const handleResize = () => {
            const newInfo = getDeviceInfo();
            console.log('📱 Dashboard - Device info atualizado:', newInfo);
            setDeviceInfo(newInfo);
        };
        window.addEventListener('resize', handleResize);
        // Também atualizar uma vez após montagem para garantir
        const timeoutId = setTimeout(() => {
            const currentInfo = getDeviceInfo();
            if (JSON.stringify(currentInfo) !== JSON.stringify(deviceInfo)) {
                console.log('📱 Dashboard - Device info sincronizado após montagem:', currentInfo);
                setDeviceInfo(currentInfo);
            }
        }, 100);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);
    
    // Função para obter chave de 2FA (compatibilidade com código existente)
    const get2FAKey = (email) => {
        const baseKey = `ml_pilot_2fa_ok:${(email || '').toLowerCase().trim()}`;
        return deviceInfo.isMobile ? `${baseKey}:mobile` : `${baseKey}:desktop`;
    };

    // Função para capitalizar primeira letra de cada palavra
    const capitalizeWords = (str) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Parse de data (dd/mm/aaaa, dd/mm/aa ou ISO) e comparação por "dia" (ignora hora)
    const parseDateAny = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return null;
        const s = dateStr.trim();
        if (!s) return null;

        // dd/mm/yyyy ou dd/mm/yy
        const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
        if (m) {
            const day = Number(m[1]);
            const month = Number(m[2]);
            let year = Number(m[3]);
            if (year < 100) year = 2000 + year; // assume 20xx
            const d = new Date(year, month - 1, day);
            if (!isNaN(d.getTime())) return d;
        }

        // ISO / outros formatos aceitos pelo Date
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d;
        return null;
    };

    const isFutureDay = (dateStr) => {
        const d = parseDateAny(dateStr);
        if (!d) return false;
        const today = new Date();
        const dayOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        return dayOnly > todayOnly;
    };

    const normalizeGridName = (gridStr) => {
        const g = String(gridStr || '').trim().toLowerCase();
        if (g.includes('carreira')) return 'carreira';
        if (g.includes('light')) return 'light';
        return null;
    };

    // Função para calcular estatísticas adicionais do piloto
    const calcularEstatisticasAdicionais = (nomePiloto, rawCarreira, rawLight, datesCarreiraMap = {}, datesLightMap = {}, temporadaAtual = 20) => {
        if (!nomePiloto || !rawCarreira || !rawLight) return null;
        
        const stats = {
            campeonatos: [], // [{ grid: 'carreira'|'light', temporada: number }]
            equipeMaisRepresentada: null, // { nome: string, corridas: number }
            totalVitorias: 0,
            totalPodios: 0,
            totalPoles: 0,
            totalVoltasRapidas: 0,
            totalCorridas: 0,
            totalPontos: 0,
            melhorResultado: null, // number
            totalTemporadas: new Set(),
            gridsParticipados: new Set()
        };
        
        // Agrupar dados por temporada e grid para calcular campeonatos
        const pontosPorTemporada = {}; // { 'carreira-5': { [nome]: pontos }, 'light-5': { ... } }
        const equipesPorPiloto = {}; // { [equipe]: corridas }
        const voltasRapidasPorCorrida = {}; // { 'carreira-5-R01': { melhor: tempo, piloto: nome } }
        
        const isSeasonComplete = (grid, season) => {
            const map = grid === 'carreira' ? datesCarreiraMap : datesLightMap;
            if (!map || typeof map !== 'object') return true;
            const prefix = `${season}-`;
            const keys = Object.keys(map).filter(k => k.startsWith(prefix));
            if (keys.length === 0) return true; // sem informação => assume completo (não travar histórico antigo)
            // Se existir qualquer etapa com data futura, a temporada ainda não está completa
            return !keys.some(k => isFutureDay(map[k]));
        };

        // Processar dados de Carreira e Light
        // IMPORTANTE: Processar TODOS os pilotos para calcular campeonatos corretamente
        [rawCarreira, rawLight].forEach((data, gridIndex) => {
            const grid = gridIndex === 0 ? 'carreira' : 'light';
            const dateMap = grid === 'carreira' ? datesCarreiraMap : datesLightMap;
            
            data.forEach(row => {
                const driverName = row[9];
                if (!driverName || driverName === '-') return;
                
                const season = parseInt(row[3]);
                const roundNum = parseInt(row[4]);
                const round = row[4] || '';
                const team = (row[10] || '').trim();
                const fastestLap = (row[11] || '').trim();
                const racePos = parseInt(row[8]) || 0;
                const qualiPos = parseInt(row[6]) || 0;

                // Ignorar etapas futuras (não contam em estatísticas/biografia)
                if (!isNaN(season) && !isNaN(roundNum) && dateMap) {
                    const dateKey = `${season}-${roundNum}`;
                    const eventDateStr = dateMap[dateKey];
                    if (eventDateStr && isFutureDay(eventDateStr)) return;
                }
                
                // Calcular pontos para TODOS os pilotos (necessário para determinar campeão)
                const key = `${grid}-${season}`;
                if (!pontosPorTemporada[key]) pontosPorTemporada[key] = {};
                if (!pontosPorTemporada[key][driverName]) pontosPorTemporada[key][driverName] = 0;
                
                let points = parseFloat((row[15] || '0').replace(',', '.'));
                if (isNaN(points)) points = 0;
                pontosPorTemporada[key][driverName] += points;
                
                // Se for o piloto atual, contar suas estatísticas
                if (driverName === nomePiloto) {
                    // Contar corridas
                    stats.totalCorridas++;
                    stats.totalTemporadas.add(season);
                    stats.gridsParticipados.add(grid);

                    // Contar vitórias
                    if (racePos === 1) {
                        stats.totalVitorias++;
                    }

                    // Contar pódios
                    if (racePos > 0 && racePos <= 3) {
                        stats.totalPodios++;
                    }

                    // Contar poles
                    if (qualiPos === 1) {
                        stats.totalPoles++;
                    }

                    // Melhor resultado
                    if (racePos > 0 && (stats.melhorResultado === null || racePos < stats.melhorResultado)) {
                        stats.melhorResultado = racePos;
                    }

                    // Pontos (somatório)
                    stats.totalPontos += points;
                    
                    // Contar equipes
                    if (team && team !== '-' && team !== '') {
                        if (!equipesPorPiloto[team]) equipesPorPiloto[team] = 0;
                        equipesPorPiloto[team]++;
                    }
                }
                
                // Processar voltas rápidas (para todos os pilotos)
                if (fastestLap && fastestLap.length > 4 && !fastestLap.includes('-')) {
                    const raceKey = `${grid}-${season}-${round}`;
                    if (!voltasRapidasPorCorrida[raceKey]) {
                        voltasRapidasPorCorrida[raceKey] = { melhor: Infinity, piloto: null };
                    }
                    
                    // Converter tempo para milissegundos (formato MM:SS.mmm)
                    const timeToMs = (timeStr) => {
                        const parts = timeStr.split(':');
                        if (parts.length !== 2) return Infinity;
                        const [min, sec] = parts.map(p => parseFloat(p.replace(',', '.')));
                        if (isNaN(min) || isNaN(sec)) return Infinity;
                        return (min * 60 + sec) * 1000;
                    };
                    
                    const ms = timeToMs(fastestLap);
                    if (ms < voltasRapidasPorCorrida[raceKey].melhor) {
                        voltasRapidasPorCorrida[raceKey] = { melhor: ms, piloto: driverName };
                    }
                }
            });
        });
        
        // Calcular campeonatos (quem teve mais pontos em cada temporada/grid)
        Object.keys(pontosPorTemporada).forEach(key => {
            const [grid, season] = key.split('-');
            const seasonNum = parseInt(season);
            // Evitar "dar título" em temporada em andamento (ex.: T20 antes de concluir calendário)
            if (!isNaN(seasonNum) && seasonNum >= Number(temporadaAtual) && !isSeasonComplete(grid, seasonNum)) {
                return;
            }
            const pontos = pontosPorTemporada[key];
            const maxPontos = Math.max(...Object.values(pontos));
            const campeao = Object.keys(pontos).find(nome => pontos[nome] === maxPontos);
            
            if (campeao === nomePiloto) {
                stats.campeonatos.push({ grid, temporada: seasonNum });
            }
        });
        
        // Contar voltas rápidas (quem teve o melhor tempo em cada corrida)
        Object.values(voltasRapidasPorCorrida).forEach(race => {
            if (race.piloto === nomePiloto) {
                stats.totalVoltasRapidas++;
            }
        });
        
        // Encontrar equipe mais representada
        const equipesOrdenadas = Object.entries(equipesPorPiloto)
            .sort((a, b) => b[1] - a[1]);
        
        if (equipesOrdenadas.length > 0) {
            stats.equipeMaisRepresentada = {
                nome: equipesOrdenadas[0][0],
                corridas: equipesOrdenadas[0][1]
            };
        }
        
        return stats;
    };

    // Função para gerar resumo da história do piloto
    const gerarResumoHistoria = (dados, nomePiloto, statsAdicionais = null, temporadaAtual = null, datesCarreiraMap = {}, datesLightMap = {}, gridAtual = null, contratoFechado = null) => {
        if (!dados || !nomePiloto) return '';
        
        const {
            primeiraTemporada,
            gridEntrada,
            primeiraCorrida,
            status,
            dataEstreia
        } = dados;
        
        const formatarData = (dataStr) => {
            if (!dataStr) return '';
            if (dataStr.includes('/')) return dataStr;
            try {
                const data = new Date(dataStr);
                if (!isNaN(data.getTime())) {
                    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                }
            } catch (e) {}
            return dataStr;
        };
        
        const nomeCapitalizado = capitalizeWords(nomePiloto);
        const dataEstreiaFormatada = formatarData(dataEstreia);
        const temporadaAtualNum = Number(temporadaAtual) || 20;
        const isTemporada20 = temporadaAtualNum === 20;
        const gridEntradaNorm = normalizeGridName(gridEntrada);
        const dateMapEntrada = gridEntradaNorm === 'light' ? datesLightMap : datesCarreiraMap;

        const ajustarEtapaParaNaoFutura = (seasonStr, roundStr, dateMap) => {
            const s = parseInt(seasonStr);
            const r = parseInt(roundStr);
            if (isNaN(s) || isNaN(r) || !dateMap) return { season: s, round: r, adjusted: false };
            const key = `${s}-${r}`;
            const dateStr = dateMap[key];
            if (!dateStr || !isFutureDay(dateStr)) return { season: s, round: r, adjusted: false };
            for (let prev = r - 1; prev >= 1; prev--) {
                const k = `${s}-${prev}`;
                const ds = dateMap[k];
                if (ds && !isFutureDay(ds)) return { season: s, round: prev, adjusted: true };
            }
            return { season: s, round: null, adjusted: true };
        };
        
        const isEstreiaFutura = dataEstreia && (
            dataEstreia.includes('30/12/99') || 
            dataEstreiaFormatada === '30/12/1999' ||
            dataEstreiaFormatada === '30/12/99'
        );
        
        if (isEstreiaFutura) {
            const temporadaEstreia = temporadaAtual || 20;
            return `${nomeCapitalizado} irá estrear na Liga na Temporada ${temporadaEstreia}.`;
        }
        
        // --- INÍCIO DA NARRATIVA ---
        let resumo = `${nomeCapitalizado} `;
        
        // 1. Entrada
        if (dataEstreiaFormatada) {
            resumo += `iniciou sua trajetória na Master League F1 em ${dataEstreiaFormatada}`;
        } else if (primeiraTemporada) {
            resumo += `iniciou sua trajetória na liga na Temporada ${primeiraTemporada}`;
        } else {
            resumo += `iniciou sua trajetória na liga`;
        }
        
        if (gridEntrada) {
            const gridFormatado = gridEntrada.toLowerCase() === 'carreira' ? 'Grid Carreira' : 
                                 gridEntrada.toLowerCase() === 'light' ? 'Grid Light' : 
                                 capitalizeWords(gridEntrada);
            resumo += `, estreando pelo ${gridFormatado}`;
        }
        
        if (primeiraCorrida) {
            const adj = ajustarEtapaParaNaoFutura(primeiraTemporada, primeiraCorrida, dateMapEntrada);
            if (adj.round) {
                resumo += ` na ${adj.round}ª etapa`;
            }
        }
        resumo += `. `;

        // 2. Trajetória e Grids
        if (statsAdicionais) {
            const grids = Array.from(statsAdicionais.gridsParticipados || []);
            if (grids.length > 1) {
                resumo += `Ao longo de sua carreira, demonstrou versatilidade ao competir tanto no Grid Carreira quanto no Grid Light. `;
            }

            // Estatísticas de Destaque
            let conquistas = [];
            if (statsAdicionais.campeonatos.length > 0) {
                const camp = statsAdicionais.campeonatos[0];
                conquistas.push(`se sagrou campeão do ${camp.grid === 'carreira' ? 'Grid Carreira' : 'Grid Light'} na Temporada ${camp.temporada}`);
            }
            if (statsAdicionais.totalVitorias > 0) {
                conquistas.push(`conquistou ${statsAdicionais.totalVitorias} vitória${statsAdicionais.totalVitorias > 1 ? 's' : ''}`);
            }
            if (statsAdicionais.totalPodios > 0) {
                conquistas.push(`subiu ao pódio ${statsAdicionais.totalPodios} vez${statsAdicionais.totalPodios > 1 ? 'es' : ''}`);
            }

            if (conquistas.length > 0) {
                resumo += `Durante este período, ${nomeCapitalizado} `;
                if (conquistas.length === 1) {
                    resumo += conquistas[0];
                } else {
                    const last = conquistas.pop();
                    resumo += conquistas.join(', ') + ` e ` + last;
                }
                if (statsAdicionais.melhorResultado) {
                    resumo += ` (com destaque para sua melhor chegada em P${statsAdicionais.melhorResultado})`;
                }
                resumo += `. `;
            }

            // Números gerais
            if (statsAdicionais.totalCorridas > 0) {
                resumo += `Acumula um total de ${statsAdicionais.totalCorridas} corridas disputadas`;
                if (statsAdicionais.totalTemporadas.size > 0) {
                    resumo += ` em ${statsAdicionais.totalTemporadas.size} temporada${statsAdicionais.totalTemporadas.size > 1 ? 's' : ''}`;
                }
                if (statsAdicionais.totalPontos > 0) {
                    resumo += `, somando ${Math.round(statsAdicionais.totalPontos)} pontos na classificação histórica. `;
                } else {
                    resumo += `. `;
                }
            }

            if (statsAdicionais.equipeMaisRepresentada) {
                resumo += `A equipe que mais defendeu nas pistas foi a ${capitalizeWords(statsAdicionais.equipeMaisRepresentada.nome)}. `;
            }
        }

        // 3. Momento Atual e Futuro
        if (status === 'INATIVO') {
            resumo += `Atualmente, o piloto encontra-se inativo, mas seu legado permanece registrado na história da liga.`;
        } else {
            // Se participou da S19
            const participouS19 = statsAdicionais?.totalTemporadas.has(19);
            const temContratoS20 = !!contratoFechado?.id;

            if (participouS19) {
                resumo += `Na última temporada (Temporada 19), mostrou sua competitividade nas pistas. `;
            }

            if (temContratoS20) {
                const novaEquipe = contratoFechado?.equipes?.name || 'sua nova equipe';
                resumo += `Para a Temporada 20, ${nomeCapitalizado} já está confirmado e defenderá as cores da ${novaEquipe}, onde enfrentará novos desafios em busca de resultados ainda mais expressivos.`;
            } else if (isTemporada20) {
                resumo += `Atualmente, está focado nos desafios da Temporada 20.`;
            } else {
                resumo += `Segue ativo na liga, aguardando os próximos capítulos de sua jornada.`;
            }
        }
        
        return resumo;
    };

    // Função para buscar COD IDML (primeiro no Supabase, depois na planilha se necessário)
    const buscarCodIdml = async (nomePiloto, emailPiloto) => {
        if (!nomePiloto || !emailPiloto) return;
        
        try {
            console.log('🔍 Buscando COD IDML para:', nomePiloto);
            
            // 1. Primeiro, tentar buscar no Supabase
            const { data: pilotoData, error: supabaseError } = await supabase
                .from('pilotos')
                .select('cod_idml')
                .eq('email', emailPiloto.toLowerCase().trim())
                .single();
            
            let codIdmlEncontrado = false;
            if (!supabaseError && pilotoData?.cod_idml) {
                console.log('✅ COD IDML encontrado no Supabase:', pilotoData.cod_idml);
                setCodIdml(pilotoData.cod_idml);
                codIdmlEncontrado = true;
            }
            
            // 2. Buscar na planilha (sempre buscar status, e COD IDML se não encontrou no Supabase)
            console.log('🔍 Buscando na planilha Pilotos PR (Status sempre da planilha)...');
            const csvText = await fetchWithProxy(LINK_PILOTOS_PR);
            
            Papa.parse(csvText, {
                header: false,
                skipEmptyLines: true,
                complete: async (results) => {
                    const rows = results.data;
                    if (rows.length < 2) {
                        console.warn('⚠️ Planilha Pilotos PR vazia ou sem dados');
                        return;
                    }
                    
                    // Cabeçalho: Drivers (coluna A, índice 0), COD IDML (coluna B, índice 1)
                    // Buscar pelo nome do piloto (normalizar para comparação - remover acentos e espaços extras)
                    const normalizarNome = (nome) => {
                        return nome
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, ' '); // Normaliza espaços
                    };
                    
                    const nomeNormalizado = normalizarNome(nomePiloto);
                    console.log('🔍 Nome normalizado para busca:', nomeNormalizado);
                    
                    // Listar primeiros nomes da planilha para debug
                    const primeirosNomes = rows.slice(1, 6).map((row, idx) => ({
                        original: row[0] || '',
                        normalizado: normalizarNome(row[0] || ''),
                        codIdml: row[1] || ''
                    }));
                    console.log('📋 Primeiros 5 nomes da planilha:', primeirosNomes);
                    
                    // Busca exata primeiro
                    let match = rows.find((row, index) => {
                        if (index === 0) return false; // Pular cabeçalho
                        const driverName = normalizarNome(row[0] || '');
                        return driverName === nomeNormalizado;
                    });
                    
                    // Se não encontrou exato, tentar busca parcial (contém)
                    if (!match) {
                        console.log('🔍 Busca exata falhou. Tentando busca parcial...');
                        match = rows.find((row, index) => {
                            if (index === 0) return false;
                            const driverName = normalizarNome(row[0] || '');
                            // Verifica se o nome normalizado está contido no nome da planilha ou vice-versa
                            return driverName.includes(nomeNormalizado) || nomeNormalizado.includes(driverName);
                        });
                    }
                    
                    if (match) {
                        // Buscar COD IDML (coluna B, índice 1) se não encontrou no Supabase
                        if (match[1]) {
                            const codIdmlValue = match[1].trim();
                            console.log('✅ COD IDML encontrado na planilha:', codIdmlValue, 'para o nome:', match[0]);
                            setCodIdml(codIdmlValue);
                            
                            // 3. Salvar no Supabase para próximas buscas
                            console.log('💾 Tentando salvar COD IDML no Supabase...');
                            const { error: updateError } = await supabase
                                .from('pilotos')
                                .update({ cod_idml: codIdmlValue })
                                .eq('email', emailPiloto.toLowerCase().trim());
                            
                            if (updateError) {
                                console.error('❌ Erro ao salvar COD IDML no Supabase:', updateError);
                            } else {
                                console.log('✅ COD IDML salvo no Supabase com sucesso');
                            }
                        }
                        
                        // Buscar Status (coluna J, índice 9)
                        const statusValue = (match[9] || '').trim().toUpperCase();
                        if (statusValue) {
                            console.log('✅ Status encontrado na planilha:', statusValue, 'para o nome:', match[0]);
                            setStatusPiloto(statusValue === 'INATIVO' ? 'INATIVO' : 'ATIVO');
                        } else {
                            console.warn('⚠️ Status não encontrado na coluna J. Usando padrão ATIVO.');
                            setStatusPiloto('ATIVO');
                        }
                        
                        // Buscar dados históricos do piloto
                        // C = primeira temporada (índice 2), D = grid entrada (índice 3), E = primeira corrida (índice 4)
                        // F = última temporada (índice 5), G = grid despedida (índice 6), H = última corrida (índice 7)
                        // J = status (índice 9), K = data estreia (índice 10), L = data saída (índice 11)
                        const dadosHistoria = {
                            primeiraTemporada: (match[2] || '').trim(),
                            gridEntrada: (match[3] || '').trim(),
                            primeiraCorrida: (match[4] || '').trim(),
                            ultimaTemporada: (match[5] || '').trim(),
                            gridDespedida: (match[6] || '').trim(),
                            ultimaCorrida: (match[7] || '').trim(),
                            status: statusValue,
                            dataEstreia: (match[10] || '').trim(),
                            dataSaida: (match[11] || '').trim()
                        };
                        
                        console.log('📚 Dados históricos encontrados:', dadosHistoria);
                        setHistoriaPiloto(dadosHistoria);
                    } else {
                        console.warn('⚠️ Piloto não encontrado na planilha para:', nomePiloto);
                        console.warn('📋 Total de linhas na planilha:', rows.length);
                        console.warn('🔍 Nome procurado (normalizado):', nomeNormalizado);
                        setCodIdml(null);
                        setStatusPiloto('ATIVO'); // Padrão se não encontrou
                        setHistoriaPiloto(null);
                    }
                },
                error: (error) => {
                    console.error('❌ Erro ao parsear planilha Pilotos PR:', error);
                }
            });
        } catch (err) {
            console.error('❌ Erro ao buscar COD IDML:', err);
        }
    };

    useEffect(() => {
        // Modo narrador: pular toda verificação de sessão e buscar diretamente
        if (pilotoEmailProp) {
            console.log('🎙️ Modo narrador ativado para:', pilotoEmailProp);
            setLoadingAuth(false);
            return;
        }

        // Verificar se é ex-piloto via sessionStorage
        const exPilotoSession = sessionStorage.getItem('ex_piloto_session');
        if (exPilotoSession) {
            try {
                const exPilotoData = JSON.parse(exPilotoSession);
                // Verificar se a sessão não expirou (24 horas)
                if (Date.now() - exPilotoData.timestamp < 24 * 60 * 60 * 1000) {
                    console.log('✅ Sessão de ex-piloto encontrada:', exPilotoData.email);
                    // Buscar dados do ex-piloto no Supabase
                    supabase.from('pilotos')
                        .select('*')
                        .eq('email', exPilotoData.email)
                        .eq('tipo_piloto', 'ex-piloto')
                        .single()
                        .then(({ data, error }) => {
                            if (!error && data && data.status === 'ativo') {
                                setProfile(data);
                                setSession({ user: { email: data.email } }); // Sessão mock para ex-piloto
                                buscarCodIdml(data.nome, data.email);
                                setLoadingAuth(false);
                                // Ex-piloto logado, não redirecionar
                                return;
                            } else {
                                // Sessão inválida ou piloto não aprovado
                                sessionStorage.removeItem('ex_piloto_session');
                                setLoadingAuth(false);
                                navigate('/dashboard/escolher-tipo');
                                return;
                            }
                        });
                    return; // Não continuar com verificação de sessão normal
                } else {
                    // Sessão expirada
                    sessionStorage.removeItem('ex_piloto_session');
                }
            } catch (err) {
                console.error('Erro ao parsear sessão ex-piloto:', err);
                sessionStorage.removeItem('ex_piloto_session');
            }
        }

        // Verificar sessão inicial (pilotos ativos)
        const checkAuth = async () => {
            try {
                console.log('🔍 Dashboard - Iniciando verificação de autenticação...');
                console.log('📱 Informações do dispositivo:', deviceInfo);
                console.log('🌐 URL atual:', window.location.href);
                
                // Primeiro, tentar recuperar sessão do localStorage
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('❌ Erro ao verificar sessão:', error);
                    setLoadingAuth(false);
                    navigate('/dashboard/escolher-tipo');
                    return;
                }
                
                console.log('🔍 Dashboard - Sessão inicial:', session ? 'Encontrada' : 'Não encontrada');
                if (session?.user?.email) {
                    console.log('📧 Email da sessão:', session.user.email);
                }
                setSession(session);
                
                if (!session) {
                    console.log('⚠️ Nenhuma sessão encontrada. Redirecionando para escolha de tipo...');
                    setLoadingAuth(false);
                    navigate('/dashboard/escolher-tipo');
                    return;
                }

                // Se tem sessão, verificar 2FA usando detecção de dispositivo
                const has2FA = is2FAValidatedForDevice(session.user?.email);
                console.log('🔐 Verificação 2FA:', {
                    email: session.user?.email,
                    has2FA,
                    deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop',
                    deviceInfo
                });
                
                if (!has2FA) {
                    const deviceType = deviceInfo.isMobile ? 'mobile' : 'desktop';
                    console.log(`⚠️ Sessão ativa mas 2FA não validado no ${deviceType}. Redirecionando para escolha de tipo...`);
                    setLoadingAuth(false);
                    navigate('/dashboard/escolher-tipo');
                    return;
                }

                // Se tem sessão E 2FA validado, continuar no dashboard (não redirecionar)
                console.log('✅ Sessão válida e 2FA validado. Continuando no dashboard...');
                setLoadingAuth(false);
            } catch (err) {
                console.error('❌ Erro ao verificar autenticação:', err);
                setLoadingAuth(false);
                navigate('/dashboard/escolher-tipo');
            }
        };
        
        checkAuth();
        
        // Listener para mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Dashboard - Auth state changed:', event, session ? 'Sessão ativa' : 'Sem sessão');
            setSession(session);
            
            if (!session && event === 'SIGNED_OUT') {
                console.log('🚪 Usuário deslogado. Redirecionando para escolha de tipo...');
                // Limpar flag de 2FA ao fazer logout (tanto PC quanto mobile)
                const previousSession = await supabase.auth.getSession();
                if (previousSession?.data?.session?.user?.email) {
                    clearAll2FAForEmail(previousSession.data.session.user.email);
                }
                setLoadingAuth(false);
                navigate('/dashboard/escolher-tipo');
            } else if (session && event === 'TOKEN_REFRESHED') {
                console.log('🔄 Token renovado automaticamente - mantendo usuário logado');
                // Token foi renovado, verificar 2FA e manter logado
                const has2FA = is2FAValidatedForDevice(session.user?.email);
                if (has2FA) {
                    const deviceType = deviceInfo.isMobile ? 'mobile' : 'desktop';
                    console.log(`✅ Token renovado e 2FA válido no ${deviceType} - mantendo sessão ativa`);
                    setLoadingAuth(false);
                } else {
                    console.log('⚠️ Token renovado mas 2FA não validado. Redirecionando...');
                    setLoadingAuth(false);
                    navigate('/dashboard/escolher-tipo');
                }
            } else if (session) {
                console.log('✅ Sessão ativa no Dashboard');
                const has2FA = is2FAValidatedForDevice(session.user?.email);
                if (!has2FA) {
                    const deviceType = deviceInfo.isMobile ? 'mobile' : 'desktop';
                    console.log(`⚠️ Sessão ativa mas 2FA não validado no ${deviceType}. Redirecionando para escolha de tipo...`);
                    setLoadingAuth(false);
                    navigate('/dashboard/escolher-tipo');
                } else {
                    // Sessão válida e 2FA ok - manter logado
                    setLoadingAuth(false);
                }
            }
        });
        
        return () => subscription.unsubscribe();
    }, [navigate, pilotoEmailProp]);

    useEffect(() => {
        // Modo narrador: usar email fornecido diretamente
        const emailParaBuscar = pilotoEmailProp || session?.user?.email;
        if (!emailParaBuscar) return;
        
        let isMounted = true;
        console.log('🔍 Buscando piloto na tabela pilotos para:', emailParaBuscar);
        setLoadingAuth(true);
        
        supabase.from('pilotos').select('*').eq('email', emailParaBuscar.toLowerCase()).single()
            .then(({ data, error }) => {
                if (!isMounted) return;
                
                if (error) {
                    console.error('❌ Erro ao buscar piloto:', error);
                    // Se o erro for "not found", pode ser que o piloto ainda não foi salvo
                    if (error.code === 'PGRST116') {
                        console.log('⚠️ Piloto não encontrado no banco ainda. Aguardando...');
                        // Aguardar 2 segundos e tentar novamente (apenas uma vez)
                        setTimeout(() => {
                            if (!isMounted) return;
                            const emailRetry = pilotoEmailProp || session?.user?.email;
                            if (!emailRetry) return;
                            supabase.from('pilotos').select('*').eq('email', emailRetry.toLowerCase()).single()
                                .then(({ data: retryData, error: retryError }) => {
                                    if (!isMounted) return;
                                    if (retryData) {
                                        console.log('✅ Piloto encontrado na segunda tentativa:', retryData);
                                        setProfile(retryData);
                                    } else {
                                        console.log('⚠️ Piloto ainda não encontrado após retry');
                                    }
                                    setLoadingAuth(false);
                                });
                        }, 2000);
                        return;
                    }
                    setLoadingAuth(false);
                    return;
                }
                
                if (data) {
                    console.log('✅ Piloto encontrado:', data);
                    setProfile(data);
                    // Buscar COD IDML (primeiro no Supabase, depois na planilha se necessário)
                    buscarCodIdml(data.nome, data.email);
                    // O Login.jsx já garante que o piloto validou o código antes de redirecionar aqui
                    // Então não precisamos verificar WhatsApp novamente
                } else {
                    console.log('⚠️ Piloto não encontrado no banco. Redirecionando para escolha de tipo...');
                    navigate('/dashboard/escolher-tipo');
                }
                
                setLoadingAuth(false);
            });
        
        return () => {
            isMounted = false;
        };
    }, [session?.user?.email, pilotoEmailProp]); // Incluído pilotoEmailProp para modo narrador

    // Buscar acusações pendentes
    useEffect(() => {
        const buscarAcusacoesPendentes = async () => {
            if (!profile?.nome) return;
            
            try {
                const { data, error } = await supabase
                    .from('notificacoes_admin')
                    .select('dados')
                    .eq('tipo', 'nova_acusacao');
                
                if (error) {
                    console.error('Erro ao buscar acusações:', error);
                    return;
                }
                
                const acusacoesSemDefesa = (data || []).filter(notif => {
                    const dados = notif.dados || {};
                    const acusado = dados.acusado || {};
                    const temDefesa = dados.defesa != null;
                    return acusado.nome?.toUpperCase() === profile.nome?.toUpperCase() && !temDefesa;
                });
                
                setAcusacoesPendentes(acusacoesSemDefesa.length);
            } catch (err) {
                console.error('Erro:', err);
            }
        };
        
        buscarAcusacoesPendentes();
    }, [profile]);

    // Buscar propostas e contratos do piloto
    useEffect(() => {
        const buscarPropostas = async () => {
            if (!profile?.id) {
                console.log('⚠️ Profile não encontrado. Não é possível buscar propostas.');
                return;
            }
            
            // Resolver COD IDML do piloto (robusto):
            // 1) profile.cod_idml (já vem do select * em pilotos)
            // 2) estado codIdml (planilha Pilotos PR)
            // 3) buscar pilotos por email (mais confiável que por id em casos de dados inconsistentes)
            // 4) fallback (último caso): tentar inferir pelo nome na tabela draft_pilotos (nome + season)
            let pilotCodIdml = profile?.cod_idml || codIdml;
            const emailPiloto = (profile?.email || session?.user?.email || '').toLowerCase().trim();
            
            console.log('🔍 [PROPOSTAS] Resolvendo cod_idml:', {
                profile_cod_idml: profile?.cod_idml,
                state_codIdml: codIdml,
                profile_email: profile?.email,
                session_email: session?.user?.email
            });
            
            if (!pilotCodIdml && emailPiloto) {
                console.log('🔍 [PROPOSTAS] cod_idml ausente. Buscando em pilotos por email:', emailPiloto);
                const { data: pilotoByEmail, error: pilotoByEmailError } = await supabase
                    .from('pilotos')
                    .select('cod_idml')
                    .eq('email', emailPiloto)
                    .maybeSingle();
                
                if (pilotoByEmailError && pilotoByEmailError.code !== 'PGRST116') {
                    console.error('❌ [PROPOSTAS] Erro ao buscar cod_idml por email:', pilotoByEmailError);
                } else if (pilotoByEmail?.cod_idml) {
                    pilotCodIdml = pilotoByEmail.cod_idml;
                    console.log('✅ [PROPOSTAS] cod_idml encontrado em pilotos por email:', pilotCodIdml);
                    if (!codIdml) setCodIdml(pilotCodIdml);
                }
            }
            
            if (!pilotCodIdml && profile?.nome) {
                // Observação: draft_pilotos não tem email; usamos nome como fallback.
                console.log('🔍 [PROPOSTAS] cod_idml ainda ausente. Tentando fallback em draft_pilotos por nome:', profile.nome);
                const { data: draftMatch, error: draftErr } = await supabase
                    .from('draft_pilotos')
                    .select('cod_idml, season')
                    .ilike('nome', profile.nome)
                    .eq('season', 20)
                    .limit(1)
                    .maybeSingle();
                
                if (draftErr && draftErr.code !== 'PGRST116') {
                    console.error('❌ [PROPOSTAS] Erro ao buscar cod_idml em draft_pilotos:', draftErr);
                } else if (draftMatch?.cod_idml) {
                    pilotCodIdml = draftMatch.cod_idml;
                    console.log('✅ [PROPOSTAS] cod_idml encontrado em draft_pilotos:', pilotCodIdml);
                    if (!codIdml) setCodIdml(pilotCodIdml);
                }
            }
            
            if (pilotCodIdml) {
                console.log('✅ [PROPOSTAS] cod_idml final resolvido:', pilotCodIdml);
            }
            
            if (!pilotCodIdml) {
                console.log('⚠️ [PROPOSTAS] Piloto não possui cod_idml. Propostas não serão buscadas.');
                setPropostas([]);
                setContratoFechado(null);
                return;
            }
            
            try {
                // Normalizar cod_idml (trim + uppercase) para consistência com AdminDraftImport
                const codIdmlNormalizado = (pilotCodIdml || '').trim().toUpperCase();
                
                if (!codIdmlNormalizado) {
                    console.error('❌ [PROPOSTAS] Cod_idml normalizado está vazio!');
                    setPropostas([]);
                    setContratoFechado(null);
                    return;
                }
                
                // Buscar propostas (interesses com status OFFER_SENT) usando cod_idml
                // Nota: A tabela 'interests' pode não existir ainda, então tratamos o erro graciosamente
                console.log('🔍 [PROPOSTAS] Buscando propostas para cod_idml normalizado:', codIdmlNormalizado);
                
                // Buscar propostas sem filtrar por grid
                // Primeiro, tentar com o cod_idml normalizado
                let { data: propostasData, error: propostasError } = await supabase
                    .from('interests')
                    .select(`
                        *,
                        equipes (*)
                    `)
                    .eq('pilot_cod_idml', codIdmlNormalizado)
                    .eq('status', 'OFFER_SENT')
                    .order('created_at', { ascending: false });
                
                console.log('📊 [PROPOSTAS] Primeira tentativa com cod_idml normalizado:', {
                    cod_idml_usado: codIdmlNormalizado,
                    encontradas: propostasData?.length || 0,
                    error: propostasError
                });
                
                // Se não encontrar nada, tentar buscar com ilike (case-insensitive) e também buscar todas para debug
                if (!propostasData || propostasData.length === 0) {
                    console.log('⚠️ [PROPOSTAS] Nenhuma proposta encontrada com busca exata. Tentando busca case-insensitive...');
                    
                    // Tentar busca case-insensitive
                    const { data: propostasDataIlike, error: propostasErrorIlike } = await supabase
                        .from('interests')
                        .select(`
                            *,
                            equipes (*)
                        `)
                        .ilike('pilot_cod_idml', codIdmlNormalizado)
                        .eq('status', 'OFFER_SENT')
                        .order('created_at', { ascending: false });
                    
                    if (!propostasErrorIlike && propostasDataIlike && propostasDataIlike.length > 0) {
                        console.log('✅ [PROPOSTAS] Propostas encontradas com busca case-insensitive!');
                        propostasData = propostasDataIlike;
                        propostasError = propostasErrorIlike;
                    } else {
                        // Se ainda não encontrar, buscar todas as propostas para debug
                        console.log('⚠️ [PROPOSTAS] Nenhuma proposta encontrada. Buscando todas as propostas para debug...');
                        const { data: todasPropostasDebug, error: debugError } = await supabase
                            .from('interests')
                            .select(`
                                pilot_cod_idml,
                                status,
                                grid,
                                season
                            `)
                            .eq('status', 'OFFER_SENT')
                            .limit(50);
                        
                        if (!debugError && todasPropostasDebug) {
                            console.log('📋 [PROPOSTAS] Todas as propostas OFFER_SENT no banco:', todasPropostasDebug);
                            const propostasComMesmoCod = todasPropostasDebug.filter(p => {
                                const codBanco = (p.pilot_cod_idml || '').trim();
                                const codNormalizado = codIdmlNormalizado.trim();
                                const codOriginal = (pilotCodIdml || '').trim();
                                return codBanco === codNormalizado || 
                                       codBanco === codOriginal ||
                                       codBanco.toLowerCase() === codNormalizado.toLowerCase();
                            });
                            console.log('🔍 [PROPOSTAS] Propostas com cod_idml similar:', propostasComMesmoCod);
                            
                            // Se encontrou propostas similares, tentar buscar novamente com o cod_idml exato do banco
                            if (propostasComMesmoCod.length > 0) {
                                const codIdmlDoBanco = propostasComMesmoCod[0].pilot_cod_idml;
                                console.log('🔄 [PROPOSTAS] Tentando buscar com cod_idml exato do banco:', codIdmlDoBanco);
                                const { data: propostasDataExato, error: propostasErrorExato } = await supabase
                                    .from('interests')
                                    .select(`
                                        *,
                                        equipes (*)
                                    `)
                                    .eq('pilot_cod_idml', codIdmlDoBanco)
                                    .eq('status', 'OFFER_SENT')
                                    .order('created_at', { ascending: false });
                                
                                if (!propostasErrorExato && propostasDataExato && propostasDataExato.length > 0) {
                                    console.log('✅ [PROPOSTAS] Propostas encontradas com cod_idml do banco!');
                                    propostasData = propostasDataExato;
                                    propostasError = propostasErrorExato;
                                }
                            }
                        }
                    }
                }
                
                console.log('📊 [PROPOSTAS] Resultado final da query:', {
                    cod_idml_usado: codIdmlNormalizado,
                    cod_idml_original: pilotCodIdml,
                    data: propostasData,
                    error: propostasError,
                    count: propostasData?.length || 0
                });
                
                if (propostasError) {
                    // Se a tabela não existir, apenas logamos e continuamos
                    if (propostasError.code === 'PGRST116' || propostasError.message?.includes('does not exist')) {
                        console.log('⚠️ [PROPOSTAS] Tabela interests ainda não existe. Sistema de propostas será ativado quando a tabela for criada.');
                    } else {
                        console.error('❌ [PROPOSTAS] Erro ao buscar propostas:', propostasError);
                    }
                    setPropostas([]);
                } else {
                    // Mostrar TODAS as propostas, independente do grid
                    // Um piloto pode receber propostas de qualquer grid
                    const todasPropostas = propostasData || [];
                    
                    console.log('📨 [PROPOSTAS] Propostas encontradas (total):', todasPropostas.length);
                    
                    if (todasPropostas.length > 0) {
                        console.log('📋 [PROPOSTAS] Detalhes das propostas:', todasPropostas.map(p => ({
                            id: p.id,
                            team: p.equipes?.name,
                            pilot_cod_idml: p.pilot_cod_idml,
                            status: p.status,
                            grid: p.grid || 'não definido',
                            season: p.season
                        })));
                        
                        // Atualizar propostas
                        setPropostas(todasPropostas);
                        
                        // Se houver novas propostas e o modal não estiver aberto, atualizar propostaSelecionada
                        if (!showPropostaModal) {
                            setPropostaSelecionada(todasPropostas);
                        }
                    } else {
                        console.log('⚠️ [PROPOSTAS] Nenhuma proposta encontrada para cod_idml:', codIdmlNormalizado);
                        // Atualizar propostas mesmo se o array estiver vazio (para limpar propostas antigas)
                        setPropostas([]);
                    }
                }

                // Buscar contrato fechado usando cod_idml (usar o normalizado)
                const { data: contratoData, error: contratoError } = await supabase
                    .from('contracts')
                    .select(`
                        *,
                        equipes (*)
                    `)
                    .eq('pilot_cod_idml', codIdmlNormalizado)
                    .eq('season', 20)
                    .maybeSingle();

                if (contratoError) {
                    // Se a tabela não existir, apenas logamos e continuamos
                    if (contratoError.code === 'PGRST116' || contratoError.message?.includes('does not exist')) {
                        console.log('Tabela contracts ainda não existe. Sistema de contratos será ativado quando a tabela for criada.');
                    } else {
                        console.error('Erro ao buscar contrato:', contratoError);
                    }
                    setContratoFechado(null);
                } else {
                    // Garantir que só consideramos "contrato fechado" quando houver um registro válido
                    if (contratoData?.id) {
                        console.log('✅ [PROPOSTAS] Contrato encontrado:', {
                            id: contratoData.id,
                            pilot_cod_idml: contratoData.pilot_cod_idml,
                            team: contratoData.equipes?.name,
                            grid: contratoData.grid,
                            season: contratoData.season
                        });
                        setContratoFechado(contratoData);
                    } else {
                        setContratoFechado(null);
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar propostas/contratos:', error);
                setPropostas([]);
                setContratoFechado(null);
            }
        };

        // Buscar imediatamente ao montar ou quando profile mudar
        buscarPropostas();

        // Configurar polling para atualizar propostas a cada 5 segundos (reduzido para atualizar mais rapidamente)
        const intervalId = setInterval(() => {
            buscarPropostas();
        }, 5000); // 5 segundos

        // Limpar o intervalo quando o componente desmontar ou profile mudar
        return () => {
            clearInterval(intervalId);
        };
    }, [profile?.id, profile?.cod_idml, codIdml, session?.user?.email]);

    // Atualizar ref de propostas sempre que mudarem para o cronômetro usar sem reiniciar o efeito
    useEffect(() => {
        propostasRef.current = propostas || [];
    }, [propostas]);

    // Cronômetro de 10 horas estável
    useEffect(() => {
        console.log('⏲️ Cronômetro iniciado');
        const DEZ_HORAS_EM_MS = 10 * 60 * 60 * 1000;

        const timer = setInterval(() => {
            const pendentes = propostasRef.current?.filter(p => p.status === 'OFFER_SENT') || [];
            
            if (pendentes.length === 0) {
                // Não usamos setTempoRestante(null) aqui para evitar loops se já for null
                // Mas precisamos zerar se as propostas desaparecerem
                setTempoRestante(prev => prev === null ? null : null);
                return;
            }

            const maisAntiga = pendentes.reduce((antiga, atual) => {
                const dA = new Date(antiga.created_at || antiga.createdAt || 0);
                const dU = new Date(atual.created_at || atual.createdAt || 0);
                return dU < dA ? atual : antiga;
            });

            // Tratamento robusto de data para evitar deslocamento de fuso horário (comum em UTC-3 Brasil)
            let rawDate = maisAntiga.created_at || maisAntiga.createdAt;
            
            // Forçamos a interpretação como UTC para garantir consistência entre banco e cliente
            // Se a data vier do Supabase como string ISO, garantimos que o 'Z' (UTC) esteja presente
            let dataInicio;
            if (typeof rawDate === 'string') {
                let formattedDate = rawDate;
                if (!formattedDate.includes('Z') && !formattedDate.includes('+')) {
                    formattedDate = formattedDate.replace(' ', 'T') + 'Z';
                }
                dataInicio = new Date(formattedDate);
            } else {
                dataInicio = new Date(rawDate);
            }
            
            if (isNaN(dataInicio.getTime())) return;

            const agora = new Date();
            
            // Calculamos a diferença em milissegundos
            // Se dataInicio estiver no "futuro" devido a fuso horário, limitamos diffMs a no mínimo 0
            const diffMs = Math.max(0, agora.getTime() - dataInicio.getTime());
            
            // O tempo restante é 10 horas menos o que já passou
            // Se o cálculo resultar em algo maior que 10 horas (devido a fusos), limitamos ao máximo de 10h
            const diff = Math.min(DEZ_HORAS_EM_MS, DEZ_HORAS_EM_MS - diffMs);

            if (diff <= 0) {
                setTempoRestante(prev => {
                    if (prev && prev.horas === 0 && prev.minutos === 0 && prev.segundos === 0) return prev;
                    return { horas: 0, minutos: 0, segundos: 0 };
                });
                
                // Lógica de cancelamento
                const expiradas = pendentes.filter(p => {
                    let rD = p.created_at || p.createdAt || 0;
                    let dP;
                    if (typeof rD === 'string') {
                        if (!rD.includes('Z') && !rD.includes('+')) {
                            rD = rD.replace(' ', 'T') + 'Z';
                        }
                        dP = new Date(rD);
                    } else {
                        dP = new Date(rD);
                    }
                    return (new Date().getTime() - dP.getTime()) >= DEZ_HORAS_EM_MS;
                });

                if (expiradas.length > 0 && cancelarPropostasExpiradasRef.current) {
                    cancelarPropostasExpiradasRef.current(expiradas);
                }
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            // Só atualiza se mudar algum valor (para reduzir re-renders desnecessários)
            setTempoRestante(prev => {
                if (prev && prev.horas === h && prev.minutos === m && prev.segundos === s) return prev;
                return { horas: h, minutos: m, segundos: s };
            });
        }, 1000);

        return () => {
            console.log('⏲️ Cronômetro parado');
            clearInterval(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Roda apenas uma vez no mount

    // Fechar modal automaticamente quando não houver mais propostas (quando admin retirar propostas)
    useEffect(() => {
        if (showPropostaModal && (propostas.length === 0 || !!contratoFechado?.id)) {
            setShowPropostaModal(false);
            setPropostaSelecionada(null);
        }
    }, [propostas, contratoFechado, showPropostaModal]);

    // Processamento - usar ref para evitar loops
    const processedRef = useRef(false);
    const lastPilotNameRef = useRef(null);
    
    // Resetar refs quando o piloto mudar
    useEffect(() => {
        if (profile?.nome && lastPilotNameRef.current !== profile.nome) {
            processedRef.current = false;
        }
    }, [profile?.nome]);
    
    useEffect(() => {
        // Só processar se tiver todos os dados necessários
        if (!profile?.nome || loadingData || !rawCarreira || !rawLight || rawCarreira.length === 0 || rawLight.length === 0) {
            return;
        }
        
        const pilotName = profile.nome;
        
        // Evitar reprocessar se já foi processado para o mesmo piloto
        if (processedRef.current && lastPilotNameRef.current === pilotName) {
            return;
        }
        
        console.log('✅ Processando estatísticas para:', pilotName);
        
        const calcStats = (data, gridType) => {
            let s = { races:0, wins:0, poles:0, podiums:0, best:999, seasons: new Set(), currentPoints: 0, racesList: [] };
            const dateMap = gridType === 'light' ? (datesLight || {}) : (datesCarreira || {});
            data.forEach(row => {
                if (row[9] === pilotName) {
                    const season = parseInt(row[3]);
                    const round = parseInt(row[4]);
                    if (!isNaN(season) && !isNaN(round) && dateMap) {
                        const dateStr = dateMap[`${season}-${round}`];
                        if (dateStr && isFutureDay(dateStr)) return;
                    }
                    s.races++; s.seasons.add(row[3]);
                    const q = parseInt(row[6]); const r = parseInt(row[8]);
                    if (q===1) s.poles++; if (r===1) s.wins++; if (r<=3) s.podiums++;
                    if (r>0 && r<s.best) s.best = r;
                    let p = parseFloat((row[15]||'0').replace(',', '.'));
                    if(!isNaN(p)) s.currentPoints += p;
                    // Incluir posição de chegada e pontos
                    s.racesList.push({ 
                        round: parseInt(row[4]), 
                        points: p,
                        position: r > 0 ? r : null // Posição de chegada (row[8])
                    });
                }
            });
            return s;
        };

        const sCarreira = calcStats(rawCarreira, 'carreira');
        const sLight = calcStats(rawLight, 'light');

        let maxS = 0, grid='carreira', team='Sem Equipe';
        const check = (row, g) => {
            if(row[9]===pilotName) {
                const s = parseInt(row[3]);
                if (s > maxS || (s === maxS && g === 'carreira')) { maxS = s; grid = g; team = row[10]; }
            }
        };
        rawCarreira.forEach(r => check(r, 'carreira'));
        rawLight.forEach(r => check(r, 'light'));

        // Filtrar dados apenas da temporada mais recente para o gráfico
        const targetGridData = grid === 'carreira' ? rawCarreira : rawLight;
        const targetDates = grid === 'carreira' ? (datesCarreira || {}) : (datesLight || {});
        const currentSeasonRaces = targetGridData
            .filter(row => row[9] === pilotName && parseInt(row[3]) === maxS)
            .map(row => {
                const roundNum = parseInt(row[4]);
                if (!isNaN(roundNum)) {
                    const dateStr = targetDates[`${maxS}-${roundNum}`];
                    if (dateStr && isFutureDay(dateStr)) return null;
                }
                const gpName = (row[5] || '').trim();
                const normalizedGP = gpName ? gpName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() : '';
                const trackData = tracks[normalizedGP] || {};
                
                return {
                    round: parseInt(row[4]),
                    position: parseInt(row[8]) > 0 ? parseInt(row[8]) : null,
                    gpName: gpName,
                    flag: trackData.flag || null,
                    countryAbbr: getCountryAbbreviation(gpName)
                };
            })
            .filter(Boolean)
            .filter(r => r.position !== null) // Filtrar apenas corridas com posição válida
            .sort((a, b) => a.round - b.round) // Ordenar por round
            .map(r => ({
                name: `R${r.round}`,
                position: r.position,
                gpName: r.gpName,
                flag: r.flag,
                countryAbbr: r.countryAbbr
            }));

        const chartData = currentSeasonRaces;

        console.log('📊 Estatísticas calculadas:', { currentGrid: grid, currentSeason: maxS, currentTeam: team });
        setDashData({ currentGrid: grid, currentSeason: maxS, currentTeam: team, statsCarreira: sCarreira, statsLight: sLight, chartData });
        
        // Calcular estatísticas adicionais para a bio
        const currentSeasonGlobal = (Array.isArray(seasons) && seasons.length > 0) ? seasons[0] : 20;
        const stats = calcularEstatisticasAdicionais(pilotName, rawCarreira, rawLight, datesCarreira || {}, datesLight || {}, currentSeasonGlobal);
        setStatsAdicionais(stats);
        console.log('📈 Estatísticas adicionais calculadas:', stats);
        
        processedRef.current = true;
        lastPilotNameRef.current = pilotName;
    }, [profile?.nome, loadingData, rawCarreira?.length, rawLight?.length, seasons?.length, !!datesCarreira, !!datesLight]); // Usar apenas length para detectar quando dados são carregados

    const handleLogout = async () => {
        // Aviso de confirmação antes de fazer logout
        const confirmMessage = `⚠️ ATENÇÃO: SAIR DO SISTEMA\n\nAo clicar em "Sair", você estará fazendo logout do sistema.\n\nVocê precisará se cadastrar novamente para acessar o painel.\n\nTem certeza que deseja sair?`;
        
        if (!window.confirm(confirmMessage)) {
            console.log('🚪 Logout cancelado pelo usuário');
            return; // Usuário cancelou, não fazer logout
        }

        try {
            console.log('🚪 Fazendo logout...');
            // Limpar flag local de 2FA (tanto PC quanto mobile) para exigir validação no próximo login
            if (session?.user?.email) {
                clearAll2FAForEmail(session.user.email);
            }
            
            // Limpar sessão de ex-piloto se existir
            sessionStorage.removeItem('ex_piloto_session');
            
            await supabase.auth.signOut();
            // Limpar qualquer cache/localStorage se necessário
            // Redirecionar para escolha de tipo após logout
            navigate('/dashboard/escolher-tipo');
            // Recarregar a página para garantir que tudo seja limpo
            window.location.reload();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            // Mesmo com erro, tentar redirecionar e recarregar
            navigate('/dashboard/escolher-tipo');
            window.location.reload();
        }
    };

    if (loadingAuth || loadingData) return <div style={{color:'white', padding:'100px', textAlign:'center'}}>Carregando...</div>;
    if (!session) return null;

    // STATUS PENDENTE - simplificar verificação
    if (profile?.status === 'pending') {
        return (
            <div style={containerStyle}>
                <div style={{fontSize:'4rem', marginBottom:'20px'}}>⏳</div>
                <h2 style={{color:'var(--highlight-cyan)', marginBottom:'10px'}}>SOLICITAÇÃO EM ANÁLISE</h2>
                <p style={{color:'#CBD5E1', lineHeight:'1.6'}}>Seus dados foram enviados para a diretoria.<br/>Aguarde a liberação.</p>
                <button onClick={handleLogout} className="btn-outline" style={{marginTop:'20px', borderColor:'#EF4444', color:'#EF4444'}}>SAIR</button>
            </div>
        );
    }

    if (!profile || !profile.nome) {
        console.log('⚠️ Sem profile ou nome, mostrando Onboarding');
        return <div style={{paddingTop:'70px'}}><Onboarding session={session} onComplete={(newP) => setProfile(newP)} /></div>;
    }
    
    if (!dashData) {
        console.log('⏳ Aguardando dashData...');
        return <div style={{color:'white', padding:'50px', textAlign:'center'}}>Bem-vindo! Carregando estatísticas...</div>;
    }

    console.log('✅ Renderizando Dashboard completo');

    // Verificar se é ex-piloto
    const isExPiloto = profile?.tipo_piloto === 'ex-piloto' || profile?.status === 'inativo';
    const isReadOnly = isReadOnlyProp !== null ? isReadOnlyProp : isExPiloto; // Modo narrador ou ex-pilotos têm acesso somente leitura

    // RENDERIZAÇÃO DO PAINEL
    // Se houver contrato fechado, o dashboard deve refletir a equipe do contrato (cores + marca d'água).
    const effectiveTeamName = (contratoFechado?.equipes?.name || dashData.currentTeam);
    const teamColor = getTeamColor(effectiveTeamName);
    const teamGradient = getTeamGradient(effectiveTeamName);
    const teamLogo = getTeamLogo(effectiveTeamName);
    const teamWallpaper = getTeamWallpaper(effectiveTeamName);
    const totalWins = dashData.statsCarreira.wins + dashData.statsLight.wins;
    const totalPodiums = dashData.statsCarreira.podiums + dashData.statsLight.podiums;
    const totalSeasons = dashData.statsCarreira.seasons.size + dashData.statsLight.seasons.size;

    // Função para determinar o tier da equipe
    const getTeamTier = (teamName) => {
        if (!teamName) return 'bronze';
        const t = teamName.toLowerCase();
        // Gold tier: McLaren, Ferrari, Red Bull Racing, Mercedes
        if (t.includes('mclaren') || t.includes('ferrari') || (t.includes('red bull') && !t.includes('racing bulls')) || t.includes('mercedes')) {
            return 'gold';
        }
        // Silver tier: Aston Martin, Alpine, Racing Bulls
        if (t.includes('aston') || t.includes('alpine') || (t.includes('racing') && t.includes('bulls'))) {
            return 'silver';
        }
        // Bronze tier: Williams, Haas, Sauber
        return 'bronze';
    };

    // Função para obter o ranking do piloto (simulado - pode ser melhorado com dados reais)
    const getPilotRanking = () => {
        // Por enquanto, vamos usar uma estimativa baseada nos pontos ou PR
        // Isso pode ser melhorado para buscar dados reais do Power Ranking
        if (dashData?.statsCarreira?.currentPoints) {
            const points = dashData.statsCarreira.currentPoints;
            if (points > 200) return 'top3';
            if (points > 150) return 'top5';
            if (points > 100) return 'top10';
            return 'midfield';
        }
        return 'midfield';
    };

    // Função para gerar texto do contrato personalizado por equipe
    const generateContractText = (team, pilotRanking) => {
        const tier = getTeamTier(team.name || team);
        const teamName = (team.name || team).toLowerCase();
        
        let objetivos = [];
        let expectativas = [];
        let introducao = '';
        
        // Personalização por equipe específica
        if (teamName.includes('ferrari')) {
            introducao = 'A Scuderia Ferrari, com sua rica história italiana e legado de grandes campeões como Michael Schumacher, busca um piloto que honre o Cavallino Rampante. Nossa torcida apaixonada espera por resultados que reflitam a tradição de excelência da equipe mais icônica da Fórmula 1.';
            objetivos = [
                'Lutar pelo título de pilotos e construtores, honrando a tradição vermelha',
                'Conquistar pelo menos 3 vitórias durante a temporada',
                'Conquistar pelo menos 3 pódios durante a temporada',
                'Terminar a temporada entre os 2 primeiros do campeonato',
                'Representar com excelência a marca Ferrari e seus valores italianos'
            ];
            expectativas = [
                'Excelência técnica e paixão pela vitória em cada corrida',
                'Liderança que inspire toda a equipe e a tifosi mundial',
                'Dedicação total ao desenvolvimento do carro e estratégias',
                'Compromisso com a tradição de grandeza da Scuderia Ferrari'
            ];
        } else if (teamName.includes('mclaren')) {
            introducao = 'A McLaren, casa de lendas como Ayrton Senna e Alain Prost, busca um piloto que continue essa tradição de grandeza. Com nossa história de rivalidades épicas e títulos memoráveis, esperamos um piloto que se comprometa com a excelência técnica e a busca pela vitória.';
            objetivos = [
                'Lutar pelo título de pilotos e construtores, seguindo os passos de Senna e Prost',
                'Conquistar pelo menos 5 vitórias durante a temporada',
                'Conquistar pelo menos 2 pódios durante a temporada',
                'Terminar a temporada entre os 3 primeiros do campeonato',
                'Desenvolver o carro ao longo da temporada para maximizar performance'
            ];
            expectativas = [
                'Excelência técnica e consistência em todas as corridas',
                'Liderança dentro e fora das pistas, honrando a tradição McLaren',
                'Trabalho em equipe para maximizar resultados e desenvolvimento',
                'Compromisso com a inovação e busca constante pela perfeição'
            ];
        } else if (teamName.includes('red bull') && !teamName.includes('racing bulls')) {
            introducao = 'A Red Bull Racing, com títulos conquistados por grandes pilotos como Sebastian Vettel e Max Verstappen, busca um piloto que se alinhe com nossa filosofia de agressividade e busca pela vitória. Nossa equipe valoriza pilotos que não têm medo de ultrapassar limites.';
            objetivos = [
                'Lutar pelo título de pilotos e construtores com determinação',
                'Conquistar pelo menos 3 vitórias durante a temporada',
                'Conquistar pelo menos 3 pódios durante a temporada',
                'Terminar a temporada entre os 3 primeiros do campeonato',
                'Demonstrar agressividade controlada e vontade de vencer'
            ];
            expectativas = [
                'Excelência técnica aliada à ousadia nas decisões de corrida',
                'Liderança que inspire a equipe com determinação e coragem',
                'Trabalho em equipe para maximizar resultados em cada etapa',
                'Compromisso com a filosofia Red Bull de sempre buscar a vitória'
            ];
        } else if (teamName.includes('mercedes')) {
            introducao = 'A Mercedes-AMG Petronas, com sua era de domínio e múltiplos títulos de construtores e pilotos, busca um piloto que continue essa tradição de excelência. Nossa equipe valoriza precisão técnica, consistência e trabalho em equipe.';
            objetivos = [
                'Lutar pelo título de pilotos e construtores com precisão técnica',
                'Conquistar pelo menos 2 vitórias durante a temporada',
                'Conquistar pelo menos 4 pódios durante a temporada',
                'Terminar a temporada entre os 3 primeiros do campeonato',
                'Demonstrar consistência e confiabilidade em todas as corridas'
            ];
            expectativas = [
                'Excelência técnica e precisão em cada decisão de corrida',
                'Liderança baseada em trabalho em equipe e desenvolvimento contínuo',
                'Dedicação total ao desenvolvimento do carro e otimização de estratégias',
                'Compromisso com a cultura de excelência da Mercedes-AMG'
            ];
        } else if (teamName.includes('aston')) {
            introducao = 'A Aston Martin, com sua elegância britânica e busca por resultados consistentes, oferece uma oportunidade única para pilotos que buscam crescer e conquistar pódios. Nossa equipe valoriza desenvolvimento constante e aproveitamento de oportunidades.';
            objetivos = [
                'Conquistar pelo menos 3 pódios durante a temporada',
                'Conquistar pelo menos 2 top 5 durante a temporada',
                'Pontuar na maioria das corridas com consistência',
                'Terminar a temporada entre os 5 primeiros do campeonato',
                'Contribuir para uma posição sólida no campeonato de construtores'
            ];
            expectativas = [
                'Consistência e aproveitamento inteligente de oportunidades',
                'Desenvolvimento constante ao longo da temporada',
                'Trabalho em equipe para melhorar resultados e performance',
                'Foco em maximizar pontos em cada corrida com estratégia'
            ];
        } else if (teamName.includes('alpine')) {
            introducao = 'A Alpine, com sua herança francesa e busca por resultados consistentes, oferece uma oportunidade para pilotos que valorizam desenvolvimento técnico e crescimento constante. Nossa equipe busca aproveitar cada oportunidade para pontuar e subir no grid.';
            objetivos = [
                'Conquistar pelo menos 2 pódios durante a temporada',
                'Conquistar pelo menos 3 top 5 durante a temporada',
                'Pontuar na maioria das corridas com consistência',
                'Terminar a temporada entre os 5 primeiros do campeonato',
                'Contribuir para melhorias constantes no desenvolvimento do carro'
            ];
            expectativas = [
                'Consistência e aproveitamento de oportunidades de pontuação',
                'Desenvolvimento técnico constante ao longo da temporada',
                'Trabalho em equipe para melhorar resultados e performance',
                'Foco em crescimento e maximização de pontos em cada corrida'
            ];
        } else if (teamName.includes('racing') && teamName.includes('bulls')) {
            introducao = 'A Racing Bulls, com sua filosofia de desenvolvimento de talentos e busca por resultados consistentes, oferece uma oportunidade para pilotos que buscam crescer e demonstrar seu potencial. Nossa equipe valoriza desenvolvimento constante e aproveitamento de oportunidades.';
            objetivos = [
                'Conquistar pelo menos 1 pódio durante a temporada',
                'Conquistar pelo menos 2 top 5 durante a temporada',
                'Pontuar em pelo menos 3 corridas adicionais durante a temporada',
                'Terminar corridas de forma consistente e confiável',
                'Contribuir para o desenvolvimento e crescimento da equipe'
            ];
            expectativas = [
                'Consistência e aproveitamento inteligente de oportunidades',
                'Desenvolvimento constante ao longo da temporada',
                'Trabalho em equipe para melhorar resultados e performance',
                'Foco em crescimento e maximização de pontos em cada corrida'
            ];
        } else if (teamName.includes('williams')) {
            introducao = 'A Williams, com sua rica história de títulos e busca por retornar ao topo da Fórmula 1, oferece uma oportunidade única para pilotos que compartilham nossa paixão por superar desafios. Estamos em uma jornada de reconstrução e buscamos um piloto que faça parte dessa história.';
            objetivos = [
                'Conquistar pelo menos 1 pódio durante a temporada',
                'Conquistar pelo menos 2 top 5 durante a temporada',
                'Pontuar em pelo menos 2 corridas adicionais durante a temporada',
                'Terminar corridas de forma consistente e confiável',
                'Contribuir para o retorno da Williams ao topo da Fórmula 1'
            ];
            expectativas = [
                'Aproveitamento máximo de cada oportunidade de pontuação',
                'Consistência e confiabilidade em todas as corridas',
                'Trabalho em equipe para superar limitações e crescer juntos',
                'Compromisso com a jornada de reconstrução da Williams'
            ];
        } else if (teamName.includes('haas')) {
            introducao = 'A Haas F1 Team, com sua abordagem pragmática e busca por resultados consistentes, oferece uma oportunidade para pilotos que valorizam aproveitamento de oportunidades e desenvolvimento constante. Nossa equipe busca maximizar cada chance de pontuação.';
            objetivos = [
                'Conquistar pelo menos 3 top 5 durante a temporada',
                'Pontuar em pelo menos 2 corridas adicionais durante a temporada',
                'Terminar corridas de forma consistente',
                'Desenvolver o carro ao longo da temporada',
                'Contribuir para melhorias na classificação da equipe'
            ];
            expectativas = [
                'Aproveitamento máximo de cada oportunidade de pontuação',
                'Consistência e confiabilidade nas corridas',
                'Trabalho em equipe para superar limitações',
                'Foco em crescimento e desenvolvimento contínuo'
            ];
        } else if (teamName.includes('sauber') || teamName.includes('stake') || teamName.includes('kick')) {
            introducao = 'A Sauber, com sua tradição suíça de precisão e busca por resultados consistentes, oferece uma oportunidade para pilotos que valorizam desenvolvimento técnico e crescimento constante. Nossa equipe busca aproveitar cada oportunidade para melhorar.';
            objetivos = [
                'Conquistar pelo menos 2 top 5 durante a temporada',
                'Pontuar em pelo menos 2 corridas adicionais durante a temporada',
                'Terminar corridas de forma consistente',
                'Desenvolver o carro ao longo da temporada',
                'Contribuir para melhorias na classificação da equipe'
            ];
            expectativas = [
                'Aproveitamento máximo de cada oportunidade de pontuação',
                'Consistência e confiabilidade nas corridas',
                'Trabalho em equipe para superar limitações',
                'Foco em crescimento e desenvolvimento contínuo'
            ];
        } else {
            // Fallback genérico baseado em tier
            if (tier === 'gold') {
                introducao = 'Nossa equipe busca um piloto que se comprometa com a excelência e a busca pelo título. Valorizamos pilotos que demonstrem liderança e dedicação total ao desenvolvimento.';
                objetivos = [
                    'Lutar pelo título de pilotos da Master League F1',
                    'Conquistar o título de construtores',
                    'Buscar vitórias em pelo menos 5 corridas da temporada',
                    'Manter-se no pódio em pelo menos 70% das corridas',
                    'Terminar a temporada entre os 3 primeiros do campeonato'
                ];
                expectativas = [
                    'Excelência técnica e consistência em todas as corridas',
                    'Liderança dentro e fora das pistas',
                    'Trabalho em equipe para maximizar resultados',
                    'Dedicação total ao desenvolvimento do carro e estratégias'
                ];
            } else if (tier === 'silver') {
                introducao = 'Nossa equipe busca um piloto que se comprometa com resultados consistentes e crescimento constante. Valorizamos pilotos que aproveitem oportunidades e contribuam para o desenvolvimento da equipe.';
                objetivos = [
                    'Conquistar pódios regularmente durante a temporada',
                    'Pontuar na maioria das corridas',
                    'Terminar a temporada entre os 5 primeiros do campeonato',
                    'Buscar pelo menos 3 pódios durante a temporada',
                    'Contribuir para uma posição sólida no campeonato de construtores'
                ];
                expectativas = [
                    'Consistência e aproveitamento de oportunidades',
                    'Desenvolvimento constante ao longo da temporada',
                    'Trabalho em equipe para melhorar resultados',
                    'Foco em maximizar pontos em cada corrida'
                ];
            } else {
                introducao = 'Nossa equipe busca um piloto que se comprometa com o desenvolvimento e crescimento. Valorizamos pilotos que aproveitem cada oportunidade e contribuam para o progresso da equipe.';
                objetivos = [
                    'Conquistar pontos regularmente nas corridas',
                    'Buscar pelo menos 3 pódios durante a temporada',
                    'Terminar corridas de forma consistente',
                    'Desenvolver o carro ao longo da temporada',
                    'Contribuir para melhorias na classificação da equipe'
                ];
                expectativas = [
                    'Aproveitamento máximo de cada oportunidade',
                    'Consistência e confiabilidade nas corridas',
                    'Trabalho em equipe para superar limitações',
                    'Foco em crescimento e desenvolvimento contínuo'
                ];
            }
        }

        return {
            introducao,
            objetivos,
            expectativas,
            tier
        };
    };

    return (
        <div className="page-wrapper">
            <div className="dashboard-hero" style={{
                // `teamColor` pode ser CSS var (ex: var(--f1-aston)), então não dá pra concatenar "99/40" como HEX.
                // Usamos overlay em RGBA (válido) + wallpaper da equipe.
                backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.10) 0%, rgba(15,23,42,0.55) 55%, #0F172A 100%), url(${teamWallpaper})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundBlendMode: 'overlay',
                backgroundAttachment: deviceInfo.isMobile ? 'scroll' : 'fixed'
            }}>
                <div className="dashboard-hero-content">
                    <div>
                        <h1 style={{
                            fontSize: deviceInfo.isMobile ? '1.8rem' : '2.5rem', 
                            fontStyle:'italic', 
                            fontWeight:'900', 
                            textTransform:'uppercase', 
                            margin:0, 
                            lineHeight:1
                        }}>MOTORHOME</h1>
                        <div style={{
                            color: 'rgba(255,255,255,0.8)', 
                            fontWeight: '700', 
                            letterSpacing: deviceInfo.isMobile ? '1px' : '2px', 
                            marginTop:'5px', 
                            textTransform:'uppercase', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: deviceInfo.isMobile ? '8px' : '12px',
                            fontSize: deviceInfo.isMobile ? '0.85rem' : '1rem',
                            flexWrap: 'wrap'
                        }}>
                            {teamLogo && <img src={teamLogo} alt="" style={{
                                height: deviceInfo.isMobile ? '28px' : '34px', 
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'
                            }} />}
                            {effectiveTeamName}
                        </div>
                    </div>
                    <div style={{
                        display:'flex', 
                        gap: deviceInfo.isMobile ? '8px' : '10px', 
                        alignItems:'center',
                        flexWrap: 'nowrap'
                    }}>
                        <Link 
                            to="/" 
                            className="btn-outline" 
                            style={{
                                fontSize: deviceInfo.isMobile ? '1.2rem' : '0.8rem', 
                                padding: deviceInfo.isMobile ? '8px' : '8px 20px', 
                                textDecoration:'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: deviceInfo.isMobile ? '40px' : 'auto',
                                height: deviceInfo.isMobile ? '40px' : 'auto'
                            }}
                            title={deviceInfo.isMobile ? 'SITE' : ''}
                        >
                            {deviceInfo.isMobile ? '🏠' : 'SITE'}
                        </Link>
                        <button 
                            onClick={handleLogout} 
                            className="btn-outline" 
                            style={{
                                fontSize: deviceInfo.isMobile ? '1.2rem' : '0.8rem', 
                                padding: deviceInfo.isMobile ? '8px' : '8px 20px', 
                                borderColor:'#EF4444', 
                                color:'#EF4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: deviceInfo.isMobile ? '0' : '6px',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                background: 'transparent',
                                minWidth: deviceInfo.isMobile ? '40px' : 'auto',
                                height: deviceInfo.isMobile ? '40px' : 'auto'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                                e.target.style.borderColor = '#DC2626';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.borderColor = '#EF4444';
                            }}
                            title={deviceInfo.isMobile ? 'SAIR' : ''}
                        >
                            {deviceInfo.isMobile ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16 17 21 12 16 7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg>
                                    SAIR
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="dashboard-container">
                <div className="dashboard-main-grid">
                    {/* LICENÇA */}
                    <div className="license-card" style={{background: teamGradient}}>
                        {teamLogo && (
                            <div
                                className="lc-watermark"
                                style={{
                                    backgroundImage: `url(${teamLogo})`,
                                    opacity: contratoFechado?.id ? 0.18 : undefined
                                }}
                            />
                        )}
                        <div className="lc-content-wrapper">
                            <div className="lc-left-col">
                                <div className="lc-header">
                                    MOTORHOME MLF1 
                                    <span 
                                        className="lc-status" 
                                        style={statusPiloto === 'INATIVO' ? {
                                            background: '#EF4444',
                                            color: '#E2E8F0'
                                        } : {}}
                                    >
                                        {statusPiloto}
                                    </span>
                                </div>

                                <div className="lc-body" style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'flex-start',
                                    flexDirection: deviceInfo.isMobile ? 'column' : 'row',
                                    gap: deviceInfo.isMobile ? '20px' : '0'
                                }}>
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: deviceInfo.isMobile ? '12px' : '15px', 
                                        alignItems: 'flex-start',
                                        width: deviceInfo.isMobile ? '100%' : 'auto'
                                    }}>
                                        <div className="lc-photo-box" style={{borderColor: teamColor}}>
                                            <DriverImage 
                                                name={profile.nome} 
                                                gridType={contratoFechado?.grid || dashData.currentGrid} 
                                                season={contratoFechado?.season || dashData.currentSeason} 
                                                isExPiloto={isExPiloto} 
                                            />
                                        </div>
                                        <div className="lc-info" style={{ flex: 1 }}>
                                            <div className="lc-label">PILOTO</div>
                                            <div className="lc-name" style={{ fontSize: deviceInfo.isMobile ? '1.1rem' : undefined }}>{capitalizeWords(profile.nome)}</div>
                                            <div className="lc-team" style={{color: teamColor, fontSize: deviceInfo.isMobile ? '0.9rem' : undefined}}>{effectiveTeamName}</div>
                                            <div className="lc-details-row" style={{ 
                                                flexDirection: deviceInfo.isMobile ? 'column' : 'row',
                                                gap: deviceInfo.isMobile ? '8px' : '20px'
                                            }}>
                                                <div><div className="lc-label">LICENÇA MLF1</div><div className="lc-value">{codIdml || 'N/A'}</div></div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div className="lc-label">OVERALL</div>
                                                    <div className="lc-value" style={{color:'#22C55E'}}>
                                                        {Math.round((dashData?.statsCarreira?.currentPoints || 0) + (dashData?.statsLight?.currentPoints || 0))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Botões de Análise - Lado Direito */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: deviceInfo.isMobile ? 'row' : 'column',
                                        gap: deviceInfo.isMobile ? '8px' : '10px',
                                        marginLeft: deviceInfo.isMobile ? '0' : 'auto',
                                        width: deviceInfo.isMobile ? '100%' : 'auto'
                                    }}>
                                        <button 
                                            className="btn-analise btn-acusacao"
                                            onClick={() => !isReadOnly && navigate('/acusacao')}
                                            disabled={isReadOnly}
                                            style={{
                                                opacity: isReadOnly ? 0.5 : 1,
                                                cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                                padding: deviceInfo.isMobile ? '12px' : '10px 20px',
                                                background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontWeight: '700',
                                                fontSize: deviceInfo.isMobile ? '1.2rem' : '0.8rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: deviceInfo.isMobile ? '0' : '6px',
                                                transition: 'all 0.2s ease',
                                                width: deviceInfo.isMobile ? '100%' : '170px',
                                                height: deviceInfo.isMobile ? '44px' : '40px',
                                                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                                                cursor: 'pointer',
                                                flex: deviceInfo.isMobile ? '1' : 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.transform = 'translateY(-2px)';
                                                e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.5)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.transform = 'translateY(0)';
                                                e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
                                            }}
                                            onMouseDown={(e) => {
                                                e.target.style.transform = 'translateY(1px) scale(0.98)';
                                            }}
                                            onMouseUp={(e) => {
                                                e.target.style.transform = 'translateY(-2px)';
                                            }}
                                            title={deviceInfo.isMobile ? 'Enviar Acusação' : ''}
                                        >
                                            {deviceInfo.isMobile ? '⚖️' : '⚖️ Enviar Acusação'}
                                        </button>
                                        
                                        {/* Botão de Defesa com Badge de Notificações */}
                                        <div style={{ 
                                            position: 'relative', 
                                            width: deviceInfo.isMobile ? '100%' : '170px', 
                                            height: deviceInfo.isMobile ? '44px' : '40px',
                                            flex: deviceInfo.isMobile ? '1' : 'none'
                                        }}>
                                            {acusacoesPendentes > 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-8px',
                                                    right: deviceInfo.isMobile ? '-4px' : '-8px',
                                                    background: '#EF4444',
                                                    color: 'white',
                                                    borderRadius: '50%',
                                                    width: '22px',
                                                    height: '22px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)',
                                                    zIndex: 10,
                                                    animation: 'pulse 2s infinite'
                                                }}>
                                                    {acusacoesPendentes}
                                                </div>
                                            )}
                                            <button 
                                                className="btn-analise btn-defesa"
                                                onClick={() => !isReadOnly && navigate('/defesa')}
                                                disabled={isReadOnly}
                                                style={{
                                                    opacity: isReadOnly ? 0.5 : 1,
                                                    cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                                    padding: deviceInfo.isMobile ? '12px' : '10px 20px',
                                                    background: acusacoesPendentes > 0 
                                                        ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' 
                                                        : 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)',
                                                    color: 'white',
                                                    border: acusacoesPendentes > 0 ? '2px solid #EF4444' : 'none',
                                                    borderRadius: '6px',
                                                    fontWeight: '700',
                                                    fontSize: deviceInfo.isMobile ? '1.2rem' : '0.8rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: deviceInfo.isMobile ? '0' : '6px',
                                                    transition: 'all 0.2s ease',
                                                    width: '100%',
                                                    height: '100%',
                                                    boxShadow: acusacoesPendentes > 0 
                                                        ? '0 4px 15px rgba(245, 158, 11, 0.5)' 
                                                        : '0 4px 15px rgba(34, 197, 94, 0.4)',
                                                    cursor: 'pointer',
                                                    boxSizing: 'border-box'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                                title={deviceInfo.isMobile ? (acusacoesPendentes > 0 ? 'Defender-se!' : 'Enviar Defesa') : ''}
                                            >
                                                {deviceInfo.isMobile ? '🛡️' : `🛡️ ${acusacoesPendentes > 0 ? 'Defender-se!' : 'Enviar Defesa'}`}
                                            </button>
                                        </div>
                                        <button 
                                            className="btn-analise btn-consulta"
                                            onClick={() => !isReadOnly && navigate('/analises?tab=consulta')}
                                            disabled={isReadOnly}
                                            style={{
                                                opacity: isReadOnly ? 0.5 : 1,
                                                cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                                padding: deviceInfo.isMobile ? '12px' : '10px 20px',
                                                background: 'linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontWeight: '700',
                                                fontSize: deviceInfo.isMobile ? '1.2rem' : '0.8rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: deviceInfo.isMobile ? '0' : '6px',
                                                transition: 'all 0.2s ease',
                                                width: deviceInfo.isMobile ? '100%' : '170px',
                                                height: deviceInfo.isMobile ? '44px' : '40px',
                                                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
                                                cursor: 'pointer',
                                                flex: deviceInfo.isMobile ? '1' : 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.transform = 'translateY(-2px)';
                                                e.target.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.5)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.transform = 'translateY(0)';
                                                e.target.style.boxShadow = '0 4px 15px rgba(6, 182, 212, 0.4)';
                                            }}
                                            onMouseDown={(e) => {
                                                e.target.style.transform = 'translateY(1px) scale(0.98)';
                                            }}
                                            onMouseUp={(e) => {
                                                e.target.style.transform = 'translateY(-2px)';
                                            }}
                                            title={deviceInfo.isMobile ? 'Consultar Análise' : ''}
                                        >
                                            {deviceInfo.isMobile ? '📋' : '📋 Consultar Análise'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="lc-fia-bg">FIA</div>
                    </div>

                    {/* RESUMO */}
                    <div className="career-summary-card">
                        {/* Cronômetro Digital - Acima do Card de Mensagens */}
                        {tempoRestante !== null && propostas?.some(p => p.status === 'OFFER_SENT') && tempoRestante.horas !== undefined && (
                            <div style={{
                                background: '#0F172A',
                                padding: deviceInfo.isMobile ? '8px 12px' : '10px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderBottom: `2px solid ${teamColor || '#22C55E'}`,
                                marginBottom: '12px',
                                borderRadius: '12px 12px 0 0',
                                position: 'relative'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: deviceInfo.isMobile ? '6px' : '8px',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center'
                                }}>
                                    <div style={{
                                        fontSize: deviceInfo.isMobile ? '0.65rem' : '0.7rem',
                                        color: '#94A3B8',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {propostas?.length > 0 ? 'Tempo para Responder:' : 'Tempo Restante:'}
                                    </div>
                                    <div style={{
                                        fontFamily: '"Courier New", monospace',
                                        fontSize: deviceInfo.isMobile ? '1rem' : '1.2rem',
                                        fontWeight: '700',
                                        color: tempoRestante.horas === 0 && tempoRestante.minutos < 30 ? '#EF4444' : '#22C55E',
                                        letterSpacing: '1px',
                                        textShadow: '0 0 8px rgba(34, 197, 94, 0.4)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}>
                                        <span style={{ 
                                            minWidth: deviceInfo.isMobile ? '22px' : '28px',
                                            textAlign: 'center'
                                        }}>
                                            {String(tempoRestante.horas || 0).padStart(2, '0')}
                                        </span>
                                        <span style={{ color: '#64748B', fontSize: '0.9em' }}>:</span>
                                        <span style={{ 
                                            minWidth: deviceInfo.isMobile ? '22px' : '28px',
                                            textAlign: 'center'
                                        }}>
                                            {String(tempoRestante.minutos || 0).padStart(2, '0')}
                                        </span>
                                        <span style={{ color: '#64748B', fontSize: '0.9em' }}>:</span>
                                        <span style={{ 
                                            minWidth: deviceInfo.isMobile ? '22px' : '28px',
                                            textAlign: 'center'
                                        }}>
                                            {String(tempoRestante.segundos || 0).padStart(2, '0')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div style={{ marginBottom: '14px' }}>
                            {(() => {
                                const hasPropostas = (propostas?.length || 0) > 0;
                                const hasContrato = !!contratoFechado?.id;
                                const gridAtual = dashData?.currentGrid || 'carreira';
                                const accentColor = hasContrato
                                    ? '#FFD700'
                                    : (gridAtual === 'carreira' ? '#EF4444' : '#3B82F6');
                                const isClickable = hasPropostas;

                                const titulo = hasContrato
                                    ? 'CONTRATO FECHADO'
                                    : hasPropostas
                                        ? 'NOVA MENSAGEM (PROPOSTA)'
                                        : 'CAIXA DE ENTRADA';

                                const remetente = hasContrato
                                    ? (contratoFechado?.equipes?.name ? `Equipe: ${contratoFechado.equipes.name}` : 'Equipe')
                                    : hasPropostas
                                        ? `${propostas.length} proposta${propostas.length > 1 ? 's' : ''} recebida${propostas.length > 1 ? 's' : ''}`
                                        : 'Nenhuma proposta pendente';

                                const snippet = hasContrato
                                    ? 'Você já assinou um contrato nesta temporada.'
                                    : hasPropostas
                                        ? 'Clique para abrir e decidir aceitar ou recusar.'
                                        : 'Quando uma equipe enviar proposta, ela aparecerá aqui.';

                                return (
                                    <div
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255, 255, 255, 0.96)',
                                            color: '#0F172A',
                                            borderRadius: '12px',
                                            border: `1px solid ${hasContrato ? 'rgba(255, 215, 0, 0.45)' : hasPropostas ? 'rgba(59, 130, 246, 0.25)' : 'rgba(15, 23, 42, 0.12)'}`,
                                            boxShadow: hasPropostas
                                                ? '0 10px 26px rgba(0,0,0,0.28)'
                                                : '0 8px 20px rgba(0,0,0,0.18)',
                                            overflow: 'hidden',
                                            cursor: (hasContrato || isClickable) ? 'pointer' : 'default',
                                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                            animation: hasPropostas ? 'pulse 2s infinite' : 'none'
                                        }}
                                        onClick={() => {
                                            if (hasContrato) {
                                                setShowContratoModal(true);
                                                return;
                                            }
                                            if (!isClickable) return;
                                            setPropostaSelecionada(propostas);
                                            setShowPropostaModal(true);
                                            if (!lastNotifyOpenAt) {
                                                notifyAdminOpenInbox().finally(() => setLastNotifyOpenAt(new Date().toISOString()));
                                            }
                                        }}
                                        title={hasContrato ? 'Clique para visualizar o contrato' : (isClickable ? 'Clique para abrir as propostas' : '')}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                                            <div style={{ width: '6px', background: accentColor }} />
                                            <div style={{
                                                flex: 1,
                                                padding: deviceInfo.isMobile ? '12px' : '10px 12px',
                                                display: 'grid',
                                                gridTemplateColumns: deviceInfo.isMobile ? '28px 1fr auto' : '30px 1fr auto',
                                                gap: deviceInfo.isMobile ? '8px' : '10px',
                                                alignItems: 'center'
                                            }}>
                                                <div style={{
                                                    width: deviceInfo.isMobile ? '24px' : '28px',
                                                    height: deviceInfo.isMobile ? '24px' : '28px',
                                                    borderRadius: '8px',
                                                    background: hasContrato ? 'rgba(255, 215, 0, 0.18)' : hasPropostas ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15, 23, 42, 0.06)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: '1px solid rgba(15, 23, 42, 0.10)'
                                                }}>
                                                    <span style={{ fontSize: deviceInfo.isMobile ? '0.8rem' : '0.9rem' }}>✉️</span>
                                                </div>

                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                        <div style={{
                                                            fontWeight: 900,
                                                            letterSpacing: '0.5px',
                                                            fontSize: deviceInfo.isMobile ? '0.7rem' : '0.75rem',
                                                            textTransform: 'uppercase',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {titulo}
                                                        </div>
                                                        {hasPropostas && (
                                                            <div style={{
                                                                width: deviceInfo.isMobile ? '6px' : '8px',
                                                                height: deviceInfo.isMobile ? '6px' : '8px',
                                                                borderRadius: '999px',
                                                                background: accentColor,
                                                                boxShadow: `0 0 0 3px ${accentColor}22`
                                                            }} />
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                                                        <div style={{
                                                            fontSize: deviceInfo.isMobile ? '0.7rem' : '0.75rem',
                                                            fontWeight: 700,
                                                            color: '#0F172A',
                                                            opacity: 0.85,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {remetente}
                                                        </div>
                                                        <div style={{
                                                            fontSize: deviceInfo.isMobile ? '0.65rem' : '0.7rem',
                                                            color: '#334155',
                                                            opacity: 0.9,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {snippet}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                    {hasContrato ? (
                                                        <div style={{
                                                            padding: deviceInfo.isMobile ? '4px 7px' : '5px 8px',
                                                            borderRadius: '999px',
                                                            background: 'rgba(255, 215, 0, 0.18)',
                                                            border: '1px solid rgba(255, 215, 0, 0.35)',
                                                            color: '#0F172A',
                                                            fontWeight: 900,
                                                            fontSize: deviceInfo.isMobile ? '0.65rem' : '0.68rem',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            ✅ FECHADO
                                                        </div>
                                                    ) : hasPropostas ? (
                                                        <div style={{
                                                            padding: deviceInfo.isMobile ? '4px 7px' : '5px 8px',
                                                            borderRadius: '999px',
                                                            background: `${accentColor}12`,
                                                            border: `1px solid ${accentColor}33`,
                                                            color: '#0F172A',
                                                            fontWeight: 900,
                                                            fontSize: deviceInfo.isMobile ? '0.65rem' : '0.68rem',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {propostas.length} NOVA{propostas.length > 1 ? 'S' : ''}
                                                        </div>
                                                    ) : (
                                                        <div style={{
                                                            padding: deviceInfo.isMobile ? '4px 7px' : '5px 8px',
                                                            borderRadius: '999px',
                                                            background: 'rgba(15, 23, 42, 0.06)',
                                                            border: '1px solid rgba(15, 23, 42, 0.10)',
                                                            color: '#334155',
                                                            fontWeight: 900,
                                                            fontSize: deviceInfo.isMobile ? '0.65rem' : '0.68rem',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            OK
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        <h3>RESUMO DA CARREIRA</h3>
                        <div className="csc-grid">
                            <div className="csc-item"><div className="csc-val">{totalWins}</div><div className="csc-lbl">VITÓRIAS</div></div>
                            <div className="csc-item"><div className="csc-val">{totalPodiums}</div><div className="csc-lbl">PÓDIOS</div></div>
                            <div className="csc-item"><div className="csc-val">{totalSeasons}</div><div className="csc-lbl">TEMPORADAS</div></div>
                        </div>
                    </div>
                </div>

                {/* RESUMO DA HISTÓRIA DO PILOTO - Abaixo do card do piloto */}
                {historiaPiloto && gerarResumoHistoria(historiaPiloto, profile.nome, statsAdicionais, dashData?.currentSeason, datesCarreira, datesLight, dashData?.currentGrid, contratoFechado) && (
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        backdropFilter: 'blur(15px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '20px',
                        padding: '25px',
                        marginBottom: '40px',
                        boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
                        width: '100%'
                    }}>
                        <h3 style={{
                            fontSize: '0.9rem',
                            color: '#94A3B8',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '15px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            paddingBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            📜 BIOGRAFIA MASTER LEAGUE F1
                        </h3>
                        <p style={{
                            color: '#E2E8F0',
                            lineHeight: '1.8',
                            fontSize: '1rem',
                            fontStyle: 'italic',
                            margin: 0,
                            textAlign: 'justify'
                        }}>
                                {gerarResumoHistoria(historiaPiloto, profile.nome, statsAdicionais, dashData?.currentSeason, datesCarreira, datesLight, dashData?.currentGrid, contratoFechado)}
                        </p>
                    </div>
                )}
                
                {/* GRÁFICO DE POSIÇÕES / OBJETIVOS */}
                {dashData.chartData && dashData.chartData.length > 0 && (
                    <div style={{
                        background: viewMode === 'objetivos' && contratoFechado 
                            ? `linear-gradient(135deg, ${teamColor}22 0%, rgba(30, 41, 59, 0.7) 100%)` 
                            : 'rgba(30, 41, 59, 0.7)',
                        backdropFilter: 'blur(15px)',
                        borderRadius: '20px', 
                        padding: '25px', 
                        border: viewMode === 'objetivos' && contratoFechado ? `1px solid ${teamColor}33` : '1px solid rgba(255,255,255,0.1)', 
                        marginBottom: '40px',
                        boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Marca d'água da equipe (apenas no modo objetivos) */}
                        {viewMode === 'objetivos' && teamLogo && (
                            <div style={{
                                position: 'absolute',
                                right: deviceInfo.isMobile ? '-40px' : '-20px',
                                bottom: deviceInfo.isMobile ? '-40px' : '-20px',
                                width: deviceInfo.isMobile ? '200px' : '300px',
                                height: deviceInfo.isMobile ? '200px' : '300px',
                                backgroundImage: `url(${teamLogo})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                opacity: 0.07,
                                pointerEvents: 'none',
                                filter: 'grayscale(1) brightness(1.5)',
                                transform: 'rotate(-15deg)',
                                zIndex: 0
                            }} />
                        )}

                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '25px',
                            flexDirection: deviceInfo.isMobile ? 'column' : 'row',
                            gap: deviceInfo.isMobile ? '15px' : '0',
                            position: 'relative',
                            zIndex: 1
                        }}>
                            <h3 style={{fontSize:'1rem', color:'white', margin: 0, textTransform:'uppercase', fontStyle:'italic'}}>
                                {viewMode === 'telemetria' ? `POSIÇÕES DE CHEGADA (S${dashData.currentSeason})` : 'OBJETIVOS CONTRATUAIS'}
                            </h3>
                            
                            {contratoFechado && (
                                <div style={{ 
                                    display: 'flex', 
                                    background: 'rgba(15, 23, 42, 0.6)', 
                                    padding: '4px', 
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <button 
                                        onClick={() => setViewMode('telemetria')}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: viewMode === 'telemetria' ? teamColor : 'transparent',
                                            color: viewMode === 'telemetria' ? '#000' : 'rgba(255,255,255,0.5)',
                                            fontSize: '0.75rem',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        TELEMETRIA
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('objetivos')}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: viewMode === 'objetivos' ? teamColor : 'transparent',
                                            color: viewMode === 'objetivos' ? '#000' : 'rgba(255,255,255,0.5)',
                                            fontSize: '0.75rem',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        OBJETIVOS
                                    </button>
                                </div>
                            )}
                        </div>

                        {viewMode === 'telemetria' ? (
                            <div style={{width:'100%', height: 280, position: 'relative', zIndex: 1}}>
                                <ResponsiveContainer>
                                    <LineChart data={dashData.chartData} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis 
                                            dataKey="name" 
                                            stroke="transparent" 
                                            tick={{fontSize: 0, fill: 'transparent'}}
                                            tickLine={{stroke: 'transparent'}}
                                            axisLine={{stroke: 'transparent'}}
                                            height={0}
                                        />
                                        <YAxis 
                                            stroke="#64748B" 
                                            tick={{fontSize: 12}} 
                                            reversed={true}
                                            domain={[1, 20]}
                                            label={{ value: 'Posição', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748B' } }}
                                        />
                                        <Tooltip 
                                            contentStyle={{backgroundColor:'#0F172A', border:`1px solid ${teamColor}`, borderRadius:'8px', color:'white'}}
                                            formatter={(value, name, props) => {
                                                const gpName = props.payload.gpName;
                                                return [
                                                    <div key="tooltip">
                                                        <div style={{fontWeight: 'bold', marginBottom: '4px'}}>{gpName || props.payload.name}</div>
                                                        <div>{value}º lugar</div>
                                                    </div>
                                                ];
                                            }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="position" 
                                            stroke={teamColor} 
                                            strokeWidth={3} 
                                            dot={{ fill: teamColor, r: 5 }}
                                            activeDot={{ r: 7 }}
                                            label={{ 
                                                fill: teamColor, 
                                                fontSize: 13, 
                                                fontWeight: 'bold',
                                                formatter: (value) => `${value}º`,
                                                position: 'top',
                                                offset: 10
                                            }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                                {/* Bandeiras e abreviações abaixo do gráfico - centralizadas com as etapas */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-around',
                                    alignItems: 'flex-start',
                                    marginTop: '8px',
                                    paddingTop: '8px',
                                    width: '100%',
                                    position: 'relative'
                                }}>
                                    {dashData.chartData?.map((d, idx) => {
                                        // Calcular posição percentual para centralizar com os pontos do gráfico
                                        const totalItems = dashData.chartData.length;
                                        const leftPercent = totalItems > 1 ? (idx / (totalItems - 1)) * 100 : 50;
                                        
                                        return (
                                            <div 
                                                key={idx} 
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    position: 'absolute',
                                                    left: `${leftPercent}%`,
                                                    transform: 'translateX(-50%)',
                                                    minWidth: '50px'
                                                }}
                                            >
                                                {d.flag && (
                                                    <img 
                                                        src={d.flag} 
                                                        alt={d.gpName || d.name}
                                                        style={{
                                                            width: '26px',
                                                            height: '20px',
                                                            objectFit: 'cover',
                                                            borderRadius: '3px',
                                                            border: '1px solid rgba(255,255,255,0.2)',
                                                            marginBottom: '1px'
                                                        }}
                                                    />
                                                )}
                                                <span style={{
                                                    fontSize: '10px',
                                                    color: '#94A3B8',
                                                    textAlign: 'center',
                                                    fontWeight: '700',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    {d.name}
                                                </span>
                                                {d.countryAbbr && (
                                                    <span style={{
                                                        fontSize: '9px',
                                                        color: '#64748B',
                                                        textAlign: 'center',
                                                        fontWeight: '600',
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        {d.countryAbbr}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            /* INFOGRÁFICO DE OBJETIVOS */
                            <div style={{ animation: 'fadeIn 0.5s ease-out', position: 'relative', zIndex: 1 }}>
                                {(() => {
                                    const contractData = generateContractText(contratoFechado.equipes?.name || effectiveTeamName, getPilotRanking());
                                    const totalObjetivos = contractData.objetivos?.length || 0;
                                    
                                    return (
                                        <div style={{ display: 'grid', gridTemplateColumns: deviceInfo.isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px' }}>
                                            {/* Coluna 1: Objetivos Principais */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                {contractData.objetivos?.map((obj, i) => (
                                                    <div key={i} style={{
                                                        background: `linear-gradient(90deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%)`,
                                                        padding: '18px',
                                                        borderRadius: '14px',
                                                        borderLeft: `4px solid ${teamColor}`,
                                                        borderTop: '1px solid rgba(255,255,255,0.05)',
                                                        borderRight: '1px solid rgba(255,255,255,0.05)',
                                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '18px',
                                                        position: 'relative',
                                                        overflow: 'hidden',
                                                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                                                    }}>
                                                        <div style={{
                                                            width: '36px',
                                                            height: '36px',
                                                            borderRadius: '10px',
                                                            background: `linear-gradient(135deg, ${teamColor} 0%, ${teamColor}AA 100%)`,
                                                            color: '#000',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: '900',
                                                            fontSize: '1rem',
                                                            flexShrink: 0,
                                                            boxShadow: `0 0 15px ${teamColor}44`
                                                        }}>
                                                            {i + 1}
                                                        </div>
                                                        <div style={{ flex: 1, fontSize: '0.95rem', color: '#FFF', fontWeight: '600', lineHeight: '1.4' }}>
                                                            {obj}
                                                        </div>
                                                        {/* Detalhe visual de fundo */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            right: '-10px',
                                                            top: '-10px',
                                                            fontSize: '4rem',
                                                            opacity: 0.03,
                                                            fontWeight: '900',
                                                            color: '#FFF',
                                                            fontStyle: 'italic',
                                                            pointerEvents: 'none'
                                                        }}>
                                                            {i + 1}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Coluna 2: Status e Expectativas */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                <div style={{
                                                    background: `linear-gradient(135deg, ${teamColor}33 0%, rgba(30, 41, 59, 0.8) 100%)`,
                                                    padding: '20px',
                                                    borderRadius: '15px',
                                                    border: `1px solid ${teamColor}55`,
                                                    textAlign: 'center',
                                                    position: 'relative',
                                                    boxShadow: `0 10px 30px ${teamColor}11`
                                                }}>
                                                    <div style={{ 
                                                        color: teamColor, 
                                                        fontSize: '0.75rem', 
                                                        fontWeight: '900', 
                                                        letterSpacing: '2.5px', 
                                                        textTransform: 'uppercase', 
                                                        marginBottom: '10px',
                                                        textShadow: `0 0 10px ${teamColor}44`
                                                    }}>
                                                        STATUS DO CONTRATO
                                                    </div>
                                                    <div style={{ fontSize: '2rem', fontWeight: '900', color: '#FFF', letterSpacing: '1px' }}>EM VIGOR</div>
                                                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: '8px', fontWeight: '600' }}>Temporada 20 • Master League F1</div>
                                                </div>

                                                <div style={{
                                                    background: 'rgba(15, 23, 42, 0.5)',
                                                    padding: '20px',
                                                    borderRadius: '15px',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    backdropFilter: 'blur(10px)'
                                                }}>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#FFF', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '1.2rem' }}>🎯</span> EXPECTATIVAS DA EQUIPE
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        {contractData.expectativas?.slice(0, 3).map((exp, i) => (
                                                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '0.9rem', color: '#E2E8F0', lineHeight: '1.4' }}>
                                                                <div style={{ 
                                                                    width: '6px', 
                                                                    height: '6px', 
                                                                    borderRadius: '50%', 
                                                                    background: teamColor, 
                                                                    marginTop: '6px',
                                                                    boxShadow: `0 0 8px ${teamColor}`
                                                                }} />
                                                                <span style={{ fontWeight: '500' }}>{exp}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}

                {/* STATS CARREIRA */}
                <h3 className="stats-section-title" style={{color: 'var(--carreira-wine)', borderColor: 'var(--carreira-wine)'}}>GRID CARREIRA</h3>
                {dashData.statsCarreira.races > 0 ? (
                    <div className="stats-row-cockpit">
                        <StatCard label="CORRIDAS" value={dashData.statsCarreira.races} />
                        <StatCard label="VITÓRIAS" value={dashData.statsCarreira.wins} color="#FFD700" />
                        <StatCard label="POLES" value={dashData.statsCarreira.poles} color="#A855F7" />
                        <StatCard label="PÓDIOS" value={dashData.statsCarreira.podiums} />
                        <StatCard label="MELHOR RES." value={dashData.statsCarreira.best === 999 ? '-' : `${dashData.statsCarreira.best}º`} />
                    </div>
                ) : <div className="no-data-box">Sem histórico no Grid Carreira.</div>}

                {/* STATS LIGHT */}
                <h3 className="stats-section-title" style={{marginTop:'40px', color: 'var(--light-blue)', borderColor: 'var(--light-blue)'}}>GRID LIGHT</h3>
                {dashData.statsLight.races > 0 ? (
                    <div className="stats-row-cockpit">
                        <StatCard label="CORRIDAS" value={dashData.statsLight.races} />
                        <StatCard label="VITÓRIAS" value={dashData.statsLight.wins} color="#FFD700" />
                        <StatCard label="POLES" value={dashData.statsLight.poles} color="#A855F7" />
                        <StatCard label="PÓDIOS" value={dashData.statsLight.podiums} />
                        <StatCard label="MELHOR RES." value={dashData.statsLight.best === 999 ? '-' : `${dashData.statsLight.best}º`} />
                    </div>
                ) : <div className="no-data-box">Sem histórico no Grid Light.</div>}
            </div>

            {/* Modal de Proposta/Contrato */}
            {showPropostaModal && propostaSelecionada && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.9)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    overflow: 'auto'
                }} onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowPropostaModal(false);
                    }
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: deviceInfo.isMobile ? '8px' : '12px',
                        overflow: 'hidden',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                        width: '100%',
                        maxWidth: deviceInfo.isMobile ? '100%' : '1080px',
                        maxHeight: deviceInfo.isMobile ? '95vh' : '90vh',
                        overflow: 'auto',
                        position: 'relative',
                        margin: deviceInfo.isMobile ? '10px' : '0'
                    }}>
                        {/* Header do formulário */}
                        <div style={{
                            background: '#FFD700',
                            padding: deviceInfo.isMobile ? '16px 18px' : '20px 24px',
                            color: '#000000',
                            position: 'relative'
                        }}>
                            <button
                                onClick={() => setShowPropostaModal(false)}
                                style={{
                                    position: 'absolute',
                                    top: deviceInfo.isMobile ? '16px' : '20px',
                                    right: deviceInfo.isMobile ? '16px' : '20px',
                                    background: 'rgba(0, 0, 0, 0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: deviceInfo.isMobile ? '28px' : '30px',
                                    height: deviceInfo.isMobile ? '28px' : '30px',
                                    color: '#000000',
                                    fontSize: deviceInfo.isMobile ? '16px' : '18px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(0, 0, 0, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'rgba(0, 0, 0, 0.1)';
                                }}
                            >
                                ×
                            </button>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: deviceInfo.isMobile ? '10px' : '12px',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{
                                    width: deviceInfo.isMobile ? '35px' : '40px',
                                    height: deviceInfo.isMobile ? '35px' : '40px',
                                    background: '#000000',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#FFD700',
                                    fontSize: deviceInfo.isMobile ? '20px' : '24px',
                                    fontWeight: '900'
                                }}>
                                    M
                                </div>
                                <div>
                                    <h1 style={{ 
                                        margin: 0, 
                                        fontSize: deviceInfo.isMobile ? '1.1rem' : '1.4rem',
                                        fontWeight: '900',
                                        textTransform: 'uppercase',
                                        letterSpacing: deviceInfo.isMobile ? '0.8px' : '1.2px',
                                        color: '#000000'
                                    }}>
                                        PROPOSTA MASTER LEAGUE F1
                                    </h1>
                                    <p style={{ 
                                        margin: '4px 0 0 0', 
                                        fontSize: deviceInfo.isMobile ? '0.8rem' : '0.9rem',
                                        fontWeight: '600',
                                        color: '#000000'
                                    }}>
                                        Temporada 20
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Conteúdo do formulário */}
                        <div style={{ 
                            padding: deviceInfo.isMobile ? '16px' : '20px', 
                            paddingBottom: deviceInfo.isMobile ? '20px' : '28px' 
                        }}>
                            {((contratoFechado ? (
                                // Se já tem contrato, mostrar apenas o contrato assinado
                                <div style={{ textAlign: 'center', padding: '24px' }}>
                                    <div style={{
                                        color: '#FFD700',
                                        fontSize: '1.5rem',
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        letterSpacing: '2px',
                                        marginBottom: '20px'
                                    }}>
                                        ✅ CONTRATO ASSINADO
                                    </div>
                                    <div style={{
                                        color: '#374151',
                                        fontSize: '1rem',
                                        marginBottom: '20px'
                                    }}>
                                        Você já possui um contrato assinado para a Temporada 20.
                                    </div>
                                    {contratoFechado.equipes && (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '15px',
                                            marginTop: '30px'
                                        }}>
                                            {getTeamLogo(contratoFechado.equipes.name) && (
                                                <img
                                                    src={getTeamLogo(contratoFechado.equipes.name)}
                                                    alt={contratoFechado.equipes.name}
                                                    style={{
                                                        width: '150px',
                                                        height: 'auto'
                                                    }}
                                                />
                                            )}
                                            <div style={{
                                                color: getTeamColor(contratoFechado.equipes.name),
                                                fontWeight: '700',
                                                fontSize: '1.2rem'
                                            }}>
                                                {contratoFechado.equipes.name}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : ((Array.isArray(propostaSelecionada) ? propostaSelecionada : [propostaSelecionada]).length > 0 ? (
                                // Mostrar todas as propostas em formato de seleção
                                <div>
                                    <div style={{
                                        marginBottom: deviceInfo.isMobile ? '16px' : '20px',
                                        padding: deviceInfo.isMobile ? '12px' : '16px',
                                        background: '#F3F4F6',
                                        borderRadius: '8px',
                                        border: '1px solid #E5E7EB'
                                    }}>
                                        <p style={{
                                            color: '#374151',
                                            fontSize: deviceInfo.isMobile ? '0.85rem' : '0.95rem',
                                            margin: 0,
                                            lineHeight: '1.6'
                                        }}>
                                            Você recebeu <strong>{(Array.isArray(propostaSelecionada) ? propostaSelecionada : [propostaSelecionada]).length} proposta{(Array.isArray(propostaSelecionada) ? propostaSelecionada : [propostaSelecionada]).length > 1 ? 's' : ''}</strong> de diferentes equipes. 
                                            Revise cada proposta abaixo e selecione a equipe com a qual deseja assinar o contrato.
                                        </p>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: deviceInfo.isMobile
                                            ? '1fr'
                                            : (propostaSelecionada && Array.isArray(propostaSelecionada) && propostaSelecionada.length === 3
                                                ? 'repeat(3, 1fr)'
                                                : propostaSelecionada && Array.isArray(propostaSelecionada) && propostaSelecionada.length >= 2
                                                    ? 'repeat(2, 1fr)'
                                                    : '1fr'),
                                        gap: deviceInfo.isMobile ? '12px' : '16px',
                                        width: '100%',
                                        minWidth: 0
                                    }}>
                                        {(Array.isArray(propostaSelecionada) ? propostaSelecionada : [propostaSelecionada]).map((proposta, idx) => {
                                            const equipe = proposta.equipes;
                                            const contractData = generateContractText(equipe, getPilotRanking());
                                            const teamColor = getTeamColor(equipe?.name || '');
                                            const teamLogo = getTeamLogo(equipe?.name || '');

                                            return (
                                                <div
                                                    key={proposta.id || idx}
                                                    style={{
                                                        border: `2px solid ${teamColor}40`,
                                                        borderRadius: '12px',
                                                        overflow: 'hidden',
                                                        background: '#FFFFFF',
                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                        position: 'relative',
                                                        minWidth: 0,
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    }}
                                                >

                                                    <div style={{ 
                                                        position: 'relative', 
                                                        zIndex: 1, 
                                                        padding: deviceInfo.isMobile ? '16px' : '20px', 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        gap: deviceInfo.isMobile ? '12px' : '16px', 
                                                        background: '#FFFFFF' 
                                                    }}>
                                                        {/* Header do card com logo e nome */}
                                                        <div style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: deviceInfo.isMobile ? '10px' : '12px', 
                                                            marginBottom: '8px' 
                                                        }}>
                                                            {teamLogo && (
                                                                <img 
                                                                    src={teamLogo} 
                                                                    alt={equipe?.name || 'Equipe'} 
                                                                    style={{ 
                                                                        width: deviceInfo.isMobile ? '50px' : '60px', 
                                                                        height: deviceInfo.isMobile ? '50px' : '60px', 
                                                                        objectFit: 'contain', 
                                                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' 
                                                                    }} 
                                                                    onError={(e) => e.target.style.display = 'none'}
                                                                />
                                                            )}
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ 
                                                                    color: teamColor, 
                                                                    fontWeight: 800, 
                                                                    fontSize: deviceInfo.isMobile ? '1rem' : '1.2rem', 
                                                                    letterSpacing: '0.5px', 
                                                                    textTransform: 'uppercase', 
                                                                    marginBottom: '4px' 
                                                                }}>
                                                                    {equipe?.name || 'Equipe'}
                                                                </div>
                                                                <div style={{ 
                                                                    color: '#6B7280', 
                                                                    fontSize: deviceInfo.isMobile ? '0.8rem' : '0.85rem', 
                                                                    fontWeight: 500 
                                                                }}>
                                                                    Proposta #{idx + 1}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Botões de ação - Logo abaixo do nome da equipe */}
                                                        <div style={{ 
                                                            display: 'grid', 
                                                            gridTemplateColumns: '1fr 1fr', 
                                                            gap: deviceInfo.isMobile ? '8px' : '10px', 
                                                            marginBottom: '12px' 
                                                        }}>
                                                            <button
                                                                onClick={async () => {
                                                                    const pilotCodIdml = codIdml || profile?.cod_idml;
                                                                    if (!pilotCodIdml) {
                                                                        alert('❌ Erro: Código do piloto (COD IDML) não encontrado. Não é possível aceitar a proposta sem o código.');
                                                                        return;
                                                                    }

                                                                    // Normalizar cod_idml (trim + uppercase) para consistência com AdminDraftImport
                                                                    const pilotCodIdmlNormalizado = String(pilotCodIdml).trim().toUpperCase();

                                                                    console.log('📝 [CONTRATO] Criando contrato:', {
                                                                        pilot_cod_idml_original: pilotCodIdml,
                                                                        pilot_cod_idml_normalizado: pilotCodIdmlNormalizado,
                                                                        team_id: equipe.id,
                                                                        team_name: equipe.name,
                                                                        grid: dashData?.currentGrid || 'carreira',
                                                                        season: 20
                                                                    });

                                                                    try {
                                                                        // Criar contrato
                                                                        const { data: contratoData, error: contratoError } = await supabase
                                                                            .from('contracts')
                                                                            .insert({
                                                                                pilot_cod_idml: pilotCodIdmlNormalizado,
                                                                                team_id: equipe.id,
                                                                                grid: dashData?.currentGrid || 'carreira',
                                                                                season: 20,
                                                                                signed_at: new Date().toISOString()
                                                                            })
                                                                            .select(`
                                                                                *,
                                                                                equipes (*)
                                                                            `)
                                                                            .single();

                                                                        if (contratoError) {
                                                                            console.error('❌ [CONTRATO] Erro ao criar contrato:', contratoError);
                                                                            throw contratoError;
                                                                        }

                                                                        console.log('✅ [CONTRATO] Contrato criado com sucesso:', contratoData);

                                                                        // Buscar TODAS as propostas OFFER_SENT do piloto para atualizar
                                                                        // (não apenas as que estão no modal, pois podem ter sido criadas depois)
                                                                        console.log('🔍 [PROPOSTAS] Buscando todas as propostas OFFER_SENT do piloto...');
                                                                        const { data: todasPropostasPiloto, error: buscaPropostasError } = await supabase
                                                                            .from('interests')
                                                                            .select('id, team_id')
                                                                            .eq('pilot_cod_idml', pilotCodIdmlNormalizado)
                                                                            .eq('status', 'OFFER_SENT')
                                                                            .eq('season', 20);

                                                                        console.log('📊 [PROPOSTAS] Propostas encontradas:', {
                                                                            total: todasPropostasPiloto?.length || 0,
                                                                            propostas: todasPropostasPiloto
                                                                        });

                                                                        if (buscaPropostasError && buscaPropostasError.code !== 'PGRST116') {
                                                                            console.error('❌ [PROPOSTAS] Erro ao buscar propostas para atualizar:', buscaPropostasError);
                                                                        }

                                                                        // Marcar a proposta aceita como ACCEPTED
                                                                        if (proposta.id) {
                                                                            await supabase
                                                                                .from('interests')
                                                                                .update({ status: 'ACCEPTED' })
                                                                                .eq('id', proposta.id);
                                                                        }

                                                                        // Marcar TODAS as outras propostas OFFER_SENT como REJECTED
                                                                        if (todasPropostasPiloto && todasPropostasPiloto.length > 0) {
                                                                            const outrasPropostasIds = todasPropostasPiloto
                                                                                .map(p => p.id)
                                                                                .filter(id => id !== proposta.id); // Excluir a proposta aceita
                                                                            
                                                                            if (outrasPropostasIds.length > 0) {
                                                                                const { error: updateError } = await supabase
                                                                                    .from('interests')
                                                                                    .update({ status: 'REJECTED' })
                                                                                    .in('id', outrasPropostasIds);
                                                                                
                                                                                if (updateError) {
                                                                                    console.error('Erro ao atualizar propostas para REJECTED:', updateError);
                                                                                } else {
                                                                                    console.log(`✅ ${outrasPropostasIds.length} proposta(s) marcada(s) como REJECTED`);
                                                                                }
                                                                            }
                                                                        }

                                                                        await notifyAdminContrato(equipe.name);
                                                                        
                                                                        // Notificar o piloto sobre o contrato fechado
                                                                        const pilotWhatsapp = profile?.whatsapp;
                                                                        const pilotNome = profile?.nome || 'Piloto';
                                                                        if (pilotWhatsapp) {
                                                                            await notifyPilotoContrato(equipe.name, pilotWhatsapp, pilotNome);
                                                                        } else {
                                                                            console.warn('⚠️ WhatsApp do piloto não encontrado no profile, tentando buscar no banco...');
                                                                            // Tentar buscar WhatsApp do piloto no banco
                                                                            try {
                                                                                const { data: pilotoData } = await supabase
                                                                                    .from('pilotos')
                                                                                    .select('whatsapp, nome')
                                                                                    .eq('cod_idml', pilotCodIdmlNormalizado)
                                                                                    .maybeSingle();
                                                                                
                                                                                if (pilotoData?.whatsapp) {
                                                                                    await notifyPilotoContrato(equipe.name, pilotoData.whatsapp, pilotoData.nome || pilotNome);
                                                                                } else {
                                                                                    console.warn('⚠️ WhatsApp do piloto não encontrado no banco de dados');
                                                                                }
                                                                            } catch (error) {
                                                                                console.error('❌ Erro ao buscar WhatsApp do piloto:', error);
                                                                            }
                                                                        }
                                                                        
                                                                        setShowPropostaModal(false);
                                                                        
                                                                        // Recarregar propostas e contratos
                                                                        const buscarPropostas = async () => {
                                                                            const pilotCodIdml = profile?.cod_idml || codIdml;
                                                                            if (!pilotCodIdml) return;

                                                                            // Normalizar cod_idml para busca
                                                                            const codIdmlNormalizado = String(pilotCodIdml).trim().toUpperCase();

                                                                            const { data: propostasData } = await supabase
                                                                                .from('interests')
                                                                                .select(`*, equipes (*)`)
                                                                                .eq('pilot_cod_idml', codIdmlNormalizado)
                                                                                .eq('status', 'OFFER_SENT')
                                                                                .order('created_at', { ascending: false });

                                                                            const { data: contratoData } = await supabase
                                                                                .from('contracts')
                                                                                .select(`*, equipes (*)`)
                                                                                .eq('pilot_cod_idml', codIdmlNormalizado)
                                                                                .eq('season', 20)
                                                                                .maybeSingle();

                                                                            setPropostas(propostasData || []);
                                                                            setContratoFechado(contratoData);
                                                                            
                                                                            // Abrir modal do contrato automaticamente após aceitar
                                                                            // Se o contrato não foi encontrado imediatamente, tentar novamente após um delay
                                                                            if (contratoData) {
                                                                                setTimeout(() => {
                                                                                    setShowContratoModal(true);
                                                                                }, 500);
                                                                            } else {
                                                                                // Tentar novamente após 1 segundo caso o contrato ainda não tenha sido criado
                                                                                setTimeout(async () => {
                                                                                    const { data: contratoRetry } = await supabase
                                                                                        .from('contracts')
                                                                                        .select(`*, equipes (*)`)
                                                                                        .eq('pilot_cod_idml', codIdmlNormalizado)
                                                                                        .eq('season', 20)
                                                                                        .maybeSingle();
                                                                                    
                                                                                    if (contratoRetry) {
                                                                                        setContratoFechado(contratoRetry);
                                                                                        setShowContratoModal(true);
                                                                                    }
                                                                                }, 1000);
                                                                            }
                                                                        };

                                                                        buscarPropostas();
                                                                    } catch (error) {
                                                                        console.error('Erro ao aceitar proposta:', error);
                                                                        alert(`❌ Erro ao aceitar proposta: ${error.message}`);
                                                                    }
                                                                }}
                                                                style={{
                                                                    background: '#FFFFFF',
                                                                    color: teamColor || '#22C55E',
                                                                    border: `2px solid ${teamColor || '#22C55E'}`,
                                                                    borderRadius: '8px',
                                                                    padding: deviceInfo.isMobile ? '10px 12px' : '12px 16px',
                                                                    fontSize: deviceInfo.isMobile ? '0.85rem' : '0.95rem',
                                                                    fontWeight: '800',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '1px',
                                                                    width: '100%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '6px'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.target.style.background = teamColor || '#22C55E';
                                                                    e.target.style.color = '#FFFFFF';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.target.style.background = '#FFFFFF';
                                                                    e.target.style.color = teamColor || '#22C55E';
                                                                }}
                                                            >
                                                                ✅ ACEITAR
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!window.confirm(`Tem certeza que deseja recusar a proposta da ${equipe.name}?`)) {
                                                                        return;
                                                                    }

                                                                    try {
                                                                        // Marcar proposta como REJECTED
                                                                        if (proposta.id) {
                                                                            const { error } = await supabase
                                                                                .from('interests')
                                                                                .update({ status: 'REJECTED' })
                                                                                .eq('id', proposta.id);

                                                                            if (error) {
                                                                                throw error;
                                                                            }

                                                                            // Recarregar propostas imediatamente
                                                                            const pilotCodIdml = profile?.cod_idml || codIdml;
                                                                            if (pilotCodIdml) {
                                                                                const { data: propostasData, error: fetchError } = await supabase
                                                                                    .from('interests')
                                                                                    .select(`*, equipes (*)`)
                                                                                    .eq('pilot_cod_idml', pilotCodIdml)
                                                                                    .eq('status', 'OFFER_SENT')
                                                                                    .order('created_at', { ascending: false });

                                                                                if (fetchError) {
                                                                                    console.error('Erro ao buscar propostas após recusar:', fetchError);
                                                                                } else {
                                                                                    // Atualizar estados
                                                                                    const novasPropostas = propostasData || [];
                                                                                    setPropostas(novasPropostas);
                                                                                    
                                                                                    // Se não houver mais propostas, fechar o modal
                                                                                    if (novasPropostas.length === 0) {
                                                                                        setShowPropostaModal(false);
                                                                                        setPropostaSelecionada(null);
                                                                                    } else {
                                                                                        // Atualizar as propostas no modal - forçar re-render
                                                                                        setPropostaSelecionada([...novasPropostas]);
                                                                                    }
                                                                                }
                                                                            }

                                                                            alert(`❌ Proposta da ${equipe.name} recusada.`);
                                                                        }
                                                                    } catch (error) {
                                                                        console.error('Erro ao recusar proposta:', error);
                                                                        alert(`❌ Erro ao recusar proposta: ${error.message}`);
                                                                    }
                                                                }}
                                                                style={{
                                                                    background: '#FFFFFF',
                                                                    color: '#EF4444',
                                                                    border: '2px solid #EF4444',
                                                                    borderRadius: '8px',
                                                                    padding: deviceInfo.isMobile ? '10px 12px' : '12px 16px',
                                                                    fontSize: deviceInfo.isMobile ? '0.85rem' : '0.95rem',
                                                                    fontWeight: '800',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '1px',
                                                                    width: '100%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '6px'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.target.style.background = '#EF4444';
                                                                    e.target.style.color = '#FFFFFF';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.target.style.background = '#FFFFFF';
                                                                    e.target.style.color = '#EF4444';
                                                                }}
                                                            >
                                                                ✕ RECUSAR
                                                            </button>
                                                        </div>

                                                        {/* Descrição da equipe com marca d'água */}
                                                        {contractData.introducao && (
                                                            <div style={{
                                                                position: 'relative',
                                                                padding: deviceInfo.isMobile ? '12px' : '16px',
                                                                background: 'transparent',
                                                                borderRadius: '8px',
                                                                color: teamColor,
                                                                fontWeight: 500,
                                                                fontSize: deviceInfo.isMobile ? '0.85rem' : '0.95rem',
                                                                lineHeight: 1.6,
                                                                minHeight: deviceInfo.isMobile ? '100px' : '120px',
                                                                display: 'flex',
                                                                alignItems: 'center'
                                                            }}>
                                                                {teamLogo && (
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        top: '50%',
                                                                        left: '50%',
                                                                        transform: 'translate(-50%, -50%)',
                                                                        width: deviceInfo.isMobile ? '180px' : '250px',
                                                                        height: deviceInfo.isMobile ? '180px' : '250px',
                                                                        opacity: 0.2,
                                                                        backgroundImage: `url(${teamLogo})`,
                                                                        backgroundSize: 'contain',
                                                                        backgroundRepeat: 'no-repeat',
                                                                        backgroundPosition: 'center',
                                                                        pointerEvents: 'none',
                                                                        zIndex: 0,
                                                                        filter: 'grayscale(100%)'
                                                                    }} />
                                                                )}
                                                                <p style={{ 
                                                                    position: 'relative', 
                                                                    zIndex: 1, 
                                                                    margin: 0,
                                                                    textAlign: 'justify'
                                                                }}>
                                                                    {contractData.introducao}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Seção de Objetivos */}
                                                        <div style={{ marginTop: '8px' }}>
                                                            <div style={{ 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: '8px', 
                                                                marginBottom: deviceInfo.isMobile ? '10px' : '12px',
                                                                color: teamColor,
                                                                fontWeight: 800,
                                                                fontSize: deviceInfo.isMobile ? '0.85rem' : '0.95rem',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.5px'
                                                            }}>
                                                                <span style={{ fontSize: deviceInfo.isMobile ? '1rem' : '1.2rem' }}>📋</span>
                                                                <span>OBJETIVOS DA TEMPORADA</span>
                                                            </div>
                                                            <ul style={{ 
                                                                margin: 0, 
                                                                paddingLeft: deviceInfo.isMobile ? '18px' : '20px', 
                                                                display: 'flex', 
                                                                flexDirection: 'column',
                                                                gap: deviceInfo.isMobile ? '5px' : '6px',
                                                                color: '#1F2937',
                                                                fontSize: deviceInfo.isMobile ? '0.8rem' : '0.9rem',
                                                                lineHeight: 1.5
                                                            }}>
                                                                {(contractData.objetivos || []).slice(0, 4).map((obj, i) => (
                                                                    <li key={i} style={{ 
                                                                        listStyleType: 'disc',
                                                                        color: '#374151'
                                                                    }}>
                                                                        {obj}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        {/* Seção de Expectativas/Desafios da Equipe */}
                                                        {contractData.expectativas && contractData.expectativas.length > 0 && (
                                                            <div style={{ marginTop: deviceInfo.isMobile ? '16px' : '20px' }}>
                                                                <div style={{ 
                                                                    display: 'flex', 
                                                                    alignItems: 'center', 
                                                                    gap: '8px', 
                                                                    marginBottom: deviceInfo.isMobile ? '10px' : '12px',
                                                                    color: teamColor,
                                                                    fontWeight: 800,
                                                                    fontSize: deviceInfo.isMobile ? '0.85rem' : '0.95rem',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.5px'
                                                                }}>
                                                                    <span style={{ fontSize: deviceInfo.isMobile ? '1rem' : '1.2rem' }}>🎯</span>
                                                                    <span>EXPECTATIVAS DA EQUIPE</span>
                                                                </div>
                                                                <ul style={{ 
                                                                    margin: 0, 
                                                                    paddingLeft: deviceInfo.isMobile ? '18px' : '20px', 
                                                                    display: 'flex', 
                                                                    flexDirection: 'column',
                                                                    gap: deviceInfo.isMobile ? '5px' : '6px',
                                                                    color: '#1F2937',
                                                                    fontSize: deviceInfo.isMobile ? '0.8rem' : '0.9rem',
                                                                    lineHeight: 1.5
                                                                }}>
                                                                    {(contractData.expectativas || []).slice(0, 4).map((exp, i) => (
                                                                        <li key={i} style={{ 
                                                                            listStyleType: 'disc',
                                                                            color: '#374151'
                                                                        }}>
                                                                            {exp}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : contratoFechado ? (
                                // Fallback para contrato fechado (caso não seja array)
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{
                                        color: '#FFD700',
                                        fontSize: '1.5rem',
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        letterSpacing: '2px'
                                    }}>
                                        ✅ CONTRATO ASSINADO
                                    </div>
                                </div>
                            ) : null)))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal do Contrato Timbrado */}
            {showContratoModal && contratoFechado && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    padding: deviceInfo.isMobile ? '10px' : '20px',
                    overflow: 'auto'
                }} onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowContratoModal(false);
                    }
                }}>
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: deviceInfo.isMobile ? '8px' : '12px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        width: '100%',
                        maxWidth: deviceInfo.isMobile ? '100%' : '900px',
                        maxHeight: deviceInfo.isMobile ? '95vh' : '90vh',
                        overflow: 'auto',
                        position: 'relative',
                        margin: deviceInfo.isMobile ? '10px' : '0'
                    }}>
                        {/* Header do Contrato */}
                        <div style={{
                            background: teamGradient || `linear-gradient(135deg, ${teamColor} 0%, ${teamColor}dd 100%)`,
                            padding: deviceInfo.isMobile ? '20px 50px 20px 16px' : '30px 60px 30px 40px',
                            color: '#FFFFFF',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* Marca d'água do logo */}
                            {teamLogo && (
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    right: '20px',
                                    transform: 'translateY(-50%)',
                                    width: '200px',
                                    height: '200px',
                                    opacity: 0.15,
                                    backgroundImage: `url(${teamLogo})`,
                                    backgroundSize: 'contain',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center',
                                    pointerEvents: 'none',
                                    filter: 'brightness(0) invert(1)'
                                }} />
                            )}
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowContratoModal(false);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: deviceInfo.isMobile ? '12px' : '20px',
                                    right: deviceInfo.isMobile ? '12px' : '20px',
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: deviceInfo.isMobile ? '44px' : '36px',
                                    height: deviceInfo.isMobile ? '44px' : '36px',
                                    color: '#FFFFFF',
                                    fontSize: deviceInfo.isMobile ? '24px' : '20px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s',
                                    zIndex: 100,
                                    pointerEvents: 'auto',
                                    touchAction: 'manipulation',
                                    WebkitTapHighlightColor: 'transparent',
                                    padding: 0,
                                    minWidth: deviceInfo.isMobile ? '44px' : '36px',
                                    minHeight: deviceInfo.isMobile ? '44px' : '36px'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                                }}
                                onTouchStart={(e) => {
                                    e.target.style.background = 'rgba(255, 255, 255, 0.4)';
                                }}
                                onTouchEnd={(e) => {
                                    e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                                }}
                            >
                                ×
                            </button>
                            <div style={{ position: 'relative', zIndex: 0 }}>
                                <div style={{
                                    fontSize: deviceInfo.isMobile ? '0.9rem' : '1rem',
                                    fontWeight: '700',
                                    letterSpacing: '2px',
                                    textTransform: 'uppercase',
                                    opacity: 0.95,
                                    marginBottom: '8px'
                                }}>
                                    CONTRATO OFICIAL
                                </div>
                                <div style={{
                                    fontSize: deviceInfo.isMobile ? '1.8rem' : '2.5rem',
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '8px',
                                    textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                                }}>
                                    {effectiveTeamName}
                                </div>
                                <div style={{
                                    fontSize: deviceInfo.isMobile ? '0.85rem' : '1rem',
                                    fontWeight: '600',
                                    opacity: 0.9
                                }}>
                                    Temporada 20 • Grid {dashData?.currentGrid?.toUpperCase() || 'CARREIRA'}
                                </div>
                            </div>
                        </div>

                        {/* Corpo do Contrato - Papel Timbrado */}
                        <div style={{
                            background: '#FAFAFA',
                            backgroundImage: `
                                repeating-linear-gradient(0deg, transparent, transparent 31px, #E5E7EB 31px, #E5E7EB 32px),
                                repeating-linear-gradient(90deg, transparent, transparent 31px, #E5E7EB 31px, #E5E7EB 32px)
                            `,
                            backgroundSize: '100% 32px, 32px 100%',
                            padding: deviceInfo.isMobile ? '30px 20px' : '50px 60px',
                            position: 'relative',
                            minHeight: '500px'
                        }}>
                            {/* Timbre no topo */}
                            <div style={{
                                textAlign: 'center',
                                marginBottom: deviceInfo.isMobile ? '30px' : '40px',
                                paddingBottom: deviceInfo.isMobile ? '20px' : '30px',
                                borderBottom: `3px solid ${teamColor}`,
                                position: 'relative'
                            }}>
                                {teamLogo && (
                                    <img 
                                        src={teamLogo} 
                                        alt={effectiveTeamName}
                                        style={{
                                            height: deviceInfo.isMobile ? '60px' : '80px',
                                            marginBottom: '15px',
                                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                                        }}
                                    />
                                )}
                                <div style={{
                                    fontSize: deviceInfo.isMobile ? '0.75rem' : '0.9rem',
                                    fontWeight: '700',
                                    color: '#6B7280',
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    marginTop: '10px'
                                }}>
                                    MASTER LEAGUE F1
                                </div>
                            </div>

                            {/* Conteúdo do Contrato */}
                            <div style={{
                                color: '#1F2937',
                                lineHeight: 1.8,
                                fontSize: deviceInfo.isMobile ? '0.95rem' : '1.05rem'
                            }}>
                                <div style={{
                                    textAlign: 'center',
                                    marginBottom: deviceInfo.isMobile ? '25px' : '35px'
                                }}>
                                    <div style={{
                                        fontSize: deviceInfo.isMobile ? '1.1rem' : '1.3rem',
                                        fontWeight: '800',
                                        color: teamColor,
                                        marginBottom: '10px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>
                                        CONTRATO DE PILOTO
                                    </div>
                                    <div style={{
                                        fontSize: deviceInfo.isMobile ? '0.9rem' : '1rem',
                                        color: '#4B5563',
                                        fontWeight: '600'
                                    }}>
                                        Temporada 20
                                    </div>
                                </div>

                                <div style={{
                                    marginBottom: deviceInfo.isMobile ? '20px' : '30px',
                                    textAlign: 'justify'
                                }}>
                                    <p style={{ marginBottom: '15px', textIndent: '30px' }}>
                                        Olá <strong style={{ color: teamColor, fontSize: deviceInfo.isMobile ? '1.05rem' : '1.15rem', fontWeight: '800' }}>{capitalizeWords(profile?.nome || 'Piloto')}</strong>!
                                    </p>
                                    <p style={{ marginBottom: '15px', textIndent: '30px' }}>
                                        Estamos muito felizes em te dar as boas-vindas à <strong style={{ color: teamColor, fontSize: deviceInfo.isMobile ? '1.05rem' : '1.15rem', fontWeight: '800' }}>{effectiveTeamName}</strong>! 
                                        É uma honra ter você conosco para correr no <strong>Grid {dashData?.currentGrid?.toUpperCase() || 'CARREIRA'}</strong> da <strong>Temporada 20</strong> da Master League F1.
                                    </p>
                                    <p style={{ marginBottom: '15px', textIndent: '30px' }}>
                                        Sabemos que você tem muito talento e estamos animados para ver o que vamos conquistar juntos nesta temporada. 
                                        Acreditamos que sua experiência e dedicação serão essenciais para alcançarmos nossos objetivos e, quem sabe, até mesmo lutar pelo título!
                                    </p>
                                    <p style={{ marginBottom: '15px', textIndent: '30px' }}>
                                        Este contrato oficializa nossa parceria e estabelece os termos da nossa colaboração. 
                                        Estamos confiantes de que será uma temporada incrível!
                                    </p>
                                </div>

                                <div style={{
                                    marginBottom: deviceInfo.isMobile ? '20px' : '30px'
                                }}>
                                    <div style={{
                                        fontSize: deviceInfo.isMobile ? '1rem' : '1.1rem',
                                        fontWeight: '800',
                                        color: teamColor,
                                        marginBottom: '15px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        borderLeft: `4px solid ${teamColor}`,
                                        paddingLeft: '15px'
                                    }}>
                                        📋 Cláusulas do Contrato
                                    </div>
                                    <div style={{ paddingLeft: '20px' }}>
                                        <p style={{ marginBottom: '12px' }}>
                                            <strong style={{ color: teamColor }}>1. OBJETO:</strong> O presente contrato tem por objeto a participação do PILOTO pela EQUIPE no Grid {dashData?.currentGrid?.toUpperCase() || 'CARREIRA'} da Temporada 20 da Master League F1.
                                        </p>
                                        <p style={{ marginBottom: '12px' }}>
                                            <strong style={{ color: teamColor }}>2. COMPROMISSOS DO PILOTO:</strong> O PILOTO compromete-se a representar a EQUIPE com dedicação, profissionalismo e ética, seguindo os regulamentos da Master League F1 e os valores da EQUIPE.
                                        </p>
                                        <p style={{ marginBottom: '12px' }}>
                                            <strong style={{ color: teamColor }}>3. COMPROMISSOS DA EQUIPE:</strong> A EQUIPE compromete-se a fornecer todo o suporte necessário para o desempenho do PILOTO, incluindo estratégias, desenvolvimento técnico e ambiente de trabalho adequado.
                                        </p>
                                        <p style={{ marginBottom: '12px' }}>
                                            <strong style={{ color: teamColor }}>4. TEMPORADA:</strong> Este contrato é válido exclusivamente para a Temporada 20 da Master League F1, no Grid {dashData?.currentGrid?.toUpperCase() || 'CARREIRA'}.
                                        </p>
                                        <p>
                                            <strong style={{ color: teamColor }}>5. VIGÊNCIA:</strong> O presente contrato entra em vigor na data de assinatura e permanece válido até o término da Temporada 20.
                                        </p>
                                    </div>
                                </div>

                                {/* Assinaturas */}
                                <div style={{
                                    marginTop: deviceInfo.isMobile ? '40px' : '60px',
                                    display: 'grid',
                                    gridTemplateColumns: deviceInfo.isMobile ? '1fr' : '1fr 1fr',
                                    gap: deviceInfo.isMobile ? '30px' : '40px',
                                    paddingTop: deviceInfo.isMobile ? '30px' : '40px',
                                    borderTop: `2px solid ${teamColor}40`
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        {/* Assinatura manuscrita do Piloto */}
                                        <div style={{
                                            fontFamily: '"Brush Script MT", "Lucida Handwriting", "Comic Sans MS", cursive, serif',
                                            fontSize: deviceInfo.isMobile ? '1.4rem' : '1.6rem',
                                            fontWeight: '400',
                                            color: '#000000',
                                            fontStyle: 'italic',
                                            letterSpacing: '1px',
                                            lineHeight: 1.3,
                                            marginBottom: '2px',
                                            textAlign: 'center'
                                        }}>
                                            {capitalizeWords(profile?.nome || 'Piloto')}
                                        </div>
                                        {/* Linha de assinatura do Piloto */}
                                        <div style={{
                                            height: '60px',
                                            borderBottom: '2px solid #000000',
                                            marginBottom: '8px',
                                            position: 'relative',
                                            width: '100%',
                                            maxWidth: '250px',
                                            margin: '0 auto 8px'
                                        }} />
                                        {/* Texto PILOTO */}
                                        <div style={{
                                            fontSize: deviceInfo.isMobile ? '0.75rem' : '0.8rem',
                                            color: teamColor,
                                            fontWeight: '700',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px'
                                        }}>
                                            PILOTO
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        {/* Assinatura manuscrita da Equipe */}
                                        <div style={{
                                            fontFamily: '"Brush Script MT", "Lucida Handwriting", "Comic Sans MS", cursive, serif',
                                            fontSize: deviceInfo.isMobile ? '1.4rem' : '1.6rem',
                                            fontWeight: '400',
                                            color: '#000000',
                                            fontStyle: 'italic',
                                            letterSpacing: '1px',
                                            lineHeight: 1.3,
                                            marginBottom: '2px',
                                            textAlign: 'center'
                                        }}>
                                            {effectiveTeamName}
                                        </div>
                                        {/* Linha de assinatura da Equipe */}
                                        <div style={{
                                            height: '60px',
                                            borderBottom: '2px solid #000000',
                                            marginBottom: '8px',
                                            position: 'relative',
                                            width: '100%',
                                            maxWidth: '250px',
                                            margin: '0 auto 8px'
                                        }} />
                                        {/* Texto EQUIPE */}
                                        <div style={{
                                            fontSize: deviceInfo.isMobile ? '0.75rem' : '0.8rem',
                                            color: teamColor,
                                            fontWeight: '700',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px'
                                        }}>
                                            EQUIPE
                                        </div>
                                    </div>
                                </div>

                                {/* Data e Local */}
                                <div style={{
                                    textAlign: 'center',
                                    marginTop: deviceInfo.isMobile ? '30px' : '40px',
                                    fontSize: deviceInfo.isMobile ? '0.85rem' : '0.9rem',
                                    color: '#6B7280',
                                    fontStyle: 'italic'
                                }}>
                                    Contrato assinado em {new Date(contratoFechado?.signed_at || new Date()).toLocaleDateString('pt-BR', { 
                                        day: '2-digit', 
                                        month: 'long', 
                                        year: 'numeric' 
                                    })}
                                </div>

                                {/* Botão de Fechar no Final do Contrato */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    marginTop: deviceInfo.isMobile ? '30px' : '40px',
                                    marginBottom: deviceInfo.isMobile ? '20px' : '30px',
                                    paddingTop: deviceInfo.isMobile ? '20px' : '30px',
                                    borderTop: `1px solid ${teamColor}20`
                                }}>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowContratoModal(false);
                                        }}
                                        style={{
                                            background: teamColor || '#22C55E',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: deviceInfo.isMobile ? '14px 32px' : '16px 40px',
                                            fontSize: deviceInfo.isMobile ? '0.9rem' : '1rem',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            transition: 'all 0.2s',
                                            touchAction: 'manipulation',
                                            WebkitTapHighlightColor: 'transparent',
                                            minHeight: deviceInfo.isMobile ? '48px' : '52px',
                                            boxShadow: `0 4px 12px ${teamColor}40`
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.transform = 'translateY(-2px)';
                                            e.target.style.boxShadow = `0 6px 16px ${teamColor}60`;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = `0 4px 12px ${teamColor}40`;
                                        }}
                                        onTouchStart={(e) => {
                                            e.target.style.transform = 'scale(0.98)';
                                        }}
                                        onTouchEnd={(e) => {
                                            e.target.style.transform = 'scale(1)';
                                        }}
                                    >
                                        FECHAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const StatCard = ({ label, value, color = 'white' }) => <div className="cockpit-stat-box"><div className="csb-value" style={{color}}>{value}</div><div className="csb-label">{label}</div></div>;
const containerStyle = { maxWidth:'500px', margin:'50px auto', background:'#1E293B', padding:'40px', borderRadius:'20px', textAlign:'center', border:'1px solid rgba(255,255,255,0.1)' };
const labelStyle = { display:'block', color:'#CBD5E1', fontSize:'0.7rem', fontWeight:'700', marginBottom:'5px', textTransform:'uppercase' };
const inputStyle = { width:'100%', padding:'12px', background:'#0F172A', color:'white', border:'1px solid var(--highlight-cyan)', borderRadius:'8px', fontSize:'1rem', outline:'none' };
const inputDisabledStyle = { ...inputStyle, color:'#64748B', border:'1px solid #334155', cursor:'not-allowed' };

export default Dashboard;