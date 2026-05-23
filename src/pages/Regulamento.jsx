import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
    Trophy,
    UserCheck,
    Activity,
    Target,
    History,
    AlertTriangle,
    XCircle,
    Info,
    CheckCircle,
    CalendarDays,
    Clock11,
    Sparkles,
    Video,
    BadgeCheck,
    ShieldCheck,
    FileText,
    Users,
    Signal,
    ListOrdered,
    Search,
    Printer,
    ChevronRight,
    X,
    BookOpen,
    ChevronUp,
    Save,
    Zap,
    Gauge,
    ToggleRight,
    ToggleLeft,
    Shield,
    Waves,
    Thermometer,
    CloudRain,
    Settings2,
    CornerUpRight,
    Eye,
    EyeOff
} from 'lucide-react';
import Footer from '../components/Footer';

// ========== DADOS DO INFOGRÁFICO ==========
const pillars = [
    { id: 1, title: 'Performance', icon: <Trophy className="reg-icon" />, desc: 'Resultados na pista: velocidade, qualificação e posições finais nas corridas oficiais.' },
    { id: 2, title: 'Conduta', icon: <UserCheck className="reg-icon" />, desc: 'Presença, respostas a formulários, envio de fotos, comunicação com a liga e fair play.' },
    { id: 3, title: 'Racecraft', icon: <Activity className="reg-icon" />, desc: 'Consistência, ganho de posições limpo e posicionamento estratégico durante as disputas.' },
    { id: 4, title: 'Overall', icon: <Target className="reg-icon" />, desc: 'Cumprimento das metas contratuais e evolução ao longo da temporada com foco no objetivo da equipe.' },
    { id: 5, title: 'Histórico', icon: <History className="reg-icon" />, desc: 'Bagagem na Master League: temporadas disputadas, títulos e presença nos grids.' }
];

const infractions = [
    'Não enviar foto oficial solicitada pelo campeonato',
    'Faltar a etapas (W.O.) sem justificativa',
    'Ignorar lista de presença ou formulários obrigatórios',
    'Acúmulo de punições em análises de incidentes',
    'Usar telemetria fechada sem autorização',
    'Piloto com numeração incorreta ou alteração não comunicada',
    'Não responder vídeo de defesa quando solicitado pela comissão'
];

const heroStats = [
    { id: 1, icon: CalendarDays, title: '8 Etapas Oficiais', detail: 'Calendário divulgado em canais oficiais e grupos da liga.' },
    { id: 2, icon: Sparkles, title: '2 Corridas Sprint', detail: 'Eventos de sprint (~33%) acompanham o formato tradicional em etapas selecionadas.' },
    { id: 3, icon: Clock11, title: 'Corridas às 20:15h', detail: 'Abertura do lobby 15 minutos antes; partidas começam pontualmente.' },
    { id: 4, icon: Video, title: 'Transmissões ao vivo', detail: 'As transmissões serão ao vivo pelo canal da Master League F1 no Youtube.' }
];

const registrationHighlights = [
    { id: 1, icon: BadgeCheck, title: '1.1. Inscrição e Valores', desc: 'A participação na liga é mediante pagamento de taxa de inscrição. O valor é anunciado pela administração antes do início de cada temporada através dos grupos de WhatsApp ou canais oficiais da Master League F1.' },
    { id: 2, icon: ShieldCheck, title: 'Política para Reservas', desc: 'O piloto reserva paga o valor total do campeonato no ato da inscrição. O valor proporcional das etapas em que o reserva não participar poderá ser devolvido ao final da temporada ou utilizado como crédito para abater a inscrição da temporada seguinte.' },
    { id: 3, icon: FileText, title: 'Política de Reembolso (Titulares)', desc: 'Não haverá reembolso de inscrição em caso de desistência após o início do campeonato, expulsão por infração ao regulamento, ou após a realização do Draft para escolha das equipes.' },
    { id: 4, icon: Users, title: 'Uso de Imagem', desc: 'Ao se inscrever, o piloto concorda com o uso de sua imagem (gamertag/nome/foto) nas transmissões e mídias sociais da liga.' }
];

const sessionFormats = [
    { id: 1, icon: Activity, title: 'Etapa padrão', detail: 'Qualificação de 18 minutos seguida de Corrida Principal em 50% do total.' },
    { id: 2, icon: Signal, title: 'Etapa com sprint', detail: 'Haverá um qualy antes da Sprint e outro qualy antes da corrida. Sprint (~33%) e Corrida Principal (50%).' }
];

const lobbySteps = [
    'Lobby abre 15 minutos antes da largada oficial (20:15h).',
    'Apenas 1 host de cada plataforma recebe convite para entrar no lobby.',
    'Pilotos entram pelo perfil do host ou de outros pilotos na mesma plataforma.',
    'Convites diretos só funcionam com contas EA vinculadas.',
    'Responder à lista de presença é obrigatório; ausência gera perda de Pontos de Conduta.'
];

// Configurações do Lobby
const lobbyConfig = [
    { config: 'Volta de Apresentação', valor: 'Sim' },
    { config: 'Assistência de Freios', valor: 'Sim' },
    { config: 'ABS', valor: 'Sim' },
    { config: 'Controle de Tração', valor: 'Completo' },
    { config: 'Câmbio', valor: 'Automático' },
    { config: 'Assistência de Box', valor: 'Não' },
    { config: 'Linha', valor: 'Somente nas curvas' },
    { config: 'Assistência de DRS/ERS', valor: 'Não' },
    { config: 'Combustível', valor: 'Difícil' },
    { config: 'Largada', valor: 'Manual' },
    { config: 'Previsão do Tempo', valor: 'Aproximada' },
    { config: 'Modo de Recuperação', valor: 'Nenhuma' },
    { config: 'Liberação de box insegura', valor: 'Sim' },
    { config: 'Nível IA', valor: '50%' },
    { config: 'Classificação (Padrão)', valor: 'Qualy de 18 minutos' },
    { config: 'Classificação (Sprint)', valor: 'Qualy de volta única' },
    { config: 'Corrida', valor: '50%' },
    { config: 'Clima', valor: 'Dinâmico' },
    { config: 'Horário da Sessão', valor: 'Oficial' },
    { config: 'Parque Fechado', valor: 'Sim' },
    { config: 'Dano ao veículo', valor: 'Moderado (Asa Frontal)' },
    { config: 'Frequência do Dano', valor: 'Padrão' },
    { config: 'Fantasma (Ghost)', valor: 'Desligado' },
    { config: 'Corte nas curvas', valor: 'Rígido' },
    { config: 'Temperatura do pneu', valor: 'Simulação' },
    { config: 'Setup do Carro', valor: 'Travado (Pré-Definidos)' },
    { config: 'Bandeiras', valor: 'Ligado' },
    { config: 'Telemetria', valor: 'Pública (Aberta)' },
    { config: 'Safety Car', valor: 'Padrão' },
    { config: 'Bandeira Vermelha', valor: 'Padrão' },
    { config: 'Modo Imersivo', valor: 'Volta de formação, SC, Box' }
];

// ========== CALENDÁRIO DA TEMPORADA ==========
const calendarData = [
    { etapa: 1, modelo: 'Qualy 18"', dataCarreira: '16/04/26', circuito: 'Bahrein', pais: 'BH', flag: '🇧🇭', desempenhoLight: 'Real', desempenhoCarreira: 'Real' },
    { etapa: 2, modelo: 'Qualy 18"', dataCarreira: '11/05/26', circuito: 'Arábia Saudita', pais: 'SA', flag: '🇸🇦', desempenhoLight: 'Igual', desempenhoCarreira: 'Real' },
    { etapa: 3, modelo: 'Qualy 18"', dataCarreira: '30/04/26', circuito: 'Imola', pais: 'IT', flag: '🇮🇹', desempenhoLight: 'Real', desempenhoCarreira: 'Real' },
    { etapa: 4, modelo: 'Sprint', dataCarreira: '07/05/26', circuito: 'Azerbaijão', pais: 'AZ', flag: '🇦🇿', desempenhoLight: 'Igual', desempenhoCarreira: 'Real' },
    { etapa: 5, modelo: 'Qualy 18"', dataCarreira: '14/05/26', circuito: 'Brasil', pais: 'BR', flag: '🇧🇷', desempenhoLight: 'Real', desempenhoCarreira: 'Real' },
    { etapa: 6, modelo: 'Qualy 18"', dataCarreira: '21/05/26', circuito: 'Canadá', pais: 'CA', flag: '🇨🇦', desempenhoLight: 'Igual', desempenhoCarreira: 'Real' },
    { etapa: 7, modelo: 'Qualy 18"', dataCarreira: '28/05/26', circuito: 'México', pais: 'MX', flag: '🇲🇽', desempenhoLight: 'Real', desempenhoCarreira: 'Real' },
    { etapa: 8, modelo: 'Sprint', dataCarreira: '04/06/26', circuito: 'Japão', pais: 'JP', flag: '🇯🇵', desempenhoLight: 'Igual', desempenhoCarreira: 'Real' }
];

// Função para calcular data do Grid Light (3 dias antes)
// Mapeamento dos links das bandeiras por circuito
// Mapeamento do nome do circuito e mapa da pista
// Usando flagcdn.com que é mais confiável e não tem problemas de CORS
const circuitInfo = {
    "Bahrein": {
        nome: "Bahrain International Circuit",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Bahrain.png",
        bandeira: "https://flagcdn.com/w40/bh.png"
    },
    "Arábia Saudita": {
        nome: "Jeddah Corniche Circuit",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/SaudiArabia.png",
        bandeira: "https://flagcdn.com/w40/sa.png"
    },
    "Imola": {
        nome: "Autodromo Enzo e Dino Ferrari",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/EmiliaRomagna.png",
        bandeira: "https://flagcdn.com/w40/it.png"
    },
    "Azerbaijão": {
        nome: "Baku City Circuit",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Azerbaijan.png",
        bandeira: "https://flagcdn.com/w40/az.png"
    },
    "Brasil": {
        nome: "Interlagos",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Brazil.png",
        bandeira: "https://flagcdn.com/w40/br.png"
    },
    "Canadá": {
        nome: "Circuit Gilles-Villeneuve",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Canada.png",
        bandeira: "https://flagcdn.com/w40/ca.png"
    },
    "México": {
        nome: "Autódromo Hermanos Rodríguez",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Mexico.png",
        bandeira: "https://flagcdn.com/w40/mx.png"
    },
    "Japão": {
        nome: "Suzuka International Racing Course",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Japan.png",
        bandeira: "https://flagcdn.com/w40/jp.png"
    }
};
const flagsByCircuit = {
    "Bahrein": "https://flagcdn.com/w40/bh.png",
    "Arábia Saudita": "https://flagcdn.com/w40/sa.png",
    "Imola": "https://flagcdn.com/w40/it.png",
    "Azerbaijão": "https://flagcdn.com/w40/az.png",
    "Brasil": "https://flagcdn.com/w40/br.png",
    "Canadá": "https://flagcdn.com/w40/ca.png",
    "México": "https://flagcdn.com/w40/mx.png",
    "Japão": "https://flagcdn.com/w40/jp.png"
};
const calcLightDate = (carreiraDate) => {
    const [day, month, year] = carreiraDate.split('/');
    const date = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
    date.setDate(date.getDate() - 3);
    const newDay = String(date.getDate()).padStart(2, '0');
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    const newYear = String(date.getFullYear()).slice(-2);
    return `${newDay}/${newMonth}/${newYear}`;
};

