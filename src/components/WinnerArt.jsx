import { useMemo } from 'react';
import { GRID_THEME, slugify } from './Top10Art';
import '../pages/GeradorVencedor.css';

/** Caminho público padrão da arte base (você envia o PNG para esta pasta). */
export function getWinnerBaseImagePath(gpSlug, gridType) {
    if (!gpSlug || !gridType) return '';
    return `/highlights/${gpSlug}/winner-base-${gridType}.png`;
}

export function formatGpDisplayName(gp = '') {
    const clean = String(gp || '').replace(/^GP\s+/i, '').trim();
    if (!clean) return 'GRAND PRIX';
    return `GP DO ${clean.toUpperCase()}`;
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
    const gpDisplayName = formatGpDisplayName(winner?.gp);

    return {
        winner,
        theme,
        gpSlug,
        fileName,
        targetPath,
        baseImagePath,
        baseImageStoragePath,
        circuitImage,
        gpDisplayName,
        hasWinner: Boolean(winner?.name && winner.name !== '-'),
    };
}

/**
 * Compositor: arte base (upload ou public/) + overlays automáticos
 * na parte inferior central (circuito → nome do GP → logo ML).
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
    showCircuit = true,
    showGpName = true,
    showMlLogo = true,
    showGridLogo = false,
}) {
    const data = useMemo(
        () => computeWinnerArtData({ rawData, season, round, tracks, gridType }),
        [rawData, season, round, tracks, gridType],
    );

    const {
        winner,
        theme,
        circuitImage,
        gpDisplayName,
        baseImagePath,
        hasWinner,
    } = data;

    const resolvedBase = baseImageUrl || baseImagePath;
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

                <div className="ml-winner-composite-overlays" aria-hidden="true">
                    {showGridLogo && (
                        <img
                            className="ml-winner-overlay-grid"
                            src={theme.logo}
                            alt=""
                        />
                    )}
                    {showCircuit && circuitImage && (
                        <img
                            className="ml-winner-overlay-circuit"
                            src={circuitImage}
                            alt=""
                        />
                    )}
                    {showGpName && (
                        <p className="ml-winner-overlay-gp">{gpDisplayName}</p>
                    )}
                    {showMlLogo && (
                        <img
                            className="ml-winner-overlay-ml"
                            src="/team-logos/logo-ml.png"
                            alt="Master League"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
