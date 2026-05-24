import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { useLeagueData } from '../hooks/useLeagueData';
import WinnerArt, { computeWinnerArtData } from '../components/WinnerArt';
import { GRID_THEME } from '../components/Top10Art';
import '../index.css';
import './GeradorVencedor.css';

export default function GeradorVencedor() {
    const navigate = useNavigate();
    const artRef = useRef(null);
    const { rawCarreira, rawLight, seasons, tracks, loading } = useLeagueData();
    const [gridType, setGridType] = useState('carreira');
    const [selectedSeason, setSelectedSeason] = useState('');
    const [selectedRound, setSelectedRound] = useState('');
    const [status, setStatus] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [generatedImage, setGeneratedImage] = useState('');
    const [exportFormat, setExportFormat] = useState('feed');

    const rawData = gridType === 'carreira' ? rawCarreira : rawLight;
    const safeSeasons = useMemo(() => {
        if (seasons?.length) return seasons;
        const seasonSet = new Set();
        [...(rawCarreira || []), ...(rawLight || [])].forEach((row) => {
            const season = parseInt(row[3], 10);
            if (!Number.isNaN(season) && season > 0) seasonSet.add(season);
        });
        return Array.from(seasonSet).sort((a, b) => b - a);
    }, [rawCarreira, rawLight, seasons]);

    useEffect(() => {
        if (!selectedSeason && safeSeasons.length) setSelectedSeason(String(safeSeasons[0]));
    }, [safeSeasons, selectedSeason]);

    const rounds = useMemo(() => {
        const roundMap = new Map();
        rawData.forEach((row) => {
            const season = parseInt(row[3], 10);
            const round = parseInt(row[4], 10);
            const pos = parseInt(row[8], 10);
            if (season !== parseInt(selectedSeason, 10) || Number.isNaN(round) || pos !== 1) return;
            roundMap.set(round, { round, gp: row[5], date: row[0] });
        });
        return Array.from(roundMap.values()).sort((a, b) => a.round - b.round);
    }, [rawData, selectedSeason]);

    useEffect(() => {
        if (!rounds.length) {
            setSelectedRound('');
            return;
        }
        if (!selectedRound || !rounds.some((item) => String(item.round) === String(selectedRound))) {
            setSelectedRound(String(rounds[rounds.length - 1].round));
        }
    }, [rounds, selectedRound]);

    const artData = useMemo(
        () => computeWinnerArtData({
            rawData,
            season: selectedSeason,
            round: selectedRound,
            tracks,
            gridType,
        }),
        [rawData, selectedSeason, selectedRound, tracks, gridType],
    );

    const { winner, gpSlug, fileName, targetPath, hasWinner } = artData;
    const theme = GRID_THEME[gridType];

    const exportCanvas = async () => {
        if (!artRef.current) throw new Error('Preview da arte não encontrado.');
        if (typeof document !== 'undefined' && document.fonts?.ready) {
            try { await document.fonts.ready; } catch { /* segue */ }
        }
        const targetWidth = 1080;
        const targetHeight = exportFormat === 'story' ? 1920 : 1350;

        return toPng(artRef.current, {
            backgroundColor: '#03060f',
            pixelRatio: 2,
            cacheBust: true,
            width: targetWidth,
            height: targetHeight,
            canvasWidth: targetWidth,
            canvasHeight: targetHeight,
            style: {
                transform: 'none',
                position: 'static',
                top: 'auto',
                left: 'auto',
                margin: '0',
                boxShadow: 'none',
                width: `${targetWidth}px`,
                height: `${targetHeight}px`,
            },
        });
    };

    const handleDownload = async () => {
        try {
            setIsExporting(true);
            setStatus('Gerando PNG...');
            const dataUrl = await exportCanvas();
            setGeneratedImage(dataUrl);
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            link.click();
            setStatus('PNG gerado para download.');
        } catch (error) {
            setStatus(`Erro ao gerar PNG: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="top10-admin-page">
            <div className="top10-admin-header">
                <button className="top10-back-btn" type="button" onClick={() => navigate('/admin')}>
                    Voltar ao Admin
                </button>
                <div>
                    <span className="top10-kicker">Admin</span>
                    <h1>Gerador do Vencedor</h1>
                    <p>
                        Arte 4:5 do vencedor da etapa — automática por grid, temporada e etapa.
                        Destino sugerido: <code>{targetPath}</code>
                    </p>
                </div>
            </div>

            <div className="top10-admin-layout">
                <aside className="top10-control-panel">
                    <label>
                        Grid
                        <select value={gridType} onChange={(event) => setGridType(event.target.value)}>
                            <option value="light">Light</option>
                            <option value="carreira">Carreira</option>
                        </select>
                    </label>
                    <label>
                        Temporada
                        <select value={selectedSeason} onChange={(event) => setSelectedSeason(event.target.value)}>
                            {safeSeasons.map((season) => <option key={season} value={season}>{season}</option>)}
                        </select>
                    </label>
                    <label>
                        Etapa
                        <select value={selectedRound} onChange={(event) => setSelectedRound(event.target.value)}>
                            {rounds.map((round) => (
                                <option key={round.round} value={round.round}>
                                    {round.round} - {round.gp}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Formato da arte
                        <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value)}>
                            <option value="feed">Feed 1080×1350 (4:5)</option>
                            <option value="story">Story 1080×1920 (9:16)</option>
                        </select>
                    </label>

                    <div className="top10-path-box">
                        <strong>Vencedor</strong>
                        <span>{hasWinner ? `${winner.name} · ${winner.team}` : 'Nenhum vencedor nesta etapa'}</span>
                        <strong style={{ marginTop: 10 }}>Destino</strong>
                        <code>{targetPath}</code>
                    </div>

                    <button
                        className="top10-primary-btn"
                        type="button"
                        onClick={handleDownload}
                        disabled={loading || isExporting || !hasWinner}
                    >
                        {isExporting ? 'Processando...' : 'Baixar PNG'}
                    </button>

                    {status && <div className="top10-status">{status}</div>}
                    {generatedImage && <img className="top10-generated-preview" src={generatedImage} alt="PNG gerado" />}
                </aside>

                <main className="top10-preview-wrap">
                    <WinnerArt
                        gridType={gridType}
                        season={selectedSeason}
                        round={selectedRound}
                        rawData={rawData}
                        tracks={tracks}
                        format={exportFormat}
                        artRef={artRef}
                    />
                </main>
            </div>
        </div>
    );
}
