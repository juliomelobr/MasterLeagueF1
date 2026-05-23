// Supabase Edge Function - Envio de Emails
// Esta função envia emails via SMTP usando as credenciais configuradas

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587");
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validar variáveis de ambiente
    if (!SMTP_USER || !SMTP_PASS) {
      console.error("❌ SMTP_USER ou SMTP_PASS não configurados");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "SMTP credentials não configuradas. Configure SMTP_USER e SMTP_PASS no Supabase Dashboard > Settings > Edge Functions > Secrets" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Parse do body da requisição
    const { to, subject, html, templateType, logId } = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Campos obrigatórios: to, subject, html" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log(`📧 Enviando email para: ${to}`);
    console.log(`📝 Assunto: ${subject}`);
    console.log(`📋 Tipo: ${templateType || 'N/A'}`);

    // Conectar ao servidor SMTP
    const client = new SmtpClient();
    
    await client.connectTLS({
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      username: SMTP_USER,
      password: SMTP_PASS,
    });

    // Enviar email
    await client.send({
      from: SMTP_USER,
      to: to,
      subject: subject,
      content: html,
      mimeType: "text/html",
    });

    await client.close();

    console.log(`✅ Email enviado com sucesso para: ${to}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email enviado com sucesso",
        to: to,
        subject: subject
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Erro ao enviar email:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro desconhecido ao enviar email",
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});












































