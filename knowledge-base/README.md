# turnos-odontologia — Base de Conocimiento

Base de conocimiento generada por `kb-creator` en modo silencioso (ingest) a partir de `docs/discovery/informe-discovery.md`, `docs/discovery/discovery.md` y la sección `discovery` de `.active-orchestrator-state.json`. Fecha: 2026-11-17.

## Índice de Archivos

| Archivo | Contenido |
|---|---|
| [01_vision_y_objetivos.md](01_vision_y_objetivos.md) | Propósito, objetivos por actor, alcance v1, fuera de alcance, métricas de éxito |
| [02_descripcion_general.md](02_descripcion_general.md) | Stack (TypeScript + Node 24 + Fastify + SQLite + Vitest), arquitectura, integraciones, API REST |
| [03_actores_y_roles.md](03_actores_y_roles.md) | Recepción, odontólogo, administrador, paciente; matriz RBAC |
| [04_modelo_de_datos.md](04_modelo_de_datos.md) | Entidades, ERD, constraints, índices, seed ficticio |
| [05_reglas_de_negocio.md](05_reglas_de_negocio.md) | Reglas RN-TU (turnos y solapamientos), RN-AG (agenda), RN-PA, RN-RO, RN-AU, RN-GL |
| [06_funcionalidades.md](06_funcionalidades.md) | Épicas e historias US-001 a US-032 con criterios de aceptación |
| [07_flujos_principales.md](07_flujos_principales.md) | Crear, cancelar, reprogramar y consultar agenda, de extremo a extremo |
| [08_arquitectura_propuesta.md](08_arquitectura_propuesta.md) | Patrones, directorios, seguridad, variables de entorno, testing |
| [09_decisiones_y_supuestos.md](09_decisiones_y_supuestos.md) | DD-01 a DD-07 y SU-01 a SU-06 |
| [10_preguntas_abiertas.md](10_preguntas_abiertas.md) | Inconsistencias, preguntas de producto y puntos "No evidenciado" del Discovery |
| [11_contexto_de_mercado.md](11_contexto_de_mercado.md) | (Extra) competidores, vacíos del mercado e implicancias para el roadmap |

## Quick Start para Desarrolladores

1. Entender el dominio → [01](01_vision_y_objetivos.md), [03](03_actores_y_roles.md), [11](11_contexto_de_mercado.md)
2. Entender los datos → [04](04_modelo_de_datos.md)
3. Entender las reglas → [05](05_reglas_de_negocio.md) (especialmente RN-TU-01 a RN-TU-04)
4. Entender la arquitectura → [02](02_descripcion_general.md), [08](08_arquitectura_propuesta.md)
5. Implementar → [07](07_flujos_principales.md), [06](06_funcionalidades.md)
6. Antes de codificar → [10](10_preguntas_abiertas.md) (PA-01 y PA-02 bloquean el spec del primer change)

## Resumen Ejecutivo

Agenda odontológica para consultorios argentinos de 2 a 5 profesionales. Cada turno ocupa a la vez un profesional y un sillón/box durante [inicio, fin). El sistema nunca permite superposiciones, ni siquiera con reservas concurrentes, y acepta turnos contiguos. El MVP v1 es una API en TypeScript con SQLite, sin integraciones externas, y se verifica con tests por escenario. Ataca el vacío más claro del mercado relevado: nadie demuestra cómo evita las reservas dobles.
