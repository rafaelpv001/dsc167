# Rifa Solidária — Sistema de Rifas Online

Sistema web completo de rifas online: venda de números, reserva com concorrência segura, pagamento
via PIX (PagBank), confirmação automática por webhook, sorteio auditável com fonte criptográfica de
aleatoriedade, painel administrativo e relatórios.

Tema visual padrão: identidade "Rifa Solidária" (A·R·L·M· Domingos da Silva Cunha Nº 167) — dourado
e azul nobre, fontes Cinzel/Montserrat. O sistema é genérico/whitelabel; a paleta é configurável em
`frontend/tailwind.config.ts`.

## Arquitetura

Monorepo com npm workspaces:

```
RIFA/
├── backend/    NestJS + TypeScript + Prisma ORM + PostgreSQL
├── frontend/   Next.js (App Router) + React + TypeScript + Tailwind CSS
└── docker-compose.yml   postgres + backend + frontend
```

### Backend (`backend/src/modules`)

| Módulo | Responsabilidade |
|---|---|
| `auth` | Login (JWT em cookie HTTPOnly), guards, rate limiting |
| `raffles` | CRUD de rifas, geração de números, máquina de estados (DRAFT→ACTIVE→PAUSED→CLOSED) |
| `raffle-numbers` | Listagem pública paginada/filtrada da grade de números |
| `customers` | Cadastro mínimo de participantes (nome + telefone) |
| `orders` | Reserva atômica de números, geração de código, expiração automática (cron) |
| `payments` | Abstração `PaymentProvider` + implementação PagBank (PIX), webhook idempotente, reconciliação |
| `draws` | Sorteio (pool somente PAID, `crypto.randomInt`, snapshot com hash SHA-256, imutável) |
| `reports` | Dashboard administrativo e exportação CSV |
| `realtime` | Server-Sent Events (grade de números, pagamento, resultado do sorteio) |
| `audit` | Log de auditoria centralizado |

### Frontend (`frontend/app`)

- `/` — lista de rifas ativas
- `/rifa/[slug]` — página pública: grade de números, seleção, identificação do participante
- `/pedido/[token]` — pagamento PIX (QR Code, copia-e-cola, contador, realtime)
- `/admin/login`, `/admin/dashboard`, `/admin/raffles`, `/admin/raffles/[id]` (com sorteio), `/admin/orders`

## Decisões técnicas principais

### Dinheiro
Todo valor é `Int` em centavos no Prisma — nunca `float`/`Decimal` ambíguo.

### Concorrência na reserva de números
`OrdersService.create` usa um **update condicional** dentro de uma transação Prisma:

```ts
tx.raffleNumber.updateMany({
  where: { raffleId, number: { in: numbers }, status: 'AVAILABLE' },
  data: { status: 'RESERVED' },
});
```

Sob Postgres READ COMMITTED, duas transações concorrentes tentando atualizar o mesmo número: a
segunda bloqueia até a primeira commitar, então reavalia o `WHERE` e não encontra mais a linha
`AVAILABLE` — não pode reservar duas vezes. Se `count !== numbers.length`, toda a operação é
revertida (`NUMBER_UNAVAILABLE`) — nunca reserva parcialmente.

### Expiração vs. pagamento (race condition)
`OrdersExpirationJob` e `PaymentsService.confirmPayment` usam a mesma técnica: `updateMany` com
`where: { status: 'PENDING_PAYMENT' }` (ou `PENDING`) como guarda condicional. Se um pagamento for
confirmado exatamente quando o job de expiração roda, o `updateMany` do job simplesmente não afeta
nenhuma linha — `PAID` nunca vira `EXPIRED`.

### PagBank / gateway de pagamento
Abstração `PaymentProvider` (`backend/src/modules/payments/providers/payment-provider.interface.ts`)
desacopla `Order`/`Payment` do gateway concreto. `PagBankProvider` implementa PIX dinâmico via API
PagBank (sandbox/produção controlados só por env, sem mudança de código). Retries com backoff
exponencial apenas para falhas transitórias (429/5xx/timeout); se a criação da cobrança falhar
definitivamente, o pedido é cancelado e os números liberados automaticamente
(`payment.creation_failed` auditado) — números nunca ficam presos.

### Webhook — idempotência e integridade
`PaymentsService.processWebhook`:
1. Valida token/assinatura (`PaymentProvider.validateWebhook`).
2. Idempotência via `@@unique([provider, providerEventId])` em `PaymentWebhookEvent` — reentregas do
   mesmo evento são detectadas e ignoradas sem reprocessar.
