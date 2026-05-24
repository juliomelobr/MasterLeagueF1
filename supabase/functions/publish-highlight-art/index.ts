import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GITHUB_API_BASE = "https://api.github.com";
const DEFAULT_OWNER = "juliomelobr";
const DEFAULT_REPO = "MasterLeagueF1";
const DEFAULT_BRANCH = "main";

type PublishPayload = {
  publishKey?: string;
  imageBase64?: string;
  targetPath?: string;
  message?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function sanitizeTargetPath(targetPath = "") {
  const normalized = targetPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const isAllowed =
    /^public\/highlights\/[a-z0-9-]+\/top10-(light|carreira)\.png$/.test(normalized);

  if (!isAllowed) {
    throw new Error("Caminho inválido. Use public/highlights/{gp}/top10-{grid}.png.");
  }

  return normalized;
}

function assertPngBase64(imageBase64 = "") {
  if (!imageBase64 || imageBase64.length < 128) {
    throw new Error("Imagem ausente ou inválida.");
  }

  const pngSignatureBase64 = "iVBORw0KGgo";
  if (!imageBase64.startsWith(pngSignatureBase64)) {
    throw new Error("A imagem precisa ser PNG em base64.");
  }

  const estimatedBytes = Math.floor((imageBase64.length * 3) / 4);
  const maxBytes = 8 * 1024 * 1024;
  if (estimatedBytes > maxBytes) {
    throw new Error("Imagem grande demais. Limite: 8 MB.");
  }
}

async function githubRequest(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "master-league-f1-highlights",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : response.statusText;
    throw new Error(`GitHub ${response.status}: ${message}`);
  }

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Método não permitido." }, 405);
  }

  try {
    const expectedPublishKey = Deno.env.get("HIGHLIGHTS_PUBLISH_KEY");
    const githubToken = Deno.env.get("GITHUB_HIGHLIGHTS_TOKEN");
    const owner = Deno.env.get("GITHUB_HIGHLIGHTS_OWNER") || DEFAULT_OWNER;
    const repo = Deno.env.get("GITHUB_HIGHLIGHTS_REPO") || DEFAULT_REPO;
    const branch = Deno.env.get("GITHUB_HIGHLIGHTS_BRANCH") || DEFAULT_BRANCH;

    if (!expectedPublishKey) {
      throw new Error("Secret HIGHLIGHTS_PUBLISH_KEY não configurado.");
    }
    if (!githubToken) {
      throw new Error("Secret GITHUB_HIGHLIGHTS_TOKEN não configurado.");
    }

    const payload = (await req.json()) as PublishPayload;
    if (!payload.publishKey || payload.publishKey !== expectedPublishKey) {
      return jsonResponse({ success: false, error: "Chave de publicação inválida." }, 401);
    }

    const targetPath = sanitizeTargetPath(payload.targetPath);
    assertPngBase64(payload.imageBase64);

    let currentSha: string | undefined;
    try {
      const currentFile = await githubRequest(
        `/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath).replaceAll("%2F", "/")}?ref=${encodeURIComponent(branch)}`,
        githubToken,
      );
      if (typeof currentFile?.sha === "string") currentSha = currentFile.sha;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("GitHub 404")) throw error;
    }

    const commitMessage =
      payload.message?.trim() ||
      `Publica arte ${targetPath.replace("public/highlights/", "")}`;

    const result = await githubRequest(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath).replaceAll("%2F", "/")}`,
      githubToken,
      {
        method: "PUT",
        body: JSON.stringify({
          message: commitMessage,
          content: payload.imageBase64,
          branch,
          ...(currentSha ? { sha: currentSha } : {}),
        }),
      },
    );

    return jsonResponse({
      success: true,
      path: targetPath,
      sha: (result?.content as { sha?: string } | undefined)?.sha,
      commit: (result?.commit as { html_url?: string } | undefined)?.html_url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("publish-highlight-art error:", message);
    return jsonResponse({ success: false, error: message }, 400);
  }
});
