# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

**Proyecto**: turnos-odontologia (TypeScript + Node 24 + Fastify + SQLite node:sqlite + Vitest; solo API, sin UI en v1).
**Relevantes para este proyecto**: fastify-best-practices, vitest, tdd, openspec-apply-change, openspec-propose, openspec-explore, openspec-update-change, openspec-sync-specs, openspec-archive-change. El resto es de flujo de fundación o de dominios que no aplican (React/Vercel/UI).

## User Skills

Rutas: `G` = `C:/Users/nazar/.claude/skills`, `P` = `C:/Users/nazar/Desktop/Global Desarrollo/turnos-odontologia/.claude/skills`.

| Trigger | Skill | Path |
|---------|-------|------|
| Fastify, Node.js server, REST API, API routes, server.ts, app.ts (RELEVANTE) | fastify-best-practices | G/fastify-best-practices/SKILL.md |
| Escribir tests, mocking, coverage, filtros, fixtures (RELEVANTE) | vitest | G/vitest/SKILL.md |
| Construir features o arreglar bugs test-first, red-green-refactor (RELEVANTE) | tdd | G/tdd/SKILL.md |
| openspec apply / implementar tareas de un change (RELEVANTE) | openspec-apply-change | P/openspec-apply-change/SKILL.md |
| Proponer un change con todos los artefactos (RELEVANTE) | openspec-propose | P/openspec-propose/SKILL.md |
| Explorar ideas/requisitos antes o durante un change (RELEVANTE) | openspec-explore | P/openspec-explore/SKILL.md |
| Revisar artefactos de planificación de un change (RELEVANTE) | openspec-update-change | P/openspec-update-change/SKILL.md |
| Sincronizar delta specs a main specs (RELEVANTE) | openspec-sync-specs | P/openspec-sync-specs/SKILL.md |
| Archivar un change terminado (RELEVANTE) | openspec-archive-change | P/openspec-archive-change/SKILL.md |
| Flujo de fundación: init, kb, design, rules, discovery | active-orchestrator | G/active-orchestrator/SKILL.md |
| Generar AGENTS.md / CLAUDE.md del proyecto | agent-instruction | G/agent-instruction/SKILL.md |
| Política de design system / mockups | design-system | G/design-system/SKILL.md |
| Fase Discovery antes de la KB | discovery-research | G/discovery-research/SKILL.md |
| Crear/generar knowledge base | kb-creator | G/kb-creator/SKILL.md |
| Generar CHANGES.md / roadmap | roadmap-generator | G/roadmap-generator/SKILL.md |
| Descubrir/instalar skills | find-skills | G/find-skills/SKILL.md |
| Investigar competidores desde una URL | web-scraper | G/web-scraper/SKILL.md |
| Crear/mejorar skills | skill-creator | G/skill-creator/SKILL.md |
| Revisar prosa/docs contra guía de escritura | writing-guidelines | G/writing-guidelines/SKILL.md |
| Revisar UI / accesibilidad (no aplica: sin UI en v1) | web-design-guidelines | G/web-design-guidelines/SKILL.md |
| Pulido de UI/animaciones (no aplica) | emil-design-eng | G/emil-design-eng/SKILL.md |
| Diseño frontend v1 (no aplica) | design-taste-frontend-v1 | G/design-taste-frontend-v1/SKILL.md |
| Deploy a Vercel (no aplica) | deploy-to-vercel | G/deploy-to-vercel/SKILL.md |
| Vercel CLI con tokens (no aplica) | vercel-cli-with-tokens | G/vercel-cli-with-tokens/SKILL.md |
| Optimización costo/performance Vercel (no aplica) | vercel-optimize | G/vercel-optimize/SKILL.md |
| Patrones de composición React (no aplica) | vercel-composition-patterns | G/vercel-composition-patterns/SKILL.md |
| Performance React/Next.js (no aplica) | vercel-react-best-practices | G/vercel-react-best-practices/SKILL.md |
| React Native/Expo (no aplica) | vercel-react-native-skills | G/vercel-react-native-skills/SKILL.md |
| React View Transitions (no aplica) | vercel-react-view-transitions | G/vercel-react-view-transitions/SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### fastify-best-practices
- Schema-first: define JSON Schema para body/params/querystring/response en cada ruta; el schema de response serializa rápido y evita filtrar campos.
- Encapsulación por plugins: registra rutas/servicios con `app.register`; usa `fastify-plugin` solo para compartir decorators; decora con `app.decorate` y tipa las extensiones.
- Handlers y hooks son async/await; no mezcles callbacks con promesas ni llames `reply.send` y retornes valor a la vez.
- Errores: lanza errores con `statusCode` (clases propias o @fastify/sensible); un `setErrorHandler` central; schema de error consistente; nunca expongas stack ni PII.
- La validación fallida responde 400 automáticamente; personaliza el formato en el error handler, no en cada ruta.
- Tests con `app.inject()` (sin red): factory `buildApp()`, `await app.ready()` y `await app.close()` al final; cada test con su propia instancia/BD.
- TypeScript con type stripping de Node (`node app.ts`): sin enums ni namespaces, imports con extensión y `import type`; type providers para inferir tipos desde schemas.
- Logging con Pino integrado (`logger: true`); redactar campos sensibles; sin datos de pacientes en logs.
- Base de datos: conexión como plugin/decorator, cierre en `onClose`; escrituras críticas dentro de transacciones.
- Config por entorno validada al arrancar; sin secretos en el repo.

