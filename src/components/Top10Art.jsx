import { useEffect, useMemo, useState } from 'react';
import { resolveTrackInfo } from '../utils/resolveTrackInfo';
import '../pages/GeradorTop10.css';

const POINTS_RACE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const POINTS_SPRINT = [8, 7, 6, 5, 4, 3, 2, 1];

/** Faixa inferior de parceiros — não altera o core 1080×1500. */
export const TOP10_PARTNERS_STRIP_HEIGHT = 120;
export const TOP10_FEED_CORE_HEIGHT = 1500;
export const TOP10_FEED_EXPORT_HEIGHT = TOP10_FEED_CORE_HEIGHT + TOP10_PARTNERS_STRIP_HEIGHT;
export const TOP10_STORY_EXPORT_HEIGHT = 2080;

export const TOP10_PARTNER_LOGOS = [
    { src: '/partners/master-league.png', alt: 'Master League', className: 'ml-top10-partner-logo--ml' },
    { src: '/partners/ubav.png', alt: 'UBAV', className: 'ml-top10-partner-logo--ubav' },
    { src: '/partners/f1vs.png', alt: 'F1 VS', className: 'ml-top10-partner-logo--f1vs' },
    { src: '/partners/saes-54es.png', alt: '54ES Design', className: 'ml-top10-partner-logo--saes' },
];

export const GRID_THEME = {
    carreira: {
        label: 'Carreira',
        logo: '/logos/logo-ml-carreira.png',
        accent: '#8B1E3F',
        accent2: '#E11D48',
        className: 'carreira',
    },
    light: {
        label: 'Light',
        logo: '/logos/logo-ml-light.png',
        accent: '#1E40AF',
        accent2: '#3B82F6',
        className: 'light',
    },
};

export const formatDriverName = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return String(name || '').toUpperCase();
    return `${parts[0]} ${parts.slice(1).join(' ')}`.toUpperCase();
};

export const splitDriverName = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: '', last: '' };
    if (parts.length === 1) return { first: parts[0].toUpperCase(), last: '' };
    return {
        first: parts[0].toUpperCase(),
        last: parts.slice(1).join(' ').toUpperCase(),
    };
};

export const parseLapTime = (timeStr) => {
    if (!timeStr || timeStr === '-') return Infinity;
    const parts = String(timeStr).split(':');
    if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return parseInt(minutes, 10) * 60000 + parseFloat(seconds) * 1000;
    }
    return Infinity;
};

export const normalizeFileName = (name = '') =>
    String(name || 'pilotoshadow')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '')
        .toLowerCase() || 'pilotoshadow';

export const slugify = (text = '') =>
    String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/gp\s+/g, 'gp-')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

export const getTeamLogo = (teamName, gridType = 'carreira') => {
    const fallbackByGrid = {
        carreira: '/logos/logo-ml-carreira.png',
        light: '/logos/logo-ml-light.png',
    };
    const fallback = fallbackByGrid[gridType] || '/team-logos/logo-ml.png';
    if (!teamName || teamName.trim() === '') return fallback;

    const t = teamName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (t.includes('redbull') || t.includes('red bull') || t.includes('oracle')) return '/team-logos/f1-redbull.png';
    if (t.includes('ferrari')) return '/team-logos/f1-ferrari.png';
    if (t.includes('mercedes')) return '/team-logos/f1-mercedes.png';
    if (t.includes('renault')) return '/team-logos/f1-renault.png';
    if (t.includes('mclaren')) return '/team-logos/f1-mclaren.png';
    if (t.includes('aston')) return '/team-logos/f1-astonmartin.png';
    if (t.includes('alpine')) return '/team-logos/f1-alpine.png';
    if (t.includes('alfaromeo') || t.includes('alfa romeo') || (t.includes('alfa') && !t.includes('tauri'))) return '/team-logos/f1-alfaromeo.png';
    if (t.includes('alphatauri') || t.includes('alpha tauri')) return '/team-logos/f1-alphatauri.png';
    if (t.includes('tororosso') || t.includes('toro rosso') || t.includes('toro')) return '/team-logos/f1-tororosso.png';
    if (t.includes('williams')) return '/team-logos/f1-williams.png';
    if (t.includes('haas')) return '/team-logos/f1-haas.png';
    if (t.includes('sauber') || t.includes('stake') || t.includes('kick')) return '/team-logos/f1-sauber.png';
    if (t.includes('racingpoint') || (t.includes('racing') && t.includes('point'))) return '/team-logos/f1-racingpoint.png';
    if (t.includes('vcarb') || (t.includes('racing') && t.includes('bulls'))) return '/team-logos/f1-racingbulls.png';
    return fallback;
};

