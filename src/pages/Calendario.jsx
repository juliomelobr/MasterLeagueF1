import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Gauge } from 'lucide-react';
import Footer from '../components/Footer';
import { useLeagueData } from '../hooks/useLeagueData';
import './Calendario.css';

const etapas = [
    {
        etapa: 'E1',
        gp: 'Bahrein',
        circuito: 'Bahrain International Circuit',
        dataLight: '13/04/26',
        dataCarreira: '16/04/26',
        desempenhoLight: 'Real',
        desempenhoCarreira: 'Real',
        isSprint: false,
        flag: 'https://flagcdn.com/w80/bh.png',
        mapa: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Bahrain.png',
    },
    {
        etapa: 'E2',
        gp: 'Arábia Saudita',
        circuito: 'Jeddah Corniche Circuit',
        dataLight: '20/04/26',
        dataCarreira: '11/06/26',
        desempenhoLight: 'Igual',
        desempenhoCarreira: 'Real',
        isSprint: false,
        flag: 'https://flagcdn.com/w80/sa.png',
        mapa: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/SaudiArabia.png',
    },
    {
        etapa: 'E3',
        gp: 'Imola',
        circuito: 'Autodromo Enzo e Dino Ferrari',
        dataLight: '27/04/26',
        dataCarreira: '30/04/26',
        desempenhoLight: 'Real',
        desempenhoCarreira: 'Real',
        isSprint: false,
        flag: 'https://flagcdn.com/w80/it.png',
        mapa: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/EmiliaRomagna.png',
    },
    {
        etapa: 'E4',
        gp: 'Azerbaijão',
        circuito: 'Baku City Circuit',
        dataLight: '04/05/26',
        dataCarreira: '07/05/26',
        desempenhoLight: 'Igual',
        desempenhoCarreira: 'Real',
        isSprint: true,
        flag: 'https://flagcdn.com/w80/az.png',
        mapa: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Azerbaijan.png',
    },
    {
        etapa: 'E5',
        gp: 'Brasil',
        circuito: 'Interlagos',
        dataLight: '11/05/26',
        dataCarreira: '14/05/26',
        desempenhoLight: 'Real',
        desempenhoCarreira: 'Real',
        isSprint: false,
        flag: 'https://flagcdn.com/w80/br.png',
        mapa: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Brazil.png',
    },
    {
        etapa: 'E6',
        gp: 'Canadá',
        circuito: 'Circuit Gilles-Villeneuve',
        dataLight: '18/05/26',
        dataCarreira: '21/05/26',
        desempenhoLight: 'Igual',
        desempenhoCarreira: 'Real',
        isSprint: false,
        flag: 'https://flagcdn.com/w80/ca.png',
        mapa: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Canada.png',
    },
    {
        etapa: 'E7',
        gp: 'México',
        circuito: 'Autódromo Hermanos Rodríguez',
        dataLight: '25/05/26',
        dataCarreira: '28/05/26',
        desempenhoLight: 'Real',
        desempenhoCarreira: 'Real',
        isSprint: false,
        flag: 'https://flagcdn.com/w80/mx.png',
        mapa: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Mexico.png',
    },
    {
        etapa: 'E8',
        gp: 'Japão',
        circuito: 'Suzuka International Racing Course',
        dataLight: '01/06/26',
        dataCarreira: '04/06/26',
        desempenhoLight: 'Igual',
        desempenhoCarreira: 'Real',
        isSprint: true,
        flag: 'https://flagcdn.com/w80/jp.png',
        mapa: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Japan.png',
    },
];

const CIRCUIT_ASSET_FALLBACKS = {
    'ABU DHABI': {
        flag: 'https://flagcdn.com/w80/ae.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/YasMarina.png',
    },
    AUSTRIA: {
        flag: 'https://flagcdn.com/w80/at.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Austria.png',
    },
    TEXAS: {
        flag: 'https://flagcdn.com/w80/us.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Austin.png',
    },
    SPAIN: {
        flag: 'https://flagcdn.com/w80/es.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Spain.png',
    },
    QATAR: {
        flag: 'https://flagcdn.com/w80/qa.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Qatar.png',
    },
    MEXICO: {
        flag: 'https://flagcdn.com/w80/mx.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Mexico.png',
    },
    AUSTRALIA: {
        flag: 'https://flagcdn.com/w80/au.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Australia.png',
    },
    CHINA: {
        flag: 'https://flagcdn.com/w80/cn.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/China.png',
    },
    BAHREIN: {
        flag: 'https://flagcdn.com/w80/bh.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Bahrain.png',
    },
    'ARABIA SAUDITA': {
        flag: 'https://flagcdn.com/w80/sa.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/SaudiArabia.png',
    },
    IMOLA: {
        flag: 'https://flagcdn.com/w80/it.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/EmiliaRomagna.png',
    },
    AZERBAIJAO: {
        flag: 'https://flagcdn.com/w80/az.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Azerbaijan.png',
    },
    BRASIL: {
        flag: 'https://flagcdn.com/w80/br.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Brazil.png',
    },
    CANADA: {
        flag: 'https://flagcdn.com/w80/ca.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Canada.png',
    },
    'LAS VEGAS': {
        flag: 'https://flagcdn.com/w80/us.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/LasVegas.png',
    },
    JAPAO: {
        flag: 'https://flagcdn.com/w80/jp.png',
        map: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Japan.png',
    },
};

