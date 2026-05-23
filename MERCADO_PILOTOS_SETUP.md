# 🏎️ Mercado de Pilotos - Setup

Este documento contém as instruções para configurar o mercado de pilotos no Master League F1.

## 📋 Pré-requisitos

- Projeto Master League F1 já configurado
- Acesso ao painel do Supabase
- Node.js e dependências instaladas

## 🗄️ Configuração do Banco de Dados

### 1. Executar o Script SQL

Acesse o painel do Supabase do seu projeto e execute o script SQL localizado em `supabase-schema-mercado-pilotos.sql`:

1. Vá para **SQL Editor** no painel do Supabase
2. Cole o conteúdo completo do arquivo `supabase-schema-mercado-pilotos.sql`
3. Clique em **Run** para executar

O script criará as seguintes tabelas:
- `mercado_pilotos` - Pilotos disponíveis no mercado
- `propostas_mercado` - Propostas de transferência
- `historico_transferencias` - Histórico de transferências realizadas

### 2. Verificar Políticas RLS

As tabelas já incluem políticas de segurança (RLS) configuradas para:
- Permitir leitura pública dos dados do mercado
- Controle de acesso para inserção e atualização

## 🚀 Funcionalidades Implementadas

### ✅ Já Implementado
- **Interface completa do mercado** com abas (Mercado, Propostas, Histórico)
- **Sistema de filtros** por grid (Carreira/Light) e busca por nome
- **Cards de pilotos** com informações detalhadas
- **Modal de propostas** para fazer ofertas
- **Hook personalizado** `useMercadoPilotos` para gerenciamento de estado
- **Sistema de cache** para otimização de performance

### 🔄 Próximas Implementações
- **Notificações em tempo real** para novas propostas
- **Validação de equipes** (apenas equipes oficiais podem fazer propostas)
- **Sistema de permissões** baseado em papéis de usuário
- **Integração com WhatsApp** para notificações
- **Dashboard administrativo** para gerenciar transferências

## 🎯 Como Usar

### Para Administradores
1. Acesse a página **Mercado** através do menu
2. Use os filtros para encontrar pilotos específicos
3. Clique em **"FAZER PROPOSTA"** para iniciar uma negociação
4. Preencha os detalhes da proposta (equipe, valor, mensagem)
5. Acompanhe as propostas na aba **"Minhas Propostas"**

### Para Pilotos
1. Os pilotos podem ser colocados no mercado através do sistema administrativo
2. Eles receberão notificações sobre novas propostas
3. Podem aceitar ou rejeitar propostas diretamente na interface

## 📱 Responsividade

A interface do mercado é totalmente responsiva e funciona bem em:
- Desktop
- Tablets
- Dispositivos móveis

## 🔧 Personalização

### Cores por Grid
- **Carreira**: Laranja (#FF6B35)
- **Light**: Verde água (#4ECDC4)

### Temas
A interface segue o tema escuro padrão do projeto, mantendo consistência visual.

## 🐛 Troubleshooting

### Erro: "Tabelas não encontradas"
- Verifique se o script SQL foi executado corretamente no Supabase
- Confirme que todas as tabelas foram criadas

### Erro: "Permissões insuficientes"
- Verifique as políticas RLS configuradas
- Confirme se o usuário tem as permissões adequadas

### Performance lenta
- O sistema inclui cache automático de 2 minutos
- Para forçar atualização, recarregue a página

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console do navegador (F12)
2. Confirme a conectividade com o Supabase
3. Verifique se todas as dependências estão instaladas

## 🎉 Conclusão

O mercado de pilotos está pronto para uso! Aproveite para gerenciar transferências de forma organizada e profissional na Master League F1.

🏁 *Bora acelerar as negociações!* 🏁








