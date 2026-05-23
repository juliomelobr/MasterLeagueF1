import { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { fetchGoogleSheetCsvText } from '../utils/fetchGoogleSheetCsv';

const LINKS = {
    // Data Carreira (gid=321791996) - USADO PARA CLASSIFICAÇÃO DO GRID CARREIRA
    carreira: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=321791996&single=true&output=csv",
    // Data Light (gid=1687781433) - USADO PARA CLASSIFICAÇÃO DO GRID LIGHT
    light: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=1687781433&single=true&output=csv",
    // Data Carreira (gid=321791996) - Backup/Referência
    dataCarreira: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=321791996&single=true&output=csv",
    // Data Light (gid=1687781433) - Backup/Referência
    dataLight: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=1687781433&single=true&output=csv",
    // Tracks (gid=848427722)
    tracks: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=848427722&single=true&output=csv",
    // CALCULADORA PR (gid=984075936)
    pr: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=984075936&single=true&output=csv",
    // PTS PR (gid=1677611609)
    ptsPR: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=1677611609&single=true&output=csv",
    // Piloto PR (gid=884534812)
    pilotoPR: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=884534812&single=true&output=csv",
    // GRIDS - T20 (gid=995939670) - MANTIDO SE PRECISAR
    gridsT20: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=995939670&single=true&output=csv",
    // Pré-temporada / fallback home: col A = nome; col C = SEASON (deve bater com current_season / próxima no app).
    draftCarreira: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=914372939&single=true&output=csv",
    draftLight: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=905408135&single=true&output=csv",
};

// Timeout para requisições (8 segundos)
const FETCH_TIMEOUT = 8000;

// Cache global para evitar recarregar dados
const cacheData = {
    rawCarreira: null,
    rawLight: null,
    rawPR: null,
    rawGridsT20: null,
    draftCarreira: null,
    draftLight: null,
    tracks: null,
    datesCarreira: null,
    datesLight: null,
    seasons: null,
    lastFetch: 0
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Função para limpar cache e forçar atualização
export const clearLeagueDataCache = () => {
    cacheData.rawCarreira = null;
    cacheData.rawLight = null;
    cacheData.rawPR = null;
    cacheData.rawGridsT20 = null;
    cacheData.draftCarreira = null;
    cacheData.draftLight = null;
    cacheData.tracks = null;
    cacheData.datesCarreira = null;
    cacheData.datesLight = null;
    cacheData.seasons = null;
    cacheData.lastFetch = 0;
    
    // Limpar localStorage relacionado
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_') || key.includes('league') || key.includes('carreira') || key.includes('light')) {
            localStorage.removeItem(key);
        }
    });
};

