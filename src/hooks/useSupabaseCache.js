import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook genérico para buscar dados do cache do Supabase
 * com fallback automático para Google Sheets se necessário
 * 
 * @param {string} tableName - Nome da tabela de cache no Supabase
 * @param {object} options - Opções de configuração
 * @param {object} options.filter - Filtros para aplicar na query (ex: { grid: 'carreira', season: 20 })
 * @param {number} options.cacheMaxAge - Idade máxima do cache em minutos (default: 10)
 * @param {boolean} options.enableLocalCache - Usar localStorage como cache adicional (default: true)
 * @param {string} options.fallbackUrl - URL do Google Sheets para fallback
 * @param {function} options.parseData - Função para processar os dados do cache
 */
export function useSupabaseCache(tableName, options = {}) {
    const {
        filter = {},
        cacheMaxAge = 10,
        enableLocalCache = true,
        fallbackUrl = null,
        parseData = (data) => data,
        validateData = () => true
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [source, setSource] = useState(null); // 'supabase' | 'sheets' | 'local'
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!isMounted.current) return;

            setLoading(true);
            setError(null);

            try {
                // 1. Tentar Supabase PRIMEIRO (fonte de verdade)
                let supabaseData = null;
                let supabaseError = null;
                
                try {
                    // Usar select('*') para evitar erro 406 (Not Acceptable) 
                    // que pode ocorrer com select('data, last_synced_at')
                    let query = supabase.from(tableName).select('*');
                    
                    // Aplicar filtros
                    Object.entries(filter).forEach(([key, value]) => {
                        if (value !== undefined && value !== null) {
                            query = query.eq(key, value);
                        }
                    });

                    // Ordenar por last_synced_at DESC para pegar o mais recente
                    query = query.order('last_synced_at', { ascending: false }).limit(1);

                    const result = await query;
                    supabaseData = result.data;
                    supabaseError = result.error;
                } catch (queryError) {
                    // Capturar erros de rede ou outros erros não relacionados ao Supabase
                    supabaseError = queryError;
                }

                // Verificar se há erro que deve pular para fallback
                let shouldUseFallback = false;
                
                if (supabaseError) {
                    const errorStatus = supabaseError.status || supabaseError.code;
                    const errorMessage = supabaseError.message || '';
                    
                    const isTableNotFound = errorStatus === 406 || 
                                          errorStatus === 404 ||
                                          supabaseError.code === 'PGRST116' ||
                                          errorMessage.includes('does not exist') ||
                                          errorMessage.includes('permission denied') ||
                                          errorMessage.includes('Not Acceptable');
                    
                    if (isTableNotFound) {
                        shouldUseFallback = true;
                        supabaseData = null; // Garantir que não tenta processar dados
                    }
                }

                // Só processar dados do Supabase se não houver erro que requer fallback
                if (!shouldUseFallback && !supabaseError && supabaseData && supabaseData.length > 0) {
                    const record = supabaseData[0];
                    const dataToValidate = record?.data;
                    const isValid = validateData(dataToValidate);
                    if (import.meta.env.DEV) {
                        console.log(`🔍 Validação de dados para ${tableName}:`, isValid ? 'VÁLIDO' : 'INVÁLIDO — fallback');
                    }
                    if (!isValid) {
                        shouldUseFallback = true;
                    } else {
                        const lastSync = new Date(record.last_synced_at);
                        const age = (Date.now() - lastSync.getTime()) / (1000 * 60);

                    // Se a idade for negativa (data no futuro), provavelmente é problema de timezone
                    // Tratar como cache válido se a diferença for menor que 24 horas
                    const isNegativeAge = age < 0;
                    const absAge = Math.abs(age);
                    
                    if (isNegativeAge) {
                        // Se a diferença for menor que 24 horas, considerar válido (problema de timezone)
                        if (absAge >= 24 * 60) {
                            // Pular para fallback
                        }
                    }

                    // Se cache está atualizado OU se é idade negativa mas dentro de 24h (timezone), usar
                    if (age < cacheMaxAge || (isNegativeAge && absAge < 24 * 60)) {
                        const processedData = parseData(record.data);
                        
                        if (isMounted.current) {
                            if (import.meta.env.DEV) {
                                console.log(`✅ Usando dados do SUPABASE para ${tableName}`);
                            }
                            setData(processedData);
                            setSource('supabase');
                            setLoading(false);
                            
                            // Salvar no cache local
                            if (enableLocalCache) {
                                const localCacheKey = `cache_${tableName}_${JSON.stringify(filter)}`;
                                localStorage.setItem(localCacheKey, JSON.stringify({
                                    data: record.data,
                                    timestamp: Date.now()
                                }));
                            }
                        }
                        return;
                    } else {
                        shouldUseFallback = true; // Cache expirado, usar fallback
                        if (import.meta.env.DEV) {
                            console.info(
                                `[cache] ${tableName}: registro no Supabase válido porém antigo (~${age.toFixed(1)} min; limite ${cacheMaxAge} min) — buscando planilha`,
                            );
                        }
                    }
                }
            } else {
                shouldUseFallback = true; // Sem dados, usar fallback
            }

                // 3. Fallback para Google Sheets se necessário
                if (shouldUseFallback && fallbackUrl) {
                    try {
                        const response = await fetch(fallbackUrl);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        
                        const csvText = await response.text();
                        
                        // Parse CSV básico
                        const lines = csvText.split('\n').filter(line => line.trim());
                        const rows = lines.map(line => {
                            const fields = [];
                            let current = '';
                            let inQuotes = false;
                            
                            for (let i = 0; i < line.length; i++) {
                                const char = line[i];
                                if (char === '"') {
                                    inQuotes = !inQuotes;
                                } else if (char === ',' && !inQuotes) {
                                    fields.push(current.trim());
                                    current = '';
                                } else {
                                    current += char;
                                }
                            }
                            fields.push(current.trim());
                            return fields;
                        });

                        const processedData = parseData({ rows, metadata: { rowCount: rows.length } });
                        
                        if (isMounted.current) {
                            if (import.meta.env.DEV) {
                                console.log(`✅ Usando dados do GOOGLE SHEETS (fallback) para ${tableName}`);
                            }
                            setData(processedData);
                            setSource('sheets');
                            setLoading(false);
                            
                            // Tentar atualizar cache do Supabase em background
                            updateSupabaseCache(tableName, filter, { rows, metadata: { rowCount: rows.length } });
                        }
                    } catch (fallbackError) {
                        console.error('Erro no fallback para Google Sheets:', fallbackError);
                        if (isMounted.current) {
                            setError(fallbackError.message);
                            setLoading(false);
                        }
                    }
                } else {
                    // Sem fallback do Google Sheets, tentar cache local como último recurso
                    if (enableLocalCache) {
                        const localCacheKey = `cache_${tableName}_${JSON.stringify(filter)}`;
                        const cached = localStorage.getItem(localCacheKey);
                        
                        if (cached) {
                            try {
                                const { data: cachedData, timestamp } = JSON.parse(cached);
                                const age = (Date.now() - timestamp) / (1000 * 60);
                                
                                if (isMounted.current) {
                                    setData(parseData(cachedData));
                                    setSource('local');
                                    setLoading(false);
                                    return;
                                }
                            } catch (e) {
                            }
                        }
                    }
                    
                    // Sem fallback, retornar erro
                    if (isMounted.current) {
                        setError(supabaseError?.message || 'Dados não encontrados');
                        setLoading(false);
                    }
                }

            } catch (err) {
                console.error(`Erro ao buscar dados de ${tableName}:`, err);
                if (isMounted.current) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };

        fetchData();
    }, [tableName, JSON.stringify(filter), cacheMaxAge, enableLocalCache, fallbackUrl]);

    return { data, loading, error, source };
}

