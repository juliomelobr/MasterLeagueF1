// Edge Function para sincronizar dados do Google Sheets para Supabase
// Uso: POST /functions/v1/sync-google-sheets
// Body: { sheetType: 'classificacao' | 'power_ranking' | 'calendario' | 'tracks' | 'minicup' | 'equipes', force: boolean }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuração das planilhas
const SHEETS_CONFIG = {
  classificacao_carreira: {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=321791996&single=true&output=csv",
    gid: "321791996",
    name: "Data Carreira"
  },
  classificacao_light: {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=1687781433&single=true&output=csv",
    gid: "1687781433",
    name: "Data Light"
  },
  power_ranking_carreira: {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=984075936&single=true&output=csv",
    gid: "984075936",
    name: "Power Ranking Carreira"
  },
  power_ranking_light: {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=1453010431&single=true&output=csv",
    gid: "1453010431",
    name: "Power Ranking Light"
  },
  calendario: {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=0&single=true&output=csv",
    gid: "0",
    name: "CALENDÁRIO ML1"
  },
  tracks: {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=848427722&single=true&output=csv",
    gid: "848427722",
    name: "Tracks"
  },
  minicup: {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/pub?gid=1709066718&single=true&output=csv",
    gid: "1709066718",
    name: "TAB MINICUP"
  },
  // Nota: equipes são extraídas das planilhas de classificação (carreira + light)
  // Não há uma planilha separada de equipes
};

// Função para calcular hash dos dados
async function calculateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Função para buscar CSV do Google Sheets
async function fetchSheetCSV(url: string, retries = 3): Promise<string> {
  const proxies = [
    url, // Tentar direto primeiro
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  ];

  for (let attempt = 0; attempt < retries; attempt++) {
    for (const proxyUrl of proxies) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(proxyUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const text = await response.text();
          // Validar que não é HTML/login do Google (erro de permissão, proxy ou planilha não publicada).
          const normalized = text.trim().slice(0, 2048).toLowerCase();
          if (
            normalized.startsWith("<!doctype") ||
            normalized.startsWith("<html") ||
            normalized.includes("accounts.google.com") ||
            normalized.includes("googlesignin") ||
            normalized.includes("signin")
          ) {
            console.warn(`Resposta inválida ao buscar planilha ${url}: HTML/login detectado`);
            continue;
          }
          if (text.length < 10) {
            continue; // Muito curto, provavelmente erro
          }
          return text;
        }
      } catch (error) {
        console.error(`Erro ao buscar via ${proxyUrl}:`, error);
        continue;
      }
    }
    
    // Aguardar antes de tentar novamente
    if (attempt < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }

  throw new Error("Falha ao buscar dados do Google Sheets após múltiplas tentativas");
}

function validateCsvRows(rows: string[][], sheetName: string, expectedHeaders: string[]) {
  if (!rows || rows.length < 2) {
    throw new Error(`CSV inválido para ${sheetName}: sem linhas suficientes`);
  }

  const firstCell = String(rows[0]?.[0] || "").trim().toLowerCase();
  const header = rows[0].map((field) => String(field || "").trim().toLowerCase());
  const hasExpectedHeaders = expectedHeaders.every((expected) =>
    header.includes(expected.toLowerCase())
  );

  if (
    firstCell.startsWith("<!doctype") ||
    firstCell.startsWith("<html") ||
    firstCell.includes("accounts.google.com") ||
    !hasExpectedHeaders
  ) {
    throw new Error(
      `CSV inválido para ${sheetName}: cabeçalho inesperado (${rows[0].slice(0, 4).join(" | ")})`
    );
  }
}

// Função para parsear CSV
function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Pular próxima aspas
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentLine.push(currentField.trim());
      currentField = "";
    } else if (char === "\n" && !inQuotes) {
      currentLine.push(currentField.trim());
      lines.push(currentLine);
      currentLine = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // Adicionar última linha
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine);
  }

  return lines.filter(line => line.some(field => field.length > 0));
}

