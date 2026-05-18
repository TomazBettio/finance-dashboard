# Dynamic SaaS — Plataforma de Gestão de Estoque Multi-Tenant

> Sistema ERP/SaaS moderno para gestão de inventário, movimentações de estoque, pedidos de venda e emissão de Notas Fiscais Eletrônicas (NF-e), construído com Next.js 16, TypeScript, PostgreSQL e Drizzle ORM.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tech Stack](#tech-stack)
- [Arquitetura](#arquitetura)
- [Banco de Dados](#banco-de-dados)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Como Rodar Localmente](#como-rodar-localmente)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Decisões Técnicas](#decisões-técnicas)
- [Roadmap](#roadmap)

---

## Visão Geral

**Dynamic SaaS** é uma plataforma multi-tenant de gestão empresarial voltada ao mercado brasileiro. O sistema permite que empresas gerenciem seu inventário em tempo real, registrem entradas e saídas de estoque com rastreabilidade completa, acompanhem pedidos de venda e emitam Notas Fiscais Eletrônicas (NF-e) com suporte completo à tributação brasileira (ICMS, IPI, PIS, COFINS).

A arquitetura foi projetada para escalar horizontalmente: cada empresa (tenant) possui dados completamente isolados, e novos tenants são criados automaticamente no primeiro acesso — sem necessidade de cadastro manual.

**Rotas disponíveis:**

| Rota | Descrição |
|------|-----------|
| `/` | Redireciona para `/dashboard` |
| `/dashboard` | Dashboard com métricas e gráficos |
| `/dashboard/inventory` | Gestão de produtos e estoque |
| `/dashboard/settings` | Configuração de motivos de movimentação |

---

## Funcionalidades

### Dashboard Analítico
- 4 cards de métricas em tempo real:
  - Total de produtos cadastrados
  - Total de unidades em estoque
  - Valor total do estoque (preço base × quantidade)
  - Produtos com estoque zerado
- Gráfico de barras com **movimentações dos últimos 14 dias** (entradas vs. saídas)
- Feed das **8 últimas movimentações** com produto, tipo, motivo e tempo relativo (ex: "há 5 min")
- Queries paralelas com `Promise.all()` para máxima performance

### Gestão de Inventário (`/dashboard/inventory`)
- Tabela de produtos com ações inline
- **Cadastro/edição de produtos**: nome, SKU, preço base (R$), quantidade inicial, localização
- **Movimentação de estoque**:
  - Tipos: Entrada ou Saída
  - Seletor de motivo filtrado por tipo
  - Validação de estoque suficiente antes de saídas
  - Atualização atômica do inventário + registro do histórico
- **Exclusão** com diálogo de confirmação (reset automático de 3s)

### Configurações (`/dashboard/settings`)
- Gerenciamento de **motivos de movimentação** (ex: "Compra", "Devolução", "Venda", "Perda")
- Motivos separados por tipo: Entrada / Saída
- Criação e exclusão sem impacto no histórico (ON DELETE SET NULL)

### Multi-Tenancy
- Tenant criado automaticamente no primeiro acesso (`getOrCreateTenant()`)
- Isolamento completo de dados por `tenantId` em todas as tabelas
- Slug único por empresa para identificação

### NF-e — Estrutura Pronta (schema completo, UI em desenvolvimento)
- Suporte a número, série e chave de acesso (44 dígitos)
- Informações completas do destinatário com endereço brasileiro
- Itens com snapshot de produto e impostos (ICMS, IPI, PIS, COFINS)
- Integração com SEFAZ: protocolo de autorização, timestamps, cancelamento
- Armazenamento de XML completo
- Status: `draft` → `pending` → `authorized` → `cancelled` / `denied`

---

## Tech Stack

### Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js | 16.2.6 | Framework full-stack com App Router |
| React | 19.2.4 | Biblioteca de UI |
| TypeScript | 5 | Tipagem estática |
| Tailwind CSS | 4 | Estilização utilitária |
| Recharts | 3.8.1 | Gráficos e visualizações |
| shadcn/ui + Base UI | latest | Componentes acessíveis |
| Lucide React | 1.16.0 | Ícones |

### Backend
| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js Server Actions | — | Mutações server-side |
| Next.js Server Components | — | Renderização server-side |
| Drizzle ORM | 0.45.2 | ORM TypeScript-first |
| PostgreSQL (driver `postgres`) | 3.4.9 | Banco de dados relacional |
| Neon (recomendado) | — | Postgres serverless para Vercel |

### Tooling
| Tecnologia | Versão | Uso |
|---|---|---|
| Drizzle Kit | 0.31.10 | Migrations e geração de schema |
| tsx | 4.22.0 | Execução de TypeScript para scripts |
| ESLint | 9 | Linting |

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js App Router                     │
│                                                           │
│  ┌─────────────────┐      ┌──────────────────────────┐   │
│  │ Server Components│      │    Server Actions         │   │
│  │  (RSC, SSR)     │      │  (createProduct,          │   │
│  │  /dashboard/*   │      │   registerStockMovement,  │   │
│  └────────┬────────┘      │   deleteProduct, ...)     │   │
│           │               └────────────┬─────────────┘   │
│           └──────────────────┬─────────┘                  │
│                              │                            │
│                    ┌─────────▼──────────┐                │
│                    │    Drizzle ORM     │                 │
│                    └─────────┬──────────┘                │
│                              │                            │
└──────────────────────────────┼───────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   PostgreSQL/Neon   │
                    │                    │
                    │  tenants           │
                    │  products          │
                    │  inventoryStock    │
                    │  stockMovements    │
                    │  movementReasons   │
                    │  orders            │
                    │  orderItems        │
                    │  invoices          │
                    │  invoiceItems      │
                    └────────────────────┘
```

**Princípios arquiteturais:**
- **Domain-driven modules**: cada domínio de negócio (`inventory`, `sales`, `invoices`, `core`) possui seu próprio schema, actions e componentes
- **Server-first**: lógica de negócio e queries ficam no servidor (Server Components + Server Actions), sem API layer separada
- **Zero client-side state para dados do servidor**: dados são buscados diretamente em Server Components e passados como props
- **Isolamento multi-tenant**: toda query inclui `tenantId` como filtro obrigatório

---

## Banco de Dados

### Módulo Core

```sql
-- Empresas/tenants
tenants (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  createdAt   TIMESTAMP DEFAULT NOW(),
  updatedAt   TIMESTAMP DEFAULT NOW()
)
```

### Módulo Inventory

```sql
-- Cadastro de produtos
products (
  id          SERIAL PRIMARY KEY,
  tenantId    INT REFERENCES tenants(id),
  name        VARCHAR(255) NOT NULL,
  sku         VARCHAR(255),
  basePrice   INT,                    -- em centavos (ex: R$ 10,50 → 1050)
  metadata    JSONB,                  -- campos customizados por tenant
  createdAt   TIMESTAMP,
  updatedAt   TIMESTAMP
)

-- Posição atual do estoque
inventoryStock (
  id          SERIAL PRIMARY KEY,
  tenantId    INT REFERENCES tenants(id),
  productId   INT REFERENCES products(id),
  quantity    INT DEFAULT 0,
  location    VARCHAR(255),
  createdAt   TIMESTAMP,
  updatedAt   TIMESTAMP
)

-- Motivos de movimentação (configurável por tenant)
movementReasons (
  id          SERIAL PRIMARY KEY,
  tenantId    INT REFERENCES tenants(id),
  name        VARCHAR(255) NOT NULL,
  type        ENUM('entry', 'exit'),
  createdAt   TIMESTAMP
)

-- Histórico de movimentações (imutável)
stockMovements (
  id          SERIAL PRIMARY KEY,
  tenantId    INT REFERENCES tenants(id),
  productId   INT REFERENCES products(id),
  type        ENUM('entry', 'exit'),
  quantity    INT,                    -- sempre positivo
  reasonId    INT REFERENCES movementReasons(id) ON DELETE SET NULL,
  createdAt   TIMESTAMP
)
```

### Módulo Sales

```sql
orders (
  id              SERIAL PRIMARY KEY,
  tenantId        INT,
  customerName    VARCHAR(255),
  customerDocument VARCHAR(18),       -- CPF/CNPJ
  customerEmail   VARCHAR(255),
  customerPhone   VARCHAR(20),
  status          ENUM('pending','confirmed','processing','shipped','delivered','cancelled'),
  paymentMethod   ENUM('cash','card','pix','bank_transfer','other'),
  paymentStatus   ENUM('pending','paid','failed','refunded'),
  subtotal        INT,                -- centavos
  discount        INT,
  shipping        INT,
  total           INT,
  notes           VARCHAR(1000),
  metadata        JSONB,
  createdAt       TIMESTAMP,
  updatedAt       TIMESTAMP
)

orderItems (
  id           SERIAL PRIMARY KEY,
  orderId      INT REFERENCES orders(id),
  tenantId     INT,
  productId    INT REFERENCES products(id),
  productName  VARCHAR(255),         -- snapshot histórico
  productSku   VARCHAR(255),         -- snapshot histórico
  quantity     INT,
  unitPrice    INT,
  discount     INT,
  subtotal     INT,
  createdAt    TIMESTAMP
)
```

### Módulo Invoices (NF-e)

```sql
invoices (
  id                    SERIAL PRIMARY KEY,
  tenantId              INT,
  orderId               INT REFERENCES orders(id),     -- opcional
  number                INT,
  series                VARCHAR(3),
  accessKey             VARCHAR(44) UNIQUE,            -- chave NF-e 44 dígitos
  status                ENUM('draft','pending','authorized','cancelled','denied'),
  natureOfOperation     VARCHAR(60),
  issueDate             TIMESTAMP,
  -- Destinatário
  customerDocument      VARCHAR(18),
  customerName          VARCHAR(255),
  customerEmail         VARCHAR(255),
  customerStateReg      VARCHAR(20),
  customerZip           VARCHAR(9),
  customerStreet        VARCHAR(255),
  customerNumber        VARCHAR(20),
  customerComplement    VARCHAR(100),
  customerNeighborhood  VARCHAR(100),
  customerCity          VARCHAR(100),
  customerState         VARCHAR(2),
  -- Totais em centavos
  totalProducts         INT,
  totalDiscount         INT,
  totalShipping         INT,
  totalTax              INT,
  totalInvoice          INT,
  -- SEFAZ
  authorizationProtocol VARCHAR(50),
  authorizedAt          TIMESTAMP,
  cancelledAt           TIMESTAMP,
  cancellationReason    VARCHAR(255),
  xmlContent            TEXT,
  metadata              JSONB,
  createdAt             TIMESTAMP,
  updatedAt             TIMESTAMP
)

invoiceItems (
  id            SERIAL PRIMARY KEY,
  invoiceId     INT REFERENCES invoices(id),
  productId     INT REFERENCES products(id),
  productName   VARCHAR(255),
  productCode   VARCHAR(60),
  ncm           VARCHAR(8),            -- código NCM
  cfop          VARCHAR(4),            -- código CFOP
  unit          VARCHAR(6),            -- ex: "UN", "KG", "CX"
  quantity      INT,
  unitPrice     INT,
  discount      INT,
  total         INT,
  -- Impostos
  icmsRate      DECIMAL(5,2),
  icmsValue     INT,
  ipiRate       DECIMAL(5,2),
  ipiValue      INT,
  pisRate       DECIMAL(5,2),
  pisValue      INT,
  cofinsRate    DECIMAL(5,2),
  cofinsValue   INT,
  createdAt     TIMESTAMP
)
```

**Convenções do schema:**
- Todos os valores monetários em **centavos (INT)** para evitar problemas de ponto flutuante
- `metadata JSONB` nos modelos principais para campos customizados por tenant
- **Snapshots** em `orderItems` e `invoiceItems`: nome e SKU copiados no momento da criação, preservando integridade histórica
- Enums para tipos com domínio fixo (status, métodos de pagamento, tipos de movimentação)

---

## Estrutura do Projeto

```
dynamic-saas/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # → redirect para /dashboard
│   │   ├── layout.tsx                # Root layout (fontes, dark theme)
│   │   ├── globals.css               # Tailwind + CSS vars
│   │   └── dashboard/
│   │       ├── layout.tsx            # Sidebar + header
│   │       ├── page.tsx              # Dashboard com analytics
│   │       ├── inventory/
│   │       │   └── page.tsx          # Listagem e gestão de produtos
│   │       └── settings/
│   │           └── page.tsx          # Configuração de motivos
│   │
│   ├── modules/                      # Domínios de negócio
│   │   ├── core/
│   │   │   └── schema.ts             # Tabela tenants
│   │   ├── inventory/
│   │   │   ├── schema.ts             # products, stock, movements
│   │   │   └── actions.ts            # Server Actions (CRUD)
│   │   ├── sales/
│   │   │   └── schema.ts             # orders, orderItems
│   │   └── invoices/
│   │       └── schema.ts             # invoices, invoiceItems (NF-e)
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui + Base UI
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── table.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── app-sidebar.tsx           # Navegação lateral
│   │   ├── dashboard/
│   │   │   └── movements-chart.tsx   # Gráfico Recharts
│   │   ├── inventory/
│   │   │   ├── product-table.tsx     # Listagem com ações
│   │   │   ├── product-form.tsx      # Formulário criar/editar
│   │   │   └── stock-movement-form.tsx
│   │   └── settings/
│   │       ├── reason-form.tsx
│   │       └── settings-card.tsx
│   │
│   ├── lib/
│   │   ├── db.ts                     # Drizzle client (singleton)
│   │   ├── tenant.ts                 # getOrCreateTenant()
│   │   ├── migrate.ts                # Script de migration
│   │   └── utils.ts                  # cn() helper (clsx + tailwind-merge)
│   │
│   └── hooks/
│       └── use-mobile.ts             # Hook para detecção de mobile
│
├── drizzle/                          # Migrations geradas automaticamente
├── drizzle.config.ts                 # Configuração Drizzle Kit
├── next.config.ts                    # Configuração Next.js
├── postcss.config.mjs                # PostCSS + Tailwind v4
├── tsconfig.json
└── package.json
```

---

## Como Rodar Localmente

### Pré-requisitos

- **Node.js** >= 20
- **npm** >= 9
- Acesso a um banco **PostgreSQL** (recomenda-se [Neon](https://neon.tech) — free tier disponível)

### Passo a passo

**1. Clone o repositório**

```bash
git clone https://github.com/seu-usuario/dynamic-saas.git
cd dynamic-saas
```

**2. Instale as dependências**

```bash
npm install
```

**3. Configure as variáveis de ambiente**

Crie um arquivo `.env.local` na raiz do projeto:

```env
DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=require
```

> **Neon (recomendado):** Crie um projeto gratuito em [neon.tech](https://neon.tech), copie a connection string no modo **pooler** (recomendado para serverless) e cole acima.

**4. Execute as migrations**

```bash
npx tsx src/lib/migrate.ts
```

Isso criará todas as tabelas no banco de dados.

**5. Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

**6. Acesse no navegador**

```
http://localhost:3000
```

O sistema redirecionará automaticamente para `/dashboard` e criará um tenant padrão ("Minha Empresa") no primeiro acesso — nenhuma configuração adicional necessária.

### Dados de Demonstração

Para explorar o sistema com dados reais:

1. Acesse `/dashboard/settings` e cadastre motivos de movimentação:
   - **Entrada**: "Compra", "Devolução de Cliente"
   - **Saída**: "Venda", "Perda", "Ajuste"

2. Acesse `/dashboard/inventory` e cadastre produtos com estoque inicial

3. Registre movimentações de estoque nos produtos cadastrados

4. Volte ao `/dashboard` para ver as métricas e o gráfico atualizados

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | String de conexão PostgreSQL (formato: `postgresql://user:pass@host/db`) |

---

## Scripts Disponíveis

```bash
npm run dev      # Servidor de desenvolvimento com hot-reload (localhost:3000)
npm run build    # Build de produção otimizado
npm start        # Inicia servidor de produção (requer build antes)
npm run lint     # Executa ESLint no código
```

**Scripts adicionais:**

```bash
# Gerar novas migrations a partir do schema
npx drizzle-kit generate

# Executar migrations
npx tsx src/lib/migrate.ts

# Abrir Drizzle Studio (GUI para o banco)
npx drizzle-kit studio
```

---

## Decisões Técnicas

### Por que Next.js App Router com Server Actions?
Elimina a necessidade de uma API REST separada para operações de dados. Server Actions executam no servidor, têm acesso direto ao banco, e são chamadas de componentes React como funções normais — reduzindo boilerplate e mantendo o código co-localizado com a UI.

### Por que Drizzle ORM?
Drizzle oferece type-safety completa end-to-end: o schema TypeScript define as tabelas e as queries retornam tipos inferidos automaticamente. Comparado ao Prisma, tem zero overhead de runtime e o schema é SQL-like, tornando as queries fáceis de auditar.

### Por que valores monetários em centavos (INT)?
`DECIMAL` e `FLOAT` têm problemas de arredondamento em ponto flutuante que são críticos em cálculos financeiros. Armazenar em centavos como inteiros é a prática padrão em sistemas de pagamento — a conversão para reais ocorre apenas na camada de apresentação.

### Por que JSONB `metadata` nos produtos?
Permite que cada tenant adicione campos customizados (ex: "cor", "fornecedor", "código interno") sem alterar o schema. É uma abordagem pragmática para um SaaS onde diferentes empresas têm necessidades diferentes.

### Por que snapshots em `orderItems` e `invoiceItems`?
Produtos podem ter preços e nomes alterados ao longo do tempo. Copiar `productName` e `productSku` no momento da venda/emissão garante integridade histórica — o pedido de 2 anos atrás continua mostrando os dados corretos mesmo que o produto tenha sido atualizado.

### Por que multi-tenancy por `tenantId` em vez de schemas separados por tenant?
Schema-per-tenant oferece maior isolamento mas maior complexidade operacional (migrations em N schemas, connection pooling por schema). `tenantId` como coluna é mais simples de manter, funciona bem até milhares de tenants, e é suficiente para a maioria dos casos de SaaS B2B.

---

## Roadmap

- [ ] Autenticação com Clerk ou NextAuth, vinculação tenant-usuário
- [ ] Módulo Financeiro: contas a pagar/receber, fluxo de caixa
- [ ] UI de Pedidos de Venda: listagem, criação e gestão
- [ ] UI de NF-e: emissão e consulta de notas fiscais
- [ ] Integração SEFAZ: envio e recepção automática de NF-e
- [ ] Exportação: PDF de pedidos e notas, CSV de inventário
- [ ] Alertas de estoque mínimo
- [ ] API REST pública para integrações com ERP/WMS externos
- [ ] Testes automatizados com Vitest e Playwright

---

## Licença

MIT