const technicalRules = [
    { id: 1, title: 'Desempenho', detail: 'Grid Carreira roda com performance real. Grid Light alterna entre performance real e igual, conforme definido para cada etapa.' },
    { id: 2, title: 'Setup & Assistências', detail: 'Grid Carreira com setup aberto; Grid Light com setup padrão pré-definido. Traçado automático, câmbio automático e ABS/tração completos são permitidos. Pit stop e largada permanecem manuais.' },
    { id: 3, title: 'Telemetria', detail: 'Uso aberto obrigatório. Telemetria fechada gera perda automática de Pontos de Conduta.' }
];

const numberPreferences = [
    'Piloto já no grid na temporada anterior',
    'Piloto promovido do Grid Light',
    'Piloto com histórico na liga',
    'Piloto novato (Por ordem alfabética)',
    'Administração decide em caso de empate'
];

const scoringMain = [
    { pos: '1º', pts: 25 }, { pos: '2º', pts: 18 }, { pos: '3º', pts: 15 }, { pos: '4º', pts: 12 }, { pos: '5º', pts: 10 },
    { pos: '6º', pts: 8 }, { pos: '7º', pts: 6 }, { pos: '8º', pts: 4 }, { pos: '9º', pts: 2 }, { pos: '10º', pts: 1 }
];

const scoringSprint = [
    { pos: '1º', pts: 8 }, { pos: '2º', pts: 7 }, { pos: '3º', pts: 6 }, { pos: '4º', pts: 5 },
    { pos: '5º', pts: 4 }, { pos: '6º', pts: 3 }, { pos: '7º', pts: 2 }, { pos: '8º', pts: 1 }
];

const tiebreakers = [
    'Maior número de vitórias',
    'Maior número de segundos lugares, terceiros lugares, etc...',

    'Ordem alfabética do nome do piloto na transmissão oficial'
];

const draftPriority = [
    { title: 'Grid Carreira - Power', items: ['Power Ranking - Temporada anterior','Pilotos que já disputaram o Grid Carreira na temporada anterior', 'Pilotos promovidos do Grid Light', 'Pilotos com ranking histórico alto', 'Pilotos novatos em ordem alfabética'] },
    { title: 'Grid Light', items: ['Melhor pontuação na temporada anterior', 'Pilotos antigos na liga', 'Pilotos novatos em ordem alfabética'] }
];

// Promoção Obrigatória do Grid Light
const promotionRule = {
    title: 'Promoção Obrigatória',
    description: 'Os 3 primeiros colocados do Grid Light ao final da temporada NÃO poderão mais competir nesse grid. Deverão obrigatoriamente seguir para o Grid Carreira na temporada seguinte. Também poderá haver promoção na metade da temporada em casos de abandono de grid ou excesso de faltas.'
};

// Reservas
const reserveRule = {
    title: 'Reservas',
    description: 'O piloto reserva ocupa a vaga quando o titular não confirma presença. Deve aceitar o carro de menor performance disponível. Pontos conquistados pelo reserva são computados normalmente.'
};

const penaltyScale = [
    { label: 'Advertência', points: '0 pts', detail: 'Aviso oficial na carteira.' },
    { label: 'Leve', points: '5 pts', detail: 'Primeiro aviso com peso menor.' },
    { label: 'Média', points: '10 pts', detail: 'Requer atenção da comissão.' },
    { label: 'Grave', points: '15 pts', detail: 'Impacta draft e reputação.' },
    { label: 'Gravíssima', points: '20 pts + Race Ban', detail: 'Suspensão imediata na etapa seguinte. (Raceban)' }
];

const penaltyAggravations = [
    'Incidentes na largada (até volta 2)',
    'Incidentes na última volta',
    'Incidentes durante ou logo após Safety Car',
    'Reincidência ou omissão de informações para a comissão'
];

const analysisSteps = [
    { label: 'Solicitação', detail: 'Via site/app até as 20h do dia seguinte à corrida.' },
    { label: 'Defesa', detail: 'Até 12:00h do dia seguinte após notificação. Enviar o vídeo onboard pelo link verde do Motorhome (links externos: YouTube, Twitch, etc.).' },
    { label: 'Consequências', detail: 'Ausência de defesa gera perda de Pontos de Conduta e punição leve (+5 pts) sem presumir culpa.' }
];

// ========== DADOS DE BUSCA DO INFOGRÁFICO ==========
const infographicSections = [
    { id: 'info-introducao', elementId: 'info-introducao', title: 'Introdução', keywords: ['introdução', 'master league', 'temporada', 'regulamento', 'oficial', 'imagem', 'gamertag'] },
    { id: 'info-hero', elementId: 'info-hero', title: 'Visão Geral da Temporada', keywords: ['etapa', 'sprint', 'lobby', 'transmissão', '8 etapas', '20:15'] },
    { id: 'info-inscricao', elementId: 'info-inscricao', title: 'Inscrição & Valores', keywords: ['inscrição', 'taxa', 'pagamento', 'reserva', 'reembolso', 'comunicação'] },
    { id: 'info-calendario', elementId: 'info-calendario', title: 'Calendário & Lobby', keywords: ['calendário', 'lobby', 'horário', 'segunda', 'quinta', 'presença', 'host', 'formato', 'qualificação', 'sprint', 'corrida', 'one-shot', '50%', '33%', 'abu dhabi', 'áustria', 'texas', 'espanha', 'catar', 'méxico', 'austrália', 'china', 'circuito', 'etapa 1', 'etapa 2', 'etapa 3', 'etapa 4', 'etapa 5', 'etapa 6', 'etapa 7', 'etapa 8', 'janeiro', 'fevereiro', 'março'] },
    { id: 'info-formato', elementId: 'info-formato', title: 'Formato das Sessões', keywords: ['formato', 'qualificação', 'sprint', 'corrida', 'one-shot', '50%', '33%', 'etapa padrão', 'etapa sprint'] },
    { id: 'info-tecnico', elementId: 'info-tecnico', title: 'Regras Técnicas & Numeração', keywords: ['setup', 'assistência', 'telemetria', 'performance', 'câmbio', 'abs', 'tração', 'numeração', 'número'] },
    { id: 'info-pontuacao', elementId: 'info-pontuacao', title: 'Sistema de Pontuação', keywords: ['pontuação', 'pontos', 'vitória', 'pódio', 'sprint', 'desempate'] },
    { id: 'info-draft', elementId: 'info-draft', title: 'Equipes, Draft & Reservas', keywords: ['draft', 'equipe', 'time', 'escolha', 'prioridade', 'reserva', 'promoção', 'grid light', 'grid carreira'] },
    { id: 'info-punicoes', elementId: 'info-punicoes', title: 'Sistema de Punições', keywords: ['punição', 'penalidade', 'carteira', 'suspensão', 'ban', 'advertência', 'agravante'] },
    { id: 'info-analises', elementId: 'info-analises', title: 'Análises & Defesa', keywords: ['análise', 'defesa', 'vídeo', 'incidente', 'prazo', 'solicitação', 'bug', 'retirada', 'box', 'classificatória', 'qualificação'] },
    { id: 'info-bug-lobby', elementId: 'info-bug-lobby', title: 'Protocolo de Bug de Lobby', keywords: ['bug de lobby', 'queda', 'desconexão', 'qualy', 'corrida', 'grid editado', 'snapshot', '30%', '60%', 'nova data'] },
    { id: 'info-ranking', elementId: 'info-ranking', title: 'Power Ranking', keywords: ['power ranking', 'ranking', 'nota', 'performance', 'conduta', 'racecraft', 'overall', 'histórico'] },
    { id: 'info-ranking-calculo', elementId: 'info-ranking-calculo', title: 'Regras de Cálculo do Power Ranking', keywords: ['power ranking', 'cálculo', 'pilares', 'performance', 'conduta', 'racecraft', 'overall', 'histórico', 'pesos', 'fórmula'] },
    { id: 'info-infracoes', elementId: 'info-infracoes', title: 'Infrações Críticas', keywords: ['infração', 'falta', 'wo', 'ausência', 'foto', 'formulário', 'telemetria'] },
    { id: 'info-premiacao', elementId: 'info-premiacao', title: 'Premiação e Gerais', keywords: ['premiação', 'troféu', 'troféus', 'frete', 'campeão', 'campeã', 'dupla campeã', 'inscrição grátis'] },
    { id: 'info-disposicoes', elementId: 'info-disposicoes', title: 'Disposições Finais', keywords: ['final', 'alteração', 'administração', 'casos omissos', 'soberania', 'decisão', 'foto', 'obrigatório'] }
];