/**
 * Função auxiliar para atualizar cache do Supabase em background
 */
async function updateSupabaseCache(tableName, filter, data) {
    try {
        // Chamar Edge Function para sincronizar
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Determinar tipo de sheet baseado no tableName
        let sheetType = '';
        if (tableName.includes('classificacao')) sheetType = 'classificacao';
        else if (tableName.includes('power_ranking')) sheetType = 'power_ranking';
        else if (tableName.includes('calendario')) sheetType = 'calendario';
        else if (tableName.includes('tracks')) sheetType = 'tracks';
        else if (tableName.includes('minicup')) sheetType = 'minicup';

        if (sheetType) {
            // Chamar Edge Function em background (não esperar resposta)
            fetch(`${supabase.supabaseUrl}/functions/v1/sync-google-sheets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabase.supabaseKey}`
                },
                body: JSON.stringify({ sheetType, force: false })
            }).catch(() => {});
        }
    } catch (err) {
        // Silenciar falhas de atualização de cache
    }
}

/**
 * Hook específico para classificação
 */
export function useClassificacaoCache(grid, season = 20) {
    const fallbackUrl = grid === 'carreira'
        ? 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=321791996&single=true&output=csv'
        : 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=1687781433&single=true&output=csv';

    return useSupabaseCache('classificacao_cache', {
        filter: { grid, season },
        cacheMaxAge: 5,
        fallbackUrl,
        parseData: (data) => data.rows || []
    });
}

