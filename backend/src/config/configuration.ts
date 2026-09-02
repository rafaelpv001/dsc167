export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  appUrl: process.env.APP_URL,
  database: {
    url: process.env.DATABASE_URL,
  },
  session: {
    secret: process.env.SESSION_SECRET,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  admin: {
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  pagbank: {
    environment: process.env.PAGBANK_ENVIRONMENT ?? 'sandbox',
    token: process.env.PAGBANK_TOKEN,
    apiUrl: process.env.PAGBANK_API_URL,
    webhookUrl: process.env.PAGBANK_WEBHOOK_URL,
  },
  // Segredo usado pelos endpoints /api/internal/cron/* — em produção no Vercel,
  // a própria plataforma envia este valor como "Authorization: Bearer <CRON_SECRET>"
  // automaticamente quando a env var CRON_SECRET está definida no projeto.
  cronSecret: process.env.CRON_SECRET,
  storage: {
    blobToken: process.env.BLOB_READ_WRITE_TOKEN,
  },
  demo: {
    enabled: process.env.DEMO_MODE === 'true',
    adminEmail: process.env.DEMO_ADMIN_EMAIL ?? 'teste',
    adminPassword: process.env.DEMO_ADMIN_PASSWORD ?? 'teste',
    raffleSlug: process.env.DEMO_RAFFLE_SLUG ?? 'rifa-solidaria-de-teste',
    autoConfirmDelayMs: process.env.DEMO_AUTOCONFIRM_DELAY_MS
      ? parseInt(process.env.DEMO_AUTOCONFIRM_DELAY_MS, 10)
      : 4000,
    retentionMinutes: process.env.DEMO_RETENTION_MINUTES
      ? parseInt(process.env.DEMO_RETENTION_MINUTES, 10)
      : 60,
  },
});
