import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// API Selection
const WHATSAPP_API_TYPE = Deno.env.get("WHATSAPP_API_TYPE") || "";

// Z-API Config
const ZAPI_INSTANCE = Deno.env.get("ZAPI_INSTANCE");
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN");
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN"); // Token de Segurança da Conta (opcional)

// Twilio Config
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
const ADMIN_WHATSAPP_COPY = Deno.env.get("ADMIN_WHATSAPP_COPY"); // ex: 5551999999999

console.log(`🔍 Secrets carregados:`);
console.log(`   WHATSAPP_API_TYPE: ${WHATSAPP_API_TYPE || 'não configurado (auto-detectar)'}`);
console.log(`   ZAPI_INSTANCE: ${ZAPI_INSTANCE ? '✅' : '❌'}`);
console.log(`   ZAPI_TOKEN: ${ZAPI_TOKEN ? '✅' : '❌'}`);
console.log(`   ZAPI_CLIENT_TOKEN: ${ZAPI_CLIENT_TOKEN ? '✅ (opcional)' : '❌ (não configurado)'}`);
console.log(`   TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID ? '✅' : '❌'}`);
console.log(`   TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN ? '✅' : '❌'}`);
console.log(`   TWILIO_WHATSAPP_NUMBER: ${TWILIO_WHATSAPP_NUMBER ? '✅' : '❌'}`);
console.log(`   ADMIN_WHATSAPP_COPY: ${ADMIN_WHATSAPP_COPY ? '✅' : '❌'}`);

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatPhoneNumber(phone: string): string {
  const numbers = phone.replace(/\D/g, '');
  if (numbers.startsWith('0')) {
    return numbers.substring(1);
  }
  if (!numbers.startsWith('55')) {
    return '55' + numbers;
  }
  return numbers;
}

