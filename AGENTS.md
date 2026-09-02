 # CRM - instruções do projeto

Este é o único `AGENTS.md` do repositório e aplica-se à raiz e a todos os subdiretórios. Não criar outros sem solicitação explícita.

O projeto não usa `plans/`, PRDs, manifestos, planos atômicos ou skills de iniciativa. Não criar nem depender desses artefatos.

## 1. Autonomia, escopo e multiagentes

- Pedidos de analisar, revisar, diagnosticar, explicar, planejar ou informar status autorizam somente leitura e apresentação do resultado.
- Pedidos explícitos de implementar, corrigir, adicionar, criar, remover, atualizar ou refatorar autorizam as alterações locais necessárias no escopo solicitado, sem segunda confirmação.
- Antes da primeira edição, inspecionar os arquivos envolvidos, uma implementação análoga, testes e configurações relevantes; informar brevemente objetivo, arquivos principais, validações e impacto em banco. Essa atualização não é um gate.
- Fazer apenas suposições reversíveis que não alterem regra de negócio, segurança, contrato público ou persistência, registrando as materiais na entrega.
- Pedir direcionamento somente diante de ambiguidade funcional ou expansão material não prevista, como outro módulo, novo comportamento, API pública, autorização, esquema/dados, dependência de produção, integração externa ou refatoração não relacionada.
- Criar migrations, scripts e testes previstos no escopo é autorizado; aplicá-los em bancos ou ambientes requer autorização específica.
- Não inferir autorização para commit, push, PR, publicação, deploy ou alteração externa. Operações amplas, ambíguas ou difíceis de recuperar exigem confirmação.
- Não executar `git reset --hard`, `git clean`, descarte de alterações, force-push ou exclusão recursiva sem solicitação explícita, inspeção do estado e confirmação do alvo resolvido dentro do workspace.
- Trabalhar uma feature por vez, preservar alterações do usuário e evitar refatorações, mudanças cosméticas ou comportamentais fora do escopo.
- Usar subagentes somente quando houver frentes independentes e ganho líquido. Evitar delegação em tarefas pequenas ou sequenciais.
- Em trabalho paralelo, definir responsabilidade e conclusão claras; escrita exige ownership disjunto e um único agente por arquivo. O agente principal integra e valida o resultado.

## 2. Entity Framework Core e banco de dados

- Identificar o `DbContext`, schema, tabelas e mecanismo de implantação proprietários antes de alterar persistência.
- Quando o contexto usa EF Core migrations, a migration é canônica; manter entidade, mapping, configuração, migration, snapshot e identificador consistentes.
- Para DDL, seed, backfill, correção ou transformação de implantação em QA/produção, criar ou atualizar o script T-SQL idempotente em `database/scripts`.
- Quando migration e script coexistirem, o rollout deve refletir a migration e registrar o mesmo `MigrationId` no histórico correto quando substituir sua aplicação pelo EF.
- Em área legada sem migrations como mecanismo de implantação, usar somente o script T-SQL; DML normal da aplicação não exige script.
- Scripts devem validar objetos e dados, usar transação e `XACT_ABORT` quando aplicáveis, falhar com segurança e permitir reexecução sem corrupção.
- Não executar `dotnet ef`, aplicar migrations, executar SQL ou acessar bancos compartilhados automaticamente. Quando a geração depender de `dotnet ef migrations add`, fornecer o comando PowerShell ao usuário e revisar os artefatos gerados; não editar migration ou snapshot manualmente apenas para contornar essa restrição.

## 3. Interface, responsividade e acessibilidade

Para telas criadas ou alteradas:

- Reutilizar layouts, partials, componentes, estilos e breakpoints Bootstrap existentes; evitar scripts inline e preservar a CSP.
- Funcionar em desktop, tablet e smartphone sem overflow horizontal indevido, sobreposição ou conteúdo cortado.
- Adaptar formulários, tabelas, botões, menus e espaçamentos, preservando eficiência no desktop e usabilidade por toque.
- Manter labels, validações, semântica, contraste, foco visível e navegação por teclado adequados.
- No desktop, usar a área útil e alinhar o breadcrumb à direita conforme o padrão da área.
- Validar os breakpoints afetados; sem padrão específico, considerar 360 px, 768 px e 1280 px. Se não houver validação visual, fornecer passos manuais objetivos.

## 4. Segurança obrigatória

- Aplicar os controles relevantes à superfície alterada, considerando OWASP Top 10 e práticas corporativas.
- Exigir autenticação e autorização adequadas, especialmente em operações privilegiadas.
- Validar no servidor; preservar antiforgery/CSRF em mudanças de estado, encoding contra XSS e sanitização apenas quando necessária.
- Prevenir SQL Injection com EF Core, consultas parametrizadas e APIs seguras.
- Minimizar dados pessoais ou sensíveis e nunca expô-los em código, patches, comandos, logs, ferramentas ou entrega.
- Não versionar segredos, tokens ou credenciais; usar placeholders, variáveis de ambiente ou user-secrets.
- Tratar exceções com segurança, apresentar mensagens adequadas e manter detalhes técnicos em logs estruturados internos sem dados sensíveis.
- Não desabilitar autenticação, autorização, antiforgery, validação, encoding, CSP, TLS ou outras proteções sem justificativa, análise de risco e aprovação explícita.

## 5. Testes e validação

- Criar ou ajustar testes proporcionais ao risco e aos critérios de aceite, regras, permissões, validações, erros e idempotência. Não enfraquecer, ignorar ou remover testes para obter sucesso.
- Antes de executar projeto desconhecido, inspecionar `.csproj`, `Directory.Build.*`, fixtures e configurações em busca de efeitos colaterais.
- Sem autorização específica, os únicos comandos .NET permitidos são `dotnet --info`, `dotnet --list-sdks`, `dotnet build <projeto>.csproj --no-restore` e `dotnet test <projeto-de-teste>.csproj --no-restore`. Usar filtro obrigatório quando o projeto misturar testes isolados e integrações ou quando houver dúvida.
- Executar somente testes com mocks, fakes, banco em memória ou recurso local descartável. Loopback, fixtures versionadas e diretórios temporários locais são permitidos; banco, rede, filas, e-mail, arquivos ou serviços compartilhados/externos não são.
- Preferir projetos diretamente afetados; validar a solução inteira somente para mudanças transversais ou dependências relevantes.
- Qualquer outro subcomando `dotnet` é proibido sem autorização, incluindo `restore`, `run`, `watch`, `publish`, `pack`, `msbuild`, `new`, `format`, `clean`, `add/remove`, `nuget`, instalação de tools/workloads e `ef`.
- Se a validação exigir restore, credenciais, rede ou infraestrutura real, fornecer o comando PowerShell ou solicitar autorização. Não declarar sucesso sem evidência.
- Fazer verificações estáticas proporcionais ao risco. Preservar encoding e terminações de linha; confirmar os bytes antes de tratar mojibake exibido pelo terminal.

## 6. Entrega final

Informar somente os itens aplicáveis:

- resultado e arquivos alterados;
- atendimento ao escopo e decisões técnicas, visuais ou de segurança materiais;
- migrations, scripts e testes criados ou ajustados;
- validações executadas e resultados;
- pendências, comandos PowerShell, riscos, limitações e suposições relevantes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
