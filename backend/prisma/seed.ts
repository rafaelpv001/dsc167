import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { generateRaffleNumberValues } from '../src/common/utils/generate-raffle-numbers.util';

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Administrador';

  if (!email || !password) {
    console.warn(
      '[seed] ADMIN_EMAIL/ADMIN_PASSWORD não definidos no .env — nenhum administrador padrão foi criado.',
    );
    return;
  }

  const passwordHash = await argon2.hash(password);
  const admin = await prisma.adminUser.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: { name, email: email.toLowerCase(), passwordHash, active: true },
  });

  console.log(`[seed] Administrador pronto: ${admin.email}`);
}

/**
 * Ambiente de demonstração: cria o admin teste/teste e a rifa pré-populada
 * "Rifa Solidária de Teste" (400 números, ACTIVE). Só roda quando
 * DEMO_MODE=true — nunca em produção real. Idempotente (upsert/skip se já existir).
 */
async function seedDemo() {
  if (process.env.DEMO_MODE !== 'true') return;

  const demoEmail = (process.env.DEMO_ADMIN_EMAIL ?? 'teste').toLowerCase();
  const demoPassword = process.env.DEMO_ADMIN_PASSWORD ?? 'teste';
  const demoSlug = process.env.DEMO_RAFFLE_SLUG ?? 'rifa-solidaria-de-teste';

  const passwordHash = await argon2.hash(demoPassword);
  const demoAdmin = await prisma.adminUser.upsert({
    where: { email: demoEmail },
    update: { passwordHash, active: true },
    create: { name: 'Administrador de Teste', email: demoEmail, passwordHash, active: true },
  });
  console.log(`[seed:demo] Admin de demonstração pronto: login "${demoEmail}" / senha "${demoPassword}"`);

  const existing = await prisma.raffle.findUnique({ where: { slug: demoSlug } });
  if (existing) {
    console.log(`[seed:demo] Rifa de demonstração já existe (slug=${demoSlug}), seed pulado.`);
    return;
  }

  const totalNumbers = 400;
  const numberValues = generateRaffleNumberValues(totalNumbers, 0);

  await prisma.$transaction(async (tx) => {
    const raffle = await tx.raffle.create({
      data: {
        title: 'Rifa Solidária de Teste',
        slug: demoSlug,
        description:
          'Ambiente de demonstração do sistema. Todo número reservado é confirmado como pago automaticamente para simular o fluxo real de pagamento PIX.',
        totalNumbers,
        startNumber: 0,
        unitPriceCents: 1000, // R$ 10,00
        reservationMinutes: 60,
        status: 'ACTIVE',
      },
    });

    await tx.raffleNumber.createMany({
      data: numberValues.map((number) => ({ raffleId: raffle.id, number })),
    });

    await tx.auditLog.create({
      data: {
        adminUserId: demoAdmin.id,
        action: 'demo.seeded',
        entity: 'Raffle',
        entityId: raffle.id,
        metadata: { totalNumbers },
      },
    });
  });

  console.log(`[seed:demo] Rifa "Rifa Solidária de Teste" criada com ${totalNumbers} números (ACTIVE).`);
}

async function main() {
  await seedAdmin();
  await seedDemo();
}

main()
  .catch((error) => {
    console.error('[seed] Falha ao executar seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