async function sendViaZAPI(phone: string, codeOrMessage: string, nomePiloto: string, isNotification: boolean = false): Promise<{success: boolean, error?: string}> {
  console.log(`🔍 [Z-API] Iniciando envio...`);
  console.log(`   ZAPI_INSTANCE: ${ZAPI_INSTANCE ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`   ZAPI_TOKEN: ${ZAPI_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`   ZAPI_CLIENT_TOKEN: ${ZAPI_CLIENT_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
  
  if (!ZAPI_INSTANCE || !ZAPI_TOKEN) {
    const error = "Z-API não configurado";
    console.error(`❌ [Z-API] ${error}`);
    return { success: false, error };
  }

    const phoneFormatted = formatPhoneNumber(phone);
    // Se codeOrMessage for uma mensagem completa (notificação), usar diretamente. Senão, formatar como código.
    const message = codeOrMessage.length > 10 ? codeOrMessage : `🔐 CÓDIGO DE VERIFICAÇÃO - MASTER LEAGUE F1\n\nOlá ${nomePiloto || 'Piloto'}!\n\nSeu código de verificação é:\n\n${codeOrMessage}\n\nEste código expira em 10 minutos.`;

  try {
    const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;
    
    console.log(`📱 [Z-API] Enviando via Z-API:`);
    console.log(`   URL: ${url}`);
    console.log(`   Para: ${phoneFormatted}`);
    console.log(`   Mensagem: ${message.substring(0, 50)}...`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Adiciona Client-Token se estiver configurado
    if (ZAPI_CLIENT_TOKEN) {
      headers['Client-Token'] = ZAPI_CLIENT_TOKEN;
      console.log(`   Client-Token: ✅ configurado`);
    } else {
      console.log(`   Client-Token: ⚠️ não configurado (opcional)`);
    }
    
    const requestBody = {
      phone: phoneFormatted,
      message: message,
    };
    
    console.log(`📤 [Z-API] Request body:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log(`📥 [Z-API] Response status: ${response.status} ${response.statusText}`);
    console.log(`📥 [Z-API] Response headers:`, JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    console.log(`📥 [Z-API] Response body (raw):`, responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`📥 [Z-API] Response body (parsed):`, JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error(`❌ [Z-API] Erro ao parsear resposta:`, parseError);
      data = { error: responseText || 'Resposta inválida', rawResponse: responseText };
      console.log(`📥 [Z-API] Response body (não-JSON):`, responseText);
    }
    
    // Verificar sucesso: HTTP 200 OK + (zaapId OU messageId OU id OU status success OU success true)
    const hasZaapId = data && (data.zaapId || data.messageId || data.id);
    const hasStatusSuccess = data && data.status === 'success';
    const hasSuccessTrue = data && data.success === true;
    const isResponseOk = response.ok;
    
    console.log(`🔍 [Z-API] Verificação de sucesso:`);
    console.log(`   Resposta Z-API: ${response.status}`);
    console.log(`   HTTP Status OK: ${isResponseOk}`);
    console.log(`   Tem zaapId/messageId/id: ${hasZaapId ? `✅` : '❌'}`);
    if (hasZaapId) {
      console.log(`   zaapId: ${data.zaapId || 'não presente'}`);
      console.log(`   messageId: ${data.messageId || 'não presente'}`);
      console.log(`   id: ${data.id || 'não presente'}`);
    }
    console.log(`   Status === 'success': ${hasStatusSuccess}`);
    console.log(`   Success === true: ${hasSuccessTrue}`);
    
    // Z-API retorna sucesso quando: HTTP 200 + (zaapId OU messageId OU id OU status='success' OU success=true)
    if (response.ok && (hasZaapId || hasStatusSuccess || hasSuccessTrue)) {
      console.log(`✅ [Z-API] Mensagem enviada com sucesso!`);
      console.log(`📋 Resposta completa:`, JSON.stringify(data, null, 2));
      return { success: true };
    } else {
      const errorMsg = data?.message || data?.error || data?.errorMessage || data?.error_description || 'Erro do Z-API';
      console.error(`❌ [Z-API] Erro ao enviar:`, errorMsg);
      console.error(`❌ [Z-API] Resposta completa:`, JSON.stringify(data, null, 2));
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    console.error(`❌ [Z-API] Exceção capturada:`, error);
    console.error(`❌ [Z-API] Stack trace:`, error.stack);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Erro de conexão: ${errorMessage}` };
  }
}

async function sendViaTwilio(phone: string, codeOrMessage: string, nomePiloto: string): Promise<{success: boolean, error?: string}> {
  console.log(`🔍 [Twilio] Iniciando envio...`);
  console.log(`   TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`   TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`   TWILIO_WHATSAPP_NUMBER: ${TWILIO_WHATSAPP_NUMBER ? `✅ Configurado (${TWILIO_WHATSAPP_NUMBER})` : '❌ Não configurado'}`);
  
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    const error = "Twilio não configurado";
    console.error(`❌ [Twilio] ${error}`);
    return { success: false, error };
  }

  const phoneFormatted = formatPhoneNumber(phone);
  // Twilio precisa do formato whatsapp:+5511999999999
  const twilioTo = `whatsapp:+${phoneFormatted}`;
  // Se code for uma mensagem completa (notificação), usar diretamente. Senão, formatar como código.
  const message = (codeOrMessage.length > 10
    ? codeOrMessage
    : `🔐 CÓDIGO DE VERIFICAÇÃO - MASTER LEAGUE F1\n\nOlá ${nomePiloto || 'Piloto'}!\n\nSeu código de verificação é:\n\n${codeOrMessage}\n\nEste código expira em 10 minutos.`)
    .normalize('NFC');

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    console.log(`📱 [Twilio] Enviando via Twilio:`);
    console.log(`   URL: ${url}`);
    console.log(`   De: ${TWILIO_WHATSAPP_NUMBER}`);
    console.log(`   Para: ${twilioTo}`);
    console.log(`   Mensagem: ${message.substring(0, 50)}...`);
    
    // Twilio usa Basic Auth com Account SID e Auth Token
    const credentials = encode(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    const formData = new URLSearchParams();
    formData.append('From', TWILIO_WHATSAPP_NUMBER);
    formData.append('To', twilioTo);
    formData.append('Body', message);
    
    console.log(`📤 [Twilio] Request body:`, formData.toString());
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: formData.toString(),
    });

    const responseText = await response.text();
    console.log(`📥 [Twilio] Response status: ${response.status} ${response.statusText}`);
    console.log(`📥 [Twilio] Response body (raw):`, responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`📥 [Twilio] Response body (parsed):`, JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error(`❌ [Twilio] Erro ao parsear resposta:`, parseError);
      data = { error: responseText || 'Resposta inválida', rawResponse: responseText };
    }
    
    // Twilio retorna sucesso quando: HTTP 200/201 + status 'queued' ou 'sent' ou 'delivered'
    const isResponseOk = response.ok && (response.status === 200 || response.status === 201);
    const hasSuccessStatus = data && (data.status === 'queued' || data.status === 'sent' || data.status === 'delivered' || data.sid);
    
    console.log(`🔍 [Twilio] Verificação de sucesso:`);
    console.log(`   Resposta Twilio: ${response.status}`);
    console.log(`   HTTP Status OK: ${isResponseOk}`);
    console.log(`   Status: ${data?.status || 'não presente'}`);
    console.log(`   SID: ${data?.sid || 'não presente'}`);
    console.log(`   Tem sucesso: ${hasSuccessStatus ? '✅' : '❌'}`);
    
    if (isResponseOk && hasSuccessStatus) {
      console.log(`✅ [Twilio] Mensagem enviada com sucesso!`);
      console.log(`📋 SID: ${data.sid}`);
      return { success: true };
    } else {
      const errorMsg = data?.message || data?.error_message || data?.error || 'Erro do Twilio';
      console.error(`❌ [Twilio] Erro ao enviar:`, errorMsg);
      console.error(`❌ [Twilio] Resposta completa:`, JSON.stringify(data, null, 2));
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    console.error(`❌ [Twilio] Exceção capturada:`, error);
    console.error(`❌ [Twilio] Stack trace:`, error.stack);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Erro de conexão: ${errorMessage}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, whatsapp, nomePiloto, tipo, skipPilotoCheck, mensagemCustomizada, forceApi, grid, plataforma, temporada } = await req.json();

    if (!email || !whatsapp) {
      return new Response(
        JSON.stringify({ success: false, error: "Email e WhatsApp obrigatórios" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Determina qual API usar: Z-API (chip/operadora) ou Twilio
    // forceApi: 'twilio' | 'zapi' força o uso de uma API específica (útil para testes)
    const useZAPI = forceApi === 'twilio' ? false : (
      forceApi === 'zapi' ? true : (
        WHATSAPP_API_TYPE === 'zapi' || WHATSAPP_API_TYPE === 'z-api' ||
        (ZAPI_INSTANCE && ZAPI_TOKEN && WHATSAPP_API_TYPE !== 'twilio')
      )
    );
    const useTwilio = (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_NUMBER);

    // Notificação de inscrição (boas-vindas) - NÃO gera código
    if (tipo === 'notificacao_inscricao') {
      const whatsappFormatted = formatPhoneNumber(whatsapp);
      const nome = nomePiloto || 'Piloto';
      const gridTxt = String(grid || '').trim();
      const plataformaTxt = String(plataforma || '').trim();
      const temporadaTxt = temporada ? `T${temporada}` : '';

      const gridNice = gridTxt ? (gridTxt[0].toUpperCase() + gridTxt.slice(1).toLowerCase()) : '—';
      const plataformaNice = plataformaTxt ? (plataformaTxt[0].toUpperCase() + plataformaTxt.slice(1).toLowerCase()) : '—';

      const mensagemPadrao =
        `🏁 *BEM-VINDO À MASTER LEAGUE F1!*\n\n` +
        `Olá ${nome}!\n\n` +
        `✅ Recebemos sua inscrição${temporadaTxt ? ` para a *${temporadaTxt}*` : ''}.\n\n` +
        `📌 *Grid:* ${gridNice}\n` +
        `🎮 *Plataforma:* ${plataformaNice}\n` +
        `📧 *E-mail:* ${String(email || '').trim()}\n\n` +
        `Em breve o ADM vai analisar e atualizar o status da sua inscrição.\n\n` +
        `🏎️ Boa sorte e nos vemos na pista!`;

      const mensagem = mensagemCustomizada || mensagemPadrao;

      const sendOne = async (toWhats: string) => {
        if (forceApi === 'twilio' && useTwilio) {
          console.log(`📋 [forceApi] Usando Twilio para notificação de inscrição`);
          return await sendViaTwilio(toWhats, mensagem, nome);
        }
        if (useZAPI) {
          console.log(`📋 Usando Z-API para notificação de inscrição`);
          return await sendViaZAPI(toWhats, mensagem, nome, true);
        }
        if (useTwilio) {
          console.log(`📋 Usando Twilio para notificação de inscrição`);
          return await sendViaTwilio(toWhats, mensagem, nome);
        }
        return { success: false, error: 'Configure Z-API ou Twilio nos secrets do Supabase' };
      };

      // Envia ao piloto
      const pilotResult = await sendOne(whatsappFormatted);
      if (!pilotResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: pilotResult.error || "Erro ao enviar notificação" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      // Cópia para o ADM (opcional)
      const adminTargetRaw = ADMIN_WHATSAPP_COPY ? String(ADMIN_WHATSAPP_COPY).trim() : '';
      if (adminTargetRaw) {
        const adminTarget = formatPhoneNumber(adminTargetRaw);
        const prefix = `📥 *CÓPIA ADM - NOVA INSCRIÇÃO*\n\n`;
        const adminMsg = prefix + mensagem;
        const adminSendOne = async (toWhats: string) => {
          if (forceApi === 'twilio' && useTwilio) return await sendViaTwilio(toWhats, adminMsg, nome);
          if (useZAPI) return await sendViaZAPI(toWhats, adminMsg, nome, true);
          if (useTwilio) return await sendViaTwilio(toWhats, adminMsg, nome);
          return { success: false, error: 'Configure Z-API ou Twilio nos secrets do Supabase' };
        };
        const adminResult = await adminSendOne(adminTarget);
        if (!adminResult.success) {
          console.warn('⚠️ Falha ao enviar cópia ao ADM:', adminResult.error);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Notificação de inscrição enviada com sucesso" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Se for notificação de aprovação, enviar mensagem diferente
    if (tipo === 'notificacao_aprovacao') {
      const whatsappFormatted = formatPhoneNumber(whatsapp);
      const nome = nomePiloto || 'Piloto';
      // Usar mensagem customizada se fornecida, senão usar mensagem padrão atualizada
      const siteUrl = 'https://masterleaguef1.com.br';
      const loginUrl = `${siteUrl}/ex-piloto/login`;
      const mensagemPadrao = `✅ *ACESSO LIBERADO - MASTER LEAGUE F1*\n\nOlá ${nome},\n\nSeu acesso ao Painel do Piloto foi *APROVADO*!\n\n📋 *CADASTRE SUA SENHA E ACESSE:*\n\n🔗 Link direto: ${loginUrl}\n\n📝 *Passos:*\n\n1️⃣ Clique no link acima\n\n2️⃣ Digite seu e-mail:\n   ${email}\n\n3️⃣ Valide seu WhatsApp com o código que será enviado\n\n4️⃣ Crie sua senha de acesso\n\n5️⃣ Pronto! Você terá acesso ao seu painel histórico\n\n🏎️ Reveja a sua história na Master League F1`;
      const mensagem = mensagemCustomizada || mensagemPadrao;

      let result = { success: false, error: '' };
      if (forceApi === 'twilio' && useTwilio) {
        console.log(`📋 [forceApi] Usando Twilio para notificação de aprovação`);
        result = await sendViaTwilio(whatsappFormatted, mensagem, nome);
      } else if (useZAPI) {
        console.log(`📋 Usando Z-API para notificação de aprovação`);
        result = await sendViaZAPI(whatsappFormatted, mensagem, nome, true);
      } else if (useTwilio) {
        console.log(`📋 Usando Twilio para notificação de aprovação`);
        result = await sendViaTwilio(whatsappFormatted, mensagem, nome);
      } else {
        result = { success: false, error: 'Configure Z-API ou Twilio nos secrets do Supabase' };
      }

      if (result.success) {
        return new Response(
          JSON.stringify({ success: true, message: "Notificação enviada com sucesso" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } else {
        return new Response(
          JSON.stringify({ success: false, error: result.error || "Erro ao enviar notificação" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }

    // Verificar se o piloto existe no banco (pular se skipPilotoCheck = true, para cadastros novos)
    let piloto = null;
    if (!skipPilotoCheck) {
      const { data: pilotoData, error: pilotoError } = await supabase
        .from('pilotos')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (pilotoError || !pilotoData) {
        return new Response(
          JSON.stringify({ success: false, error: "Piloto não encontrado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }
      piloto = pilotoData;
    }

    const whatsappFormatted = formatPhoneNumber(whatsapp);
    const emailNormalized = email.toLowerCase().trim();
    const code = generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    console.log(`🔐 Gerando código de verificação:`, {
      email: emailNormalized,
      whatsapp: whatsappFormatted,
      code: code,
      codeLength: code.length,
      expiresAt: expiresAt.toISOString()
    });

    // Invalidar códigos anteriores para este email
    await supabase
      .from('whatsapp_verification_codes')
      .update({ used: true })
      .eq('email', emailNormalized)
      .eq('used', false);

    const { data: codeRecord, error: codeError } = await supabase
      .from('whatsapp_verification_codes')
      .insert({
        email: emailNormalized,
        whatsapp: whatsappFormatted,
        code: code, // Código como string de 6 dígitos
        expires_at: expiresAt.toISOString(),
        used: false,
        attempts: 0,
      })
      .select()
      .single();

    if (codeError || !codeRecord) {
      console.error("❌ Erro ao salvar código:", codeError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao gerar código" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log(`✅ Código salvo no banco:`, {
      codeId: codeRecord.id,
      email: codeRecord.email,
      code: codeRecord.code,
      codeLength: codeRecord.code?.length,
      expiresAt: codeRecord.expires_at
    });

    const nome = nomePiloto || piloto?.nome || 'Piloto';
    
    let result = { success: false, error: '' };
    if (forceApi === 'twilio' && useTwilio) {
      console.log(`📋 [forceApi] Usando Twilio`);
      result = await sendViaTwilio(whatsappFormatted, code, nome);
    } else if (useZAPI) {
      console.log(`📋 Usando Z-API (chip/operadora)`);
      result = await sendViaZAPI(whatsappFormatted, code, nome);
    } else if (useTwilio) {
      console.log(`📋 Usando Twilio`);
      result = await sendViaTwilio(whatsappFormatted, code, nome);
    } else {
      console.log(`❌ Nenhuma API configurada`);
      result = { success: false, error: 'Configure Z-API ou Twilio nos secrets do Supabase. Z-API: WHATSAPP_API_TYPE=zapi, ZAPI_INSTANCE e ZAPI_TOKEN.' };
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error || "Erro ao enviar" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Atualizar WhatsApp do piloto apenas se o piloto existir no banco
    if (piloto) {
      await supabase
        .from('pilotos')
        .update({ whatsapp: whatsappFormatted })
        .eq('email', email.toLowerCase().trim());
    }

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro desconhecido" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
