# turnos-odontologia — Instrucciones para Agentes

> Este archivo (y su copia `CLAUDE.md`) es lo PRIMERO que todo agente lee al entrar al repo.
> Generado por `agent-instruction` a partir de `knowledge-base/`, `CHANGES.md` y `.atl/skill-registry.md` (2026-11-17). Ajustado el 2026-11-23 al sumar la interfaz web mínima (DD-08) y el equipo de 3 integrantes. Si editás uno, re-sincronizá el otro.

Agenda odontológica para consultorios argentinos de 2 a 5 profesionales. Cada turno ocupa a la vez un profesional y un sillón/box durante [inicio, fin). El sistema nunca permite superposiciones y acepta turnos contiguos. El MVP v1 es una API REST más una **interfaz web mínima** en `web/` (pantallas Nuevo turno y Agenda, DD-08), sin login ni integraciones externas.

---

## Stack Tecnológico

| Capa | Tecnología | Versión mínima |
|---|---|---|
| Lenguaje | TypeScript | 5.x |
| Runtime | Node.js | 24.x |
| API HTTP | Fastify | 5.x |
| Persistencia | SQLite vía `node:sqlite` (`DatabaseSync`) | integrado en Node 24 |
| Tests | Vitest | 3.x |
| Ejecución TS | `tsx` (dev) / `tsc` (build) | — |
| Interfaz web | Vite + React + TypeScript en `web/` (proxy `/api` → API) | la que instala `npm create vite@latest` (plantilla `react-ts`) |
| Diseño visual | `design-system/` (tokens verde/menta, modo `system-and-mockups`) | Revisión 1 |
| Integraciones | Ninguna en v1 | — |

Detalle completo: [knowledge-base/02_descripcion_general.md](knowledge-base/02_descripcion_general.md)

---

## Base de Conocimiento

La fuente de verdad del dominio vive en `knowledge-base/`. **Leé el archivo relevante ANTES de implementar.**

| Archivo | Cuándo leerlo |
|---|---|
| [01_vision_y_objetivos.md](knowledge-base/01_vision_y_objetivos.md) | Propósito, alcance v1 y fuera de alcance |
| [02_descripcion_general.md](knowledge-base/02_descripcion_general.md) | Stack, arquitectura, API REST y códigos de error |
| [03_actores_y_roles.md](knowledge-base/03_actores_y_roles.md) | Actores y matriz RBAC |
| [04_modelo_de_datos.md](knowledge-base/04_modelo_de_datos.md) | Entidades, constraints, índices y seed ficticio |
| [05_reglas_de_negocio.md](knowledge-base/05_reglas_de_negocio.md) | Reglas RN-TU, RN-AG, RN-PA, RN-RO, RN-AU y RN-GL (la base de los specs) |
| [06_funcionalidades.md](knowledge-base/06_funcionalidades.md) | Historias US-NNN y criterios de aceptación |
| [07_flujos_principales.md](knowledge-base/07_flujos_principales.md) | Flujos crear, cancelar, reprogramar y consultar |
| [08_arquitectura_propuesta.md](knowledge-base/08_arquitectura_propuesta.md) | Patrones, directorios, seguridad, env vars y testing |
| [09_decisiones_y_supuestos.md](knowledge-base/09_decisiones_y_supuestos.md) | DD-01 a DD-08 y SU-01 a SU-06 |
| [10_preguntas_abiertas.md](knowledge-base/10_preguntas_abiertas.md) | ⚠️ Inconsistencias y preguntas a resolver ANTES de codear |
| [11_contexto_de_mercado.md](knowledge-base/11_contexto_de_mercado.md) | Competidores y vacío del mercado que ataca el producto |

> ✅ PA-01 (sillón obligatorio) y PA-02 (duración múltiplo de 15) se resolvieron en el Explore del 2026-11-17; PA-06 (grupo de 3 integrantes) el 2026-11-23. Antes de cada change nuevo, revisá las preguntas abiertas que lo bloquean en `10_preguntas_abiertas.md`.

Evidencia del Discovery: [docs/discovery/informe-discovery.md](docs/discovery/informe-discovery.md) y [docs/discovery/discovery.md](docs/discovery/discovery.md).

---

## Skills Disponibles

Fuente: `.atl/skill-registry.md`.