export const useLeagueData = () => {
    const [data, setData] = useState({
        rawCarreira: [],
        rawLight: [],
        rawPR: [],
        rawGridsT20: [],
        draftCarreira: [],
        draftLight: [],
        tracks: {},
        datesCarreira: {},
        datesLight: {},
        seasons: [],
        loading: true
    });
    
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Verifica cache
                const now = Date.now();
                if (cacheData.rawCarreira && (now - cacheData.lastFetch) < CACHE_DURATION) {
                    if (isMounted.current) {
                        setData({
                            rawCarreira: cacheData.rawCarreira,
                            rawLight: cacheData.rawLight,
                            rawPR: cacheData.rawPR,
                            rawGridsT20: cacheData.rawGridsT20 || [],
                            draftCarreira: cacheData.draftCarreira || [],
                            draftLight: cacheData.draftLight || [],
                            tracks: cacheData.tracks,
                            datesCarreira: cacheData.datesCarreira,
                            datesLight: cacheData.datesLight,
                            seasons: cacheData.seasons,
                            loading: false
                        });
                    }
                    return;
                }
                // Função auxiliar para parsear CSV
                const parseCSV = (text) => new Promise(resolve => {
                    if (!text || !String(text).trim()) {
                        resolve([]);
                        return;
                    }
                    Papa.parse(text, { header: false, skipEmptyLines: true, complete: (res) => resolve(res.data.slice(1)) });
                });

                // Dados principais para a classificação
                let rowsC = [], rowsL = [], rowsT = [], rowsPR = [];
                // Dados secundários (não bloqueiam carregamento)
                let rowsG20 = [], rowsDC = [], rowsDL = [];

                // PASSO 1: Buscar dados ESSENCIAIS do Supabase (prioridade máxima)
                // Usar try/await em cada query: o cliente Supabase pode não expor .catch() na cadeia
                const safeQuery = async (fn) => {
                    try {
                        return await fn();
                    } catch (e) {
                        return { data: null, error: e };
                    }
                };
                try {
                    const [carreiraResult, lightResult, tracksResult, prResult] = await Promise.all([
                        safeQuery(() => supabase.from('classificacao_cache').select('*').eq('grid', 'carreira').order('season', { ascending: false }).limit(1).single()),
                        safeQuery(() => supabase.from('classificacao_cache').select('*').eq('grid', 'light').order('season', { ascending: false }).limit(1).single()),
                        safeQuery(() => supabase.from('tracks_cache').select('*').order('last_synced_at', { ascending: false }).limit(1)),
                        safeQuery(() => supabase.from('power_ranking_cache').select('*').order('last_synced_at', { ascending: false }).limit(1))
                    ]);

                    const carreiraData = carreiraResult?.data;
                    const lightData = lightResult?.data;
                    const tracksData = Array.isArray(tracksResult?.data) ? tracksResult.data[0] : tracksResult?.data?.[0];
                    const prData = Array.isArray(prResult?.data) ? prResult.data[0] : prResult?.data?.[0];

                    // Usar dados do Supabase se disponíveis
                    if (carreiraData?.data?.rows) rowsC = carreiraData.data.rows;
                    if (lightData?.data?.rows) rowsL = lightData.data.rows;
                    if (tracksData?.data?.rows) rowsT = tracksData.data.rows;
                    if (prData?.data?.rows) rowsPR = prData.data.rows;
                } catch (supabaseError) {
                    console.warn('⚠️ Erro ao buscar do Supabase:', supabaseError?.message || supabaseError);
                }

                // PASSO 2: Fallback para Google Sheets APENAS para dados faltantes (com timeout)
                const needsCarreira = !rowsC || rowsC.length === 0;
                const needsLight = !rowsL || rowsL.length === 0;
                const needsTracks = !rowsT || rowsT.length === 0;
                const needsPR = !rowsPR || rowsPR.length === 0;

                if (needsCarreira || needsLight || needsTracks || needsPR) {
                    console.log('📡 Buscando dados faltantes do Google Sheets...');
                    const fallbackPromises = [];
                    
                    if (needsCarreira) fallbackPromises.push(fetchGoogleSheetCsvText(LINKS.carreira, { timeoutMs: FETCH_TIMEOUT }).then(parseCSV).then(d => { rowsC = d; }));
                    if (needsLight) fallbackPromises.push(fetchGoogleSheetCsvText(LINKS.light, { timeoutMs: FETCH_TIMEOUT }).then(parseCSV).then(d => { rowsL = d; }));
                    if (needsTracks) fallbackPromises.push(fetchGoogleSheetCsvText(LINKS.tracks, { timeoutMs: FETCH_TIMEOUT }).then(parseCSV).then(d => { rowsT = d; }));
                    if (needsPR) fallbackPromises.push(fetchGoogleSheetCsvText(LINKS.pr, { timeoutMs: FETCH_TIMEOUT }).then(parseCSV).then(d => { rowsPR = d; }));
                    
                    await Promise.allSettled(fallbackPromises);
                }

                // PASSO 3: Drafts e grids auxiliares — precisam estar preenchidos antes do setData;
                // sem await, carrossel da Home (pré-temporada) recebia listas vazias e só o cache em visitas seguintes trazia nomes.
                await Promise.allSettled([
                    fetchGoogleSheetCsvText(LINKS.gridsT20, { timeoutMs: FETCH_TIMEOUT }).then(parseCSV).then((d) => { rowsG20 = d; cacheData.rawGridsT20 = d; }),
                    fetchGoogleSheetCsvText(LINKS.draftCarreira, { timeoutMs: FETCH_TIMEOUT }).then(parseCSV).then((d) => { rowsDC = d; cacheData.draftCarreira = d; }),
                    fetchGoogleSheetCsvText(LINKS.draftLight, { timeoutMs: FETCH_TIMEOUT }).then(parseCSV).then((d) => { rowsDL = d; cacheData.draftLight = d; }),
                ]).catch(() => {});
                const trackMap = {};
                
                // --- FUNÇÃO DE EXTRAÇÃO E CORREÇÃO DE IMAGENS ---
                const extractImgSrc = (html) => {
                    if (!html) return null;
                    let src = html;
                    
                    // Se for tag HTML, extrai o src
                    if (!html.startsWith('http')) {
                        const match = html.match(/src=['"](.*?)['"]/);
                        src = match ? match[1] : null;
                    }

                    if (src) {
                        // Limpeza de URLs inválidas que podem vir da planilha
                        if (src === 'image.png' || src.includes('undefined') || src === 'null') {
                            return null;
                        }

                        // PATCH 1: Corrige erro de digitação "Felipe Kingdom"
                        if (src.includes('Felipe Kingdom')) {
                            src = src.replace('united-Felipe Kingdom', 'united-kingdom');
                        }

                        // PATCH 2: Corrige bandeira da Rússia (Link oficial quebrado/branco)
                        if (src.includes('russia-flag')) {
                            return 'https://upload.wikimedia.org/wikipedia/en/f/f3/Flag_of_Russia.svg';
                        }
                    }

                    return src;
                };

                if (rowsT) {
                    rowsT.forEach(row => {
                        // Nova estrutura: Grand Prix (0), Flag (1), Circuit (2), Track (3)
                        const gpName = row[0]?.trim();
                        if (gpName) {
                            const name = gpName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
                            let flag = extractImgSrc(row[1]);

                            // PATCH 3: Fallback para circuitos dos EUA (Texas, Miami, Vegas, Austin)
                            if (!flag && (name.includes('TEXAS') || name.includes('MIAMI') || name.includes('VEGAS') || name.includes('AUSTIN'))) {
                                flag = 'https://flagcdn.com/w40/us.png';
                            }

                            trackMap[name] = {
                                flag: flag,
                                circuitName: row[2] || "Autódromo",
                                circuit: extractImgSrc(row[3])
                            };
                        }
                    });
                }

                const allSeasons = new Set();
                if (rowsC) {
                    rowsC.forEach(row => {
                        const s = parseInt(row[3]);
                        if (!isNaN(s) && s > 0) allSeasons.add(s);
                    });
                }
                if (rowsL) {
                    rowsL.forEach(row => {
                        const s = parseInt(row[3]);
                        if (!isNaN(s) && s > 0) allSeasons.add(s);
                    });
                }

                // Processando datas: usar os dados já carregados (rowsC e rowsL)
                // Não é necessário buscar novamente - os dados de data estão nas colunas dos mesmos arrays
                const datesCarreiraMap = {};
                const datesLightMap = {};

                // Usar rowsC e rowsL que já foram carregados (evita requisições duplicadas)
                if (rowsC && rowsC.length > 0) {
                    rowsC.forEach(row => {
                        const date = row[0]; // Coluna A
                        const season = row[3]; // Coluna D
                        const round = row[5]; // Coluna F
                        if (date && season && round) {
                            const key = `${season}-${round}`;
                            datesCarreiraMap[key] = date;
                        }
                    });
                }

                if (rowsL && rowsL.length > 0) {
                    rowsL.forEach(row => {
                        const date = row[0]; // Coluna A
                        const season = row[3]; // Coluna D
                        const round = row[5]; // Coluna F
                        if (date && season && round) {
                            const key = `${season}-${round}`;
                            datesLightMap[key] = date;
                        }
                    });
                }
                
                const newData = {
                    rawCarreira: rowsC,
                    rawLight: rowsL,
                    rawPR: rowsPR,
                    rawGridsT20: rowsG20,
                    draftCarreira: rowsDC,
                    draftLight: rowsDL,
                    tracks: trackMap,
                    datesCarreira: datesCarreiraMap,
                    datesLight: datesLightMap,
                    seasons: Array.from(allSeasons).sort((a, b) => b - a)
                };

                // Atualiza cache
                cacheData.rawCarreira = newData.rawCarreira;
                cacheData.rawLight = newData.rawLight;
                cacheData.rawPR = newData.rawPR;
                cacheData.rawGridsT20 = newData.rawGridsT20;
                cacheData.draftCarreira = newData.draftCarreira;
                cacheData.draftLight = newData.draftLight;
                cacheData.tracks = newData.tracks;
                cacheData.datesCarreira = newData.datesCarreira;
                cacheData.datesLight = newData.datesLight;
                cacheData.seasons = newData.seasons;
                cacheData.lastFetch = now;

                if (isMounted.current) {
                    setData({
                        ...newData,
                        loading: false
                    });
                }

            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                if (isMounted.current) {
                    setData(prev => ({ ...prev, loading: false }));
                }
            }
        };

        // Timeout global: evita Motorhome/Dashboard travado em "Carregando..." (ex.: Netlify com proxy 403 ou rede lenta)
        const LOADING_TIMEOUT_MS = 8000;
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('league_data_timeout')), LOADING_TIMEOUT_MS);
        });
        Promise.race([fetchAll(), timeoutPromise]).catch((err) => {
            if (err?.message === 'league_data_timeout') {
                console.warn('⏱️ useLeagueData: timeout – liberando loading para não travar Motorhome');
            }
            if (isMounted.current) {
                setData(prev => ({ ...prev, loading: false }));
            }
        });
    }, []);

    return data;
};
