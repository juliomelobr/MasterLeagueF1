// Script para criar jurados de teste
// Execute com: node scripts/criar_jurados_teste.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ueqfmjwdijaeawvxhdtp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcWZtandkaWphZWF3dnhoZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjEzOTEsImV4cCI6MjA4MDA5NzM5MX0.b-y_prO5ffMuSOs7rUvrMru4SDN06BHqyMsbUIDDdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

const juradosTeste = [
    {
        usuario: 'jurado1',
        nome: 'Jurado Teste 1',
        email_google: 'juradoteste1@masterleaguef1.com',
        whatsapp: '(11) 99999-0001',
        ativo: true
    },
    {
        usuario: 'jurado2',
        nome: 'Jurado Teste 2',
        email_google: 'juradoteste2@masterleaguef1.com',
        whatsapp: '(11) 99999-0002',
        ativo: true
    },
    {
        usuario: 'jurado3',
        nome: 'Jurado Teste 3',
        email_google: 'juradoteste3@masterleaguef1.com',
        whatsapp: '(11) 99999-0003',
        ativo: true
    }
];

async function criarJurados() {
    console.log('🚀 Criando jurados de teste...\n');

    for (const jurado of juradosTeste) {
        try {
            // Verificar se já existe
            const { data: existente } = await supabase
                .from('jurados')
                .select('id')
                .eq('usuario', jurado.usuario)
                .single();

            if (existente) {
                console.log(`⚠️ ${jurado.nome} já existe. Pulando...`);
                continue;
            }

            // Inserir novo jurado
            const { data, error } = await supabase
                .from('jurados')
                .insert([jurado])
                .select();

            if (error) {
                console.error(`❌ Erro ao criar ${jurado.nome}:`, error.message);
            } else {
                console.log(`✅ ${jurado.nome} criado com sucesso!`);
            }
        } catch (err) {
            console.error(`❌ Erro:`, err.message);
        }
    }

    console.log('\n✨ Processo finalizado!');
    console.log('\n📝 Para fazer login como jurado de teste:');
    console.log('   1. Vá para /veredito');
    console.log('   2. Use um dos emails:');
    console.log('      - juradoteste1@masterleaguef1.com');
    console.log('      - juradoteste2@masterleaguef1.com');
    console.log('      - juradoteste3@masterleaguef1.com');
    console.log('   3. WhatsApp de teste: (11) 99999-000X');
}

criarJurados();