// ========== DADOS DO TEXTO COMPLETO ==========
const regulamentoTexto = [
    {
        id: 'introducao',
        title: '1. Introdução',
        keywords: ['introdução', 'master league', 'temporada', 'regulamento', 'oficial'],
        content: `A Master League F1 é uma liga de automobilismo virtual focada na competitividade justa e organização profissional, utilizando a plataforma oficial da Fórmula 1. A liga preza pela diversão na pista e cordialidade nos bastidores, priorizando a qualidade na condução dos campeonatos.

1.1. Inscrição e Valores

A participação na liga é mediante pagamento de taxa de inscrição.

O valor da taxa é anunciado pela administração antes do início de cada temporada através dos grupos de WhatsApp ou canais oficiais da Master League F1.

Política para Reservas: O piloto reserva paga o valor total do campeonato no ato da inscrição. O valor proporcional das etapas em que o reserva não participar poderá ser devolvido ao final da temporada ou utilizado como crédito para abater a inscrição da temporada seguinte.

Política de Reembolso (Titulares): Não haverá reembolso de inscrição em caso de desistência após o início do campeonato, expulsão por infração ao regulamento, ou após a realização do Draft para escolha das equipes.

Ao se inscrever, o piloto concorda com o uso de sua imagem (gamertag/nome/foto) nas transmissões e mídias sociais da liga.

1.2. Plataforma e Transmissão

Jogo: F1 25 (Crossplay ativado).

Grid Light: Segundas-feiras, às 20:15h.

Grid Carreira: Quintas-feiras, às 20:15h.

Transmissão: Todas as corridas da Temporada 20 terão transmissão programada com narração ao vivo.`
    },
    {
        id: 'inscricao',
        title: '1. Inscrição e Taxas',
        keywords: ['inscrição', 'taxa', 'pagamento', 'valor', 'reembolso', 'reserva', 'vaga'],
        content: `A participação na liga é mediante pagamento de taxa de inscrição.

O valor da taxa é anunciado pela administração antes do início de cada temporada através dos grupos de WhatsApp ou canais oficiais da Master League F1.

Política para Reservas: O piloto reserva paga o valor total do campeonato no ato da inscrição. O valor proporcional das etapas em que o reserva não participar poderá ser devolvido ao final da temporada ou utilizado como crédito para abater a inscrição da temporada seguinte.

Política de Reembolso (Titulares): Não haverá reembolso de inscrição em caso de desistência após o início do campeonato, expulsão por infração ao regulamento, ou após a realização do Draft para escolha das equipes.

Ao se inscrever, o piloto concorda com o uso de sua imagem (gamertag/nome/foto) nas transmissões e mídias sociais da liga.`
    },
    {
        id: 'calendario',
        title: '2. Calendário e Horários',
        keywords: ['calendário', 'horário', 'etapa', 'corrida', 'segunda', 'quinta', 'lobby', '20:15'],
        content: `2.1. Temporada

O calendário terá 8 Etapas. As datas serão divulgadas nos canais da Master League F1.

Serão realizadas 2 Corridas Sprint por temporada.

2.2. Horários e Convites

Início: As corridas iniciam pontualmente às 20:15h.

Abertura do Lobby: Pelo menos 15 minutos de antecedência.

Sistema de Convites: Apenas os hosts recebem o convite inicial. Pilotos devem entrar pelo perfil do host ou de outros pilotos da mesma plataforma. Convites diretos apenas para contas EA vinculadas.

Lista de Presença: É obrigatória a resposta à lista de presença. A ausência de resposta acarreta perda de Pontos de Conduta.`,
        tables: [
            {
                title: 'Calendário Grid Light - Temporada 21',
                headers: ['Etapa', 'Data', 'Circuito', 'Desempenho'],
                rows: calendarData.map((item) => {
                    const isSprint = item.modelo === 'Sprint';
                    const isQualy = item.modelo === 'Qualy 18"';
                    const info = circuitInfo[item.circuito] || {};
                    const etapa = item.circuito + (isSprint ? ' **' : isQualy ? ' *' : '');
                    return [etapa, calcLightDate(item.dataCarreira), info.nome || item.circuito, item.desempenhoLight || 'Igual'];
                })
            },
            {
                title: 'Calendário Grid Carreira - Temporada 21',
                headers: ['Etapa', 'Data', 'Circuito', 'Desempenho'],
                rows: calendarData.map((item) => {
                    const isSprint = item.modelo === 'Sprint';
                    const isQualy = item.modelo === 'Qualy 18"';
                    const info = circuitInfo[item.circuito] || {};
                    const etapa = item.circuito + (isSprint ? ' **' : isQualy ? ' *' : '');
                    return [etapa, item.dataCarreira, info.nome || item.circuito, item.desempenhoCarreira || 'Real'];
                })
            }
        ],
        extra: `⏰ Todas as etapas iniciam às 20:15h

* Qualificação 18 minutos
** Sprint (Haverá um qualy antes da Sprint e outro qualy antes da corrida)

2.4. Configurações do Lobby

Volta de Apresentação - Sim
Assistência de Freios - Sim
ABS - Sim
Controle de Tração - Completo
Câmbio - Automático
Assistência de Box - Não
Linha - Somente nas curvas
Assistência de DRS/ERS - Não
Combustível - Difícil
Largada - Manual
Previsão do Tempo - Aproximada
Modo de Recuperação - Nenhuma
Liberação de box insegura - Sim
Nível IA - 50%
Classificação (Padrão) - Qualy de 18 minutos
Classificação (Sprint) - Qualy de volta única
Corrida - 50%
Clima - Dinâmico
Horário da Sessão - Oficial
Parque Fechado - Sim
Dano ao veículo - Moderado (Asa Frontal)
Frequência do Dano - Padrão
Fantasma (Ghost) - Desligado
Corte nas curvas - Rígido
Temperatura do pneu - Simulação
Setup do Carro - Grid Carreira Aberto / Grid Light Travado (Pré-Definidos)
Bandeiras - Ligado
Telemetria - Pública (Aberta)
Safety Car - Padrão
Bandeira Vermelha - Padrão
Modo Imersivo - Volta de formação, SC e Box`
    },
    {
        id: 'formato',
        title: '3. Formato das Sessões',
        keywords: ['formato', 'qualificação', 'sprint', 'corrida', 'one-shot', '50%', '33%'],
        content: `2.3. Formato das Sessões

Etapa Padrão: Qualificação de 18 minutos + Corrida de 50%.

Etapa com Sprint: Haverá um qualy antes da Sprint e outro qualy antes da corrida. Sprint (~33%) + Corrida Principal (50%).`
    },
    {
        id: 'pontuacao',
        title: '4. Sistema de Pontuação',
        keywords: ['pontuação', 'pontos', 'vitória', 'pódio', 'sprint', 'desempate'],
        content: `4.1. Corrida Principal (Padrão FIA): 25, 18, 15, 12, 10, 8, 6, 4, 2, 1.

4.2. Corrida Sprint: 8, 7, 6, 5, 4, 3, 2, 1.`,
        tables: [
            {
                title: 'Corrida Principal',
                headers: ['Posição', 'Pontos'],
                rows: scoringMain.map(s => [s.pos, s.pts])
            },
            {
                title: 'Corrida Sprint',
                headers: ['Posição', 'Pontos'],
                rows: scoringSprint.map(s => [s.pos, s.pts])
            }
        ],
        extra: `4.3. Desempate: Vitórias > 2º Lugares > 3º Lugares, etc... > Ordem alfabética do nome na transmissão.`
    },
    {
        id: 'tecnico',
        title: '5. Configurações Técnicas',
        keywords: ['setup', 'assistência', 'telemetria', 'performance', 'câmbio', 'abs', 'tração'],
        content: `3.1. Desempenho e Setup

Grid Light: Desempenho alternado entre REAL e IGUAL (conforme etapa definida pela administração).

Grid Carreira: Desempenho REAL em todas as etapas.

Setup Grid Carreira: ABERTO.

Setup Grid Light: Padrão (Pré-Definido).

3.2. Assistências e Configurações

Traçado: Apenas nas curvas.

Câmbio: Automático permitido.

Freios/Tração: ABS, Freios e Tração Completa permitidos.

Pit Stop/Largada: Manuais.

3.4. Telemetria e Número de Piloto

Uso obrigatório de telemetria aberta.

Telemetria fechada ou número incorreto acarreta em perda de Pontos de Conduta.`
    },
    {
        id: 'numeracao',
        title: '6. Numeração de Pilotos',
        keywords: ['número', 'numeração', 'piloto', 'duplicidade'],
        content: `3.3. Numeração dos Carros

É obrigatório o uso do número do carro configurado no jogo igual ao registrado na liga.

Não são permitidos números duplicados no mesmo grid.

Ordem de preferência para escolha do número:

1. Piloto que já estava no grid na temporada anterior.
2. Piloto da liga que vem de outro grid (transferência interna).
3. Piloto que já participou da liga anteriormente (retorno).
4. Piloto novato (Por ordem alfabética).

Caso não haja acordo entre pilotos com números iguais, a administração definirá a numeração.

Punição: Uso de número errado acarretam em perda de Pontos de Conduta e advertência/multa em pontos de campeonato conforme reincidência.`
    },
    {
        id: 'draft',
        title: '7. Draft e Equipes',
        keywords: ['draft', 'equipe', 'time', 'escolha', 'prioridade', 'reserva'],
        content: `5.1. Escolha de Equipes (Draft)

Realizada via site/app ou whatsapp com propostas e contratos.`,
        tables: [
            {
                title: 'Prioridade Grid Carreira',
                headers: ['Ordem', 'Critério'],
                rows: [
                    ['1º', 'Power Ranking - Temporada anterior'],
                    ['2º', 'Pilotos que já disputaram o Grid Carreira na temporada anterior'],
                    ['3º', 'Pilotos promovidos do Grid Light'],
                    ['4º', 'Pilotos com ranking histórico alto'],
                    ['5º', 'Pilotos novatos (por ordem alfabética)']
                ]
            },
            {
                title: 'Prioridade Grid Light',
                headers: ['Ordem', 'Critério'],
                rows: [
                    ['1º', 'Melhor pontuação na temporada anterior'],
                    ['2º', 'Pilotos antigos na liga'],
                    ['3º', 'Pilotos novatos (por ordem alfabética)']
                ]
            }
        ],
        extra: `5.2. Regras para Reservas

O reserva ocupa a vaga quando o titular sinaliza ausência na lista de presença.

Prioridade: O reserva melhor qualificado escolhe primeiro a vaga, mas deve correr com o pior carro disponível (pela ordem de forças).

Reservas pontuam para o campeonato de pilotos e construtores.

5.3. Mudanças de Grid

Piloto que ficar nas últimas posições no grid carreira não é obrigado a ir pro Light mas a administração poderá analisar o pedido.

Mudanças de grid durante a temporada serão analisadas pela administração.

Todas as categorias correm com os carros de F1.

5.4. Substituição por Ausências

Caso de ausência em duas etapas sem aviso ou justificativa, a liga terá direito de substituir o piloto após a quarta etapa e o colocar como reserva no grid.

5.5. Promoção Obrigatória

Os 3 primeiros colocados do Grid Light ao final da temporada NÃO poderão mais competir nesse grid e deverão obrigatoriamente seguir para o Grid Carreira na temporada seguinte.

Também poderá haver promoção de pilotos na metade da temporada em casos de abandono de grid ou excesso de faltas.`
    },
    {
        id: 'punicoes',
        title: '8. Sistema de Punições',
        keywords: ['punição', 'penalidade', 'carteira', 'suspensão', 'ban', 'advertência', 'pontos'],
        content: `6.1. Penalidades em Pista (Carteira de Pontos)

A liga utiliza um sistema de carteira de pontos progressiva. Acúmulo de pontos leva a suspensões e impacta o Power Ranking.`,
        tables: [
            {
                title: 'Escala de Punições',
                headers: ['Nível', 'Pontos', 'Descrição'],
                rows: penaltyScale.map(p => [p.label, p.points, p.detail])
            }
        ],
        extra: `Agravantes (+5 pts): Largada (até volta 2), Última volta, Safety Car, Reincidência.

Suspensão: Ao atingir 20 pontos de penalização nas análises (incidentes de pista) na carteira, o piloto cumpre suspensão automática na etapa seguinte (Race Ban). Não entram nessa conta as perdas de pontos por falta de envio do vídeo de defesa.`
    },
    {
        id: 'analises',
        title: '9. Análises e Defesa',
        keywords: ['análise', 'defesa', 'vídeo', 'incidente', 'prazo', 'solicitação', 'bug', 'retirada', 'box', 'classificatória', 'qualificação'],
        content: `6.2. Procedimento de Análise

Solicitação via site/app até as 20h do dia seguinte da corrida (Vídeo Onboard). Defesa até 12:00h do dia seguinte após notificação da comissão (enviar o vídeo pelo link verde do Motorhome).

Obrigatório vídeo Onboard (links externos).

A não apresentação de defesa não implica culpa automática, mas gera perda de Pontos de Conduta e punição leve (+5 pts na carteira).

IMPORTANTE: Vídeos privados, sem nitidez, com palavrão ou que impossibilitem análise por algum motivo técnico serão automaticamente descartados pela comissão.

6.3. Retirada de Punições de Bug

Não serão aceitas solicitações de retirada de punições de bug que tenham sido pagas no box durante a corrida.

Não serão aceitas solicitações de retirada de punições de bug ocorridas durante a sessão classificatória (qualificação).

Bug de posição por conta de abandono do lobby antes da bandeirada final não é retirado e a posição final da transmissão é validada.`
    },
    {
        id: 'bug-lobby',
        title: '9.1. Regulamento Técnico - Protocolo de Bug de Lobby',
        keywords: ['bug de lobby', 'queda', 'travamento', 'desconexão', 'qualy', 'corrida', 'grid editado', 'snapshot', 'nova data', 'adiamento'],
        content: `MASTER LEAGUE F1
Regulamento Técnico - Protocolo de Bug de Lobby

1. Introdução e Objetivo
Este protocolo define os procedimentos a serem adotados em caso de bug ou queda de lobby durante as sessões de classificação (qualy) e corrida da Master League F1. O objetivo é garantir decisões rápidas, claras e justas para todos os participantes, sem margem para interpretações divergentes.
O formato padrão de cada etapa consiste em: sessão de classificação com duração de 18 minutos, seguida de corrida com 50% do número total de voltas do circuito.

2. Definições
Bug de lobby: qualquer queda, travamento ou desconexão que encerre involuntariamente a sessão para um ou mais pilotos.
Sessão preservada: a sessão é considerada válida e seus resultados são mantidos integralmente.
Grid editado: o grid de largada é configurado manualmente pela administração com base nos tempos de classificação válidos.
Snapshot de resultado: registro da posição de cada piloto na última volta completa registrada antes do bug.
Nova data: sessão reagendada para dia e horário a serem definidos pela administração.

3. Cenários - Sessão de Classificação (Qualy)
A sessão de classificação tem duração total de 18 minutos. Os cenários abaixo são avaliados com base no tempo decorrido no momento do bug.

Art. 3.1 - Bug com mais de 10 minutos restantes (antes de 44% do tempo decorrido)
Condição: o lobby cai quando ainda restam mais de 10 minutos na sessão de classificação.
Qualy: Inválido - sessão encerrada sem aproveitamento dos tempos registrados.
Corrida: Não realizada - aguarda refazer o qualy.
Ação: o qualy é refeito integralmente na mesma data. A corrida ocorre somente após novo qualy válido.

Art. 3.2 - Bug após 10 minutos decorridos (mais de 55% do tempo disputado)
Condição: o lobby cai quando já foram disputados mais de 10 minutos da sessão de classificação.
Qualy: Válido - os tempos registrados até o momento do bug são aproveitados.
Corrida: Realizada no mesmo dia com grid editado.
Ação: a administração configura o grid manualmente com base nos tempos válidos. A corrida segue normalmente.

4. Cenários - Corrida
A corrida tem duração de 50% das voltas totais do circuito. Os cenários abaixo são avaliados com base no percentual de voltas completadas no momento do bug.

Art. 4.1 - Bug antes de 30% das voltas completadas
Condição: o lobby cai antes de atingir 30% das voltas totais da corrida.
Qualy: Válido - os tempos de classificação são preservados.
Corrida: Resultado anulado - a corrida é reiniciada.
Ação: a administração edita o grid com as posições do qualy original e a corrida é refeita no mesmo dia.

Art. 4.2 - Bug entre 30% e 60% das voltas completadas
Condição: o lobby cai após 30% e antes de 60% das voltas totais da corrida.
Qualy: Válido - os tempos de classificação são preservados.
Corrida: Resultado anulado - a corrida é refeita em nova data.
Ação: a administração define nova data para realizar a corrida completa, mantendo o grid do qualy original.

Art. 4.3 - Bug após 60% das voltas completadas
Condição: o lobby cai após 60% ou mais das voltas totais da corrida.
Qualy: Válido.
Corrida: Resultado válido - corrida encerrada.
Ação: o resultado é capturado com base nas posições da última volta completa registrada antes do bug. Os pontos são distribuídos normalmente.

5. Bug Recorrente
Caso o lobby apresente duas ou mais quedas durante a mesma etapa - seja durante o qualy ou a corrida -, independentemente do momento ou percentual atingido, a etapa será imediatamente encerrada e integralmente adiada para uma nova data definida pela administração. Na nova data, tanto o qualy quanto a corrida serão refeitos do início.

6. Invalidação de Pedidos de Análise
Sessões canceladas ou adiadas nos termos deste regulamento invalidam automaticamente todos os pedidos de análise referentes à sessão em questão. Não serão aceitas solicitações de análise, revisão de penalidades ou contestações relacionadas a eventos ocorridos em sessões que não tiveram seu resultado homologado. Pedidos de análise somente poderão ser protocolados após a realização e homologação da sessão substituta, com base nos eventos ocorridos nessa nova sessão.`
    },
    {
        id: 'powerranking',
        title: '10. Power Ranking',
        keywords: ['power ranking', 'ranking', 'nota', 'avaliação', 'performance', 'conduta', 'racecraft'],
        content: `O Power Ranking (PR) é o sistema que define o valor de mercado do piloto, as prioridades de draft e a elegibilidade para equipes.

7.1. Composição do Power Ranking

A nota final do piloto é composta por 5 pilares:`,
        tables: [
            {
                title: 'Pilares do Power Ranking',
                headers: ['Pilar', 'Descrição'],
                rows: [
                    ['Pontos de Performance', 'Baseado nos resultados obtidos na pista (Classificação e Corrida).'],
                    ['Pontos de Conduta', 'Baseado no cumprimento das obrigações da liga (ver item 7.2).'],
                    ['Pontos de Racecraft', 'Avaliação da performance técnica e limpa durante as corridas (ganho de posições, consistência, poucos incidentes).'],
                    ['Overall', 'Baseado no atingimento dos objetivos estipulados pela equipe/contrato.'],
                    ['Histórico', 'Pontuação acumulada histórica na Master League F1.']
                ]
            }
        ],
        extra: `7.2. Infrações de Conduta (Perda de Pontos)

O piloto perderá Pontos de Conduta (afetando seu Power Ranking e status na liga) nas seguintes situações:

• Não enviar a foto oficial para o campeonato.
• Faltar às etapas (W.O.).
• Não responder à lista de presença nos prazos estipulados.
• Receber punições em análises (incidentes de pista).
• Correr com Telemetria Fechada.
• Correr com numeração do carro errada (diferente da registrada).
• Não enviar vídeo de defesa quando solicitado.`
    },
    {
        id: 'powerranking-calculo',
        title: '10.1 Aditivo – Regras de Cálculo do Power Ranking (28/01/2026)',
        keywords: ['power ranking', 'cálculo', 'pilares', 'performance', 'conduta', 'racecraft', 'overall', 'histórico', 'pesos', 'fórmula'],
        content: `Este aditivo foi inserido em 28 de janeiro de 2026 e detalha como os pilares do Power Ranking são compostos e como a nota final é calculada.

Peso de cada pilar na nota final (Power Ranking):`,
        tables: [
            {
                title: 'Pesos dos pilares na nota final',
                headers: ['Pilar', 'Peso'],
                rows: [
                    ['Performance', '30%'],
                    ['Racecraft', '25%'],
                    ['Overall', '20%'],
                    ['Conduta', '15%'],
                    ['Histórico', '10%']
                ]
            },
            {
                title: 'Pilar 1 – Performance (escala 60–100)',
                headers: ['Regra', 'Descrição'],
                rows: [
                    ['Base', 'Percentual dos pontos da temporada atual em relação ao maior PR do mesmo grid (Carreira ou Light). Escala: 60 + (percentual × 0,24).'],
                    ['Bônus por etapa', 'Por cada etapa (1 a 8): +1 se não houver NC RACE; +1 se não houver PUNISH RACE. Máximo 16 pontos de bônus.']
                ]
            },
            {
                title: 'Pilar 2 – Conduta (escala 0–100)',
                headers: ['Regra', 'Descrição'],
                rows: [
                    ['Base', '100 pontos.'],
                    ['Foto não enviada', '-5 (uma vez por temporada).'],
                    ['Por etapa', 'Lista de presença não respondida: -1; Numeração errada: -1; Telemetria fechada: -1; Pontos descontados manuais (conforme aplicado).'],
                    ['Faltas W.O.', '-3 por falta.'],
                    ['Punições (análises)', 'Metade do valor exibido de defesa faltante (5 pts por defesa não enviada) + metade do valor exibido de punições de incidentes.'],
                    ['Advertências', '-1 por advertência.']
                ]
            },
            {
                title: 'Pilar 3 – Racecraft (escala 60–100)',
                headers: ['Componente', 'Peso'],
                rows: [
                    ['Ritmo de Corrida', '30%'],
                    ['POS. Q (posição média qualy)', '20%'],
                    ['Ritmo de Classificação (QUALY)', '20%'],
                    ['POS. R (posição média corrida)', '30%'],
                    ['Mínimo', '60.']
                ]
            },
            {
                title: 'Pilar 4 – Overall (escala 60–100)',
                headers: ['Regra', 'Descrição'],
                rows: [
                    ['Cálculo', 'Soma dos pontos dos 5 objetivos contratuais (metas da equipe/contrato).'],
                    ['Sem corridas na temporada', 'Base 60.']
                ]
            },
            {
                title: 'Pilar 5 – Histórico (escala 60–100)',
                headers: ['Componente', 'Descrição'],
                rows: [
                    ['60%', 'PR histórico normalizado: média ponderada das últimas 5 temporadas (T atual 35%, T-1 25%, T-2 20%, T-3 15%, T-4 5%) em relação ao maior PR do mesmo grid. Escala 60–100.'],
                    ['40%', 'Pontuação por quantidade de temporadas disputadas: quantidade + 80 (máx. 100). Ex.: 20 temporadas = 100.']
                ]
            },
            {
                title: 'Fórmula da nota final (Power Ranking)',
                headers: ['Fórmula / Regra', 'Descrição'],
                rows: [
                    ['Cálculo pelos pilares', 'PR = (Performance × 0,30) + (Racecraft × 0,25) + (Overall × 0,20) + (Conduta × 0,15) + (Histórico × 0,10)'],
                    ['Desconto por faltas (W.O.)', 'Cada falta do piloto (ausência em etapa) desconta 2 pontos no número final do Power Ranking. Ex.: nota 95 com 2 faltas = Power Ranking final 91.']
                ]
            }
        ]
    },
    {
        id: 'infracoes',
        title: '11. Infrações Críticas',
        keywords: ['infração', 'falta', 'wo', 'ausência', 'foto', 'formulário'],
        content: `As seguintes ações reduzem automaticamente Pontos de Conduta e Power Ranking:

• Não enviar foto oficial solicitada pelo campeonato
• Faltar a etapas (W.O.) sem justificativa
• Ignorar lista de presença ou formulários obrigatórios
• Acúmulo de punições em análises de incidentes
• Usar telemetria fechada sem autorização
• Piloto com numeração incorreta ou alteração não comunicada
• Não responder vídeo de defesa quando solicitado pela comissão

Comunicação e clareza valem tanto quanto velocidade. Pilotos colaborativos têm melhor reputação na liga.`
    },
    {
        id: 'premiacao',
        title: '12. Premiação e Gerais',
        keywords: ['premiação', 'troféu', 'troféus', 'frete', 'campeão', 'campeã', 'dupla campeã', 'inscrição grátis'],
        content: `8.1. Premiação

Troféus: Para os 3 primeiros de cada grid (Frete por conta do piloto; prazo de envio após 2 temporadas custo de frete é da liga).

Inscrição Grátis: Para a dupla campeã de equipes (uso na temporada seguinte).`
    },
    {
        id: 'disposicoes',
        title: '13. Disposições Finais',
        keywords: ['final', 'alteração', 'administração', 'casos omissos', 'foto', 'obrigatório'],
        content: `8.2. Disposições Finais

É obrigatório o envio de foto para o campeonato (sujeito a perda de conduta).

Casos omissos serão resolvidos pela Administração da Master League F1.

• Este regulamento pode ser alterado pela administração a qualquer momento, com aviso prévio aos participantes.
• A decisão da administração é soberana e definitiva em todas as situações.
• Ao participar da Master League F1, o piloto declara ter lido e concordado com todas as regras aqui estabelecidas.

© 2025 Master League F1 • Regulamento Oficial Temporada 20`
    }
];

