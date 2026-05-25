/**
 * Resolve bandeira, traçado e nome do circuito a partir do GP da planilha.
 * Trata países com mais de uma etapa (EUA, Itália, etc.) e URLs quebradas.
 */

export function normalizeTrackKey(gp = '') {
    return String(gp || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/^GP\s+(DO|DA|DE|DOS|DAS)\s+/i, '')
        .replace(/^GP\s+/i, '')
        .trim()
        .toUpperCase();
}

function normalizeAssetUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let u = url.trim();
    if (!u || u === 'null' || u === 'undefined') return '';
    // Só rejeita placeholder genérico — URLs da F1 usam sufixo .../transform/.../image.png
    if (u === 'image.png' || (!u.includes('://') && u.includes('image.png'))) return '';
    if (u.startsWith('//')) u = `https:${u}`;
    return u;
}

function isValidAssetUrl(url) {
    const u = normalizeAssetUrl(url).toLowerCase();
    return u.startsWith('http');
}

/** Bandeiras confiáveis quando a planilha não bate ou a URL veio quebrada. */
const FLAG_FALLBACKS = [
    { test: (k) => /TEXAS|MIAMI|VEGAS|AUSTIN|EUA|USA|ESTADOS UNIDOS|UNITED STATES/.test(k), flag: 'https://flagcdn.com/w80/us.png' },
    { test: (k) => /IMOLA|EMILIA|MONZA|ITALIA|ITALY/.test(k), flag: 'https://flagcdn.com/w80/it.png' },
    { test: (k) => /ESPANHA|SPAIN|BARCELONA|MONTMEL/.test(k), flag: 'https://flagcdn.com/w80/es.png' },
    { test: (k) => /INGLATERRA|SILVERSTONE|GREAT BRITAIN|REINO UNIDO/.test(k), flag: 'https://flagcdn.com/w80/gb.png' },
    { test: (k) => /BAHREIN|BAREM/.test(k), flag: 'https://flagcdn.com/w80/bh.png' },
    { test: (k) => /ARABIA SAUDITA|JEDDAH|RIYADH/.test(k), flag: 'https://flagcdn.com/w80/sa.png' },
    { test: (k) => /AZERBAIJAO|AZERBAIJAN|BAKU/.test(k), flag: 'https://flagcdn.com/w80/az.png' },
    { test: (k) => /BRASIL|INTERLAGOS|SAO PAULO/.test(k), flag: 'https://flagcdn.com/w80/br.png' },
    { test: (k) => /CANADA|MONTREAL/.test(k), flag: 'https://flagcdn.com/w80/ca.png' },
    { test: (k) => /MEXICO/.test(k), flag: 'https://flagcdn.com/w80/mx.png' },
    { test: (k) => /JAPAO|JAPAN|SUZUKA/.test(k), flag: 'https://flagcdn.com/w80/jp.png' },
    { test: (k) => /CHINA|SHANGHAI/.test(k), flag: 'https://flagcdn.com/w80/cn.png' },
    { test: (k) => /AUSTRALIA|MELBOURNE/.test(k), flag: 'https://flagcdn.com/w80/au.png' },
    { test: (k) => /AUSTRIA|SPIELBERG|RED BULL RING/.test(k), flag: 'https://flagcdn.com/w80/at.png' },
    { test: (k) => /BELGICA|SPA/.test(k), flag: 'https://flagcdn.com/w80/be.png' },
    { test: (k) => /HOLANDA|ZANDVOORT|PAISES BAIXOS/.test(k), flag: 'https://flagcdn.com/w80/nl.png' },
    { test: (k) => /HUNGRIA|HUNGARORING/.test(k), flag: 'https://flagcdn.com/w80/hu.png' },
    { test: (k) => /QATAR|CATAR/.test(k), flag: 'https://flagcdn.com/w80/qa.png' },
    { test: (k) => /ABU DHABI|EMIRADOS/.test(k), flag: 'https://flagcdn.com/w80/ae.png' },
    { test: (k) => /SINGAPURA|SINGAPORE/.test(k), flag: 'https://flagcdn.com/w80/sg.png' },
    { test: (k) => /MONACO/.test(k), flag: 'https://flagcdn.com/w80/mc.png' },
    { test: (k) => /FRANCA|PAUL RICARD/.test(k), flag: 'https://flagcdn.com/w80/fr.png' },
    { test: (k) => /ALEMANHA|HOCKENHEIM|NURBURGRING/.test(k), flag: 'https://flagcdn.com/w80/de.png' },
];

