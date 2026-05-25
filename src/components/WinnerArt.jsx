import { useMemo } from 'react';
import {
    GRID_THEME,
    slugify,
    splitDriverName,
    getTeamColor,
    getTeamLogo,
    TOP10_PARTNER_LOGOS,
    TOP10_PARTNERS_STRIP_HEIGHT,
} from './Top10Art';
import { formatGpDisplayName, formatCountryName } from '../utils/gpDisplayName';
import { resolveTrackInfo } from '../utils/resolveTrackInfo';
import '../pages/GeradorVencedor.css';

export { formatGpDisplayName, formatCountryName };

/** Logo principal do site (mesma usada em favicon / compartilhamento). */
export const ML_BRAND_LOGO = '/brand/master-league-og.png';

/** Core 1080×1350 + faixa de parceiros (mesma do TOP 10). */
export const WINNER_FEED_CORE_HEIGHT = 1350;
export const WINNER_FEED_EXPORT_HEIGHT = WINNER_FEED_CORE_HEIGHT + TOP10_PARTNERS_STRIP_HEIGHT;
export const WINNER_STORY_EXPORT_HEIGHT = 1920;

export function getWinnerBaseImagePath(gpSlug, gridType) {
    if (!gpSlug || !gridType) return '';
    return `/highlights/${gpSlug}/winner-base-${gridType}.png`;
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

    const trackInfo = resolveTrackInfo(winner?.gp, tracks);
    const circuitImage = trackInfo.circuit || '';
    const circuitName = trackInfo.circuitName || '';
    const gpFlag = trackInfo.flag || '';
    const gpDisplayName = formatGpDisplayName(winner?.gp);
    const countryName = formatCountryName(winner?.gp);
    const gridLabel = gridType === 'carreira' ? 'GRID CARREIRA' : 'GRID LIGHT';
    const teamColor = getTeamColor(winner?.team, gridType);
    const teamLogo = getTeamLogo(winner?.team, gridType);
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
        circuitName,
        gpFlag,
        gpDisplayName,
        countryName,
        gridLabel,
        teamColor,
        teamLogo,
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
    showCircuitName = true,
    showMlLogo = true,
    showPartners = true,
}) {
    const data = useMemo(
        () => computeWinnerArtData({ rawData, season, round, tracks, gridType }),
        [rawData, season, round, tracks, gridType],
    );

    const {
        winner,
        theme,
        circuitImage,
        circuitName,
        gpFlag,
        gpDisplayName,
        countryName,
        gridLabel,
        teamColor,
        teamLogo,
        nameParts,
        roundNum,
        hasWinner,
    } = data;

    const resolvedBase = baseImageUrl || data.baseImagePath;
    const partnersActive = showPartners && format === 'feed';
    const partnersClass = partnersActive ? 'has-partners' : '';
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
            className={`ml-winner-scaler format-${format} ${partnersClass} ${className}`.trim()}
            style={wrapperStyle}
        >
            <div
                className={`ml-winner-artboard ml-winner-composite format-${format} ${theme.className} ${partnersClass}`.trim()}
                ref={artRef}
            >
                <div className="ml-winner-core">
                    <img
                        className="ml-winner-composite-base"
                        src={resolvedBase}
                        alt={`Vencedor ${winner.name} · ${gpDisplayName}`}
                        crossOrigin={resolvedBase.startsWith('blob:') ? undefined : 'anonymous'}
                    />

                {/* Meta superior: ETAPA · bandeira + GP · GRID */}
                {showMeta && (
                    <div className="ml-winner-overlay-meta">
                        <span className="ml-winner-overlay-etapa">{`ETAPA ${roundNum}`}</span>
                        <div className="ml-winner-overlay-gp-row">
                            {showFlag && gpFlag && (
                                <img
                                    className="ml-winner-overlay-flag"
                                    src={gpFlag}
                                    alt={countryName}
                                    crossOrigin={gpFlag.includes('flagcdn.com') ? 'anonymous' : undefined}
                                />
                            )}
                            <span className="ml-winner-overlay-gp-name">{gpDisplayName}</span>
                        </div>
                        <span className="ml-winner-overlay-grid-label">{gridLabel}</span>
                    </div>
                )}

                {/* Bloco do piloto: VENCEDOR · nome · logo equipe · equipe */}
                {showDriver && (
                    <div className="ml-winner-overlay-driver">
                        <span className="ml-winner-overlay-vencedor">VENCEDOR</span>
                        <div className="ml-winner-overlay-name">
                            <span>{nameParts.first}</span>
                            {nameParts.last && <span className="ml-winner-overlay-last">{nameParts.last}</span>}
                        </div>
                        {showTeam && teamLogo && (
                            <div className="ml-winner-overlay-team-logo-wrap">
                                <img className="ml-winner-overlay-team-logo" src={teamLogo} alt={winner.team} />
                            </div>
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

                {/* Inferior central: circuito → nome do circuito → logo ML */}
                <div className="ml-winner-composite-overlays">
                    {showCircuit && circuitImage && (
                        <div className="ml-winner-overlay-circuit-wrap">
                            <img className="ml-winner-overlay-circuit" src={circuitImage} alt="" />
                        </div>
                    )}
                    {showCircuitName && circuitName && (
                        <p className="ml-winner-overlay-circuit-name">{circuitName.toUpperCase()}</p>
                    )}
                    {showMlLogo && (
                        <div className="ml-winner-overlay-ml-wrap">
                            <img className="ml-winner-overlay-ml" src={ML_BRAND_LOGO} alt="Master League" />
                        </div>
                    )}
                </div>
                </div>

                {partnersActive && (
                    <footer className="ml-winner-partners" aria-label="Parceiros">
                        {TOP10_PARTNER_LOGOS.map((logo) => (
                            <img
                                key={logo.src}
                                className={`ml-winner-partner-logo ${(logo.className || '').replace('ml-top10-', 'ml-winner-')}`.trim()}
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
