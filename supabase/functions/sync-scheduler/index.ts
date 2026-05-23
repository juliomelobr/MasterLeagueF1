// Edge Function para agendar sincronizações automáticas
// Esta função é chamada periodicamente via Supabase Cron ou webhook externo
// Uso: POST /functions/v1/sync-scheduler

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Intervalos de sincronização em minutos
const SYNC_INTERVALS = {
  classificacao: 5,    // A cada 5 minutos
  power_ranking: 15,   // A cada 15 minutos
  calendario: 60,      // A cada 1 hora
  tracks: 120,         // A cada 2 horas
  minicup: 10,         // A cada 10 minutos
  pilotos: 30          // A cada 30 minutos
};

// Função para verificar se precisa sincronizar
async function needsSync(
  supabase: any,
  tableName: string,
  intervalMinutes: number,
  filter?: { column: string; value: any }
): Promise<boolean> {
  const query = supabase
    .from(tableName)
    .select("last_synced_at")
    .order("last_synced_at", { ascending: false })
    .limit(1);

  if (filter) {
    query.eq(filter.column, filter.value);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return true; // Precisa sincronizar se não existe ou erro
  }

  const lastSync = new Date(data[0].last_synced_at);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);

  return diffMinutes >= intervalMinutes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sheetType, force } = await req.json().catch(() => ({}));
    const currentSeason = 20; // Temporada atual

    const syncUrl = `${supabaseUrl}/functions/v1/sync-google-sheets`;
    const results: any = {};

    // Se especificou um tipo, sincronizar apenas esse
    if (sheetType) {
      const needsSyncCheck = !force && await needsSync(
        supabase,
        getTableName(sheetType),
        SYNC_INTERVALS[sheetType as keyof typeof SYNC_INTERVALS] || 15,
        sheetType === "classificacao" ? undefined : undefined
      );

      if (!needsSyncCheck && !force) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `${sheetType} não precisa sincronizar ainda`,
            skipped: true 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      const response = await fetch(syncUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sheetType, season: currentSeason, force }),
      });

      const result = await response.json();
      results[sheetType] = result;

    } else {
      // Sincronizar todos os tipos que precisam
      const syncTasks: Promise<any>[] = [];

      // Classificação
      const needsClassCarreira = force || await needsSync(
        supabase,
        "classificacao_cache",
        SYNC_INTERVALS.classificacao,
        { column: "grid", value: "carreira" }
      );
      const needsClassLight = force || await needsSync(
        supabase,
        "classificacao_cache",
        SYNC_INTERVALS.classificacao,
        { column: "grid", value: "light" }
      );

      if (needsClassCarreira || needsClassLight) {
        syncTasks.push(
          fetch(syncUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ 
              sheetType: "classificacao", 
              season: currentSeason,
              force 
            }),
          }).then(r => r.json())
        );
      }

      // Power Ranking
      if (force || await needsSync(supabase, "power_ranking_cache", SYNC_INTERVALS.power_ranking)) {
        syncTasks.push(
          fetch(syncUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ sheetType: "power_ranking", force }),
          }).then(r => r.json())
        );
      }

      // Calendário
      if (force || await needsSync(supabase, "calendario_cache", SYNC_INTERVALS.calendario)) {
        syncTasks.push(
          fetch(syncUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ sheetType: "calendario", season: currentSeason, force }),
          }).then(r => r.json())
        );
      }

      // Tracks
      if (force || await needsSync(supabase, "tracks_cache", SYNC_INTERVALS.tracks)) {
        syncTasks.push(
          fetch(syncUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ sheetType: "tracks", force }),
          }).then(r => r.json())
        );
      }

      // Minicup
      if (force || await needsSync(supabase, "minicup_cache", SYNC_INTERVALS.minicup)) {
        syncTasks.push(
          fetch(syncUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ sheetType: "minicup", force }),
          }).then(r => r.json())
        );
      }

      const syncResults = await Promise.allSettled(syncTasks);
      
      syncResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const data = result.value;
          if (data.result) {
            Object.assign(results, data.result);
          }
        } else {
          console.error(`Erro na sincronização ${index}:`, result.reason);
        }
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Erro no scheduler:", error);
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

function getTableName(sheetType: string): string {
  const mapping: Record<string, string> = {
    classificacao: "classificacao_cache",
    power_ranking: "power_ranking_cache",
    calendario: "calendario_cache",
    tracks: "tracks_cache",
    minicup: "minicup_cache"
  };
  return mapping[sheetType] || "";
}










