export const getTeamColor = (teamName, gridType = 'carreira') => {
    if (!teamName) return gridType === 'light' ? '#06B6D4' : '#8B1E3F';
    const t = teamName.toLowerCase();
    if (t.includes('alfa') && !t.includes('tauri')) return '#900000';
    if (t.includes('alpha') || t.includes('tauri')) return '#DCE8F2';
    if (t.includes('racing point') || t.includes('bwt')) return '#F596C8';
    if (t.includes('renault')) return '#FFF500';
    if (t.includes('toro') || t.includes('rosso')) return '#469BFF';
    if (t.includes('red bull') || t.includes('redbull') || t.includes('oracle')) return '#3671C6';
    if (t.includes('ferrari')) return '#E8002D';
    if (t.includes('mercedes')) return '#27F4D2';
    if (t.includes('mclaren')) return '#FF8700';
    if (t.includes('aston')) return '#229971';
    if (t.includes('alpine')) return '#0090FF';
    if (t.includes('haas')) return '#B6BABD';
    if (t.includes('williams')) return '#64C4FF';
    if (t.includes('stake') || t.includes('sauber') || t.includes('kick')) return '#52E252';
    if (t.includes('vcarb') || t.includes('racing bulls')) return '#6692FF';
    return gridType === 'light' ? '#06B6D4' : '#8B1E3F';
};

const buildImageChain = (name, gridType, season) => {
    const cleanName = normalizeFileName(name);
    return [
        `/pilotos/${gridType}/s${season}/${cleanName}.png`,
        `/pilotos/SML/${cleanName}.png`,
        `/pilotos/${gridType}/s19/${cleanName}.png`,
        '/pilotos/pilotoshadow.png',
    ];
};

function DriverPhoto({ name, gridType, season, className }) {
    const chain = useMemo(() => buildImageChain(name, gridType, season), [name, gridType, season]);
    const [step, setStep] = useState(0);

    useEffect(() => setStep(0), [chain]);

    return (
        <img
            className={className}
            src={chain[Math.min(step, chain.length - 1)]}
            alt={name || 'Piloto'}
            crossOrigin="anonymous"
            onError={() => setStep((current) => Math.min(current + 1, chain.length - 1))}
        />
    );
}

function LogoImage({ src, alt, className }) {
    const [hidden, setHidden] = useState(false);
    if (hidden || !src) return null;
    return <img src={src} alt={alt || ''} className={className} crossOrigin="anonymous" onError={() => setHidden(true)} />;
}

function TeamLogo({ team, gridType, className }) {
    const primarySrc = getTeamLogo(team, gridType);
    const [src, setSrc] = useState(primarySrc);

    useEffect(() => {
        setSrc(getTeamLogo(team, gridType));
    }, [team, gridType]);

    return (
        <img
            src={src}
            alt={team || 'Equipe'}
            className={className}
            crossOrigin="anonymous"
            onError={() => setSrc('/team-logos/logo-ml.png')}
        />
    );
}

