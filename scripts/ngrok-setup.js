import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const ngrokConfigPath = join(process.env.HOME || process.env.USERPROFILE || '', '.ngrok2', 'ngrok.yml');
const localConfigPath = join(process.cwd(), '.ngrok-token');

// Verificar se já tem token configurado
let authtoken = process.env.NGROK_AUTHTOKEN;

if (!authtoken) {
    // Tentar ler do arquivo local
    if (existsSync(localConfigPath)) {
        try {
            authtoken = readFileSync(localConfigPath, 'utf-8').trim();
        } catch (e) {
            console.error('Erro ao ler token local:', e.message);
        }
    }
}

if (!authtoken) {
    console.error('❌ NGROK_AUTHTOKEN não encontrado!');
    console.log('\n📝 Configure o authtoken de uma das seguintes formas:');
    console.log('   1. Variável de ambiente: $env:NGROK_AUTHTOKEN="seu-token"');
    console.log('   2. Arquivo local: echo "seu-token" > .ngrok-token');
    console.log('   3. Manualmente: npx ngrok config add-authtoken SEU_TOKEN');
    console.log('\n🔗 Obtenha seu token em: https://dashboard.ngrok.com/get-started/your-authtoken');
    process.exit(1);
}

try {
    // Configurar authtoken
    console.log('🔐 Configurando authtoken do ngrok...');
    execSync(`npx ngrok config add-authtoken ${authtoken}`, { stdio: 'inherit' });
    console.log('✅ Authtoken configurado com sucesso!');
} catch (error) {
    console.error('❌ Erro ao configurar authtoken:', error.message);
    process.exit(1);
}
