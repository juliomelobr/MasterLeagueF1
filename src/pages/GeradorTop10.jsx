import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { supabase } from '../supabaseClient';
import { useLeagueData } from '../hooks/useLeagueData';
import Top10Art, { computeTop10ArtData, GRID_THEME, TOP10_FEED_EXPORT_HEIGHT, TOP10_STORY_EXPORT_HEIGHT } from '../components/Top10Art';
import '../index.css';
import './GeradorTop10.css';

export default function GeradorTop10() {
    const navigate = useNavigate();
    const artRef = useRef(null);
    const { rawCarreira, rawLight, seasons, tracks, loading } = useLeagueData();
    const [gridType, setGridType] = useState('light');
    const [selectedSeason, setSelectedSeason] = useState('');
    const [selectedRound, setSelectedRound] = useState('');
    const [publishKey, setPublishKey] = useState('');
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
            if (season === parseInt(selectedSeason, 10) && !Number.isNaN(round)) {
                roundMap.set(round, { round, gp: row[5], date: row[0] });
            }
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
        () => computeTop10ArtData({
            rawData,
            season: selectedSeason,
            round: selectedRound,
            tracks,
            gridType,
        }),
        [rawData, selectedSeason, selectedRound, tracks, gridType],
    );

    const { raceResults, raceInfo, gpSlug, fileName, targetPath } = artData;
    const theme = GRID_THEME[gridType];

    const exportCanvas = async () => {
        if (!artRef.current) throw new Error('Preview da arte não encontrado.');
        if (typeof document !== 'undefined' && document.fonts?.ready) {
            try { await document.fonts.ready; } catch { /* segue */ }
        }
        const targetWidth = 1080;
        const targetHeight = exportFormat === 'story' ? TOP10_STORY_EXPORT_HEIGHT : TOP10_FEED_EXPORT_HEIGHT;

        const dataUrl = await toPng(artRef.current, {
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
        return dataUrl;
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

    const handlePublish = async () => {
        if (!publishKey.trim()) {
            setStatus('Informe a chave de publicação configurada na Edge Function.');
            return;
        }
        if (raceResults.length < 10) {
            setStatus('Esta etapa ainda não tem TOP 10 completo para publicar.');
            return;
        }

        try {
            setIsExporting(true);
            setStatus('Gerando imagem e publicando no GitHub...');
            const dataUrl = await exportCanvas();
            setGeneratedImage(dataUrl);
            const base64 = dataUrl.split(',')[1];
            const { data, error } = await supabase.functions.invoke('publish-highlight-art', {
                body: {
                    publishKey,
                    imageBase64: base64,
                    targetPath,
                    message: `Publica TOP 10 ${theme.label} ${raceInfo.gp || `Etapa ${selectedRound}`}`,
                },
            });

            if (error) throw new Error(error.message || 'Falha ao chamar Edge Function.');
            if (!data?.success) throw new Error(data?.error || 'Publicação não confirmada.');
            setStatus(`Publicado com sucesso: ${data.path}`);
        } catch (error) {
            setStatus(`Erro ao publicar: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="top10-admin-page">
            <div className="top10-admin-header">
                <button className="top10-back-btn" onClick={() => navigate('/admin')}>Voltar ao Admin</button>
                <div>
                    <span className="top10-kicker">Admin</span>
                    <h1>Gerador TOP 10</h1>
                    <p>Crie a arte 4:5 do resultado da etapa e publique em <code>{targetPath}</code>.</p>
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
                    <label>
                        Chave de publicação
                        <input
                            type="password"
                            value={publishKey}
                            onChange={(event) => setPublishKey(event.target.value)}
                            placeholder="HIGHLIGHTS_PUBLISH_KEY"
                        />
                    </label>

                    <div className="top10-path-box">
                        <strong>Destino</strong>
                        <code>{targetPath}</code>
                    </div>

                    <button className="top10-primary-btn" onClick={handlePublish} disabled={loading || isExporting || raceResults.length < 10}>
                        {isExporting ? 'Processando...' : 'Publicar no GitHub'}
                    </button>
                    <button className="top10-secondary-btn" onClick={handleDownload} disabled={loading || isExporting || raceResults.length === 0}>
                        Baixar PNG
                    </button>

                    {status && <div className="top10-status">{status}</div>}
                    {generatedImage && <img className="top10-generated-preview" src={generatedImage} alt="PNG gerado" />}
                </aside>

                <main className="top10-preview-wrap">
                    <Top10Art
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