function PodiumCard({ driver, gridType, season, variant }) {
    if (!driver) return <div className="ml-top10-podium-card ml-top10-podium-card--empty" />;

    const teamColor = getTeamColor(driver.team, gridType);
    const { first, last } = splitDriverName(driver.name);

    return (
        <article
            className={`ml-top10-podium-card ml-top10-podium-card--${variant}`}
            style={{ '--team-glow': teamColor }}
        >
            <div className="ml-top10-podium-card-inner">
                <div className="ml-top10-podium-card-bg" />
                <div className="ml-top10-podium-bignum" aria-hidden="true">
                    <TeamLogo team={driver.team} gridType={gridType} className="ml-top10-podium-bignum-logo" />
                </div>
                <div className="ml-top10-podium-glow" />
                <span className="ml-top10-podium-tag">{driver.pos}º</span>
                <div className="ml-top10-podium-photo">
                    <DriverPhoto name={driver.name} gridType={gridType} season={season} className="ml-top10-podium-photo-img" />
                </div>
                <div className="ml-top10-podium-meta">
                    <div className="ml-top10-podium-driver-info">
                        <span className="ml-top10-podium-driver-first">{first}</span>
                        {last && <span className="ml-top10-podium-driver-last">{last}</span>}
                    </div>
                    <div className="ml-top10-podium-team-box">
                        <TeamLogo team={driver.team} gridType={gridType} className="ml-top10-podium-team-logo" />
                    </div>
                </div>
            </div>
        </article>
    );
}

/**
 * Calcula todos os dados derivados (top 10, pole, fastest lap, sprint winner, etc.)
 * a partir do raw da planilha de uma temporada/etapa específica de um grid.
 *
 * Função pura: pode ser chamada fora do componente (validações no Admin, etc.).
 */
export function computeTop10ArtData({ rawData, season, round, tracks, gridType }) {
    const seasonNum = parseInt(season, 10);
    const roundNum = parseInt(round, 10);
    const allRaceResults = [];

    (rawData || []).forEach((row) => {
        const s = parseInt(row[3], 10);
        const r = parseInt(row[4], 10);
        const pos = parseInt(row[8], 10);
        if (s !== seasonNum || r !== roundNum || Number.isNaN(pos)) return;

        const qualyPos = parseInt(row[6], 10);
        const sprintPos = parseInt(row[7], 10);
        let totalPoints = 0;
        if (pos >= 1 && pos <= 10) totalPoints += POINTS_RACE[pos - 1];
        if (!Number.isNaN(sprintPos) && sprintPos >= 1 && sprintPos <= 8) totalPoints += POINTS_SPRINT[sprintPos - 1];

        allRaceResults.push({
            pos,
            qualyPos: Number.isNaN(qualyPos) ? 99 : qualyPos,
            sprintPos: Number.isNaN(sprintPos) ? 99 : sprintPos,
            name: row[9] || '-',
            team: row[10] || '-',
            date: row[0] || '',
            gp: row[5] || '',
            fastestLap: row[11] || '-',
            poleTime: row[12] || '-',
            totalPoints,
        });
    });

    allRaceResults.sort((a, b) => a.pos - b.pos);
    const raceResults = allRaceResults.slice(0, 10);

    const poleInfo =
        allRaceResults.find((d) => d.qualyPos === 1 && d.poleTime && d.poleTime !== '-') || null;
    const sprintWinner = allRaceResults.find((d) => d.sprintPos === 1) || null;

    const validFastest = allRaceResults
        .filter((d) => d.fastestLap && d.fastestLap !== '-')
        .map((d) => ({ ...d, _ms: parseLapTime(d.fastestLap) }))
        .filter((d) => Number.isFinite(d._ms));
    const fastestLapInfo = validFastest.length
        ? validFastest.reduce((best, current) => (current._ms < best._ms ? current : best))
        : null;

    const raceInfo = raceResults[0] || allRaceResults[0] || {};
    const theme = GRID_THEME[gridType] || GRID_THEME.light;
    const gpSlug = slugify(raceInfo.gp || `etapa-${roundNum}`);
    const fileName = `top10-${gridType}.png`;
    const targetPath = `public/highlights/${gpSlug}/${fileName}`;
    const trackData = resolveTrackInfo(raceInfo.gp, tracks);
    const gpFlag = trackData.flag || '';

    const getByPos = (pos) => raceResults.find((d) => Number(d.pos) === pos) || null;
    const p1 = getByPos(1);
    const p2 = getByPos(2);
    const p3 = getByPos(3);
    const listFrom4 = raceResults.filter((d) => Number(d.pos) >= 4);

    return {
        allRaceResults,
        raceResults,
        raceInfo,
        poleInfo,
        sprintWinner,
        fastestLapInfo,
        theme,
        gpSlug,
        fileName,
        targetPath,
        gpFlag,
        p1,
        p2,
        p3,
        listFrom4,
    };
}

