const normalizeName = (v) =>
    String(v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

const T20_CHAMPIONS_WITH_EXTRA_TARGET = new Set([
    'leandro sopena',
    'edvan paiva',
]);

const EXTRA_OBJETIVO_CAMPEAO_T20 =
    'Objetivo extra (campeoes T20): repetir o top2 de pilotos e o titulo de construtores na T21.';
const EXTRA_OBJETIVO_LIGHT_TOPTEAM =
    'Objetivo extra (Grid Light em Ferrari/McLaren): terminar no TOP 3 de pilotos; se ficar fora do TOP 3 e permanecer na Light, não renova com equipe de ponta na próxima temporada.';

export const gerarObjetivosPorEquipe = (teamName, tier, pilotName = '', pilotGrid = '') => {
    const teamNameLower = (teamName || '').toLowerCase();
    const pilotGridLower = String(pilotGrid || '').toLowerCase();
    let objetivos = [];

    // Objetivos oficiais da T21 (usados em propostas/contratos e no Power Ranking da T21).
    if (teamNameLower.includes('ferrari')) {
        objetivos = [
            'Lutar pelo título de pilotos e construtores, honrando a tradição vermelha nas 8 etapas.',
            'Conquistar pelo menos 2 vitórias',
            'Buscar pelo menos 3 pódios nas corridas sem vitória',
            'Terminar entre os 3 primeiros no campeonato',
            'Representar a marca Ferrari sem dar NC e sem levar punição.'
        ];
    } else if (teamNameLower.includes('mclaren')) {
        objetivos = [
            'Lutar pelo título de pilotos e construtores nas 8 etapas.',
            'Conquistar pelo menos 3 vitórias',
            'Buscar pelo menos 4 pódios nas corridas sem vitória',
            'Terminar entre os 2 primeiros no campeonato',
            'Não levar punição nas corridas e nem dar NC.'
        ];
    } else if (teamNameLower.includes('red bull') && !teamNameLower.includes('racing bulls')) {
        objetivos = [
            'Lutar pelo título de pilotos e construtores nas 8 etapas.',
            'Conquistar pelo menos 2 vitórias',
            'Buscar pelo menos 3 pódios nas corridas sem vitória',
            'Terminar entre os 4 primeiros no campeonato',
            'Demonstrar agressividade controlada sem dar NC.'
        ];
    } else if (teamNameLower.includes('mercedes')) {
        objetivos = [
            'Lutar pelo título de pilotos e construtores',
            'Conquistar pelo menos 1 vitória',
            'Buscar pelo menos 2 pódios nas corridas sem vitória',
            'Terminar entre os 5 primeiros no campeonato',
            'Demonstrar consistência e confiabilidade'
        ];
    } else if (teamNameLower.includes('aston')) {
        objetivos = [
            'Conquistar pelo menos 2 pódios',
            'Buscar pelo menos 2 top 5 nas corridas sem pódio',
            'Pontuar com consistência em pelo menos 6 etapas',
            'Terminar entre os 6 primeiros no campeonato.',
            'Contribuir para posição sólida nos construtores sem faltar e nem dar NC.'
        ];
    } else if (teamNameLower.includes('alpine')) {
        objetivos = [
            'Conquistar pelo menos 1 pódio',
            'Buscar pelo menos 2 top 5 nas corridas sem pódio',
            'Pontuar com consistência em pelo menos 5 etapas',
            'Terminar entre os 7 primeiros no campeonato.',
            'Contribuir para evolução constante do carro sem faltar e nem dar NC.'
        ];
    } else if (teamNameLower.includes('racing') && teamNameLower.includes('bulls')) {
        objetivos = [
            'Conquistar pelo menos 1 pódio',
            'Buscar pelo menos 2 top 5 nas corridas sem pódio',
            'Pontuar em pelo menos 4 etapas',
            'Terminar corridas com consistência sem faltar ou dar NC.',
            'Terminar o campeonato entre os 8 primeiros.'
        ];
    } else if (teamNameLower.includes('williams')) {
        objetivos = [
            'Conquistar pelo menos 1 pódio',
            'Buscar pelo menos 2 top 5 nas corridas sem pódio',
            'Pontuar em pelo menos 3 corridas.',
            'Terminar corridas com consistência sem faltar ou dar NC.',
            'Contribuir para retorno da Williams ao topo terminando entre os 10 primeiros no campeonato de pilotos.'
        ];
    } else if (teamNameLower.includes('haas')) {
        objetivos = [
            'Conquistar pelo menos 2 top 5',
            'Pontuar em pelo menos 3 corridas',
            'Terminar corridas com consistência sem faltar ou dar NC.',
            'Terminar o campeonato de pilotos no TOP 12.',
            'Ajudar a Haas a Liderar o meio do pelotão. Pelo menos P5 de construtores.'
        ];
    } else if (teamNameLower.includes('sauber') || teamNameLower.includes('stake') || teamNameLower.includes('kick')) {
        objetivos = [
            'Conquistar pelo menos 2 top 5',
            'Pontuar em pelo menos 3 corridas',
            'Terminar corridas com consistência sem faltar ou dar NC',
            'Terminar o campeonato de construtores entre as 7.',
            'Terminar campeonato de pilotos entre os 14 primeiros.'
        ];
    } else {
        if (tier === 'gold') {
            objetivos = [
                'Lutar pelo título de pilotos e construtores nas 8 etapas.',
                'Conquistar pelo menos 2 vitórias',
                'Buscar pelo menos 3 pódios nas corridas sem vitória',
                'Terminar entre os 4 primeiros no campeonato',
                'Não levar punição nas corridas e nem dar NC.'
            ];
        } else if (tier === 'silver') {
            objetivos = [
                'Conquistar pelo menos 1 pódio',
                'Buscar pelo menos 2 top 5 nas corridas sem pódio',
                'Pontuar com consistência em pelo menos 5 etapas',
                'Terminar entre os 7 primeiros no campeonato.',
                'Contribuir para evolução constante do carro sem faltar e nem dar NC.'
            ];
        } else {
            objetivos = [
                'Conquistar pelo menos 2 top 5',
                'Pontuar em pelo menos 3 corridas',
                'Terminar corridas com consistência sem faltar ou dar NC.',
                'Terminar campeonato de pilotos entre os 14 primeiros.',
                'Terminar o campeonato de construtores entre as 7.'
            ];
        }
    }

    const isFerrariOrMcLaren = teamNameLower.includes('ferrari') || teamNameLower.includes('mclaren');
    const isCampeaoT20ComMetaExtra = T20_CHAMPIONS_WITH_EXTRA_TARGET.has(normalizeName(pilotName));
    const isGridLight = pilotGridLower.includes('light');

    if (isFerrariOrMcLaren && isGridLight) {
        objetivos = [...objetivos, EXTRA_OBJETIVO_LIGHT_TOPTEAM];
    } else if (isFerrariOrMcLaren && isCampeaoT20ComMetaExtra) {
        objetivos = [...objetivos, EXTRA_OBJETIVO_CAMPEAO_T20];
    }

    return objetivos;
};

export const getAllObjetivos = () => {
    const teams = [
        { name: 'Ferrari', tier: 'gold' },
        { name: 'McLaren', tier: 'gold' },
        { name: 'Red Bull', tier: 'gold' },
        { name: 'Mercedes', tier: 'gold' },
        { name: 'Aston Martin', tier: 'silver' },
        { name: 'Alpine', tier: 'silver' },
        { name: 'Racing Bulls', tier: 'bronze' },
        { name: 'Williams', tier: 'bronze' },
        { name: 'Haas', tier: 'bronze' },
        { name: 'Sauber', tier: 'bronze' }
    ];

    const objetivosSet = new Set();
    teams.forEach(({ name, tier }) => {
        gerarObjetivosPorEquipe(name, tier).forEach(obj => objetivosSet.add(obj));
    });
    objetivosSet.add(EXTRA_OBJETIVO_CAMPEAO_T20);
    objetivosSet.add(EXTRA_OBJETIVO_LIGHT_TOPTEAM);

    return Array.from(objetivosSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
};