3. Compara valor recebido com `Payment.amountCents`; divergência não confirma automaticamente
   (`payment.amount_mismatch` auditado, fica para análise administrativa).
4. Confirmação passa por `confirmPayment`, o único ponto de escrita que move
   `Payment PENDING→PAID` + `Order PENDING_PAYMENT→PAID` + `RaffleNumber RESERVED→PAID` numa
   transação, sempre com guarda condicional de status.

Reconciliação (`PaymentsReconciliationJob`, a cada 5 min) é rede de segurança para quando o webhook
não chega — consulta o PagBank para pagamentos `PENDING` ainda não expirados. O webhook continua
sendo o mecanismo principal.

### Sorteio
`DrawsService.execute`: só roda com `Raffle.status === CLOSED`; pool é **exclusivamente**
`RaffleNumber.status === 'PAID'` (números `AVAILABLE`/`RESERVED` nunca entram, e números de pedidos
`EXPIRED`/`REJECTED`/`CANCELLED` já voltaram a `AVAILABLE`, ficando fora automaticamente). Vencedor
escolhido com `node:crypto.randomInt` (nunca `Math.random`), com hash SHA-256 do pool ordenado
(`verificationHash`) para auditoria. `RaffleDraw.raffleId` é `@@unique` — um segundo sorteio para a
mesma rifa colide (`RAFFLE_ALREADY_DRAWN`); toda a operação roda em transação `Serializable`.
Resultado é imutável pela interface normal (sem endpoints de edição/exclusão).

### Segurança
bcrypt (via `bcryptjs`, implementação pura em JavaScript — sem binário nativo, evita crashes de
compatibilidade em ambientes serverless como o Vercel) para senha de admin; JWT em cookie
HTTPOnly/Secure(prod)/SameSite=Lax; Helmet; CORS restrito a
`APP_URL`; rate limiting global (`@nestjs/throttler`) + limites mais agressivos em login/reservas/
webhook; validação server-side via `class-validator` com `whitelist`+`forbidNonWhitelisted`; nenhuma
credencial PagBank é enviada ao navegador; erros de domínio padronizados (`{ success, code, message }`)
sem stack trace exposto.

## Ambiente de demonstração/teste

Modo especial para você testar o fluxo completo sem depender do PagBank real:

- Login administrativo fixo: **usuário `teste`, senha `teste`**.
- Já vem com a rifa **"Rifa Solidária de Teste"** publicada (ACTIVE), 400 números, R$ 10,00 cada.
- Qualquer reserva feita na página pública é **confirmada como paga automaticamente** poucos segundos
  depois (simula o cliente pagando o PIX) — não chama a API do PagBank.
- Todo pedido/pagamento/cliente criado é **apagado definitivamente após 60 minutos**, sem deixar
  histórico (job roda a cada minuto). A rifa e os 400 números continuam existindo — só os dados
  "preenchidos" pelo uso são limpos.

Para ativar, no `backend/.env`:

```
DEMO_MODE=true
DEMO_ADMIN_EMAIL=teste
DEMO_ADMIN_PASSWORD=teste
DEMO_RAFFLE_SLUG=rifa-solidaria-de-teste
DEMO_AUTOCONFIRM_DELAY_MS=4000
DEMO_RETENTION_MINUTES=60
JWT_SECRET=qualquer-valor-forte-aqui
SESSION_SECRET=qualquer-outro-valor-forte
```

Depois rode `npx prisma db seed` (cria o admin `teste`/`teste` e a rifa de teste automaticamente — é
idempotente, pode rodar de novo sem duplicar). Suba o backend e o frontend normalmente (seção abaixo)
e acesse:

- Site público: http://localhost:3000 → clique na "Rifa Solidária de Teste"
- Painel admin: http://localhost:3000/admin/login → `teste` / `teste`

> **Importante**: `DEMO_MODE=true` desativa a integração real com o PagBank (usa um provider simulado)
> e liga a limpeza automática de dados. Nunca habilite em produção real — é só para você testar o
> sistema ponta a ponta localmente.

## Como rodar (desenvolvimento)

Pré-requisitos: Node.js 20+, npm, Docker (para o PostgreSQL).

