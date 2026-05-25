import { useMemo } from 'react';
import {
    GRID_THEME,
    slugify,
    splitDriverName,
    getTeamColor,
} from './Top10Art';
import '../pages/GeradorVencedor.css';

/** Logo principal do site (mesma usada em favicon / compartilhamento). */
export const ML_BRAND_LOGO = '/brand/master-league-og.png';

export function getWinnerBaseImagePath(gpSlug, gridType) {
    if (!gpSlug || !gridType) return '';
    return `/highlights/${gpSlug}/winner-base-${gridType}.png`;
}

export function formatGpDisplayName(gp = '') {
    const clean = String(gp || '').replace(/^GP\s+/i, '').trim();
    if (!clean) return 'GRAND PRIX';
    return `GP DO ${clean.toUpperCase()}`;
}

export function formatCountryName(gp = '') {
    return String(gp || '').replace(/^GP\s+/i, '').trim().toUpperCase();
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
    const baseImagePath = getWinnerBaseImagePath(gpSlug, gridType);
    const baseImageStoragePath = `public/highlights/${gpSlug}/winner-base-${gridType}.png`;

    const trackKey = String(winner?.gp || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
    const trackInfo = tracks?.[trackKey] || {};
    const circuitImage = trackInfo.circuit || '';
    const gpFlag = trackInfo.flag || '';
    const gpDisplayName = formatGpDisplayName(winner?.gp);
    const countryName = formatCountryName(winner?.gp);
    const gridLabel = gridType === 'carreira' ? 'GRID CARREIRA' : 'GRID LIGHT';
    const teamColor = getTeamColor(winner?.team, gridType);
    const nameParts = splitDriverName(winner?.name || '');

    return {
        winner,
        theme,
        gpSlug,
        fileName,
        targetPath,
        baseImagePath,
        baseImageStoragePath,
        circuitImage,
        gpFlag,
        gpDisplayName,
        countryName,
        gridLabel,
        teamColor,
        nameParts,
        roundNum,
        hasWinner: Boolean(winner?.name && winner.name !== '-'),
    };
}

/**
 * Compositor: arte base (upload) + dados variáveis da planilha
 * posicionados como no layout de referência.
 */
export default function WinnerArt({
    gridType,
    season,
    round,
    rawData,
    tracks,
    baseImageUrl,
    format = 'feed',
    scale,
    artRef,
    className = '',
    showMeta = true,
    showDriver = true,
    showFlag = true,
    showTeam = true,
    showTaglines = true,
    showCircuit = true,
    showGpName = true,
    showMlLogo = true,
}) {
    const data = useMemo(
        () => computeWinnerArtData({ rawData, season, round, tracks, gridType }),
        [rawData, season, round, tracks, gridType],
    );

    const {
        winner,
        theme,
        circuitImage,
        gpFlag,
        gpDisplayName,
        countryName,
        gridLabel,
        teamColor,
        nameParts,
        roundNum,
        hasWinner,
    } = data;

    const resolvedBase = baseImageUrl || data.baseImagePath;
    const wrapperStyle = scale != null
        ? { '--ml-winner-scale': scale, '--team-color': teamColor, '--ml-accent': theme.accent, '--ml-accent-2': theme.accent2 }
        : { '--team-color': teamColor, '--ml-accent': theme.accent, '--ml-accent-2': theme.accent2 };

    if (!hasWinner) {
        return (
            <div className={`ml-winner-scaler format-${format} ${className}`.trim()} style={wrapperStyle}>
                <div className="ml-winner-artboard ml-winner-artboard--empty">
                    <p>Sem vencedor registrado para esta etapa.</p>
                </div>
            </div>
        );
    }

    if (!resolvedBase) {
        return (
            <div className={`ml-winner-scaler format-${format} ${className}`.trim()} style={wrapperStyle}>
                <div className="ml-winner-artboard ml-winner-artboard--empty">
                    <p>Envie a arte base (PNG) no painel ao lado.</p>
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
                className={`ml-winner-artboard ml-winner-composite format-${format} ${theme.className}`}
                ref={artRef}
            >
                <img
                    className="ml-winner-composite-base"
                    src={resolvedBase}
                    alt={`Vencedor ${winner.name} · ${gpDisplayName}`}
                    crossOrigin="anonymous"
                />

                {/* Meta superior esquerda: ETAPA · GP · GRID */}
                {showMeta && (
                    <div className="ml-winner-overlay-meta">
                        <span className="ml-winner-overlay-etapa">{`ETAPA ${roundNum}`}</span>
                        <span className="ml-winner-overlay-gp-top">{gpDisplayName}</span>
                        <span className="ml-winner-overlay-grid-label">{gridLabel}</span>
                    </div>
                )}

                {/* Bloco do piloto: VENCEDOR · nome · bandeira · equipe */}
                {showDriver && (
                    <div className="ml-winner-overlay-driver">
                        <span className="ml-winner-overlay-vencedor">VENCEDOR</span>
                        <div className="ml-winner-overlay-name">
                            <span>{nameParts.first}</span>
                            {nameParts.last && <span className="ml-winner-overlay-last">{nameParts.last}</span>}
                        </div>
                        {showFlag && gpFlag && (
                            <img className="ml-winner-overlay-flag" src={gpFlag} alt={countryName} />
                        )}
                        {showTeam && winner.team && (
                            <span className="ml-winner-overlay-team">{String(winner.team).toUpperCase()}</span>
                        )}
                        {showTaglines && (
                            <div className="ml-winner-overlay-taglines">
                                <span>MOVIDOS PELA PAIXÃO</span>
                                <span>UNIDOS PELO PROPÓSITO</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Inferior central: circuito → GP → logo ML */}
                <div className="ml-winner-composite-overlays">
                    {showCircuit && circuitImage && (
                        <img className="ml-winner-overlay-circuit" src={circuitImage} alt="" />
                    )}
                    {showGpName && (
                        <p className="ml-winner-overlay-gp">{gpDisplayName}</p>
                    )}
                    {showMlLogo && (
                        <img className="ml-winner-overlay-ml" src={ML_BRAND_LOGO} alt="Master League" />
                    )}
                </div>
            </div>
        </div>
    );
}
