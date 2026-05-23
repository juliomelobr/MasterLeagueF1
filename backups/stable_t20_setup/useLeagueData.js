import { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';

const PROXY_URL = "https://corsproxy.io/?";

const LINKS = {
    // Data Carreira (gid=321791996) - USADO PARA CLASSIFICAÇÃO DO GRID CARREIRA
    carreira: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=321791996&single=true&output=csv",
    // Data Light (gid=1687781433) - USADO PARA CLASSIFICAÇÃO DO GRID LIGHT
    light: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1687781433&single=true&output=csv",
    // Data Carreira (gid=321791996) - Backup/Referência
    dataCarreira: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=321791996&single=true&output=csv",
    // Data Light (gid=1687781433) - Backup/Referência
    dataLight: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1687781433&single=true&output=csv",
    // Tracks (gid=848427722)
    tracks: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=848427722&single=true&output=csv",
    // CALCULADORA PR (gid=984075936)
    pr: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=984075936&single=true&output=csv",
    // PTS PR (gid=1677611609)
    ptsPR: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1677611609&single=true&output=csv",
    // Piloto PR (gid=884534812)
    pilotoPR: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=884534812&single=true&output=csv",
    // GRIDS - T20 (gid=995939670) - MANTIDO SE PRECISAR
    gridsT20: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=995939670&single=true&output=csv",
    // DRAFT T20
    draftCarreira: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=914372939&single=true&output=csv",
    draftLight: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=905408135&single=true&output=csv"
};

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
                    Papa.parse(text, { header: false, skipEmptyLines: true, complete: (res) => resolve(res.data.slice(1)) });
                });

                // Tentar buscar do Supabase primeiro
                let rowsC = null, rowsL = null, rowsT = null, rowsPR = null, rowsG20 = null, rowsDC = null, rowsDL = null;
                let fromSupabase = false;

                try {
                    const season = 20; // Temporada atual
                    
                    // Buscar classificação do Supabase
                    const { data: carreiraData } = await supabase
                        .from('classificacao_cache')
                        .select('data')
                        .eq('grid', 'carreira')
                        .eq('season', season)
                        .single();

                    const { data: lightData } = await supabase
                        .from('classificacao_cache')
                        .select('data')
                        .eq('grid', 'light')
                        .eq('season', season)
                        .single();

                    // Buscar tracks do Supabase
                    const { data: tracksData } = await supabase
                        .from('tracks_cache')
                        .select('data')
                        .single();

                // Buscar Power Ranking do Supabase (com tratamento de erro específico)
                let prData = null;
                try {
                    const { data, error } = await supabase
                        .from('power_ranking_cache')
                        .select('data')
                        .single();
                    
                    if (!error && data) {
                        prData = { data };
                    }
                } catch (prError) {
                    // Ignora erro 406 ou outros erros do Supabase para power_ranking_cache
                    // Vai fazer fallback para Google Sheets
                    prData = null;
                }

                if (carreiraData?.data?.rows && lightData?.data?.rows) {
                    rowsC = carreiraData.data.rows;
                    rowsL = lightData.data.rows;
                    console.log('📊 Dados de classificação carregados do Supabase');
                } else {
                    console.log('📊 Buscando classificação do Google Sheets (não encontrada no Supabase)');
                    const [resC, resL] = await Promise.all([
                        fetch(PROXY_URL + encodeURIComponent(LINKS.carreira)).catch(() => ({ text: async () => '[]' })),
                        fetch(PROXY_URL + encodeURIComponent(LINKS.light)).catch(() => ({ text: async () => '[]' }))
                    ]);
                    rowsC = await parseCSV(await resC.text());
                    rowsL = await parseCSV(await resL.text());
                }

                if (tracksData?.data?.rows) {
                    rowsT = tracksData.data.rows;
                    console.log('📊 Dados de tracks carregados do Supabase');
                } else {
                    console.log('📊 Buscando tracks do Google Sheets (não encontradas no Supabase)');
                    const resT = await fetch(PROXY_URL + encodeURIComponent(LINKS.tracks)).catch(() => ({ text: async () => '[]' }));
                    rowsT = await parseCSV(await resT.text());
                }

                if (prData?.data?.rows) {
                    rowsPR = prData.data.rows;
                    console.log('📊 Dados de Power Ranking carregados do Supabase');
                } else {
                    console.log('📊 Buscando Power Ranking do Google Sheets (não encontrado no Supabase)');
                    const resPR = await fetch(PROXY_URL + encodeURIComponent(LINKS.pr)).catch(() => ({ text: async () => '[]' }));
                    rowsPR = await parseCSV(await resPR.text());
                }

                // Buscar Grids T20 e DRAFTS (sempre do Google Sheets por enquanto)
                const [resG20, resDC, resDL] = await Promise.all([
                    fetch(PROXY_URL + encodeURIComponent(LINKS.gridsT20)).catch(() => ({ text: async () => '[]' })),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.draftCarreira)).catch(() => ({ text: async () => '[]' })),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.draftLight)).catch(() => ({ text: async () => '[]' }))
                ]);
                
                rowsG20 = await parseCSV(await resG20.text());
                rowsDC = await parseCSV(await resDC.text());
                rowsDL = await parseCSV(await resDL.text());

            } catch (supabaseError) {
                console.warn('Erro ao buscar do Supabase, usando fallback total:', supabaseError);
                const [resC, resL, resT, resPR, resG20, resDC, resDL] = await Promise.all([
                    fetch(PROXY_URL + encodeURIComponent(LINKS.carreira)).catch(() => ({ text: async () => '[]' })),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.light)).catch(() => ({ text: async () => '[]' })),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.tracks)).catch(() => ({ text: async () => '[]' })),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.pr)).catch(() => ({ text: async () => '[]' })),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.gridsT20)).catch(() => ({ text: async () => '[]' })),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.draftCarreira)).catch(() => ({ text: async () => '[]' })),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.draftLight)).catch(() => ({ text: async () => '[]' }))
                ]);

                rowsC = await parseCSV(await resC.text());
                rowsL = await parseCSV(await resL.text());
                rowsT = await parseCSV(await resT.text());
                rowsPR = await parseCSV(await resPR.text());
                rowsG20 = await parseCSV(await resG20.text());
                rowsDC = await parseCSV(await resDC.text());
                rowsDL = await parseCSV(await resDL.text());
            }
                
                console.log('📊 useLeagueData - Dados carregados:');
                console.log('  - BD_CARREIRA:', rowsC?.length || 0, 'linhas');
                console.log('  - BD_LIGHT:', rowsL?.length || 0, 'linhas');
                console.log('  - Tracks:', rowsT?.length || 0, 'linhas');
                console.log('  - PR:', rowsPR?.length || 0, 'linhas');
                console.log('  - Grids T20:', rowsG20?.length || 0, 'linhas');
                console.log('  - Draft Carreira:', rowsDC?.length || 0, 'linhas');
                console.log('  - Draft Light:', rowsDL?.length || 0, 'linhas');
                
                if (rowsC && rowsC.length > 0) {
                    console.log('  - Primeira linha Carreira:', rowsC[0]);
                }
                if (rowsL && rowsL.length > 0) {
                    console.log('  - Primeira linha Light:', rowsL[0]);
                }

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
                            trackMap[name] = {
                                flag: extractImgSrc(row[1]),
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

                // Processando datas: Coluna A (data), Coluna D (temporada), Coluna F (etapa)
                // Sempre buscar datas do Google Sheets (não estão no cache ainda)
                const datesCarreiraMap = {};
                const datesLightMap = {};

                const [resDateC, resDateL] = await Promise.all([
                    fetch(PROXY_URL + encodeURIComponent(LINKS.dataCarreira)).catch(() => ({ text: async () => '[]' })),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.dataLight)).catch(() => ({ text: async () => '[]' }))
                ]);

                const rowsDateC = await parseCSV(await resDateC.text());
                const rowsDateL = await parseCSV(await resDateL.text());

                rowsDateC.forEach(row => {
                    const date = row[0]; // Coluna A
                    const season = row[3]; // Coluna D
                    const round = row[5]; // Coluna F
                    if (date && season && round) {
                        const key = `${season}-${round}`;
                        datesCarreiraMap[key] = date;
                    }
                });

                rowsDateL.forEach(row => {
                    const date = row[0]; // Coluna A
                    const season = row[3]; // Coluna D
                    const round = row[5]; // Coluna F
                    if (date && season && round) {
                        const key = `${season}-${round}`;
                        datesLightMap[key] = date;
                    }
                });
                
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

        fetchAll();
    }, []);

    return data;
};
