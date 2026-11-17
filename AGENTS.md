# turnos-odontologia — Instrucciones para Agentes

> Este archivo (y su copia `CLAUDE.md`) es lo PRIMERO que todo agente lee al entrar al repo.
> Generado por `agent-instruction` a partir de `knowledge-base/`, `CHANGES.md` y `.atl/skill-registry.md` (2026-11-17). Si editás uno, re-sincronizá el otro.

Agenda odontológica para consultorios argentinos de 2 a 5 profesionales. Cada turno ocupa a la vez un profesional y un sillón/box durante [inicio, fin). El sistema nunca permite superposiciones y acepta turnos contiguos. El MVP v1 es una API sin interfaz gráfica ni integraciones externas.

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
| [09_decisiones_y_supuestos.md](knowledge-base/09_decisiones_y_supuestos.md) | DD-01 a DD-07 y SU-01 a SU-06 |
| [10_preguntas_abiertas.md](knowledge-base/10_preguntas_abiertas.md) | ⚠️ Inconsistencias y preguntas a resolver ANTES de codear |
| [11_contexto_de_mercado.md](knowledge-base/11_contexto_de_mercado.md) | Competidores y vacío del mercado que ataca el producto |

> ✅ PA-01 (sillón obligatorio) y PA-02 (duración múltiplo de 15) se resolvieron en el Explore del 2026-11-17. Antes de cada change nuevo, revisá las preguntas abiertas que lo bloquean en `10_preguntas_abiertas.md`.

Evidencia del Discovery: [docs/discovery/informe-discovery.md](docs/discovery/informe-discovery.md) y [docs/discovery/discovery.md](docs/discovery/discovery.md).

---

## Skills Disponibles

Fuente: `.atl/skill-registry.md`.

| Agente | Rol | Skills que carga |
|---|---|---|
| **Backend Core** | API Fastify, dominio de agenda y persistencia SQLite | `fastify-best-practices` |
| **Tests** | Tests por escenario, test-first | `vitest`, `tdd` |
| **OPSX** | Ciclo explore → propose → apply → verify → archive | `openspec-explore`, `openspec-propose`, `openspec-apply-change`, `openspec-update-change`, `openspec-sync-specs`, `openspec-archive-change` (y `sdd-orchestrator` como coordinador) |
| **Fundación** | KB, roadmap, skills e instrucciones | `active-orchestrator`, `discovery-research`, `web-scraper`, `kb-creator`, `design-system`, `roadmap-generator`, `find-skill`, `skill-registry`, `agent-instruction` |

Cargá la skill correspondiente al contexto ANTES de escribir código. Las skills de UI, React y Vercel instaladas globalmente no aplican a la v1.

> Los compact rules de cada skill los resuelve el orquestador desde `.atl/skill-registry.md`, generado por `skill-registry`. En este proyecto el archivo **sí está versionado**, porque la consigna lo exige como entregable. Esta tabla solo mapea skill→rol.

---

## Roadmap de Changes

El plan completo está en [CHANGES.md](CHANGES.md). Resumen:

- **Total**: 10 changes en 4 fases, más un backlog fuera del MVP (FASE 5).
- **Primer change (y único del ciclo OPSX de la consigna)**: `C-01` `crear-turno-sin-solapamientos` — ✅ **archivado el 2026-11-17**. Spec vigente: `openspec/specs/agenda-turnos/`.
- **Después de C-01**: C-02 a C-07 en paralelo (catálogo de recursos, horarios y bloqueos, ficha de paciente, cancelar y cambiar estado, reprogramar, agenda). Luego C-08 `roles-basicos` (CRÍTICO), C-09 `consulta-de-auditoria` (CRÍTICO) y C-10 `cierre-y-entrega`.
- **Camino crítico**: `C-01 → (cualquiera de C-02 a C-07) → C-08 → C-09 → C-10`.

**Antes de cualquier propuesta**: leé [CHANGES.md](CHANGES.md), identificá las dependencias del change y los archivos de "Leer antes".

---

## Reglas Duras (específicas del proyecto)

> Reglas **globales** ya definidas en el archivo global de instrucciones que carga el cliente activo (OpenSpec/OPSX, governance por dominio, Engram, etapa de diseño): el proyecto las **hereda** y no se repiten acá. Acá viven solo las reglas **específicas de este proyecto**, más las universales que el global no cubre. Fueron confirmadas por el usuario el 2026-11-17. Son contrato: romperlas es un defecto.

- **NUNCA usar datos reales de pacientes** en el repositorio, ejemplos, seeds, fixtures, tests, documentación ni capturas → usar solo datos ficticios evidentes ("Paciente Ficticio Uno", "Dra. Ana Prueba", teléfonos `+54 9 11 0000-000X`). (RN-PA-01)
- **NUNCA concatenar valores en SQL** → usar siempre sentencias preparadas con parámetros de `node:sqlite`.
- **NUNCA comparar inicios y fines de turnos, franjas o bloqueos a mano** → toda superposición o inclusión pasa por el value object `Intervalo` semiabierto [inicio, fin), cuya superposición es `a < d && c < b`. (RN-TU-02, DD-02)
- **NUNCA hardcodear el offset `-03:00` en la lógica** → convertir hora local con la zona IANA `America/Argentina/Buenos_Aires`; la API usa ISO 8601 con offset y el almacenamiento interno usa minutos Unix (`inicio_min`, `fin_min`). (RN-AG-04, DD-03)
- **NUNCA commitear sin que el usuario lo pida** → cuando lo pida, usar commits en español con prefijo convencional (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), uno por fase o tarea, sobre la rama `master`. Si el trabajo es en grupo, una rama por integrante y un PR por change hacia `master`.

---

## Flujo de Trabajo

```
1. Leer la KB relevante (knowledge-base/)              → entender el dominio y las reglas RN-*
2. Identificar el change en CHANGES.md                 → respetar dependencias y "Leer antes"
3. Explore  (openspec-explore)                         → relevar el problema y el estado del código; guardar resumen
4. Propose  (openspec-propose)                         → proposal + design + specs + tasks; ≥3 escenarios dado/cuando/entonces
                                                          (feliz, error de negocio, borde); revisar y Ajustar antes de aprobar
5. Apply    (openspec-apply-change)                    → implementar contra el spec aprobado, cargando las skills
6. Verify                                              → correr `npm test`: un test por escenario, todo en verde
7. Archive  (openspec-archive-change) + marcar [x]     → cerrar el change y sincronizar el estado del roadmap
```

En este proyecto, Explore y Verify son **obligatorios** por la consigna. Para coordinar el ciclo OPSX con delegación a subagentes, invocá `/sdd-orchestrator`. Aplicá todas las reglas duras en cada paso. Si la KB y este archivo entran en conflicto, prevalecen las reglas duras.
