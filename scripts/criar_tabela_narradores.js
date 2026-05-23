// Script para criar a tabela narradores no Supabase
// Execute com: node scripts/criar_tabela_narradores.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://ueqfmjwdijaeawvxhdtp.supabase.co';
// Usando service_role key para poder criar tabelas
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcWZtandkaWphZWF3dnhoZHRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDUyMTM5MSwiZXhwIjoyMDgwMDk3MzkxfQ.INSERIR_SERVICE_ROLE_KEY_AQUI';

const supabase = createClient(supabaseUrl, supabaseKey);

const sqlScript = `
-- Criar tabela
CREATE TABLE IF NOT EXISTS public.narradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_narradores_email ON public.narradores(email);
CREATE INDEX IF NOT EXISTS idx_narradores_ativo ON public.narradores(ativo);

-- Habilitar RLS
ALTER TABLE public.narradores ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "narradores_select" ON public.narradores;
DROP POLICY IF EXISTS "narradores_insert" ON public.narradores;
DROP POLICY IF EXISTS "narradores_update" ON public.narradores;
DROP POLICY IF EXISTS "narradores_delete" ON public.narradores;

-- Criar políticas RLS
CREATE POLICY "narradores_select" ON public.narradores
    FOR SELECT USING (true);

CREATE POLICY "narradores_insert" ON public.narradores
    FOR INSERT WITH CHECK (true);

CREATE POLICY "narradores_update" ON public.narradores
    FOR UPDATE USING (true);

CREATE POLICY "narradores_delete" ON public.narradores
    FOR DELETE USING (true);
`;

async function criarTabelaNarradores() {
    console.log('🚀 Criando tabela narradores no Supabase...\n');

    try {
        // Executar SQL via RPC ou usar a API REST diretamente
        // Nota: A criação de tabelas geralmente requer acesso via SQL Editor ou service_role
        console.log('⚠️  ATENÇÃO: Este script requer Service Role Key para funcionar.');
        console.log('📝 RECOMENDAÇÃO: Execute o SQL diretamente no Supabase Dashboard\n');
        console.log('📋 Passos:');
        console.log('   1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/sql/new');
        console.log('   2. Abra o arquivo: criar_tabela_narradores.sql');
        console.log('   3. Copie TODO o conteúdo');
        console.log('   4. Cole no SQL Editor');
        console.log('   5. Clique em "Run" (ou Ctrl+Enter)\n');
        
        // Tentar verificar se a tabela já existe
        const { data, error } = await supabase
            .from('narradores')
            .select('id')
            .limit(1);

        if (error && error.code === 'PGRST116') {
            console.log('❌ Tabela narradores NÃO existe ainda.');
            console.log('✅ Execute o SQL no Supabase Dashboard para criá-la.\n');
        } else if (error) {
            console.log('❌ Erro ao verificar tabela:', error.message);
        } else {
            console.log('✅ Tabela narradores JÁ EXISTE!');
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    }
}

criarTabelaNarradores();

