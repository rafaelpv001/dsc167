/**
 * Endpoint de diagnóstico isolado — SEM Nest, SEM Prisma, SEM nenhuma
 * dependência do projeto. Se isto também der FUNCTION_INVOCATION_FAILED,
 * o problema é na configuração do projeto Vercel (Root Directory, install,
 * runtime), não no nosso código de aplicação. Se isto funcionar mas
 * /api (Nest) continuar quebrando, o problema está confirmado como sendo
 * em algo específico do bootstrap da aplicação (import de módulo, Prisma
 * Client, etc.) — ver backend/api/index.ts.
 */
export default function handler(req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  res.status(200).json({
    ok: true,
    node: process.version,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasJwtSecret: Boolean(process.env.JWT_SECRET),
    cwd: process.cwd(),
  });
}