| Agente | Rol | Skills que carga |
|---|---|---|
| **Backend Core** | API Fastify, dominio de agenda y persistencia SQLite | `fastify-best-practices` |
| **Tests** | Tests por escenario, test-first | `vitest`, `tdd` |
| **OPSX** | Ciclo explore → propose → apply → verify → archive | `openspec-explore`, `openspec-propose`, `openspec-apply-change`, `openspec-update-change`, `openspec-sync-specs`, `openspec-archive-change` (y `sdd-orchestrator` como coordinador) |
| **Frontend** | Interfaz web en `web/` (Vite + React) con el design-system | `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `emil-design-eng` (y `design-system` para tokens y revisiones) |
| **Fundación** | KB, roadmap, skills e instrucciones | `active-orchestrator`, `discovery-research`, `web-scraper`, `kb-creator`, `design-system`, `roadmap-generator`, `find-skill`, `skill-registry`, `agent-instruction` |

Cargá la skill correspondiente al contexto ANTES de escribir código. Las skills de UI y React aplican **solo** a `web/` (DD-08); las de despliegue en Vercel y React Native no aplican a la v1.

> **Diseño visual** (`design-system/README.md`, modo `system-and-mockups`): toda pantalla nueva o cambiada importa `design-system/tokens.css` y usa sus variables. Antes del Apply de un change visual (C-11, la pantalla Agenda de C-07, el botón de C-05, y C-06/C-03 si se hacen) hay que tener el mockup HTML en `openspec/changes/<change>/mockups/` **aprobado por el líder**.

> Los compact rules de cada skill los resuelve el orquestador desde `.atl/skill-registry.md`, generado por `skill-registry`. En este proyecto el archivo **sí está versionado**, porque la consigna lo exige como entregable. Esta tabla solo mapea skill→rol.

---

## Roadmap de Changes

El plan completo está en [CHANGES.md](CHANGES.md). Resumen:

- **Total**: 11 changes en 4 fases, más un backlog fuera del MVP (FASE 5).
- **C-01** `crear-turno-sin-solapamientos` (change central): ✅ **archivado el 2026-11-17**. Spec vigente: `openspec/specs/agenda-turnos/`.
- **Para la entrega del 25/11** (equipo de 3, ver CHANGES.md §Plan del equipo): `C-11` `interfaz-web-base` y `C-05` `cancelar-y-cambiar-estado-de-turno` (Lucas, rama `lucas`); `C-07` `agenda-diaria-y-semanal` con su pantalla (Lautaro, rama `lautaro`). Si sobra tiempo: `C-06` y `C-03`. **No se hacen** C-02, C-04, C-08, C-09 ni C-10 antes de la entrega.
- **Orden de merges a `master`**: C-11 → C-07 → C-05 (→ C-06 / C-03).
- **Camino crítico del MVP completo**: `C-01 → (C-02 a C-07 y C-11) → C-08 → C-09 → C-10`.

**Antes de cualquier propuesta**: leé [CHANGES.md](CHANGES.md), identificá las dependencias del change y los archivos de "Leer antes".

---

## Reglas Duras (específicas del proyecto)

> Reglas **globales** ya definidas en el archivo global de instrucciones que carga el cliente activo (OpenSpec/OPSX, governance por dominio, Engram, etapa de diseño): el proyecto las **hereda** y no se repiten acá. Acá viven solo las reglas **específicas de este proyecto**, más las universales que el global no cubre. Fueron confirmadas por el usuario el 2026-11-17. Son contrato: romperlas es un defecto.

- **NUNCA usar datos reales de pacientes** en el repositorio, ejemplos, seeds, fixtures, tests, documentación ni capturas → usar solo datos ficticios evidentes ("Paciente Ficticio Uno", "Dra. Ana Prueba", teléfonos `+54 9 11 0000-000X`). (RN-PA-01)
- **NUNCA concatenar valores en SQL** → usar siempre sentencias preparadas con parámetros de `node:sqlite`.
- **NUNCA comparar inicios y fines de turnos, franjas o bloqueos a mano** → toda superposición o inclusión pasa por el value object `Intervalo` semiabierto [inicio, fin), cuya superposición es `a < d && c < b`. (RN-TU-02, DD-02)
- **NUNCA hardcodear el offset `-03:00` en la lógica** → convertir hora local con la zona IANA `America/Argentina/Buenos_Aires`; la API usa ISO 8601 con offset y el almacenamiento interno usa minutos Unix (`inicio_min`, `fin_min`). (RN-AG-04, DD-03)
- **NUNCA commitear sin que el usuario lo pida** → cuando lo pida, usar commits en español con prefijo convencional (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), uno por fase o tarea. El trabajo es en **grupo de 3** (PA-06): cada integrante commitea desde su máquina en su propia rama (`lucas`, `lautaro`) y abre un PR por change hacia `master`; solo el líder (Nazareno) mergea, con "Create a merge commit" (nunca squash). Nadie commitea directo en `master` ni sube el trabajo de otro.

---

## Flujo de Trabajo

```
1. Leer la KB relevante (knowledge-base/)              → entender el dominio y las reglas RN-*
2. Identificar el change en CHANGES.md                 → respetar dependencias y "Leer antes"
3. Explore  (openspec-explore)                         → relevar el problema y el estado del código; guardar resumen
4. Propose  (openspec-propose)                         → proposal + design + specs + tasks; ≥3 escenarios dado/cuando/entonces
                                                          (feliz, error de negocio, borde); revisar y Ajustar antes de aprobar
4b. Design  (solo changes visuales)                    → mockup HTML en openspec/changes/<change>/mockups/ con los tokens;
                                                          el líder lo aprueba antes del Apply
5. Apply    (openspec-apply-change)                    → implementar contra el spec aprobado, cargando las skills
6. Verify                                              → correr `npm test` (y `npm run build`): un test por escenario, todo en verde;
                                                          las pantallas se prueban a mano contra el mockup, con captura
7. Archive  (openspec-archive-change) + marcar [x]     → cerrar el change y sincronizar el estado del roadmap
```

En este proyecto, Explore y Verify son **obligatorios** por la consigna. Para coordinar el ciclo OPSX con delegación a subagentes, invocá `/sdd-orchestrator`. Aplicá todas las reglas duras en cada paso. Si la KB y este archivo entran en conflicto, prevalecen las reglas duras.
