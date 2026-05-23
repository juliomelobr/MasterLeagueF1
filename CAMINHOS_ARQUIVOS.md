# 📁 Caminhos dos Arquivos - Referência Rápida

## 📂 Estrutura do Projeto

```
C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1\
```

## 📄 Arquivos Importantes

### 1. Schema do Banco de Dados
**Caminho:** 
```
C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1\supabase-schema-cache.sql
```
**O que fazer:** Copiar e colar no SQL Editor do Supabase

---

### 2. Edge Function: sync-google-sheets
**Caminho:**
```
C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1\supabase\functions\sync-google-sheets\index.ts
```
**O que fazer:** Copiar código e colar na Edge Function do Supabase

---

### 3. Edge Function: sync-scheduler
**Caminho:**
```
C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1\supabase\functions\sync-scheduler\index.ts
```
**O que fazer:** Copiar código e colar na Edge Function do Supabase

---

### 4. Hook de Cache
**Caminho:**
```
C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1\src\hooks\useSupabaseCache.js
```
**Status:** ✅ Já está no projeto, não precisa fazer nada

---

### 5. Dashboard de Sincronização
**Caminho:**
```
C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1\src\pages\AdminSync.jsx
```
**Status:** ✅ Já está no projeto, acesse em `/admin/sync`

---

### 6. Configuração de Rotas
**Caminho:**
```
C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1\src\App.jsx
```
**Status:** ✅ Já está configurado

---

## 🔗 Links Importantes

### Supabase
- **Dashboard:** https://supabase.com/dashboard
- **SQL Editor:** Dashboard → SQL Editor (menu lateral)
- **Table Editor:** Dashboard → Table Editor (menu lateral)
- **Edge Functions:** Dashboard → Edge Functions (menu lateral)
- **Settings/API:** Dashboard → Settings → API

### Projeto Local
- **Iniciar servidor:** `npm run dev`
- **URL local:** http://localhost:5173
- **Dashboard sync:** http://localhost:5173/admin/sync

---

## 📋 Como Abrir Arquivos

### Método 1: Pelo Explorador de Arquivos do Windows
1. Pressione `Windows + E` para abrir o Explorador
2. Cole o caminho na barra de endereço
3. Pressione Enter

### Método 2: Pelo VS Code / Editor
1. Abra o VS Code
2. File → Open Folder
3. Navegue até: `C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1`

### Método 3: Pelo Terminal
1. Abra o PowerShell ou CMD
2. Digite:
   ```bash
   cd "C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1"
   ```
3. Para abrir arquivo:
   ```bash
   notepad supabase-schema-cache.sql
   ```
   (ou substitua `notepad` por seu editor preferido)

---

## 🎯 Ordem de Execução

1. ✅ Abrir `supabase-schema-cache.sql` → Copiar → Colar no Supabase
2. ✅ Abrir `supabase/functions/sync-google-sheets/index.ts` → Copiar → Colar no Supabase
3. ✅ Abrir `supabase/functions/sync-scheduler/index.ts` → Copiar → Colar no Supabase
4. ✅ Configurar variáveis de ambiente no Supabase
5. ✅ Testar via `/admin/sync`

---

## 💾 Backup Recomendado

Antes de fazer mudanças, faça backup:

1. No Supabase: Settings → Database → Backups
2. Ou exporte as tabelas manualmente via SQL Editor










