```powershell
npm install
Copy-Item .env.example backend\.env
# edite backend\.env com valores locais (gere SESSION_SECRET/JWT_SECRET fortes)

docker compose up -d postgres

cd backend
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed     # cria o admin a partir de ADMIN_EMAIL/ADMIN_PASSWORD do .env
cd ..

npm run dev:backend    # terminal 1 — http://localhost:3001 (Swagger em /api/docs)
npm run dev:frontend   # terminal 2 — http://localhost:3000
```

## Como rodar com Docker

```powershell
docker compose up -d
```

Sobe `postgres` + `backend` + `frontend`. Rode as migrations/seed manualmente na primeira vez
(`docker compose exec backend npx prisma migrate deploy` e `... prisma db seed`).

## Testar PagBank Sandbox

1. `PAGBANK_ENVIRONMENT=sandbox`, `PAGBANK_TOKEN` e `PAGBANK_API_URL` apontando para o sandbox oficial
   da PagBank (ver documentação PagBank para obter credenciais de teste).
2. `PAGBANK_WEBHOOK_URL` precisa ser publicamente acessível para o sandbox notificar (use um túnel
   tipo ngrok em desenvolvimento local).
3. Crie uma rifa, publique, reserve números na página pública — o backend cria a cobrança PIX real no
   sandbox.
4. Pague com as credenciais de teste do sandbox PagBank; o webhook confirma automaticamente.
5. Sem sandbox configurado, `createPixForOrder` falhará de propósito (`PAGBANK_TOKEN` ausente) e o
   pedido é cancelado com números liberados — comportamento esperado e testado.

O ajuste fino de `validateWebhook` (assinatura exata do PagBank) e dos campos completos da API
(Orders/Charges) deve ser conferido contra a documentação oficial ao configurar credenciais reais —
a implementação atual cobre o essencial (criação de PIX, consulta de status, cancelamento, validação
por token compartilhado) de forma testável e substituível.

## Configurar produção

- `NODE_ENV=production`, `PAGBANK_ENVIRONMENT=production` — nenhuma mudança de código.
- Gere `SESSION_SECRET`/`JWT_SECRET` fortes e únicos.
- Sirva atrás de HTTPS (cookies `secure` só ativam em produção).
- Ajuste `APP_URL`/CORS para o domínio real.

## Deploy no Vercel

O Vercel é serverless — não existe um processo Node que fica sempre no ar.
Isso afeta três coisas do backend, já adaptadas no código:

| Recurso | Desenvolvimento / hospedagem tradicional | Vercel (serverless) |
|---|---|---|
| Cron (expiração, limpeza demo, reconciliação) | `@nestjs/schedule` (`@Cron`) | Um scheduler externo chamando `/api/internal/cron/*` a cada poucos minutos (ver seção abaixo) — o [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) nativo só roda 1x/dia no plano Hobby, cedo demais para expiração de reserva |
| Upload de imagem da rifa | disco local (`backend/uploads`) | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) — ativado automaticamente quando `BLOB_READ_WRITE_TOKEN` está definido |
| Tempo real (SSE) | conexão persistente funciona normalmente | **limitado** — funções serverless têm duração máxima e a conexão do `EventSource` pode cair; o cliente reconecta, mas não é garantido em produção. Se isso importar, considere polling no frontend ou mover só o backend para um host com processo persistente (Railway, Render, VPS) |

O projeto são **dois deploys separados no Vercel** (frontend Next.js e
backend NestJS), cada um como um "Project" apontando para uma subpasta deste
monorepo:

### 1. Backend (`backend/`)

1. No Vercel, **Add New → Project** → importe este repositório → em
   "Root Directory" selecione `backend`
2. Framework Preset: **Other** (o `backend/vercel.json` já configura tudo)
3. Configure as variáveis de ambiente do projeto (Settings → Environment
   Variables) — os mesmos nomes do `.env.example`, com destaque para:
   - `DATABASE_URL` — a connection string do Postgres (ex.: Prisma Postgres/Vercel Postgres)
   - `JWT_SECRET`, `SESSION_SECRET` — valores fortes, gerados só para produção
   - `APP_URL` — a URL do deploy do **frontend** (para CORS)
   - `CRON_SECRET` — qualquer valor aleatório forte; usado para autenticar as chamadas do scheduler externo aos endpoints `/api/internal/cron/*` (ver "Agendando as tarefas periódicas" abaixo)
   - `BLOB_READ_WRITE_TOKEN` — crie um Blob Store em Storage → Blob e copie o token; sem isso, o upload de imagem falha em produção (o disco local não é gravável/persistente no Vercel)
   - `DEMO_MODE=false` em produção real
