import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { useLeagueData } from '../hooks/useLeagueData';
import WinnerArt, { computeWinnerArtData, getWinnerBaseImagePath } from '../components/WinnerArt';
import '../index.css';
import './GeradorVencedor.css';

export default function GeradorVencedor() {
    const navigate = useNavigate();
    const artRef = useRef(null);
    const uploadBlobRef = useRef(null);
    const { rawCarreira, rawLight, seasons, tracks, loading } = useLeagueData();
    const [gridType, setGridType] = useState('carreira');
    const [selectedSeason, setSelectedSeason] = useState('');
    const [selectedRound, setSelectedRound] = useState('');
    const [status, setStatus] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [generatedImage, setGeneratedImage] = useState('');
    const [exportFormat, setExportFormat] = useState('feed');

    const [uploadedBaseUrl, setUploadedBaseUrl] = useState('');
    const [publicBaseUrl, setPublicBaseUrl] = useState('');
    const [publicBaseOk, setPublicBaseOk] = useState(false);

    const [showMeta, setShowMeta] = useState(true);
    const [showDriver, setShowDriver] = useState(true);
    const [showFlag, setShowFlag] = useState(true);
    const [showTeam, setShowTeam] = useState(true);
    const [showTaglines, setShowTaglines] = useState(true);
    const [showCircuit, setShowCircuit] = useState(true);
    const [showGpName, setShowGpName] = useState(true);
    const [showMlLogo, setShowMlLogo] = useState(true);

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

    const {
        winner,
        gpSlug,
        fileName,
        targetPath,
        baseImageStoragePath,
        hasWinner,
    } = artData;

    const baseImageUrl = uploadedBaseUrl || (publicBaseOk ? publicBaseUrl : '');

    // Tenta carregar arte base já salva em public/highlights/<gp>/winner-base-<grid>.png
    useEffect(() => {
        if (!gpSlug || !gridType) {
            setPublicBaseOk(false);
            setPublicBaseUrl('');
            return undefined;
        }
        let cancelled = false;
        const path = getWinnerBaseImagePath(gpSlug, gridType);
        const url = `${path}?v=${Date.now()}`;
        const img = new Image();
        img.onload = () => {
            if (!cancelled) {
                setPublicBaseUrl(url);
                setPublicBaseOk(true);
            }
        };
        img.onerror = () => {
            if (!cancelled) {
                setPublicBaseUrl('');
                setPublicBaseOk(false);
            }
        };
        img.src = url;
        return () => { cancelled = true; };
    }, [gpSlug, gridType]);

    const handleUploadBase = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (uploadBlobRef.current) {
            URL.revokeObjectURL(uploadBlobRef.current);
        }
        const blobUrl = URL.createObjectURL(file);
        uploadBlobRef.current = blobUrl;
        setUploadedBaseUrl(blobUrl);
        setStatus(`Arte base carregada: ${file.name}`);
    };

    useEffect(() => () => {
        if (uploadBlobRef.current) URL.revokeObjectURL(uploadBlobRef.current);
    }, []);

    const exportCanvas = async () => {
        if (!artRef.current) throw new Error('Preview da arte não encontrado.');
        if (!baseImageUrl) throw new Error('Envie a arte base antes de exportar.');
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
            setStatus('Gerando PNG final (base + overlays)...');
            const dataUrl = await exportCanvas();
            setGeneratedImage(dataUrl);
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            link.click();
            setStatus('PNG final salvo no seu computador.');
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
                        Envie a arte base (Photoshop/export) e o sistema adiciona automaticamente
                        o traçado do circuito, o nome do GP e a logo Master League na parte inferior.
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

                    <div className="winner-upload-box">
                        <strong>Arte base (PNG/JPG)</strong>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleUploadBase}
                        />
                        {uploadedBaseUrl && (
                            <img className="winner-base-thumb" src={uploadedBaseUrl} alt="Preview da base" />
                        )}
                        {!uploadedBaseUrl && publicBaseOk && (
                            <span className="winner-upload-hint">✓ Base encontrada em <code>{baseImageStoragePath}</code></span>
                        )}
                        {!uploadedBaseUrl && !publicBaseOk && gpSlug && (
                            <span className="winner-upload-hint">
                                Nenhuma base em disco. Envie acima ou salve em:
                                <br />
                                <code>{baseImageStoragePath}</code>
                            </span>
                        )}
                    </div>

                    <div className="winner-overlay-toggles">
                        <strong>Dados variáveis (automáticos)</strong>
                        <label>
                            <input type="checkbox" checked={showMeta} onChange={(e) => setShowMeta(e.target.checked)} />
                            Etapa, GP e Grid (topo esquerdo)
                        </label>
                        <label>
                            <input type="checkbox" checked={showDriver} onChange={(e) => setShowDriver(e.target.checked)} />
                            Vencedor + nome do piloto
                        </label>
                        <label>
                            <input type="checkbox" checked={showFlag} onChange={(e) => setShowFlag(e.target.checked)} />
                            Bandeira do GP / país
                        </label>
                        <label>
                            <input type="checkbox" checked={showTeam} onChange={(e) => setShowTeam(e.target.checked)} />
                            Equipe do piloto
                        </label>
                        <label>
                            <input type="checkbox" checked={showTaglines} onChange={(e) => setShowTaglines(e.target.checked)} />
                            Taglines ML (paixão / propósito)
                        </label>
                        <label>
                            <input type="checkbox" checked={showCircuit} onChange={(e) => setShowCircuit(e.target.checked)} />
                            Traçado do circuito (inferior)
                        </label>
                        <label>
                            <input type="checkbox" checked={showGpName} onChange={(e) => setShowGpName(e.target.checked)} />
                            Nome do GP (inferior)
                        </label>
                        <label>
                            <input type="checkbox" checked={showMlLogo} onChange={(e) => setShowMlLogo(e.target.checked)} />
                            Logo Master League (inferior)
                        </label>
                    </div>

                    <div className="top10-path-box">
                        <strong>Vencedor</strong>
                        <span>{hasWinner ? `${winner.name} · ${winner.team}` : 'Nenhum vencedor nesta etapa'}</span>
                        <strong style={{ marginTop: 10 }}>PNG final</strong>
                        <code>{targetPath}</code>
                    </div>

                    <button
                        className="top10-primary-btn"
                        type="button"
                        onClick={handleDownload}
                        disabled={loading || isExporting || !hasWinner || !baseImageUrl}
                    >
                        {isExporting ? 'Processando...' : 'Baixar PNG final'}
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
                        baseImageUrl={baseImageUrl}
                        artRef={artRef}
                        showMeta={showMeta}
                        showDriver={showDriver}
                        showFlag={showFlag}
                        showTeam={showTeam}
                        showTaglines={showTaglines}
                        showCircuit={showCircuit}
                        showGpName={showGpName}
                        showMlLogo={showMlLogo}
                    />
                </main>
            </div>
        </div>
    );
}