/** Chaves alternativas na aba Tracks para o mesmo GP/país. */
const TRACK_ALIAS_KEYS = {
    EUA: ['MIAMI', 'TEXAS', 'AUSTIN', 'LAS VEGAS', 'VEGAS'],
    'ESTADOS UNIDOS': ['MIAMI', 'TEXAS', 'AUSTIN', 'LAS VEGAS'],
    USA: ['MIAMI', 'TEXAS', 'AUSTIN', 'LAS VEGAS'],
    ITALIA: ['MONZA', 'IMOLA', 'EMILIA-ROMAGNA', 'EMILIA ROMAGNA'],
    ITALY: ['MONZA', 'IMOLA', 'EMILIA-ROMAGNA'],
    'EMILIA-ROMAGNA': ['IMOLA'],
    'EMILIA ROMAGNA': ['IMOLA'],
    VEGAS: ['LAS VEGAS'],
    BAKU: ['AZERBAIJAO', 'AZERBAIJAN'],
    INTERLAGOS: ['BRASIL'],
    'SAO PAULO': ['BRASIL', 'INTERLAGOS'],
    SILVERSTONE: ['INGLATERRA'],
    ZANDVOORT: ['HOLANDA'],
    SPA: ['BELGICA'],
    SUZUKA: ['JAPAO'],
    MONTREAL: ['CANADA'],
};

function pickFlag(key, info = {}) {
    if (isValidAssetUrl(info.flag)) return info.flag;
    for (const { test, flag } of FLAG_FALLBACKS) {
        if (test(key)) return flag;
    }
    return '';
}

function findDirectTrack(key, tracks) {
    if (!tracks || !key) return null;
    if (tracks[key]) return tracks[key];

    const keys = Object.keys(tracks);
    for (const tk of keys) {
        if (key.includes(tk) || tk.includes(key)) return tracks[tk];
    }
    return null;
}

function findViaAliases(key, tracks) {
    if (!tracks) return null;
    const aliases = TRACK_ALIAS_KEYS[key] || [];
    for (const alias of aliases) {
        const normalized = normalizeTrackKey(alias);
        const hit = tracks[normalized] || tracks[alias];
        if (hit) return hit;
    }
    return null;
}

/** Busca traçado/bandeira em qualquer chave da planilha que combine com o GP. */
function findFuzzyTrack(key, tracks) {
    if (!tracks || !key) return null;
    const entries = Object.entries(tracks);
    for (const [tk, info] of entries) {
        const tkNorm = normalizeTrackKey(tk);
        if (!tkNorm) continue;
        if (key === tkNorm || key.includes(tkNorm) || tkNorm.includes(key)) return info;
    }
    for (const [tk, info] of entries) {
        const tkNorm = normalizeTrackKey(tk);
        if (tkNorm.length < 4) continue;
        if (key.includes(tkNorm.slice(0, 4)) || tkNorm.includes(key.slice(0, 4))) return info;
    }
    return null;
}

function resolveFlagByPattern(key) {
    for (const { test, flag } of FLAG_FALLBACKS) {
        if (test(key)) return flag;
    }
    return '';
}

/**
 * @returns {{ flag: string, circuit: string, circuitName: string }}
 */
export function resolveTrackInfo(gp = '', tracks = {}) {
    const key = normalizeTrackKey(gp);
    if (!key) return { flag: '', circuit: '', circuitName: '' };

    const info = findDirectTrack(key, tracks) || findViaAliases(key, tracks) || findFuzzyTrack(key, tracks) || {};

    let flag = pickFlag(key, info);
    let circuit = isValidAssetUrl(info.circuit) ? normalizeAssetUrl(info.circuit) : '';
    let circuitName = info.circuitName || '';

    if ((!circuit || !circuitName) && tracks) {
        const aliases = TRACK_ALIAS_KEYS[key] || [];
        for (const alias of aliases) {
            const alt = tracks[normalizeTrackKey(alias)] || tracks[alias];
            if (!alt) continue;
            if (!circuit && isValidAssetUrl(alt.circuit)) circuit = normalizeAssetUrl(alt.circuit);
            if (!circuitName && alt.circuitName) circuitName = alt.circuitName;
            if (!flag && isValidAssetUrl(alt.flag)) flag = alt.flag;
        }
    }

    if (!flag) flag = resolveFlagByPattern(key);

    return {
        flag: flag || '',
        circuit: circuit || '',
        circuitName: circuitName || '',
    };
}