const DISPLAY_NAME_ALIASES = {
    'egon jackson': 'Egon Drews',
    'egon drews': 'Egon Drews',
    'rafael martins': 'Rafa Martins',
    'rafa martins': 'Rafa Martins',
};

function normalizeKey(value) {
    return (value || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

function canonicalDisplayName(name) {
    const raw = String(name || '').trim();
    if (!raw) return '';
    const key = raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return DISPLAY_NAME_ALIASES[key] || raw;
}

function parseDateLabel(rawDate) {
    if (!rawDate) return 'Data não definida';
    const s = String(rawDate).trim();
    const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (slash) {
        const day = slash[1].padStart(2, '0');
        const month = slash[2].padStart(2, '0');
        const yy = slash[3].slice(-2);
        return `${day}/${month}/${yy}`;
    }
    const iso = new Date(s);
    if (!Number.isNaN(iso.getTime())) {
        return iso.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
        });
    }
    return s;
}

const performanceByRoundS21 = {
    light: { 1: 'Real', 2: 'Igual', 3: 'Real', 4: 'Igual', 5: 'Real', 6: 'Igual', 7: 'Real', 8: 'Igual' },
    carreira: { 1: 'Real', 2: 'Real', 3: 'Real', 4: 'Real', 5: 'Real', 6: 'Real', 7: 'Real', 8: 'Real' },
};

function getTemplateRacesForSeason(gridType, seasonNum) {
    // T21 possui calendário oficial fixo; usamos como base para garantir exibição de todas as etapas.
    if (seasonNum !== 21) return [];
    return etapas.map((item, index) => ({
        etapa: item.etapa || `E${index + 1}`,
        round: index + 1,
        gp: item.gp,
        circuito: item.circuito,
        dataLabel: gridType === 'carreira' ? item.dataCarreira : item.dataLight,
        desempenho: gridType === 'carreira' ? item.desempenhoCarreira : item.desempenhoLight,
        isSprint: Boolean(item.isSprint),
        flag: item.flag || null,
        mapa: item.mapa || null,
        winner: null,
        winnerTeam: null,
    }));
}

