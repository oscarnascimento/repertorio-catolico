# 🕊️ Repertório Católico - Ministério de Adoração e Louvor

Aplicação web moderna, responsiva e mobile-first para gestão de acervo musical e seleção de repertório de celebrações católicas (Adorações, Missas, Vigílias e Grupos de Oração).

Desenvolvida com **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM** e **PostgreSQL**.

---

## 📱 Principais Funcionalidades

- **Autenticação Administrativa (`/admin/login`):**
  - Acesso protegido via senha de administração configurada por variável de ambiente (`ADMIN_PASSWORD`).
  - Controle de sessão baseado em cookies HttpOnly seguros assinado com HMAC-SHA256 (`ADMIN_SECRET`).
  - Proteção de rotas e APIs restritas via `middleware.ts`.

- **Painel do Administrador (`/admin`):**
  - **Listagem e Gestão de Eventos:**
    - Visualização completa de todas as celebrações em cards interativos com cálculo de progresso em tempo real (músicas marcadas vs total).
    - Busca e filtro dinâmico de eventos por título ou nome de músicas.
    - **Edição Completa de Eventos:** Modal para alterar o título, adicionar novas músicas do catálogo em 1 clique, remover canções e reordenar a sequência de execução (`▲/▼`).
    - **Exclusão Segura:** Remoção de eventos com diálogo de confirmação.
    - **Compartilhamento Rápido:** Cópia instantânea de links públicos e atalho direto para a visão do Diácono.
  - **Criação de Novos Eventos:**
    - Curadoria rápida de canções do acervo para montagem da playlist sugerida inicial.
  - **Gestão do Acervo Musical:**
    - Cadastro individual de canções e **Importador em Lote de Planilhas** (`.xlsx`, `.xls`, `.csv` ou Copiar & Colar do Google Sheets/Excel) com detecção inteligente de colunas (`titulo`, `compositor`, `url`).
    - Botão para **Baixar Modelo de Planilha CSV**.
    - Busca instantânea e acesso direto a links do YouTube.

- **Interface Mobile do Diácono (`/evento/[id]`):**
  - Experiência otimizada para smartphones (*touch-friendly*).
  - **Observações Gerais da Celebração:** Caixa de texto posicionada acima das músicas para registrar orientações litúrgicas gerais, com salvamento automático (*auto-save*) em tempo real.
  - **Comentários por Música:** Botão dedicado em cada canção (`+ Comentário` / `Comentário`) que abre um popup com salvamento automático na própria digitação, permitindo instruções específicas para os músicos (ex: dinâmica de entrada, repetições, tom).
  - Seleção/marcação de músicas com feedback visual imediato.
  - Ordenação personalizada da sequência de execução com botões `▲` (Subir) e `▼` (Descer).
  - Acesso direto ao vídeo de referência no YouTube.
  - **Optimistic UI & Auto-Save:** Atualizações em tempo real com sincronização automática em segundo plano e tratamento de falhas.

---

## 🛠️ Stack Tecnológica

- **Frontend & Backend:** [Next.js 15 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **ORM & Banco de Dados:** [Prisma ORM](https://www.prisma.io/) + [PostgreSQL](https://www.postgresql.org/) (Compatível com Vercel Postgres, Supabase, Neon DB)
- **Hospedagem & Deploy:** [Vercel](https://vercel.com/)
- **CI/CD:** GitHub Actions (`.github/workflows/deploy.yml`)

---

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- Node.js 18+ (recomendado 20+)
- PostgreSQL (ou instância gratuita no Supabase/Neon/Vercel Postgres)

### 2. Instalação

```bash
# Clone o repositório
git clone <URL_DO_REPOSITORIO>
cd repertorio-catolico

# Instale as dependências
npm install
```

### 3. Configuração de Banco por Ambiente (Automático)

O projeto possui um **alternador inteligente automático** ([scripts/prepare-prisma.js](file:///home/oscar/projects/repertorio-catolico/scripts/prepare-prisma.js)):
- **Ambiente Local:** Se `DATABASE_URL` for `file:./dev.db` (padrão no `.env`), o Prisma utiliza **SQLite** automaticamente.
- **Ambiente de Produção (Vercel / Supabase):** Se `DATABASE_URL` for uma URL PostgreSQL (`postgresql://...`), o Prisma altera o provider automaticamente para **PostgreSQL** durante o build/deploy.

```bash
# Aplica o schema no banco atual (SQLite ou PostgreSQL)
npm run db:push
```

### 5. Iniciar Servidor de Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador. O acesso redirecionará automaticamente para o painel de administração (`/admin`).

---

## 🌐 Deploy na Vercel

1. Crie um projeto na [Vercel](https://vercel.com).
2. Conecte o repositório GitHub.
3. Nas configurações de **Environment Variables** da Vercel, adicione:
   - `DATABASE_URL`: String de conexão do seu PostgreSQL (ex: Vercel Postgres, Supabase ou Neon).
4. O script `postinstall` configurado no `package.json` (`prisma generate`) garante que o Prisma Client seja gerado automaticamente durante o build na Vercel.

---

## 🤖 GitHub Actions (CI/CD)

O pipeline configurado em `.github/workflows/deploy.yml` executa automaticamente:
1. Validação de qualidade, tipos TypeScript e geração do Prisma.
2. Build de produção do Next.js.
3. Deploy automático para a Vercel na branch `main`.

Para habilitar o deploy automático via GitHub Actions, adicione os seguintes secrets no repositório GitHub:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `DATABASE_URL`

---

## 📖 Documentação de Domínio (DDD)

Acesse a documentação completa de Domain-Driven Design em:
👉 [docs/DDD.md](./docs/DDD.md)