// Função para sincronizar classificação
async function syncClassificacao(supabase: any, grid: "carreira" | "light", season: number) {
  const config = grid === "carreira" 
    ? SHEETS_CONFIG.classificacao_carreira 
    : SHEETS_CONFIG.classificacao_light;

  const startTime = Date.now();
  
  try {
    console.log(`Sincronizando classificação ${grid}...`);
    
    // Buscar dados
    const csvText = await fetchSheetCSV(config.url);
    const rows = parseCSV(csvText);
    validateCsvRows(rows, config.name, ["Date", "Season", "Round", "Driver", "Team"]);
    
    // Calcular hash
    const dataHash = await calculateHash(csvText);
    
    // Verificar se o registro já existe
    const { data: existing, error: selectError } = await supabase
      .from("classificacao_cache")
      .select("id, data_hash")
      .eq("grid", grid)
      .eq("season", season)
      .maybeSingle();

    if (selectError) throw selectError;

    // Verificar se os dados mudaram
    if (existing && existing.data_hash === dataHash) {
      console.log(`Dados de ${grid} não mudaram (hash: ${dataHash.substring(0, 8)}...), pulando sincronização`);
      return {
        success: true,
        skipped: true,
        message: "Dados não mudaram"
      };
    }
    
    console.log(`Dados de ${grid} mudaram ou são novos. Hash anterior: ${existing?.data_hash?.substring(0, 8) || 'nenhum'}... Novo hash: ${dataHash.substring(0, 8)}...`);
    console.log(`Total de linhas a sincronizar: ${rows.length}`);

    // Preparar dados para inserção/atualização
    const dataToStore = {
      rows,
      metadata: {
        rowCount: rows.length,
        syncedAt: new Date().toISOString()
      }
    };

    const cacheData = {
      grid,
      season,
      data: dataToStore,
      last_synced_at: new Date().toISOString(),
      sheet_url: config.url,
      sheet_gid: config.gid,
      data_hash: dataHash
    };

    // Inserir ou atualizar cache
    let upsertError;
    if (existing) {
      // Atualizar registro existente
      console.log(`Atualizando cache existente (ID: ${existing.id}) para ${grid} temporada ${season}`);
      const { error, data: updatedData } = await supabase
        .from("classificacao_cache")
        .update(cacheData)
        .eq("id", existing.id)
        .select();
      upsertError = error;
      if (!error && updatedData) {
        console.log(`✅ Cache atualizado com sucesso. ${updatedData.length} registro(s) atualizado(s)`);
      }
    } else {
      // Inserir novo registro
      console.log(`Inserindo novo cache para ${grid} temporada ${season}`);
      const { error, data: insertedData } = await supabase
        .from("classificacao_cache")
        .insert(cacheData)
        .select();
      upsertError = error;
      if (!error && insertedData) {
        console.log(`✅ Cache inserido com sucesso. ${insertedData.length} registro(s) inserido(s)`);
      }
    }

    if (upsertError) {
      console.error(`❌ Erro ao atualizar/inserir cache:`, upsertError);
      throw upsertError;
    }
    
    // Verificar se os dados foram realmente salvos
    const { data: verifyData, error: verifyError } = await supabase
      .from("classificacao_cache")
      .select("id, last_synced_at, data")
      .eq("grid", grid)
      .eq("season", season)
      .maybeSingle();
    
    if (verifyError) {
      console.warn(`⚠️ Erro ao verificar cache após sincronização:`, verifyError);
    } else if (verifyData) {
      const savedRowCount = verifyData.data?.rows?.length || 0;
      console.log(`✅ Verificação: Cache salvo com ${savedRowCount} linhas. Última sync: ${verifyData.last_synced_at}`);
      
      // Verificar algumas equipes na temporada 20
      if (season === 20 && savedRowCount > 0) {
        const sampleRows = verifyData.data.rows.slice(0, 10);
        const teamsInSample = new Set<string>();
        sampleRows.forEach((row: any) => {
          if (row && row.length > 10 && parseInt(row[3]) === 20) {
            const team = (row[10] || '').trim();
            if (team) teamsInSample.add(team);
          }
        });
        console.log(`📊 Equipes encontradas nas primeiras 10 linhas da temporada 20: ${Array.from(teamsInSample).join(', ')}`);
      }
    }

    const duration = Date.now() - startTime;

    // Registrar no log
    await supabase.from("sync_log").insert({
      source: "google_sheets",
      sheet_name: config.name,
      sheet_gid: config.gid,
      status: "success",
      records_synced: rows.length,
      duration_ms: duration
    });

    return {
      success: true,
      records_synced: rows.length,
      duration_ms: duration
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Registrar erro no log
    await supabase.from("sync_log").insert({
      source: "google_sheets",
      sheet_name: config.name,
      sheet_gid: config.gid,
      status: "error",
      error_message: error.message,
      duration_ms: duration
    });

    throw error;
  }
}

// Função auxiliar para gerar ID da equipe baseado no nome
function generateTeamId(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

// Função para sincronizar equipes (extrai das planilhas de classificação carreira e light)
async function syncEquipes(supabase: any, season: number = 20) {
  const startTime = Date.now();
  
  try {
    console.log(`Sincronizando equipes da temporada ${season}...`);
    
    const teamsSet = new Set<string>();
    let totalProcessedRows = 0;
    let totalSeasonMatches = 0;
    
    // Processar ambas as planilhas (carreira e light)
    const grids = [
      { name: 'carreira', config: SHEETS_CONFIG.classificacao_carreira },
      { name: 'light', config: SHEETS_CONFIG.classificacao_light }
    ];
    
    for (const grid of grids) {
      try {
        console.log(`Processando planilha ${grid.name}...`);
        const csvText = await fetchSheetCSV(grid.config.url);
        const rows = parseCSV(csvText);
        validateCsvRows(rows, grid.config.name, ["Date", "Season", "Round", "Driver", "Team"]);
        
        if (rows.length < 2) {
          console.warn(`Planilha ${grid.name} vazia ou sem dados`);
          continue;
        }
        
        // Estrutura da planilha de classificação:
        // row[0] = Date, row[1] = Version, row[2] = Performance, row[3] = Season, 
        // row[4] = Round, row[5] = GP, row[6] = Qualifying, row[7] = Sprint,
        // row[8] = Race, row[9] = Driver (coluna J - 10ª), row[10] = Team (coluna K - 11ª)
        let processedRows = 0;
        let seasonMatches = 0;
        
        // Extrair equipes únicas da temporada especificada
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 11) continue;
          
          processedRows++;
          const rowSeason = parseInt(row[3] || '0');
          const teamName = (row[10] || '').trim();
          
          // Filtrar apenas temporada especificada e equipes válidas
          if (rowSeason === season && teamName && teamName !== '') {
            seasonMatches++;
            teamsSet.add(teamName);
          }
        }
        
        totalProcessedRows += processedRows;
        totalSeasonMatches += seasonMatches;
        console.log(`  ${grid.name}: ${processedRows} linhas processadas, ${seasonMatches} da temporada ${season}, ${teamsSet.size} equipes únicas no total`);
      } catch (error: any) {
        console.error(`Erro ao processar planilha ${grid.name}:`, error.message);
        // Continua com a outra planilha mesmo se uma falhar
      }
    }
    
    console.log(`Total: ${totalProcessedRows} linhas processadas, ${totalSeasonMatches} da temporada ${season}, ${teamsSet.size} equipes únicas encontradas`);
    
    if (teamsSet.size === 0) {
      throw new Error(`Nenhuma equipe encontrada para a temporada ${season}`);
    }
    
    let syncedCount = 0;
    const errors: string[] = [];
    
    // Processar cada equipe única
    const teamsArray = Array.from(teamsSet).sort();
    console.log(`Equipes encontradas: ${teamsArray.join(', ')}`);
    
    for (const nomeEquipe of teamsArray) {
      try {
        // Gerar ID baseado no nome
        const teamId = generateTeamId(nomeEquipe);
        console.log(`Processando equipe: "${nomeEquipe}" -> ID: "${teamId}"`);
        
        // Valores padrão (pode ser ajustado depois se necessário)
        const equipeData: any = {
          id: teamId,
          name: nomeEquipe,
          tier: 'BRONZE', // Padrão, pode ser ajustado manualmente depois
          slots: 2, // Padrão
          color: '#94A3B8', // Padrão
          updated_at: new Date().toISOString()
        };
        
        // Buscar equipe existente por ID
        const { data: existing } = await supabase
          .from('equipes')
          .select('id')
          .eq('id', teamId)
          .maybeSingle();
        
        if (existing) {
          // Atualizar apenas o nome (preserva tier, slots, color se já existirem)
          const { error: updateError } = await supabase
            .from('equipes')
            .update({ 
              name: nomeEquipe,
              updated_at: new Date().toISOString()
            })
            .eq('id', teamId);
          
          if (updateError) {
            errors.push(`Erro ao atualizar ${nomeEquipe}: ${updateError.message}`);
            continue;
          }
        } else {
          // Inserir nova equipe
          equipeData.created_at = new Date().toISOString();
          const { error: insertError } = await supabase
            .from('equipes')
            .insert(equipeData);
          
          if (insertError) {
            errors.push(`Erro ao inserir ${nomeEquipe}: ${insertError.message}`);
            continue;
          }
        }
        
        syncedCount++;
      } catch (error: any) {
        errors.push(`Erro ao processar ${nomeEquipe}: ${error.message}`);
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Registrar no log
    await supabase.from("sync_log").insert({
      source: "google_sheets",
      sheet_name: "Equipes (Carreira + Light)",
      sheet_gid: "321791996+1687781433",
      status: errors.length > 0 ? "partial" : "success",
      records_synced: syncedCount,
      error_message: errors.length > 0 ? errors.join('; ') : null,
      duration_ms: duration
    });
    
    return {
      success: true,
      records_synced: syncedCount,
      teams: teamsArray,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    await supabase.from("sync_log").insert({
      source: "google_sheets",
      sheet_name: "Equipes (Carreira + Light)",
      sheet_gid: "321791996+1687781433",
      status: "error",
      error_message: error.message,
      duration_ms: duration
    });
    
    throw error;
  }
}

// Função genérica para sincronizar outros tipos
async function syncGeneric(
  supabase: any,
  tableName: string,
  config: any,
  season?: number,
  grid?: string
) {
  const startTime = Date.now();
  
  try {
    console.log(`Sincronizando ${tableName}${grid ? ` (${grid})` : ''}${season ? ` (S${season})` : ''}...`);
    
    const csvText = await fetchSheetCSV(config.url);
    const rows = parseCSV(csvText);
    validateCsvRows(rows, config.name, []);
    const dataHash = await calculateHash(csvText);
    
    // Verificar se mudou
    let query = supabase.from(tableName).select("data_hash");
    if (season) {
      query = query.eq("season", season);
    }
    if (grid) {
      query = query.eq("grid", grid);
    }
    
    const { data: existing } = await query.maybeSingle();

    if (existing && existing.data_hash === dataHash) {
      console.log(`Dados de ${tableName} não mudaram`);
      return {
        success: true,
        skipped: true,
        message: "Dados não mudaram"
      };
    }

    const dataToStore = {
      rows,
      metadata: {
        rowCount: rows.length,
        syncedAt: new Date().toISOString(),
        grid: grid
      }
    };

    const upsertData: any = {
      data: dataToStore,
      last_synced_at: new Date().toISOString(),
      sheet_url: config.url,
      data_hash: dataHash
    };

    if (season) {
      upsertData.season = season;
    }
    if (grid) {
      upsertData.grid = grid;
    }

    const onConflictFields = [];
    if (grid) onConflictFields.push("grid");
    if (season) onConflictFields.push("season");

    const { error } = await supabase
      .from(tableName)
      .upsert(upsertData, {
        onConflict: onConflictFields.length > 0 ? onConflictFields.join(",") : undefined
      });

    if (error) throw error;

    const duration = Date.now() - startTime;

    await supabase.from("sync_log").insert({
      source: "google_sheets",
      sheet_name: config.name,
      sheet_gid: config.gid,
      status: "success",
      records_synced: rows.length,
      duration_ms: duration
    });

    return {
      success: true,
      records_synced: rows.length,
      duration_ms: duration
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    await supabase.from("sync_log").insert({
      source: "google_sheets",
      sheet_name: config.name,
      sheet_gid: config.gid,
      status: "error",
      error_message: error.message,
      duration_ms: duration
    });

    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase com service_role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sheetType, grid, season, force } = await req.json().catch(() => ({}));

    const currentSeason = season || 20; // Temporada atual

    let result;

    switch (sheetType) {
      case "classificacao":
        if (!grid) {
          // Sincronizar ambos os grids
          const [carreira, light] = await Promise.all([
            syncClassificacao(supabase, "carreira", currentSeason),
            syncClassificacao(supabase, "light", currentSeason)
          ]);
          result = { carreira, light };
        } else {
          result = await syncClassificacao(supabase, grid, currentSeason);
        }
        break;

      case "power_ranking":
        const [prCarreira, prLight] = await Promise.all([
          syncGeneric(supabase, "power_ranking_cache", SHEETS_CONFIG.power_ranking_carreira, undefined, "carreira"),
          syncGeneric(supabase, "power_ranking_cache", SHEETS_CONFIG.power_ranking_light, undefined, "light")
        ]);
        result = { carreira: prCarreira, light: prLight };
        break;

      case "calendario":
        result = await syncGeneric(supabase, "calendario_cache", SHEETS_CONFIG.calendario, currentSeason);
        break;

      case "tracks":
        result = await syncGeneric(supabase, "tracks_cache", SHEETS_CONFIG.tracks);
        break;

      case "minicup":
        result = await syncGeneric(supabase, "minicup_cache", SHEETS_CONFIG.minicup);
        break;

      case "equipes":
        result = await syncEquipes(supabase, currentSeason);
        break;

      case "all":
        // Sincronizar tudo
        const [classCarreira, classLight, prCarreiraAll, prLightAll, cal, tracks, minicup, equipes] = await Promise.all([
          syncClassificacao(supabase, "carreira", currentSeason),
          syncClassificacao(supabase, "light", currentSeason),
          syncGeneric(supabase, "power_ranking_cache", SHEETS_CONFIG.power_ranking_carreira, undefined, "carreira"),
          syncGeneric(supabase, "power_ranking_cache", SHEETS_CONFIG.power_ranking_light, undefined, "light"),
          syncGeneric(supabase, "calendario_cache", SHEETS_CONFIG.calendario, currentSeason),
          syncGeneric(supabase, "tracks_cache", SHEETS_CONFIG.tracks),
          syncGeneric(supabase, "minicup_cache", SHEETS_CONFIG.minicup),
          syncEquipes(supabase, currentSeason)
        ]);
        result = {
          classificacao: { carreira: classCarreira, light: classLight },
          power_ranking: { carreira: prCarreiraAll, light: prLightAll },
          calendario: cal,
          tracks,
          minicup,
          equipes
        };
        break;

      default:
        throw new Error(`Tipo de planilha inválido: ${sheetType}`);
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Erro na sincronização:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});










