function WinnerAvatar({ name, gridKey, season }) {
    const cleanName = (name || 'pilotoshadow')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '')
        .toLowerCase();
    const seasonSrc = `/pilotos/${gridKey}/s${season}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';
    const [src, setSrc] = useState(seasonSrc);

    useEffect(() => {
        setSrc(seasonSrc);
    }, [seasonSrc]);

    const handleError = () => {
        if (src !== smlSrc && src !== shadowSrc) {
            setSrc(smlSrc);
            return;
        }
        if (src === smlSrc) setSrc(shadowSrc);
    };

    return <img className="cal-winner-photo" src={src} alt={name || 'Vencedor'} onError={handleError} />;
}

function winnerShortName(name) {
    const full = canonicalDisplayName(name);
    if (!full) return '';
    const parts = full.split(/\s+/).filter(Boolean);
    const first = parts[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    if (!first) return '';
    if (!last) return `${first[0].toUpperCase()}.`;
    return `${first[0].toUpperCase()}. ${last}`;
}

function performanceLabel(value) {
    const v = String(value || '').trim().toLowerCase();
    if (v === 'real') return 'DES. REAL';
    if (v === 'igual') return 'DES. IGUAL';
    return 'DES. N/D';
}

function getCircuitFallback(gpRaw) {
    const key = normalizeKey(gpRaw)
        .replace('Á', 'A')
        .replace('É', 'E')
        .replace('Í', 'I')
        .replace('Ó', 'O')
        .replace('Ú', 'U');
    const byExact = CIRCUIT_ASSET_FALLBACKS[key];
    if (byExact) return byExact;
    if (key.includes('ARABIA')) return CIRCUIT_ASSET_FALLBACKS['ARABIA SAUDITA'];
    if (key.includes('AZERBAIJAO') || key.includes('AZERBAIJAN') || key.includes('BAKU')) return CIRCUIT_ASSET_FALLBACKS.AZERBAIJAO;
    if (key.includes('VEGAS')) return CIRCUIT_ASSET_FALLBACKS['LAS VEGAS'];
    if (key.includes('JAPAO') || key.includes('JAPAN')) return CIRCUIT_ASSET_FALLBACKS.JAPAO;
    if (key.includes('CANADA')) return CIRCUIT_ASSET_FALLBACKS.CANADA;
    return { flag: null, map: null };
}

const GridColumn = ({ title, tone, gridKey, season, races, loading }) => (
    <section className={`season-grid-col ${tone}`}>
        <header className="season-grid-col-header">
            <h2>{title}</h2>
            <span className="season-pill">{races.length} etapa(s)</span>
        </header>

        {loading ? (
            <div className="season-empty">Carregando...</div>
        ) : races.length === 0 ? (
            <div className="season-empty">Sem etapas nesta temporada.</div>
        ) : (
            <div className="season-card-list">
                {races.map((etapa) => (
                    <article key={`${title}-${etapa.etapa}`} className={`season-race-card ${etapa.isSprint ? 'is-sprint' : ''}`}>
                        <div className="season-race-top">
                            <section className="season-race-info">
                                <div className="season-race-head">
                                    <img
                                        className="season-race-flag"
                                        src={etapa.flag || etapa.flagFallback || '/team-logos/logo-ml.png'}
                                        alt={`Bandeira ${etapa.gp}`}
                                        onError={(e) => {
                                            if (etapa.flagFallback && e.currentTarget.src !== etapa.flagFallback) {
                                                e.currentTarget.src = etapa.flagFallback;
                                                return;
                                            }
                                            e.currentTarget.src = '/team-logos/logo-ml.png';
                                        }}
                                    />
                                    <div className="season-race-text">
                                        <div className="season-race-title-row">
                                            <h3 className="season-race-title">{etapa.gp}</h3>
                                            {etapa.isSprint && <span className="season-sprint-badge">SPRINT</span>}
                                        </div>
                                        <div className="season-race-circuit">{etapa.circuito}</div>
                                    </div>
                                </div>
                                <div className="season-race-meta">
                                    <span className="season-race-badge">
                                        <CalendarDays size={13} />
                                        {etapa.dataLabel} - {performanceLabel(etapa.desempenho).replace('DES.', 'DESEMP.')}
                                    </span>
                                </div>
                            </section>
                            <aside className="season-winner-panel">
                                {etapa.winner ? (
                                    <>
                                        <span className="season-winner-tag">Vencedor</span>
                                        <WinnerAvatar name={canonicalDisplayName(etapa.winner)} gridKey={gridKey} season={season} />
                                        <span className="season-winner-name">{winnerShortName(etapa.winner)}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="season-winner-tag">Vencedor</span>
                                        <img className="season-winner-placeholder" src="/pilotos/pilotoshadow.png" alt="Vencedor a definir" />
                                        <span className="season-winner-name">Etapa {etapa.round}</span>
                                    </>
                                )}
                            </aside>
                        </div>
                    </article>
                ))}
            </div>
        )}
    </section>
);

function Calendario() {
    const { rawCarreira, rawLight, tracks, datesCarreira, datesLight, seasons, loading } = useLeagueData();
    const [selectedSeason, setSelectedSeason] = useState(21);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    useEffect(() => {
        if (!loading && seasons?.length > 0) {
            const hasCurrent = seasons.includes(21);
            setSelectedSeason((prev) => {
                if (prev && seasons.includes(prev)) return prev;
                return hasCurrent ? 21 : seasons[0];
            });
        }
    }, [loading, seasons]);

    const seasonsSorted = useMemo(
        () => [...(seasons || [])].sort((a, b) => b - a),
        [seasons],
    );

    const buildGridRaces = useMemo(
        () => (gridType) => {
            const raw = gridType === 'carreira' ? rawCarreira : rawLight;
            const datesMap = gridType === 'carreira' ? datesCarreira : datesLight;
            const races = new Map();
            const seasonNum = Number(selectedSeason);
            if (!Array.isArray(raw) || !Number.isFinite(seasonNum)) return [];

            const templateRaces = getTemplateRacesForSeason(gridType, seasonNum);
            templateRaces.forEach((race) => {
                races.set(race.round, race);
            });

            raw.forEach((row) => {
                const rowSeason = parseInt(row?.[3] || '0', 10);
                const round = parseInt(row?.[4] || '0', 10);
                if (rowSeason !== seasonNum || !Number.isFinite(round) || round < 1) return;

                const gpRaw = (row?.[5] || '').toString().trim();
                const gpRawCanonical = seasonNum === 21 && round === 7
                    ? 'México'
                    : gpRaw;
                const gpKey = normalizeKey(gpRawCanonical);
                const track = tracks?.[gpKey] || {};
                const dateKey = `${seasonNum}-${round}`;
                const dateRaw = datesMap?.[dateKey] || row?.[0] || '';
                const desempenho =
                    seasonNum === 21
                        ? performanceByRoundS21[gridType]?.[round] || 'N/D'
                        : 'N/D';

                if (!races.has(round)) {
                    const fallback = getCircuitFallback(gpRawCanonical);
                    races.set(round, {
                        etapa: `E${round}`,
                        round,
                        gp: gpRawCanonical || `Etapa ${round}`,
                        circuito: track?.circuitName || gpRawCanonical || `Etapa ${round}`,
                        dataLabel: parseDateLabel(dateRaw),
                        desempenho,
                        isSprint: false,
                        flag: track?.flag || fallback.flag || null,
                        mapa: track?.circuit || fallback.map || null,
                        flagFallback: fallback.flag || null,
                        mapFallback: fallback.map || null,
                        winner: null,
                        winnerTeam: null,
                    });
                }
                const current = races.get(round);
                const fallback = getCircuitFallback(gpRawCanonical || current.gp);
                // Se existir template da etapa, apenas enriquecemos com dados reais quando disponíveis.
                if (gpRawCanonical) current.gp = gpRawCanonical;
                if (track?.circuitName) current.circuito = track.circuitName;
                if (track?.flag) current.flag = track.flag;
                if (!current.flag && fallback.flag) current.flag = fallback.flag;
                current.flagFallback = fallback.flag || current.flagFallback || null;
                if (track?.circuit) current.mapa = track.circuit;
                if (!current.mapa && fallback.map) current.mapa = fallback.map;
                current.mapFallback = fallback.map || current.mapFallback || null;
                if (dateRaw) current.dataLabel = parseDateLabel(dateRaw);

                const modeloRaw = String(row?.[2] || '').toLowerCase();
                if (modeloRaw.includes('sprint')) {
                    current.isSprint = true;
                }

                const posRaw = String(row?.[8] || '').trim().toLowerCase();
                const isWinner =
                    parseInt(posRaw, 10) === 1
                    || posRaw === '1º'
                    || posRaw === 'p1';
                if (isWinner) {
                    const current = races.get(round);
                    const winnerName = (row?.[9] || '').toString().trim();
                    if (winnerName) {
                        current.winner = winnerName;
                        current.winnerTeam = (row?.[10] || '').toString().trim() || null;
                    }
                }
            });

            return [...races.values()].sort((a, b) => a.round - b.round);
        },
        [rawCarreira, rawLight, datesCarreira, datesLight, tracks, selectedSeason],
    );

    const lightRaces = useMemo(() => buildGridRaces('light'), [buildGridRaces]);
    const carreiraRaces = useMemo(() => buildGridRaces('carreira'), [buildGridRaces]);

    return (
        <main className="cal-page">
            <section className="cal-hero">
                <p className="cal-kicker">Master League F1</p>
                <h1>Calendário da Temporada {selectedSeason}</h1>
            </section>

            <section className="cal-season-filter">
                <label htmlFor="season-select">Temporada</label>
                <select
                    id="season-select"
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                >
                    {seasonsSorted.map((season) => (
                        <option key={season} value={season}>
                            T{season}
                        </option>
                    ))}
                </select>
            </section>

            <section className="cal-grids-layout">
                <GridColumn
                    title="Grid Light"
                    tone="light"
                    gridKey="light"
                    season={selectedSeason}
                    races={lightRaces}
                    loading={loading}
                />
                <GridColumn
                    title="Grid Carreira"
                    tone="carreira"
                    gridKey="carreira"
                    season={selectedSeason}
                    races={carreiraRaces}
                    loading={loading}
                />
            </section>

            <section className="cal-notes">
                <p><strong>Sprint:</strong> etapas com qualy de volta única.</p>
                <p><strong>F1:</strong> etapas em semana de evento da F1 real.</p>
            </section>
            <Footer />
        </main>
    );
}

export default Calendario;
