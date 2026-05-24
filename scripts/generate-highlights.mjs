#!/usr/bin/env node
/**
 * Gera os PNGs de TOP 10 (1080×1500) para todas as etapas elegíveis,
 * usando Playwright + Chromium contra o `vite preview` rodando localmente.
 *
 * Fluxo:
 *  1. Abre /snapshot/top10/list, espera <body data-snapshot-list-ready>.
 *  2. Lê o JSON do <pre id="top10-list">.
 *  3. Para cada etapa, abre /snapshot/top10/:grid/:season/:round, espera
 *     <body data-snapshot-ready> e tira screenshot do
 *     #top10-snapshot-stage (1080×1500).
 *  4. Salva em public/highlights/<gpSlug>/top10-<grid>.png.
 *  5. Também escreve um manifest em public/highlights/top10-manifest.json
 *     com o conteúdo da listagem (consumido pela Home pra saber se o PNG
 *     existe e em qual caminho).
 *
 * Variáveis de ambiente esperadas:
 *  - PREVIEW_URL  (default: http://127.0.0.1:4173)
 *
 * O script *NÃO* faz fetch direto no Supabase: a fonte de verdade é a
 * própria página `/snapshot/top10/list`, que reusa `useLeagueData` (mesmo
 * cache que o usuário final consome).
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const PREVIEW_URL = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const OUTPUT_ROOT = resolve(process.cwd(), 'public/highlights');
const MANIFEST_PATH = resolve(OUTPUT_ROOT, 'top10-manifest.json');

const log = (...args) => console.log('[generate-highlights]', ...args);
const err = (...args) => console.error('[generate-highlights]', ...args);

async function main() {
    log(`Preview URL: ${PREVIEW_URL}`);
    log(`Output dir: ${OUTPUT_ROOT}`);

    const browser = await chromium.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const context = await browser.newContext({
        viewport: { width: 1080, height: 1500 },
        deviceScaleFactor: 2,
        // Locale brasileiro pra datas/decimais ficarem iguais ao app real.
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
    });
    const page = await context.newPage();

    page.on('pageerror', (e) => err('pageerror:', e.message));
    page.on('console', (msg) => {
        const type = msg.type();
        if (type === 'error' || type === 'warning') {
            log(`page.${type}:`, msg.text());
        }
    });

    log('Carregando lista de etapas elegíveis…');
    await page.goto(`${PREVIEW_URL}/snapshot/top10/list`, {
        waitUntil: 'networkidle',
        timeout: 60_000,
    });
    await page.waitForSelector('body[data-snapshot-list-ready="true"]', { timeout: 60_000 });
    const listText = await page.locator('#top10-list').innerText();
    let stages = [];
    try {
        stages = JSON.parse(listText);
    } catch (e) {
        err('Falha ao parsear JSON da listagem:', e.message);
        await browser.close();
        process.exit(2);
    }

    if (!Array.isArray(stages) || stages.length === 0) {
        log('Nenhuma etapa elegível ainda. Saindo sem gerar arts.');
        await mkdir(OUTPUT_ROOT, { recursive: true });
        await writeFile(MANIFEST_PATH, JSON.stringify({ stages: [], generatedAt: new Date().toISOString() }, null, 2));
        await browser.close();
        return;
    }

    log(`Etapas elegíveis: ${stages.length}`);
    stages.forEach((s) => log(`  • ${s.grid} · S${s.season}R${s.round} · ${s.gp} (${s.gpSlug})`));

    const generated = [];

    for (const stage of stages) {
        const url = `${PREVIEW_URL}/snapshot/top10/${stage.grid}/${stage.season}/${stage.round}`;
        log(`→ ${url}`);
        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
            await page.waitForSelector('body[data-snapshot-ready="true"]', { timeout: 60_000 });

            // 200ms de gordura extra pra qualquer animação tardia / fontes
            // que tenham caído no cascade após o ready.
            await page.waitForTimeout(200);

            const stageEl = await page.$('#top10-snapshot-stage');
            if (!stageEl) {
                err(`#top10-snapshot-stage não encontrado para ${url}`);
                continue;
            }

            const fileName = `top10-${stage.grid}.png`;
            const filePath = resolve(OUTPUT_ROOT, stage.gpSlug, fileName);
            await mkdir(dirname(filePath), { recursive: true });
            await stageEl.screenshot({
                path: filePath,
                type: 'png',
                omitBackground: false,
            });
            log(`  ✓ ${filePath}`);

            generated.push({
                ...stage,
                file: `/highlights/${stage.gpSlug}/${fileName}`,
            });
        } catch (e) {
            err(`Falha em ${url}:`, e.message);
        }
    }

    await mkdir(OUTPUT_ROOT, { recursive: true });
    await writeFile(
        MANIFEST_PATH,
        JSON.stringify(
            {
                generatedAt: new Date().toISOString(),
                stages: generated,
            },
            null,
            2,
        ),
    );
    log(`Manifest salvo em ${MANIFEST_PATH}`);

    await browser.close();
    log(`Done. ${generated.length}/${stages.length} arts geradas.`);
}

main().catch((e) => {
    err('Erro fatal:', e);
    process.exit(1);
});
