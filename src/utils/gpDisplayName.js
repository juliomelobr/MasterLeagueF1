/**
 * Títulos de GP em português com artigo/preposição corretos.
 * Chaves normalizadas (sem acento, maiúsculas, sem prefixo "GP").
 */
const GP_PT_TITLES = {
    // —— GP DA (feminino) ——
    ALEMANHA: 'GP DA ALEMANHA',
    ARABIA: 'GP DA ARÁBIA SAUDITA',
    'ARABIA SAUDITA': 'GP DA ARÁBIA SAUDITA',
    ARGENTINA: 'GP DA ARGENTINA',
    AUSTRALIA: 'GP DA AUSTRÁLIA',
    AUSTRIA: 'GP DA ÁUSTRIA',
    BELGICA: 'GP DA BÉLGICA',
    CHINA: 'GP DA CHINA',
    COREIA: 'GP DA COREIA',
    'COREIA DO SUL': 'GP DA COREIA',
    ESPANHA: 'GP DA ESPANHA',
    FRANCA: 'GP DA FRANÇA',
    HOLANDA: 'GP DA HOLANDA',
    HUNGRIA: 'GP DA HUNGRIA',
    INDIA: 'GP DA ÍNDIA',
    INGLATERRA: 'GP DA INGLATERRA',
    ITALIA: 'GP DA ITÁLIA',
    ITALY: 'GP DA ITÁLIA',
    RUSSIA: 'GP DA RÚSSIA',
    SUICA: 'GP DA SUÍÇA',
    TURQUIA: 'GP DA TURQUIA',

    // —— GP DO (masculino) ——
    AZERBAIJAO: 'GP DO AZERBAIJÃO',
    BAHREIN: 'GP DO BAHREIN',
    BAREM: 'GP DO BAHREIN',
    BRASIL: 'GP DO BRASIL',
    CANADA: 'GP DO CANADÁ',
    CATAR: 'GP DO CATAR',
    QATAR: 'GP DO QATAR',
    JAPAO: 'GP DO JAPÃO',
    KUWAIT: 'GP DO KUWAIT',
    LIBANO: 'GP DO LÍBANO',
    MARROCOS: 'GP DO MARROCOS',
    MEXICO: 'GP DO MÉXICO',
    OMAN: 'GP DE OMÃ',
    OMA: 'GP DE OMÃ',
    'PAIS DE GALES': 'GP DO PAÍS DE GALES',
    PERU: 'GP DO PERU',
    PORTUGAL: 'GP DE PORTUGAL',
    VIETNA: 'GP DO VIETNÃ',
    VIETNAM: 'GP DO VIETNÃ',

    // —— GP DE (cidades / casos especiais) ——
    'ABU DHABI': 'GP DE ABU DHABI',
    AUSTIN: 'GP DE AUSTIN',
    BAKU: 'GP DO AZERBAIJÃO',
    IMOLA: 'GP DE ÍMOLA',
    'EMILIA-ROMAGNA': 'GP DE ÍMOLA',
    'EMILIA ROMAGNA': 'GP DE ÍMOLA',
    INTERLAGOS: 'GP DO BRASIL',
    'LAS VEGAS': 'GP DE LAS VEGAS',
    MIAMI: 'GP DE MIAMI',
    MONACO: 'GP DE MÔNACO',
    MONZA: 'GP DA ITÁLIA',
    'SAO PAULO': 'GP DO BRASIL',
    SINGAPURA: 'GP DE SINGAPURA',
    SINGAPORE: 'GP DE SINGAPURA',
    SPA: 'GP DA BÉLGICA',
    SILVERSTONE: 'GP DA INGLATERRA',
    TEXAS: 'GP DE AUSTIN',
    ZANDVOORT: 'GP DA HOLANDA',

    // —— GP DOS (plural) ——
    EUA: 'GP DOS ESTADOS UNIDOS',
    USA: 'GP DOS ESTADOS UNIDOS',
    'ESTADOS UNIDOS': 'GP DOS ESTADOS UNIDOS',
};

/** Regras parciais quando o nome da planilha vem abreviado ou misturado. */
const GP_PARTIAL_RULES = [
    [/ARABIA\s*SAUD/i, 'GP DA ARÁBIA SAUDITA'],
    [/AZERBAIJ|BAKU/i, 'GP DO AZERBAIJÃO'],
    [/BELGI|SPA/i, 'GP DA BÉLGICA'],
    [/BAHREIN|BAREM/i, 'GP DO BAHREIN'],
    [/EMILIA|IMOLA/i, 'GP DE ÍMOLA'],
    [/ESTADOS\s*UNID|EUA|MIAMI|LAS\s*VEGAS|AUSTIN|TEXAS/i, null], // tratados abaixo
    [/SILVERSTONE|INGLATERRA|GRÃ.?BRETANHA|GREAT\s*BRITAIN/i, 'GP DA INGLATERRA'],
    [/ZANDVOORT|HOLANDA|PAISES\s*BAIXOS/i, 'GP DA HOLANDA'],
    [/MONZA|ITALIA(?!.*IMOLA)/i, 'GP DA ITÁLIA'],
    [/MONACO|MÔNACO/i, 'GP DE MÔNACO'],
    [/INTERLAGOS|SAO\s*PAULO|BRASIL/i, 'GP DO BRASIL'],
    [/SINGAPUR/i, 'GP DE SINGAPURA'],
    [/ABU\s*DHABI/i, 'GP DE ABU DHABI'],
];

export function normalizeGpKey(gp = '') {
    return String(gp || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/^GP\s+(DO|DA|DE|DOS|DAS)\s+/i, '')
        .replace(/^GP\s+/i, '')
        .trim()
        .toUpperCase();
}

function resolvePartialTitle(key) {
    for (const [pattern, title] of GP_PARTIAL_RULES) {
        if (!pattern.test(key)) continue;
        if (title) return title;
        // EUA / cidades americanas — prioridade por nome específico
        if (/MIAMI/i.test(key)) return 'GP DE MIAMI';
        if (/LAS\s*VEGAS/i.test(key)) return 'GP DE LAS VEGAS';
        if (/AUSTIN|TEXAS/i.test(key)) return 'GP DE AUSTIN';
        return 'GP DOS ESTADOS UNIDOS';
    }
    return null;
}

/**
 * Retorna o título completo do GP em português correto.
 * Ex.: "BÉLGICA" → "GP DA BÉLGICA", "AZERBAIJÃO" → "GP DO AZERBAIJÃO"
 */
export function formatGpDisplayName(gp = '') {
    const raw = String(gp || '').trim();
    if (!raw) return 'GRAND PRIX';

    const key = normalizeGpKey(raw);

    if (GP_PT_TITLES[key]) return GP_PT_TITLES[key];

    const partial = resolvePartialTitle(key);
    if (partial) return partial;

    // Entrada já formatada e desconhecida no mapa — preserva o texto
    if (/^GP\s+(DO|DA|DE|DOS|DAS)\s+/i.test(raw)) {
        return raw.toUpperCase();
    }

    // Fallback neutro (soa melhor que "GP DO" fixo para qualquer nome)
    const clean = raw.replace(/^GP\s+/i, '').trim();
    return clean ? `GP DE ${clean.toUpperCase()}` : 'GRAND PRIX';
}

/** Nome do país/região sem prefixo GP (ex.: "BÉLGICA"). */
export function formatCountryName(gp = '') {
    return formatGpDisplayName(gp)
        .replace(/^GP\s+(DO|DA|DE|DOS|DAS)\s+/i, '')
        .trim();
}