4. Antes do primeiro deploy funcionar de ponta a ponta, rode as migrations
   contra o banco de produção a partir da sua máquina:
   ```powershell
   cd backend
   $env:DATABASE_URL="<a mesma URL configurada no Vercel>"
   npx prisma migrate deploy
   npx prisma db seed
   ```
5. Deploy. O backend fica em algo como `https://<projeto>.vercel.app`; teste
   `GET /api/raffles` para confirmar que subiu.

### Agendando as tarefas periódicas (expiração, limpeza demo, reconciliação)

O plano Hobby do Vercel limita Cron Jobs nativos a 1 execução por dia — inútil
para expirar reservas de 30-60 minutos. Em vez disso, use um scheduler
externo gratuito para chamar os três endpoints a cada poucos minutos:

| Endpoint | Frequência sugerida |
|---|---|
| `GET /api/internal/cron/expire-orders` | a cada 5 minutos |
| `GET /api/internal/cron/cleanup-demo` | a cada 5 minutos (só importa com `DEMO_MODE=true`) |
| `GET /api/internal/cron/reconcile-payments` | a cada 10 minutos |

Todos exigem o header `Authorization: Bearer <CRON_SECRET>` (o mesmo valor
configurado na env var do backend). Opções gratuitas:

- **[cron-job.org](https://cron-job.org)** — permite intervalo de 1 minuto no
  plano grátis; em cada job, adicione um "Custom Header" com
  `Authorization: Bearer <CRON_SECRET>` e aponte para a URL completa do
  endpoint (`https://<projeto>.vercel.app/api/internal/cron/expire-orders`).
- **GitHub Actions agendado** (`schedule: cron`) no próprio repositório,
  rodando um `curl` com o header — útil se preferir manter tudo no GitHub.
- Se migrar para o **plano Pro do Vercel**, pode voltar a usar Vercel Cron
  nativo — adicione de volta um bloco `"crons"` em `backend/vercel.json`
  apontando para os mesmos três endpoints (havia um exemplo assim antes
  deste commit; veja `git log -p backend/vercel.json`).

### 2. Frontend (`frontend/`)

1. **Add New → Project** novamente → mesmo repositório → "Root Directory" = `frontend`
2. Framework Preset: **Next.js** (detectado automaticamente)
3. Variável de ambiente: `NEXT_PUBLIC_API_URL` = URL do backend implantado no passo anterior
4. Deploy.

Depois dos dois deploys, volte no projeto do **backend** e confirme que
`APP_URL` aponta para a URL final do frontend (necessário para o CORS
liberar as requisições do navegador).

## Testes

```powershell
cd backend
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Resultado atual: **17/17 testes passando**, lint e typecheck limpos (backend e frontend), build de
produção OK em ambos. Testes cobrem: geração de números (bate com os exemplos do domínio: 100
números → `000`..`099`, 1000 números → `0000`..`0999`), slugify, guarda condicional de reserva
(rejeita a operação inteira se qualquer número deixou de estar `AVAILABLE`), regras do sorteio
(bloqueio fora de `CLOSED`, sorteio duplicado, pool vazio, vencedor sempre dentro do pool `PAID`), e
idempotência/validação do webhook (token inválido, evento duplicado, divergência de valor, nunca
reverte `PAID`).

## Pendências / próximos passos

Testes de integração/E2E contra um Postgres real (concorrência de fato entre duas conexões
simultâneas, ciclo completo reserva→PIX→webhook→sorteio) **não foram executados neste ambiente por
falta de Docker disponível** — a lógica foi validada via testes unitários com Prisma mockado, que
cobrem as mesmas guardas condicionais que tornam a versão real segura. Ao rodar localmente com Docker:

```powershell
docker compose up -d postgres
cd backend && npx prisma migrate dev --name init && npx prisma db seed
npm run start:dev
```

e então validar manualmente o fluxo do critério de aceite (seção "Fluxo da rifa" do plano original):
criar rifa de 100 números, reservar 3, pagar via sandbox, confirmar atualização automática, encerrar
e sortear.

Não implementados nesta fase (fora do escopo de V1 conforme o plano): CRUD de múltiplos
administradores/RBAC, integração oficial da API do WhatsApp (o botão `wa.me` com texto pré-preenchido
já está pronto), múltiplos gateways de pagamento (a abstração já permite adicionar sem tocar em
Order/Payment), cupons/afiliados/analytics.

## Variáveis de ambiente

Ver `.env.example` na raiz. Nunca versionar arquivos `.env` reais.