/**
 * Hook específico para Minicup
 */
export function useMinicupCache() {
    const fallbackUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=1709066718&single=true&output=csv';

    return useSupabaseCache('minicup_cache', {
        cacheMaxAge: 10,
        fallbackUrl,
        parseData: (data) => data.rows || []
    });
}

/**
 * Hook específico para Power Ranking (Carreira)
 */
export function usePowerRankingCache(season = 20) {
    const fallbackUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=984075936&single=true&output=csv';

    return useSupabaseCache('power_ranking_cache', {
        filter: { grid: 'carreira' },
        // PR muda pouco entre syncs; 15 min gerava fallback constante à planilha e ruído no console.
        cacheMaxAge: 720,
        fallbackUrl,
        parseData: (data) => data.rows || [],
        validateData: (data) => {
            const rows = data?.rows || [];
            // Verificar se tem dados da temporada solicitada
            const hasSeason = rows.some(row => String(row[9]).trim() === String(season));
            // Se tiver metadata de grid (nas novas sincronizações), validar também
            const matchesGrid = !data.metadata?.grid || data.metadata.grid === 'carreira';
            return hasSeason && matchesGrid;
        }
    });
}

/**
 * Hook específico para Power Ranking Light
 */
export function usePowerRankingLightCache(season = 20) {
    const fallbackUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=1453010431&single=true&output=csv';

    return useSupabaseCache('power_ranking_cache', {
        filter: { grid: 'light' },
        cacheMaxAge: 720,
        fallbackUrl,
        parseData: (data) => data.rows || [],
        validateData: (data) => {
            const rows = data?.rows || [];
            // Verificar se tem dados da temporada solicitada
            const hasSeason = rows.some(row => String(row[9]).trim() === String(season));
            // Se tiver metadata de grid (nas novas sincronizações), validar também
            const matchesGrid = !data.metadata?.grid || data.metadata.grid === 'light';
            return hasSeason && matchesGrid;
        }
    });
}

/**
 * Hook específico para Calendário
 */
export function useCalendarioCache(season = 20) {
    const fallbackUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=0&single=true&output=csv';

    return useSupabaseCache('calendario_cache', {
        filter: { season },
        cacheMaxAge: 60,
        fallbackUrl,
        parseData: (data) => data.rows || []
    });
}

/**
 * Hook específico para Tracks
 */
export function useTracksCache() {
    const fallbackUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=848427722&single=true&output=csv';

    return useSupabaseCache('tracks_cache', {
        cacheMaxAge: 120,
        fallbackUrl,
        parseData: (data) => data.rows || []
    });
}

