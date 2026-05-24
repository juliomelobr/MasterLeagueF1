import { useEffect, useMemo, useState } from 'react';
import {
    GRID_THEME,
    splitDriverName,
    slugify,
    normalizeFileName,
    getTeamLogo,
    getTeamColor,
} from './Top10Art';
import '../pages/GeradorVencedor.css';

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
    const [index, setIndex] = useState(0);

    useEffect(() => {
        setIndex(0);
    }, [name, gridType, season]);

    return (
        <img
            className={className}
            src={chain[index]}
            alt={name}
            onError={() => setIndex((prev) => (prev + 1 < chain.length ? prev + 1 : prev))}
        />
    );
}

function TeamLogo({ team, gridType, className }) {
    const [src, setSrc] = useState(() => getTeamLogo(team, gridType));
    useEffect(() => {
        setSrc(getTeamLogo(team, gridType));
    }, [team, gridType]);
    return (
        <img
            className={className}
            src={src}
            alt={team}
            onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/team-logos/logo-ml.png';
            }}
        />
    );
}

export function computeWinnerArtData({ rawData, season, round, tracks, gridType }) {
    const seasonNum = parseInt(season, 10);
    const roundNum = parseInt(round, 10);
    let winner = null;

    (rawData || []).forEach((row) => {
        const s = parseInt(row[3], 10);
        const r = parseInt(row[4], 10);
        const pos = parseInt(row[8], 10);
        if (s !== seasonNum || r !== roundNum || pos !== 1) return;
        winner = {
            pos: 1,
            name: row[9] || '-',
            team: row[10] || '-',
            date: row[0] || '',
            gp: row[5] || '',
        };
    });

    const theme = GRID_THEME[gridType] || GRID_THEME.light;
    const gpSlug = slugify(winner?.gp || `etapa-${roundNum}`);
    const fileName = `winner-${gridType}.png`;
    const targetPath = `public/highlights/${gpSlug}/${fileName}`;
    const trackKey = String(winner?.gp || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
    const trackInfo = tracks?.[trackKey] || {};
    const gpFlag = trackInfo.flag || '';
    const circuitName = trackInfo.circuitName || '';
    const circuitImage = trackInfo.circuit || '';

    return {
        winner,
        theme,
        gpSlug,
        fileName,
        targetPath,
        gpFlag,
        circuitName,
        circuitImage,
        hasWinner: Boolean(winner?.name && winner.name !== '-'),
    };
}

export default function WinnerArt({
    gridType,
    season,
    round,
    rawData,
    tracks,
    format = 'feed',
    scale,
    artRef,
    className = '',
}) {
    const data = useMemo(
        () => computeWinnerArtData({ rawData, season, round, tracks, gridType }),
        [rawData, season, round, tracks, gridType],
    );

    const { winner, theme, gpFlag, circuitName, circuitImage, hasWinner } = data;
    const teamColor = getTeamColor(winner?.team, gridType);
    const nameParts = splitDriverName(winner?.name || '');
    const gpClean = String(winner?.gp || '').replace(/^GP\s+/i, '').toUpperCase();
    const wrapperStyle = scale != null ? { '--ml-winner-scale': scale } : undefined;

    if (!hasWinner) {
        return (
            <div className={`ml-winner-scaler format-${format} ${className}`.trim()} style={wrapperStyle}>
                <div className="ml-winner-artboard ml-winner-artboard--empty">
                    <p>Sem vencedor registrado para esta etapa.</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`ml-winner-scaler format-${format} ${className}`.trim()}
            style={wrapperStyle}
        >
            <div
                className={`ml-winner-artboard ${theme.className} format-${format}`}
                ref={artRef}
                style={{
                    '--ml-accent': theme.accent,
                    '--ml-accent-2': theme.accent2,
                    '--team-color': teamColor,
                    '--team-glow': teamColor,
                }}
            >
                <div className="ml-winner-bg" aria-hidden="true">
                    <div className="ml-winner-bg-grid" />
                    <div className="ml-winner-bg-diamonds" />
                    <div className="ml-winner-bg-glow" />
                    {gpFlag && (
                        <div
                            className="ml-winner-bg-flag"
                            style={{ backgroundImage: `url(${gpFlag})` }}
                        />
                    )}
                    {circuitImage && (
                        <img className="ml-winner-bg-circuit" src={circuitImage} alt="" />
                    )}
                    <div className="ml-winner-bg-vignette" />
                    <div className="ml-winner-bg-stripe ml-winner-bg-stripe--tl" />
                    <div className="ml-winner-bg-stripe ml-winner-bg-stripe--br" />
                </div>

                <header className="ml-winner-header">
                    <div className="ml-winner-header-left">
                        {gpFlag && <img className="ml-winner-flag" src={gpFlag} alt="" />}
                        <div className="ml-winner-header-copy">
                            <span className="ml-winner-kicker">Race Winner</span>
                            <h1 className="ml-winner-gp">{gpClean || 'GRAND PRIX'}</h1>
                            <p className="ml-winner-meta-line">
                                {`Temporada ${season} · Etapa ${round}`}
                                {winner.date ? ` · ${winner.date}` : ''}
                            </p>
                            {circuitName && (
                                <p className="ml-winner-circuit">{circuitName.toUpperCase()}</p>
                            )}
                        </div>
                    </div>
                    <div className="ml-winner-header-right">
                        <img className="ml-winner-grid-logo" src={theme.logo} alt={theme.label} />
                        <span className="ml-winner-grid-tag">{theme.label.toUpperCase()}</span>
                    </div>
                </header>

                <div className="ml-winner-hero">
                    <div className="ml-winner-photo-frame">
                        <div className="ml-winner-photo-glow" />
                        <DriverPhoto
                            name={winner.name}
                            gridType={gridType}
                            season={season}
                            className="ml-winner-photo"
                        />
                        <div className="ml-winner-position-badge">
                            <span>1</span>
                            <small>VITÓRIA</small>
                        </div>
                    </div>
                </div>

                <footer className="ml-winner-footer">
                    <div className="ml-winner-footer-accent" />
                    <div className="ml-winner-footer-main">
                        <div className="ml-winner-driver-block">
                            <span className="ml-winner-label">Vencedor</span>
                            <div className="ml-winner-driver-name">
                                <span>{nameParts.first}</span>
                                {nameParts.last && <span>{nameParts.last}</span>}
                            </div>
                            <span className="ml-winner-team-name">{String(winner.team || '').toUpperCase()}</span>
                        </div>
                        <div className="ml-winner-team-box">
                            <TeamLogo team={winner.team} gridType={gridType} className="ml-winner-team-logo" />
                        </div>
                    </div>
                    <div className="ml-winner-brand-row">
                        <img className="ml-winner-ml-logo" src="/team-logos/logo-ml.png" alt="Master League" />
                        <span>Master League F1</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}