/**
 * Componente puramente visual da arte do TOP 10.
 *
 * Props:
 *  - gridType: 'light' | 'carreira'
 *  - season, round: temporada e etapa que serão filtradas em rawData
 *  - rawData: array vindo de useLeagueData (rawCarreira ou rawLight)
 *  - tracks: mapa de pistas (para bandeira)
 *  - format: 'feed' (1080×1620 com parceiros, core 1080×1500) ou 'story' (1080×2080)
 *  - scale: opcional, override do --ml-scale do CSS (ex.: 0.45)
 *  - artRef: ref opcional para o artboard (para export PNG)
 *  - className: classes extras para o wrapper externo
 *  - showPartners: exibe faixa inferior de logos (somente format feed)
 */
export default function Top10Art({
    gridType,
    season,
    round,
    rawData,
    tracks,
    format = 'feed',
    scale,
    artRef,
    className = '',
    showPartners = true,
}) {
    const data = useMemo(
        () => computeTop10ArtData({ rawData, season, round, tracks, gridType }),
        [rawData, season, round, tracks, gridType],
    );

    const {
        raceInfo,
        theme,
        gpFlag,
        poleInfo,
        sprintWinner,
        fastestLapInfo,
        p1,
        p2,
        p3,
        listFrom4,
    } = data;

    const wrapperStyle = scale != null ? { '--ml-scale': scale } : undefined;
    const partnersActive = showPartners && format === 'feed';
    const partnersClass = partnersActive ? 'has-partners' : '';

    return (
        <div
            className={`ml-top10-scaler format-${format} ${partnersClass} ${className}`.trim()}
            style={wrapperStyle}
        >
            <div
                className={`ml-top10-artboard ${theme.className} format-${format} ${partnersClass}`.trim()}
                ref={artRef}
                style={{ '--ml-accent': theme.accent, '--ml-accent-2': theme.accent2 }}
            >
                <div className="ml-top10-core">
                    <div className="ml-top10-bg" aria-hidden="true">
                        <div className="ml-top10-bg-grid" />
                        <div className="ml-top10-bg-diamonds-large" />
                        <div className="ml-top10-bg-diamonds" />
                        <div className="ml-top10-bg-dots" />
                        <div className="ml-top10-bg-streak" />
                        <div className="ml-top10-bg-noise" />
                        <div className="ml-top10-bg-vignette" />
                        <div className="ml-top10-bg-watermark">TOP 10</div>
                    </div>

                    <div className="ml-top10-content">
                    <header className="ml-top10-header">
                        <div className="ml-top10-header-left">
                            <div className="ml-top10-flag-wrap">
                                {gpFlag ? (
                                    <img className="ml-top10-flag" src={gpFlag} alt="" crossOrigin="anonymous" />
                                ) : (
                                    <div className="ml-top10-flag-fallback" />
                                )}
                            </div>
                            <div className="ml-top10-header-info">
                                <span className="ml-top10-gp-kicker">RACE RESULT</span>
                                <h1 className="ml-top10-gp-title">
                                    {String(raceInfo.gp || 'ETAPA').replace(/^GP\s+/i, '')}
                                </h1>
                                <p className="ml-top10-meta-line">
                                    <span>Temporada {season}</span>
                                    <span>Etapa {round}</span>
                                    {raceInfo.date ? <span>{raceInfo.date}</span> : null}
                                </p>
                            </div>
                        </div>
                        <div className="ml-top10-header-right">
                            <LogoImage src={theme.logo} alt={`Master League ${theme.label}`} className="ml-top10-grid-logo" />
                            <div className="ml-top10-title-block">
                                <small>{theme.label}</small>
                                <strong>TOP 10</strong>
                            </div>
                        </div>
                    </header>

                    <section className="ml-top10-podium">
                        <PodiumCard driver={p2} gridType={gridType} season={season} variant="second" />
                        <PodiumCard driver={p1} gridType={gridType} season={season} variant="first" />
                        <PodiumCard driver={p3} gridType={gridType} season={season} variant="third" />
                    </section>

                    <section className="ml-top10-ranking">
                        {listFrom4.map((driver) => {
                            const teamColor = getTeamColor(driver.team, gridType);
                            return (
                                <article
                                    className="ml-top10-rank-row"
                                    key={`${driver.pos}-${driver.name}`}
                                    style={{ '--team-color': teamColor }}
                                >
                                    <span className="ml-top10-rank-pos">{driver.pos}</span>
                                    <div className="ml-top10-rank-photo">
                                        <DriverPhoto name={driver.name} gridType={gridType} season={season} />
                                    </div>
                                    <div className="ml-top10-rank-driver">
                                        <strong>{formatDriverName(driver.name)}</strong>
                                    </div>
                                    <div className="ml-top10-rank-teamname">{driver.team}</div>
                                    <div className="ml-top10-rank-team">
                                        <TeamLogo team={driver.team} gridType={gridType} className="ml-top10-rank-team-logo" />
                                    </div>
                                </article>
                            );
                        })}
                    </section>

                    {(sprintWinner || poleInfo || fastestLapInfo) && (
                        <section className="ml-top10-stats">
                            {sprintWinner ? (
                                <article
                                    className="ml-top10-stat-row ml-top10-stat-row--sprint"
                                    style={{ '--team-color': getTeamColor(sprintWinner.team, gridType) }}
                                >
                                    <span className="ml-top10-stat-label">SPRINT</span>
                                    <div className="ml-top10-stat-photo">
                                        <DriverPhoto name={sprintWinner.name} gridType={gridType} season={season} />
                                    </div>
                                    <strong className="ml-top10-stat-driver">{formatDriverName(sprintWinner.name)}</strong>
                                    <span className="ml-top10-stat-team">{sprintWinner.team}</span>
                                    <span className="ml-top10-stat-time ml-top10-stat-time--label">VENCEDOR</span>
                                </article>
                            ) : poleInfo ? (
                                <article
                                    className="ml-top10-stat-row ml-top10-stat-row--pole"
                                    style={{ '--team-color': getTeamColor(poleInfo.team, gridType) }}
                                >
                                    <span className="ml-top10-stat-label">POLE POSITION</span>
                                    <div className="ml-top10-stat-photo">
                                        <DriverPhoto name={poleInfo.name} gridType={gridType} season={season} />
                                    </div>
                                    <strong className="ml-top10-stat-driver">{formatDriverName(poleInfo.name)}</strong>
                                    <span className="ml-top10-stat-team">{poleInfo.team}</span>
                                    <span className="ml-top10-stat-time">{poleInfo.poleTime}</span>
                                </article>
                            ) : null}
                            {fastestLapInfo && (
                                <article
                                    className="ml-top10-stat-row ml-top10-stat-row--fastest"
                                    style={{ '--team-color': getTeamColor(fastestLapInfo.team, gridType) }}
                                >
                                    <span className="ml-top10-stat-label">VOLTA RÁPIDA</span>
                                    <div className="ml-top10-stat-photo">
                                        <DriverPhoto name={fastestLapInfo.name} gridType={gridType} season={season} />
                                    </div>
                                    <strong className="ml-top10-stat-driver">{formatDriverName(fastestLapInfo.name)}</strong>
                                    <span className="ml-top10-stat-team">{fastestLapInfo.team}</span>
                                    <span className="ml-top10-stat-time">{fastestLapInfo.fastestLap}</span>
                                </article>
                            )}
                        </section>
                    )}
                    </div>
                </div>

                {partnersActive && (
                    <footer className="ml-top10-partners" aria-label="Parceiros">
                        {TOP10_PARTNER_LOGOS.map((logo) => (
                            <img
                                key={logo.src}
                                className={`ml-top10-partner-logo ${logo.className || ''}`.trim()}
                                src={logo.src}
                                alt={logo.alt}
                                crossOrigin="anonymous"
                                draggable={false}
                            />
                        ))}
                    </footer>
                )}
            </div>
        </div>
    );
}