### vitest
- Config en `vitest.config.ts` (`defineConfig` de `vitest/config`); `environment: 'node'` para una API.
- API compatible con Jest: `describe/it/expect`, hooks `beforeEach/afterEach/beforeAll/afterAll`; importar de `vitest` salvo que se active `globals`.
- Un test por escenario; nombres que se leen como especificación; aislar estado entre tests (BD en memoria nueva por test).
- Mocks: `vi.fn`, `vi.spyOn`, `vi.mock`; fechas con `vi.useFakeTimers()` y `vi.setSystemTime()`; restaurar con `vi.restoreAllMocks()`.
- Sin `.only` commiteado; filtrar con `vitest -t "nombre"` o por archivo; `vitest run` para CI (sin watch).
- Cobertura con `--coverage` (v8); `test.concurrent` solo si los tests no comparten estado.
- Matchers útiles: `toEqual`, `toMatchObject`, `rejects.toThrow`, `expect.objectContaining`; `test.each` para tablas de casos borde.

### tdd
- Red antes de green: escribir primero el test que falla y solo el código mínimo para pasarlo; sin features especulativas.
- Cortes verticales: un test, una implementación, repetir; nunca todos los tests primero y después todo el código.
- Probar comportamiento por interfaces públicas (seams), no detalles internos; el test debe sobrevivir a un refactor.
- Acordar los seams con el usuario antes de escribir tests; no testear en seams no confirmados.
- Anti-patrones: acoplado a la implementación (mockear colaboradores internos, consultar la BD por fuera de la interfaz) y tautológico (el esperado se recalcula como lo hace el código). Esperados desde literales/spec.
- El refactor no es parte del loop red-green; va en la etapa de review.
- Usar el vocabulario de dominio del proyecto (GLOSSARY.md si existe) en los nombres de tests.

### openspec-apply-change
- Estado vía CLI: `openspec status` / `openspec instructions apply`; nunca asumir artefactos.
- Implementar tareas en orden y marcar cada una `- [x]` al completarla; pausar ante bloqueos o ambigüedad en vez de adivinar.
- Leer los artefactos de contexto (proposal, specs, design, tasks) antes de codificar.

### openspec-propose
- Crear el change con `openspec new change` y generar artefactos según `openspec instructions` hasta dejarlos listos para apply.
- No crear la estructura `openspec/` a mano.

### openspec-explore
- Modo de pensamiento: explorar, preguntar, investigar; no implementar código.

### openspec-update-change
- Revisar artefactos existentes de un change y mantenerlos coherentes entre sí; sin cambiar el alcance sin aprobación.

### openspec-sync-specs
- Aplicar delta specs del change a las specs principales sin archivar; revisar el resultado antes de confirmar.

### openspec-archive-change
- Verificar tareas completas y specs sincronizadas antes de archivar; archivar con el CLI.

### active-orchestrator / agent-instruction / design-system / discovery-research / kb-creator / roadmap-generator / find-skills / web-scraper / skill-creator
- Skills del flujo de fundación (SDD/OpenSpec); el orquestador los despacha por fase. No inyectar en sub-agentes de código.
- `.active-orchestrator-state.json` es estado compartido: cada skill escribe solo su sección; `step` es del orquestador.

### writing-guidelines
- Aplicar al revisar README/docs: voz y tono consistentes, frases directas, sin relleno.

### Skills de UI / React / Vercel (no aplican en v1: sin UI ni despliegue)
- web-design-guidelines, emil-design-eng, design-taste-frontend-v1, vercel-*: no inyectar en este proyecto salvo que se agregue UI o despliegue.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| CHANGES.md | CHANGES.md | Roadmap de changes OpenSpec |
| Knowledge base | knowledge-base/README.md | Índice de la KB (reglas de negocio en 05, arquitectura en 08) |

CLAUDE.md / AGENTS.md aún no existen (los genera agent-instruction en la fase siguiente).

Read the convention files listed above for project-specific patterns and rules.