// ========== COMPONENTE PRINCIPAL ==========
const Regulamento = () => {
    const [viewMode, setViewMode] = useState('infographic');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSection, setActiveSection] = useState(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const searchInputRef = useRef(null);
    const textContentRef = useRef(null);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // Mostrar/esconder botão de voltar ao topo
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Busca com sugestões - funciona em ambos os modos
    const handleSearch = useCallback((term) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            setShowSuggestions(false);
            return;
        }

        const termLower = term.toLowerCase();
        const results = [];

        if (viewMode === 'text') {
            // Busca no modo texto
            regulamentoTexto.forEach(section => {
                const titleMatch = section.title.toLowerCase().includes(termLower);
                const keywordMatch = section.keywords.some(k => k.includes(termLower));
                const contentMatch = section.content.toLowerCase().includes(termLower);

                if (titleMatch || keywordMatch || contentMatch) {
                    let snippet = '';
                    if (contentMatch) {
                        const idx = section.content.toLowerCase().indexOf(termLower);
                        const start = Math.max(0, idx - 40);
                        const end = Math.min(section.content.length, idx + term.length + 40);
                        snippet = (start > 0 ? '...' : '') + section.content.slice(start, end) + (end < section.content.length ? '...' : '');
                    }
                    results.push({
                        id: section.id,
                        title: section.title,
                        snippet,
                        matchType: titleMatch ? 'title' : keywordMatch ? 'keyword' : 'content',
                        mode: 'text'
                    });
                }
            });
        } else {
            // Busca no modo infográfico
            infographicSections.forEach(section => {
                const titleMatch = section.title.toLowerCase().includes(termLower);
                const keywordMatch = section.keywords.some(k => k.includes(termLower));

                if (titleMatch || keywordMatch) {
                    results.push({
                        id: section.id,
                        elementId: section.elementId,
                        title: section.title,
                        snippet: section.keywords.filter(k => k.includes(termLower)).slice(0, 3).join(', '),
                        matchType: titleMatch ? 'title' : 'keyword',
                        mode: 'infographic'
                    });
                }
            });
        }

        setSearchResults(results);
        setShowSuggestions(results.length > 0);
    }, [viewMode]);

    // Scroll para seção - funciona em ambos os modos
    const scrollToSection = useCallback((result) => {
        setShowSuggestions(false);
        setSearchTerm('');
        setSearchResults([]);
        
        setTimeout(() => {
            let element;
            if (result.mode === 'text') {
                element = document.getElementById(`section-${result.id}`);
                setActiveSection(result.id);
            } else {
                element = document.getElementById(result.elementId);
            }
            
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                element.classList.add('highlight-section');
                setTimeout(() => element.classList.remove('highlight-section'), 2000);
            }
        }, 100);
    }, []);

    // Scroll para seção do índice (modo texto)
    const scrollToTextSection = useCallback((sectionId) => {
        setActiveSection(sectionId);
        setTimeout(() => {
            const element = document.getElementById(`section-${sectionId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const handleSave = () => {
        // Gera conteúdo do regulamento em texto
        let content = 'REGULAMENTO OFICIAL - MASTER LEAGUE F1\n';
        content += 'Temporada 20\n';
        content += '='.repeat(50) + '\n\n';
        
        regulamentoTexto.forEach(section => {
            content += section.title.toUpperCase() + '\n';
            content += '-'.repeat(40) + '\n';
            content += section.content + '\n\n';
            
            if (section.tables) {
                section.tables.forEach(table => {
                    content += '\n' + table.title + ':\n';
                    content += table.headers.join(' | ') + '\n';
                    table.rows.forEach(row => {
                        content += row.join(' | ') + '\n';
                    });
                    content += '\n';
                });
            }
        });
        
        // Cria blob e faz download
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Regulamento_ML1_T20.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const clearSearch = () => {
        setSearchTerm('');
        setSearchResults([]);
        setShowSuggestions(false);
    };

    // Índice de navegação
    const tableOfContents = useMemo(() => 
        regulamentoTexto.map(s => ({ id: s.id, title: s.title })),
    []);

    return (
        <div className="regulamento-page">
            {/* Watermark */}
            <div className="reg-watermark">
                <img src="/team-logos/logo-ml.png" alt="" />
            </div>

            <header className="regulamento-header">
                {/* Linha do título com botões */}
                <div className="reg-pill-row">
                    <div className="reg-pill-spacer"></div>
                    <span className="regulamento-header-pill">Temporada 20 • Regulamento Oficial ML1</span>
                    <div className="reg-header-actions">
                        <button className="reg-action-btn-icon" onClick={handlePrint} title="Imprimir">
                            <Printer size={18} />
                        </button>
                        <button className="reg-action-btn-icon save" onClick={handleSave} title="Salvar Regulamento">
                            <Save size={18} />
                        </button>
                    </div>
                </div>
                <h1>Regulamento Oficial • Master League F1</h1>
                <p>
                    {viewMode === 'infographic' 
                        ? 'Infográfico dinâmico com tudo que você precisa saber para competir na Temporada 20.'
                        : 'Versão completa para leitura com índice, busca e opção de impressão.'}
                </p>

                {/* Toggle Switch */}
                <div className="reg-view-toggle">
                    <span className={viewMode === 'infographic' ? 'active' : ''}>Infográfico</span>
                    <button
                        className={`toggle-switch ${viewMode === 'text' ? 'active' : ''}`}
                        onClick={() => setViewMode(viewMode === 'infographic' ? 'text' : 'infographic')}
                        aria-label="Alternar modo de visualização"
                    >
                        <span className="toggle-slider"></span>
                    </button>
                    <span className={viewMode === 'text' ? 'active' : ''}>Texto</span>
                </div>

                {/* Campo de Busca */}
                <div className="reg-search-container">
                    <div className="reg-search-box">
                        <Search className="reg-search-icon" size={20} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar no regulamento..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowSuggestions(true)}
                        />
                        {searchTerm && (
                            <button className="reg-search-clear" onClick={clearSearch}>
                                <X size={18} />
                            </button>
                        )}
                    </div>
                    
                    {/* Sugestões de busca */}
                    {showSuggestions && (
                        <div className="reg-search-suggestions">
                            {searchResults.map(result => (
                                <button
                                    key={result.id}
                                    className="reg-suggestion-item"
                                    onClick={() => scrollToSection(result)}
                                >
                                    <ChevronRight size={16} />
                                    <div>
                                        <strong>{result.title}</strong>
                                        {result.snippet && <span>{result.snippet}</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {viewMode === 'text' ? (
                <div className="reg-text-container" ref={textContentRef}>
                    {/* Índice */}
                    <nav className="reg-text-index">
                        <h3><BookOpen size={20} /> Índice</h3>
                        <ul>
                            {tableOfContents.map(item => (
                                <li key={item.id}>
                                    <button onClick={() => scrollToTextSection(item.id)}>
                                        {item.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Conteúdo do regulamento */}
                    <div className="reg-text-content">
                        {/* Hero Stats - Visão Geral */}
                        <section id="section-hero" className="reg-text-section">
                            <h2>Visão Geral da Temporada</h2>
                            <div className="reg-text-body">
                                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px'}}>
                                    {heroStats.map((stat) => {
                                        const Icon = stat.icon;
                                        return (
                                            <div key={stat.id} style={{background: 'rgba(6, 182, 212, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.2)'}}>
                                                <Icon style={{marginBottom: '12px', color: '#06b6d4'}} size={32} />
                                                <h3 style={{fontSize: '1.1rem', marginBottom: '8px', color: '#e2e8f0'}}>{stat.title}</h3>
                                                <p style={{fontSize: '0.9rem', color: '#94a3b8', margin: 0}}>{stat.detail}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        {regulamentoTexto.map(section => (
                            <section
                                key={section.id}
                                id={`section-${section.id}`}
                                className={`reg-text-section ${activeSection === section.id ? 'active' : ''}`}
                            >
                                <h2>{section.title}</h2>
                                <div className="reg-text-body">
                                    {section.content.split('\n').map((paragraph, idx) => (
                                        paragraph.trim() && <p key={idx}>{paragraph}</p>
                                    ))}
                                </div>

                                {/* Tabelas */}
                                {section.tables && section.tables.map((table, tIdx) => (
                                    <div key={tIdx} className="reg-text-table-wrapper">
                                        <h4>{table.title}</h4>
                                        <table className="reg-text-table">
                                            <thead>
                                                <tr>
                                                    {table.headers.map((h, hIdx) => (
                                                        <th key={hIdx}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {table.rows.map((row, rIdx) => (
                                                    <tr key={rIdx}>
                                                        {row.map((cell, cIdx) => (
                                                            <td key={cIdx}>{cell}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}

                                {/* Conteúdo extra */}
                                {section.extra && (
                                    <div className="reg-text-extra">
                                        {section.extra.split('\n').map((line, idx) => (
                                            line.trim() && <p key={idx}>{line}</p>
                                        ))}
                                    </div>
                                )}
                            </section>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {/* ========== INFOGRÁFICO ========== */}
                    {/* Seção Introdução */}
                    <section id="info-introducao" className="reg-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Introdução e Modelo de Liga</h2>
                                <p>Liga de automobilismo virtual focada na competitividade justa e organização profissional.</p>
                            </div>
                            <span className="reg-mini-pill">F1 25 • Crossplay</span>
                        </div>
                        <div className="info-card">
                            <Info className="reg-icon" />
                            <div>
                                <p>A Master League F1 é uma liga de automobilismo virtual focada na competitividade justa e organização profissional, utilizando a plataforma oficial da Fórmula 1. A liga preza pela diversão na pista e cordialidade nos bastidores, priorizando a qualidade na condução dos campeonatos.</p>
                                <div style={{marginTop: '20px', padding: '16px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.2)'}}>
                                    <h4 style={{marginTop: 0, marginBottom: '12px', color: '#06b6d4'}}>1.2. Plataforma e Transmissão</h4>
                                    <p style={{margin: '4px 0'}}><strong>Jogo:</strong> F1 25 (Crossplay ativado)</p>
                                    <p style={{margin: '4px 0'}}><strong>Grid Light:</strong> Segundas-feiras, às 20:15h</p>
                                    <p style={{margin: '4px 0'}}><strong>Grid Carreira:</strong> Quintas-feiras, às 20:15h</p>
                                    <p style={{margin: '4px 0'}}><strong>Transmissão:</strong> Todas as corridas da Temporada 20 terão transmissão programada com narração ao vivo</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div id="info-hero" className="reg-hero-grid">
                        {heroStats.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <article key={stat.id} className="reg-hero-card">
                                    <div className="reg-hero-icon">
                                        <Icon className="stat-icon" />
                                    </div>
                                    <h3>{stat.title}</h3>
                                    <p>{stat.detail}</p>
                                </article>
                            );
                        })}
                    </div>

                    <section id="info-inscricao" className="reg-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Inscrição &amp; Valores</h2>
                                <p>Taxas anunciadas em grupos oficiais; concordar com o regulamento ativa o uso de imagem e presença.</p>
                            </div>
                            <span className="reg-mini-pill">Pagamentos confirmam vaga e direitos de mídia</span>
                        </div>
                        <div className="reg-highlight-grid">
                            {registrationHighlights.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <article key={item.id} className="reg-highlight-card">
                                        <div className="reg-highlight-icon"><Icon /></div>
                                        <h3>{item.title}</h3>
                                        <p>{item.desc}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section id="info-calendario" className="reg-section reg-section-calendar">
                        <div className="reg-section-title">
                            <div>
                                <h2>Calendário &amp; Lobby</h2>
                                <p>8 etapas com transmissões programadas, lobby com início fixo e presença obrigatória.</p>
                            </div>
                            <span className="reg-mini-pill">Segundas e quintas • 20:15h</span>
                        </div>
                        <div className="reg-calendar-grid">
                            <article className="reg-calendar-card">
                                <h3>Grid Light</h3>
                                <p className="reg-calendar-sub">Segundas-feiras • 20:15h</p>
                                <p>Performance alternada entre real e igual por etapa; setup pré-definido e foco em evolução para acesso ao Grid Carreira.</p>
                            </article>
                            <article className="reg-calendar-card">
                                <h3>Grid Carreira</h3>
                                <p className="reg-calendar-sub">Quintas-feiras • 20:15h</p>
                                <p>Performance real, setup aberto e pontos decisivos para o Power Ranking.</p>
                            </article>
                        </div>

                        {/* Tabelas de Calendário */}

                        <div className="reg-calendar-tables">
                            <div className="reg-calendar-table-wrapper">
                                <h3 className="reg-calendar-table-title">📅 Calendário Grid Light - Temporada 21</h3>
                                <table className="reg-calendar-table">
                                    <thead>
                                        <tr>
                                            <th>Etapa</th>
                                            <th>Data</th>
                                            <th>Circuito</th>
                                            <th>Desempenho</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {calendarData.map((item) => {
                                            const isSprint = item.modelo === 'Sprint';
                                            const isQualy = item.modelo === 'Qualy 18"';
                                            const info = circuitInfo[item.circuito] || {};
                                            return (
                                                <tr key={`light-${item.etapa}`} className={isSprint ? 'sprint-row' : (isQualy ? 'qualy-row' : '')}>
                                                    <td>
                                                        <span className="circuit-etapa-name">{item.circuito}</span>
                                                        {isSprint && <span className="sprint-asterisk">**</span>}
                                                        {isQualy && <span className="qualy-asterisk">*</span>}
                                                    </td>
                                                    <td className="calendar-date">{calcLightDate(item.dataCarreira)}</td>
                                                    <td>
                                                        <div className="circuit-info-cell">
                                                            {info.bandeira ? (
                                                                <img 
                                                                    className="flag-img" 
                                                                    src={info.bandeira} 
                                                                    alt={item.circuito}
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <span className="circuit-name" style={{ marginLeft: '12px' }}>{info.nome || item.circuito}</span>
                                                        </div>
                                                    </td>
                                                    <td className="calendar-performance">{item.desempenhoLight || 'Igual'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div className="reg-calendar-legenda">
                                    <p className="legenda-time">⏰ Todas as etapas iniciam às 20:15h</p>
                                    <p className="legenda-notes"><span className="qualy-asterisk">*</span> Qualificação 18 minutos &nbsp; <span className="sprint-asterisk">**</span> Sprint (Haverá um qualy antes da Sprint e outro qualy antes da corrida)</p>
                                </div>
                            </div>

                            <div className="reg-calendar-table-wrapper">
                                <h3 className="reg-calendar-table-title">📅 Calendário Grid Carreira - Temporada 21</h3>
                                <table className="reg-calendar-table">
                                    <thead>
                                        <tr>
                                            <th>Etapa</th>
                                            <th>Data</th>
                                            <th>Circuito</th>
                                            <th>Desempenho</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {calendarData.map((item) => {
                                            const isSprint = item.modelo === 'Sprint';
                                            const isQualy = item.modelo === 'Qualy 18"';
                                            const info = circuitInfo[item.circuito] || {};
                                            return (
                                                <tr key={`carreira-${item.etapa}`} className={isSprint ? 'sprint-row' : (isQualy ? 'qualy-row' : '')}>
                                                    <td>
                                                        <span className="circuit-etapa-name">{item.circuito}</span>
                                                        {isSprint && <span className="sprint-asterisk">**</span>}
                                                        {isQualy && <span className="qualy-asterisk">*</span>}
                                                    </td>
                                                    <td className="calendar-date">{item.dataCarreira}</td>
                                                    <td>
                                                        <div className="circuit-info-cell">
                                                            {flagsByCircuit[item.circuito] ? (
                                                                <img 
                                                                    className="flag-img" 
                                                                    src={flagsByCircuit[item.circuito]} 
                                                                    alt={item.circuito}
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <span className="circuit-name" style={{ marginLeft: '12px' }}>{info.nome || item.circuito}</span>
                                                        </div>
                                                    </td>
                                                    <td className="calendar-performance">{item.desempenhoCarreira || 'Real'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div className="reg-calendar-legenda">
                                    <p className="legenda-time">⏰ Todas as etapas iniciam às 20:15h</p>
                                    <p className="legenda-notes"><span className="qualy-asterisk">*</span> Qualificação 18 minutos &nbsp; <span className="sprint-asterisk">**</span> Sprint (Haverá um qualy antes da Sprint e outro qualy antes da corrida)</p>
                                </div>
                            </div>
                        </div>

                        <div className="reg-lobby-steps">
                            <div className="reg-lobby-step">
                                <span>01</span>
                                <p>Lobby abre pelo menos 15 minutos antes da largada oficial (20:15h).</p>
                            </div>
                            <div className="reg-lobby-step">
                                <span>02</span>
                                <p>Apenas 1 host de cada plataforma recebe convite para entrar no lobby.</p>
                            </div>
                            <div className="reg-lobby-step">
                                <span>03</span>
                                <p>Pilotos entram pelo perfil do host ou de outros pilotos na mesma plataforma.</p>
                            </div>
                            <div className="reg-lobby-step">
                                <span>04</span>
                                <p>Convites diretos apenas para contas EA vinculadas.</p>
                            </div>
                            <div className="reg-lobby-step">
                                <span>05</span>
                                <p>É obrigatória a resposta à lista de presença. A ausência de resposta acarretam    perda de Pontos de Conduta.</p>
                            </div>
                        </div>

                        {/* Configurações do Lobby */}
                        <div className="reg-lobby-config-section">
                            <h3 style={{marginTop: '32px', marginBottom: '20px', fontSize: '1.3rem', fontWeight: '800', color: '#facc15', display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <Settings2 size={24} /> Configurações do Lobby
                            </h3>
                            <div className="reg-lobby-config-grid-new">
                                {lobbyConfig.map((item, idx) => {
                                    const val = item.valor.toLowerCase();
                                    const isYes = val === 'sim' || val === 'ligado';
                                    const isNo = val === 'não' || val === 'desligado' || val === 'nenhuma';
                                    const isLocked = val.includes('travado');
                                    const isOpen = val.includes('aberta') || val.includes('pública');
                                    
                                    let statusIcon = null;
                                    let statusColor = '#94A3B8';
                                    
                                    if (isYes) {
                                        statusIcon = <ToggleRight size={20} color="#22c55e" />;
                                        statusColor = '#22c55e';
                                    } else if (isNo) {
                                        statusIcon = <ToggleLeft size={20} color="#ef4444" />;
                                        statusColor = '#ef4444';
                                    } else if (isLocked) {
                                        statusIcon = <ShieldCheck size={20} color="#facc15" />;
                                        statusColor = '#facc15';
                                    } else if (isOpen) {
                                        statusIcon = <Eye size={20} color="#06b6d4" />;
                                        statusColor = '#06b6d4';
                                    } else {
                                        statusIcon = <Activity size={18} color="#3b82f6" />;
                                        statusColor = '#3b82f6';
                                    }

                                    return (
                                        <div key={idx} className="reg-lobby-item-new">
                                            <div className="lobby-item-header">
                                                <span className="lobby-item-label">{item.config}</span>
                                                {statusIcon}
                                            </div>
                                            <div className="lobby-item-value-container">
                                                <span className="lobby-item-value" style={{color: statusColor}}>{item.valor}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* Seção Formato das Sessões */}
                    <section id="info-formato" className="reg-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Formato das Sessões</h2>
                                <p>Dois formatos de etapa: padrão e com sprint.</p>
                            </div>
                            <span className="reg-mini-pill">Qualificação • Sprint • Corrida</span>
                        </div>
                        <div className="reg-session-grid">
                            <article className="reg-session-card">
                                <div className="reg-session-icon"><Activity /></div>
                                <h3>Etapa padrão</h3>
                                <p>Qualificação de 18 minutos seguida de Corrida Principal em 50% do total.</p>
                            </article>
                            <article className="reg-session-card">
                                <div className="reg-session-icon"><Signal /></div>
                                <h3>Etapa com sprint</h3>
                                <p>Haverá um qualy antes da Sprint e outro qualy antes da corrida. Sprint (~33%) e Corrida Principal (50%).</p>
                            </article>
                        </div>
                    </section>

                    <section id="info-tecnico" className="reg-section reg-section-technical">
                        <div className="reg-section-title">
                            <div>
                                <h2>Configurações técnicas &amp; Numeração</h2>
                                <p>Setup, assistências e telemetria seguem regras claras para manter a competitividade.</p>
                            </div>
                            <span className="reg-mini-pill">Carreira: Aberto • Light: Pré-definido</span>
                        </div>
                        <div className="reg-tech-grid">
                            <article className="reg-tech-card">
                                <h3>3.1. Desempenho e Setup</h3>
                                <p><strong>Grid Light:</strong> Desempenho alternado entre REAL e IGUAL (conforme etapa definida pela administração).</p>
                                <p><strong>Grid Carreira:</strong> Desempenho REAL em todas as etapas.</p>
                                <p><strong>Setup Grid Carreira:</strong> ABERTO.</p>
                                <p><strong>Setup Grid Light:</strong> Padrão (Pré-Definido).</p>
                            </article>
                            <article className="reg-tech-card">
                                <h3>3.2. Assistências e Configurações</h3>
                                <p><strong>Traçado:</strong> Apenas nas curvas.</p>
                                <p><strong>Câmbio:</strong> Automático permitido.</p>
                                <p><strong>Freios/Tração:</strong> ABS e Tração Completa permitidos.</p>
                                <p><strong>Pit Stop/Largada:</strong> Manuais.</p>
                            </article>
                            <article className="reg-tech-card">
                                <h3>3.4. Telemetria e Número de Piloto</h3>
                                <p>Uso obrigatório de telemetria aberta.</p>
                                <p>Telemetria fechada ou número incorreto acarretam em perda de Pontos de Conduta.</p>
                            </article>
                        </div>
                        <article className="reg-number-card">
                            <div className="reg-number-card-header">
                                <ListOrdered className="reg-number-icon" />
                                <div>
                                    <h3>Numeração obrigatória - Preferências de escolha</h3>
                                    <p>Use o número registrado no jogo e evite duplicidade no mesmo grid.</p>
                                </div>
                            </div>
                            <ul>
                                <li>Piloto que já estava no grid na temporada anterior.</li>
                                <li>Piloto da liga que vem de outro grid (transferência interna).</li>
                                <li>Piloto que já participou da liga anteriormente (retorno).</li>
                                <li>Piloto novato (Por ordem alfabética).</li>
                                <li>Caso não haja acordo entre pilotos com números iguais, a administração definirá a numeração.</li>
                            </ul>
                            <p className="reg-number-note">
                                Uso de número errado acarreta perda de Pontos de Conduta e advertência ou multa em pontos de campeonato conforme reincidência.
                            </p>
                        </article>
                    </section>

                    <section id="info-pontuacao" className="reg-section scoring-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Sistema de Pontuação</h2>
                                <p>Corrida Principal segue padrão FIA; Sprint recompensa os oito primeiros.</p>
                            </div>
                        </div>
                        <div className="reg-scoring-grid">
                            <article className="score-card">
                                <ListOrdered className="score-icon" />
                                <h3>Corrida Principal</h3>
                                <ul>
                                    {scoringMain.map((s) => (
                                        <li key={s.pos}>{s.pos} – {s.pts} pontos</li>
                                    ))}
                                </ul>
                            </article>
                            <article className="score-card">
                                <ListOrdered className="score-icon" />
                                <h3>Corrida Sprint</h3>
                                <ul>
                                    {scoringSprint.map((s) => (
                                        <li key={s.pos}>{s.pos} – {s.pts} pontos</li>
                                    ))}
                                </ul>
                            </article>
                            <article className="score-card tiebreak-card">
                                <Signal className="score-icon" />
                                <h3>Critérios de desempate</h3>
                                <ul>
                                    {tiebreakers.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </article>
                        </div>
                    </section>

                    <section id="info-draft" className="reg-section draft-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Equipes, Draft &amp; Reservas</h2>
                                <p>5.1. Escolha de Equipes (Draft) - Realizada via site/app ou whatsapp com propostas e contratos.</p>
                            </div>
                        </div>
                        <div className="draft-grid">
                            {draftPriority.map((group) => (
                                <article key={group.title} className="draft-card">
                                    <h3>{group.title}</h3>
                                    <ul>
                                        {group.items.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </div>
                        
                        {/* Promoção Obrigatória */}
                        <div className="reg-promotion-rule">
                            <div className="reg-promotion-icon">🏆</div>
                            <div className="reg-promotion-content">
                                <h4>{promotionRule.title}</h4>
                                <p>{promotionRule.description}</p>
                            </div>
                        </div>

                        <div className="info-card" style={{marginTop: '24px'}}>
                            <Info className="reg-icon" />
                            <div>
                                <h4 style={{marginTop: 0, marginBottom: '12px', color: '#06b6d4'}}>5.2. Regras para Reservas</h4>
                                <p><strong>O reserva ocupa a vaga</strong> quando o titular sinaliza ausência na lista de presença.</p>
                                <p><strong>Prioridade:</strong> O reserva melhor qualificado escolhe primeiro a vaga, mas deve correr com o pior carro disponível (pela ordem de forças).</p>
                                <p><strong>Pontuação:</strong> Reservas pontuam para o campeonato de pilotos e construtores.</p>
                            </div>
                        </div>

                        <div className="info-card" style={{marginTop: '24px'}}>
                            <Info className="reg-icon" />
                            <div>
                                <h4 style={{marginTop: 0, marginBottom: '12px', color: '#06b6d4'}}>5.3. Mudanças de Grid</h4>
                                <p>Piloto que ficar nas últimas posições no grid carreira não é obrigado a ir pro Light mas a administração poderá analisar o pedido.</p>
                                <p>Mudanças de grid durante a temporada serão analisadas pela administração.</p>
                                <p><strong>Poderá haver promoção de pilotos na metade da temporada por abandono de grid ou excesso de faltas.</strong></p>
                                <p style={{marginTop: '12px', fontWeight: '700', color: '#facc15'}}><strong>Todas as categorias correm com os carros de F1.</strong></p>
                            </div>
                        </div>

                        <div className="info-card" style={{marginTop: '24px', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.08)'}}>
                            <Info className="reg-icon" />
                            <div>
                                <h4 style={{marginTop: 0, marginBottom: '12px', color: '#ef4444'}}>5.4. Substituição por Ausências</h4>
                                <p><strong>Caso de ausência em duas etapas sem aviso ou justificativa, a liga terá direito de substituir o piloto após a quarta etapa e o colocar como reserva no grid.</strong></p>
                            </div>
                        </div>
                    </section>

                    <section id="info-punicoes" className="reg-section penalties-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Sistema de Punições e Análises</h2>
                                <p>6.1. Penalidades em Pista (Carteira de Pontos) - Sistema progressivo que leva a suspensões.</p>
                            </div>
                        </div>
                        <div className="penalties-grid">
                            {penaltyScale.map((scale) => (
                                <article key={scale.label} className="penalty-card">
                                    <h3>{scale.label}</h3>
                                    <p className="penalty-points">{scale.points}</p>
                                    <p>{scale.detail}</p>
                                </article>
                            ))}
                        </div>
                        <div className="reg-aggravations">
                            <p className="aggravation-title">Agravantes (+5 pts): Largada (até volta 2), Última volta, Safety Car, Reincidência</p>
                        </div>
                        <p className="reg-suspension-line">
                            Suspensão: Ao atingir 20 pontos de penalização nas análises (incidentes de pista) na carteira, o piloto cumpre suspensão automática na etapa seguinte (Race Ban). Não entram nessa conta as perdas de pontos por falta de envio do vídeo de defesa.
                        </p>
                    </section>

                    <section id="info-analises" className="reg-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Análises e Defesa</h2>
                                <p>6.2. Procedimento de Análise - Sistema de julgamento de incidentes.</p>
                            </div>
                        </div>
                        <div className="info-card" style={{marginTop: '24px'}}>
                            <Info className="reg-icon" />
                            <div>
                                <h4 style={{marginTop: 0, marginBottom: '12px', color: '#06b6d4'}}>6.2. Procedimento de Análise</h4>
                                <p><strong>Solicitação:</strong> Via site/app até as 20h do dia seguinte da corrida (Vídeo Onboard).</p>
                                <p><strong>Defesa:</strong> Até 12:00h do dia seguinte após notificação. Enviar o vídeo onboard pelo link verde do Motorhome (links externos).</p>
                                <p><strong>Consequências:</strong> A não apresentação de defesa não implica culpa automática, mas gera perda de Pontos de Conduta e punição leve (+5 pts na carteira).</p>
                                <p style={{marginTop: '12px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #EF4444', borderRadius: '4px'}}>
                                    <strong style={{color: '#EF4444'}}>⚠️ IMPORTANTE:</strong> Vídeos privados, sem nitidez, com palavrão ou que impossibilitem análise por algum motivo técnico serão automaticamente descartados pela comissão.
                                </p>
                            </div>
                        </div>
                        <div className="info-card" style={{marginTop: '24px', borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.08)'}}>
                            <AlertTriangle className="reg-icon" />
                            <div>
                                <h4 style={{marginTop: 0, marginBottom: '12px', color: '#F59E0B'}}>6.3. Retirada de Punições de Bug</h4>
                                <p><strong>❌ Não serão aceitas solicitações de retirada de punições de bug que tenham sido pagas no box durante a corrida.</strong></p>
                                <p><strong>❌ Não serão aceitas solicitações de retirada de punições de bug ocorridas durante a sessão classificatória (qualificação).</strong></p>
                                <p><strong>❌ Bug de posição por abandono do lobby antes da bandeirada final não é retirado; vale a posição final validada na transmissão.</strong></p>
                            </div>
                        </div>
                    </section>

                    <section id="info-bug-lobby" className="reg-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Protocolo de Bug de Lobby</h2>
                                <p>Procedimento oficial para quedas de lobby em qualy e corrida, com critérios objetivos por tempo e percentual de voltas.</p>
                            </div>
                            <span className="reg-mini-pill">Regulamento Técnico</span>
                        </div>

                        <div className="info-card" style={{marginTop: '24px'}}>
                            <Info className="reg-icon" />
                            <div>
                                <h4 style={{marginTop: 0, marginBottom: '12px', color: '#06b6d4'}}>1. Introdução e Objetivo</h4>
                                <p>Define procedimentos em caso de bug/queda de lobby para garantir decisões rápidas, claras e justas, sem margem para interpretações divergentes.</p>
                                <p>Formato padrão da etapa: <strong>qualy de 18 minutos</strong> + <strong>corrida com 50% das voltas</strong>.</p>
                            </div>
                        </div>

                        <div className="info-card" style={{marginTop: '16px'}}>
                            <Info className="reg-icon" />
                            <div>
                                <h4 style={{marginTop: 0, marginBottom: '12px', color: '#06b6d4'}}>2. Definições</h4>
                                <p><strong>Bug de lobby:</strong> queda, travamento ou desconexão involuntária da sessão.</p>
                                <p><strong>Sessão preservada:</strong> sessão válida com resultados mantidos.</p>
                                <p><strong>Grid editado:</strong> largada configurada manualmente com base nos tempos válidos.</p>
                                <p><strong>Snapshot de resultado:</strong> posição de cada piloto na última volta completa antes do bug.</p>
                                <p><strong>Nova data:</strong> sessão reagendada pela administração.</p>
                            </div>
                        </div>

                        <div className="info-card" style={{marginTop: '16px', borderColor: 'rgba(56, 189, 248, 0.35)', background: 'rgba(56, 189, 248, 0.08)'}}>
                            <CheckCircle className="reg-icon" />
                            <div>
                                <h4 style={{marginTop: 0, marginBottom: '12px', color: '#38bdf8'}}>3. Cenários - Qualificação (18 min)</h4>
                                <p><strong>Art. 3.1 - Mais de 10 minutos restantes (antes de 44%):</strong> qualy inválido, corrida não realizada; qualy refeito integralmente na mesma data.</p>
                                <p><strong>Art. 3.2 - Após 10 minutos decorridos (mais de 55%):</strong> qualy válido, corrida no mesmo dia com grid editado pela administração.</p>
                            </div>
                        </div>

                        <div className="info-card" style={{marginTop: '16px', borderColor: 'rgba(16, 185, 129, 0.35)', background: 'rgba(16, 185, 129, 0.08)'}}>
                            <CheckCircle className="reg-icon" />
                            <div>
                                <h4 style={{marginTop: 0, marginBottom: '12px', color: '#10b981'}}>4. Cenários - Corrida (50% voltas)</h4>
                                <p><strong>Art. 4.1 - Antes de 30%:</strong> qualy preservado; resultado da corrida anulado; corrida refeita no mesmo dia com grid do qualy.</p>
                                <p><strong>Art. 4.2 - Entre 30% e 60%:</strong> qualy preservado; resultado anulado; corrida refeita em nova data com grid do qualy.</p>
                                <p><strong>Art. 4.3 - Após 60%:</strong> qualy válido; corrida encerrada com resultado válido via snapshot da última volta completa; pontos distribuídos normalmente.</p>
                            </div>
                        </div>

                        <div className="info-card" style={{marginTop: '16px', borderColor: 'rgba(245, 158, 11, 0.35)', background: 'rgba(245, 158, 11, 0.08)'}}>
                            <AlertTriangle className="reg-icon" />
                            <div>
                                <h4 style={{marginTop: 0, marginBottom: '12px', color: '#F59E0B'}}>5. Bug Recorrente</h4>
                                <p>Duas ou mais quedas na mesma etapa (qualy ou corrida) encerram imediatamente a etapa e adiam tudo para nova data.</p>
                                <p>Na nova data, <strong>qualy e corrida são refeitos do início</strong>.</p>
                            </div>
                        </div>

                        <div className="info-card" style={{marginTop: '16px', borderColor: 'rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.08)'}}>
                            <XCircle className="reg-icon" />
                            <div>
                                <h4 style={{marginTop: 0, marginBottom: '12px', color: '#ef4444'}}>6. Invalidação de Pedidos de Análise</h4>
                                <p>Sessões canceladas/adiadas invalidam automaticamente todos os pedidos de análise da sessão afetada.</p>
                                <p>Novos pedidos só serão aceitos após a sessão substituta ser realizada e homologada.</p>
                            </div>
                        </div>
                    </section>

                    <section id="info-ranking" className="reg-section power-ranking-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Power Ranking e Pontos de Conduta</h2>
                                <p>7.1. Composição do Power Ranking - Sistema que define o valor de mercado do piloto, as prioridades de draft e a elegibilidade para equipes.</p>
                            </div>
                        </div>
                        
                        {/* Grid 3x2 com Hero Central */}
                        <div className="pr-grid">
                            {/* Linha 1: Performance - Hero - Conduta */}
                            <article className="reg-card pr-card">
                                <div className="reg-card-header">
                                    <span className="reg-pill-number">Pilar 01</span>
                                    <div className="reg-icon-wrapper">{pillars[0].icon}</div>
                                </div>
                                <h3>Pontos de Performance</h3>
                                <p>Baseado nos resultados obtidos na pista (Classificação e Corrida).</p>
                            </article>
                            
                            <div className="pr-hero-card">
                                <div className="pr-hero-icon">
                                    <Gauge className="pr-main-icon" />
                                </div>
                                <h3>Power Ranking (PR)</h3>
                                <p>Sistema que define o valor de mercado do piloto, as prioridades de draft e a elegibilidade para equipes.</p>
                            </div>
                            
                            <article className="reg-card pr-card">
                                <div className="reg-card-header">
                                    <span className="reg-pill-number">Pilar 02</span>
                                    <div className="reg-icon-wrapper">{pillars[1].icon}</div>
                                </div>
                                <h3>Pontos de Conduta</h3>
                                <p>Baseado no cumprimento das obrigações da liga (ver item 7.2).</p>
                            </article>
                            
                            {/* Linha 2: Racecraft - Overall - Histórico */}
                            <article className="reg-card pr-card">
                                <div className="reg-card-header">
                                    <span className="reg-pill-number">Pilar 03</span>
                                    <div className="reg-icon-wrapper">{pillars[2].icon}</div>
                                </div>
                                <h3>Pontos de Racecraft</h3>
                                <p>Avaliação da performance técnica e limpa durante as corridas (ganho de posições, consistência, poucos incidentes).</p>
                            </article>
                            
                            <article className="reg-card pr-card">
                                <div className="reg-card-header">
                                    <span className="reg-pill-number">Pilar 04</span>
                                    <div className="reg-icon-wrapper">{pillars[3].icon}</div>
                                </div>
                                <h3>Overall</h3>
                                <p>Baseado no atingimento dos objetivos estipulados pela equipe/contrato.</p>
                            </article>
                            
                            <article className="reg-card pr-card">
                                <div className="reg-card-header">
                                    <span className="reg-pill-number">Pilar 05</span>
                                    <div className="reg-icon-wrapper">{pillars[4].icon}</div>
                                </div>
                                <h3>Histórico</h3>
                                <p>Pontuação acumulada histórica na Master League F1.</p>
                            </article>
                        </div>

                        <div className="info-card pr-info-card">
                            <Info className="reg-icon" />
                            <div>
                                <h4 style={{marginTop: 0, marginBottom: '12px', color: '#06b6d4'}}>7.2. Infrações de Conduta (Perda de Pontos)</h4>
                                <p>O piloto perderá Pontos de Conduta (afetando seu Power Ranking e status na liga) nas seguintes situações:</p>
                                <ul style={{marginTop: '12px', paddingLeft: '20px'}}>
                                    <li>Não enviar a foto oficial para o campeonato.</li>
                                    <li>Faltar às etapas (W.O.).</li>
                                    <li>Não responder à lista de presença nos prazos estipulados.</li>
                                    <li>Receber punições em análises (incidentes de pista).</li>
                                    <li>Correr com Telemetria Fechada.</li>
                                    <li>Correr com numeração do carro errada (diferente da registrada).</li>
                                    <li>Não enviar vídeo de defesa quando solicitado.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Aditivo 28/01/2026 – Regras de Cálculo do Power Ranking */}
                        <div id="info-ranking-calculo" className="reg-section" style={{marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.15)'}}>
                            <div className="reg-section-title" style={{marginBottom: '16px'}}>
                                <div>
                                    <span className="reg-mini-pill" style={{background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', marginBottom: '8px', display: 'inline-block'}}>Aditivo inserido em 28/01/2026</span>
                                    <h2 style={{margin: 0, fontSize: '1.35rem'}}>10.1 Regras de Cálculo do Power Ranking</h2>
                                    <p style={{margin: '8px 0 0', opacity: 0.9, fontSize: '0.95rem'}}>Composição dos pilares e fórmula da nota final.</p>
                                </div>
                            </div>
                            <div className="info-card" style={{marginBottom: '16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)'}}>
                                <Info className="reg-icon" style={{color: '#F59E0B'}} />
                                <div>
                                    <p style={{margin: 0}}><strong>Pesos na nota final:</strong> Performance 30% • Racecraft 25% • Overall 20% • Conduta 15% • Histórico 10%</p>
                                    <p style={{margin: '10px 0 0', fontSize: '0.9rem'}}>PR = (Performance × 0,30) + (Racecraft × 0,25) + (Overall × 0,20) + (Conduta × 0,15) + (Histórico × 0,10)</p>
                                </div>
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px'}}>
                                <article className="reg-card" style={{padding: '14px'}}>
                                    <h4 style={{margin: '0 0 8px', fontSize: '1rem', color: '#3B82F6'}}>Pilar 1 – Performance</h4>
                                    <p style={{margin: 0, fontSize: '0.85rem', lineHeight: 1.4}}>Base: % dos pontos da temporada vs maior PR do grid (escala 60–100). Bônus por etapa: +1 se sem NC RACE; +1 se sem PUNISH RACE (até 16 pts).</p>
                                </article>
                                <article className="reg-card" style={{padding: '14px'}}>
                                    <h4 style={{margin: '0 0 8px', fontSize: '1rem', color: '#22C55E'}}>Pilar 2 – Conduta</h4>
                                    <p style={{margin: 0, fontSize: '0.85rem', lineHeight: 1.4}}>Base 100. Descontos: foto -5; por etapa (presença, numeração, telemetria) -1 cada; W.O. -2 cada; punições/defesa (metade do valor); advertências -1 cada.</p>
                                </article>
                                <article className="reg-card" style={{padding: '14px'}}>
                                    <h4 style={{margin: '0 0 8px', fontSize: '1rem', color: '#EF4444'}}>Pilar 3 – Racecraft</h4>
                                    <p style={{margin: 0, fontSize: '0.85rem', lineHeight: 1.4}}>Média ponderada: Ritmo Corrida 30%, POS. Q 20%, QUALY 20%, POS. R 30%. Mínimo 60.</p>
                                </article>
                                <article className="reg-card" style={{padding: '14px'}}>
                                    <h4 style={{margin: '0 0 8px', fontSize: '1rem', color: '#8B5CF6'}}>Pilar 4 – Overall</h4>
                                    <p style={{margin: 0, fontSize: '0.85rem', lineHeight: 1.4}}>Soma dos 5 objetivos contratuais. Sem corridas na temporada: base 60.</p>
                                </article>
                                <article className="reg-card" style={{padding: '14px'}}>
                                    <h4 style={{margin: '0 0 8px', fontSize: '1rem', color: '#475569'}}>Pilar 5 – Histórico</h4>
                                    <p style={{margin: 0, fontSize: '0.85rem', lineHeight: 1.4}}>60% PR histórico (média ponderada 5 temporadas: 35%/25%/20%/15%/5%) normalizado vs maior do grid; 40% pontuação por quantidade de temporadas (qtd+80, máx 100).</p>
                                </article>
                            </div>
                        </div>
                    </section>

                    <section id="info-infracoes" className="reg-section conduct-section">
                        <div className="conduct-panel">
                            <div className="conduct-header">
                                <AlertTriangle className="reg-icon alert" />
                                <div>
                                    <h2>Infrações críticas</h2>
                                    <p>Ações que reduzem Pontos de Conduta e Power Ranking.</p>
                                </div>
                            </div>
                            <div className="conduct-list">
                                {infractions.map((item) => (
                                    <div key={item} className="conduct-item">
                                        <XCircle className="reg-icon small" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="conduct-tip">
                                <CheckCircle className="reg-icon check" />
                                <p>
                                    Pilotos com conduta limpa sobem mais rápido no ranking mesmo diante de adversidades na pista.
                                    Comunicação e clareza valem tanto quanto velocidade.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Seção Premiação */}
                    <section id="info-premiacao" className="reg-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Premiação e Gerais</h2>
                                <p>Troféus e benefícios para os campeões.</p>
                            </div>
                            <span className="reg-mini-pill">Troféus • Inscrição Grátis</span>
                        </div>
                        <div className="reg-highlight-grid">
                            <article className="reg-highlight-card">
                                <div className="reg-highlight-icon">🏆</div>
                                <h3>Troféus</h3>
                                <p>Para os 3 primeiros de cada grid. Frete por conta do piloto; prazo de envio após 2 temporadas custo de frete é da liga.</p>
                            </article>
                            <article className="reg-highlight-card">
                                <div className="reg-highlight-icon">🎁</div>
                                <h3>Inscrição Grátis</h3>
                                <p>Para a dupla campeã de equipes (uso na temporada seguinte).</p>
                            </article>
                        </div>
                    </section>

                    {/* Seção Disposições Finais */}
                    <section id="info-disposicoes" className="reg-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Disposições Finais</h2>
                                <p>Regras gerais e alterações do regulamento.</p>
                            </div>
                            <span className="reg-mini-pill">Administração • Soberania</span>
                        </div>
                        <div className="info-card">
                            <Info className="reg-icon" />
                            <div>
                                <p style={{marginBottom: '16px', fontWeight: '600', color: '#facc15'}}>É obrigatório o envio de foto para o campeonato (sujeito a perda de conduta).</p>
                                <p style={{marginBottom: '16px'}}>Casos omissos serão resolvidos pela Administração da Master League F1.</p>
                                <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                                    <li style={{marginBottom: '12px'}}>• Este regulamento pode ser alterado pela administração a qualquer momento, com aviso prévio aos participantes.</li>
                                    <li style={{marginBottom: '12px'}}>• A decisão da administração é soberana e definitiva em todas as situações.</li>
                                    <li>• Ao participar da Master League F1, o piloto declara ter lido e concordado com todas as regras aqui estabelecidas.</li>
                                </ul>
                                <p style={{marginTop: '20px', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic'}}>© 2025 Master League F1 • Regulamento Oficial Temporada 20</p>
                            </div>
                        </div>
                    </section>
                </>
            )}

            {/* Botão Voltar ao Topo */}
            <button 
                className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`}
                onClick={scrollToTop}
                aria-label="Voltar ao topo"
            >
                <ChevronUp size={20} />
            </button>

            <Footer />
        </div>
    );
};

export default Regulamento;
