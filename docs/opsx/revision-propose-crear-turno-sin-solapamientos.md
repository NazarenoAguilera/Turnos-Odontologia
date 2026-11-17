# Revisión del Propose — `crear-turno-sin-solapamientos`

**Fecha**: 2026-11-17
**Fase OPSX**: Propose. La consigna pide "no aprobar a la primera: leer el spec completo y usar Ajustar si el alcance quedó de más, de menos o inventado".

## Primera versión generada

- `proposal.md`, `specs/agenda-turnos/spec.md` (12 requisitos y 19 escenarios), `design.md` (D1 a D9) y `tasks.md` (14 tareas).
- `openspec validate --strict`: válido.

## Puntos señalados por el agente para revisión

El agente marcó las decisiones que **no** venían del usuario ni de la knowledge-base:

| # | Punto | Origen | Riesgo |
|---|---|---|---|
| 1 | Regla "el turno no cruza la medianoche" (`CRUZA_MEDIANOCHE`) | Supuesto SU-04, **inferido por el agente y nunca confirmado** | Alcance inventado o de más |
| 2 | Códigos `RECURSO_INEXISTENTE` (404) y `SOLICITUD_INVALIDA` (400) | Creados por el agente para nombrar casos que la KB dejaba sin código | Inventado, aunque solo nombra un comportamiento ya definido |
| 3 | Prioridad `TURNO_SOLAPADO_PROFESIONAL` cuando chocan los dos recursos | Elección del agente | Arbitrario |
| 4 | Auditoría (`evento_auditoria`) dentro de C-01 | KB, RN-AU-01 (MVP D.3) | Alcance posiblemente de más |

## Decisión (Ajustar)

El usuario delegó la decisión en el agente ("lo que veas más adecuado"). Se aplicó este criterio:

- **Punto 1 → se quitó.** Era la única regla inventada a partir de un supuesto no confirmado. Se eliminó el requisito y su escenario, que pasaron de 19 a 18. RN-AG-05 quedó marcada como "pendiente de confirmación" en la KB y se abrió **PA-09**.
- **Punto 2 → se mantiene.** Los códigos solo nombran respuestas 404 y 400 que ya estaban definidas. Sin un código estable, esos escenarios no serían verificables.
- **Punto 3 → se mantiene.** Queda documentado en `design.md` (D6) y el detalle siempre lista ambos conflictos.
- **Punto 4 → se mantiene.** No es inventado (viene de la KB y del MVP). Además, el escenario "Rechazo sin efectos" verifica la atomicidad de la operación.

## Qué habría pasado con "Continuar"

Se habría implementado y testeado una regla de negocio que nadie pidió. Esa regla podría chocar más adelante con los horarios de atención de C-03: por ejemplo, un consultorio con guardia nocturna. Un supuesto del agente habría pasado a ser un requisito del sistema sin una decisión humana.

## Archivos ajustados

- `openspec/changes/crear-turno-sin-solapamientos/`: `proposal.md`, `specs/agenda-turnos/spec.md`, `design.md` y `tasks.md`
- `knowledge-base/05_reglas_de_negocio.md`, `07_flujos_principales.md` y `10_preguntas_abiertas.md` (PA-09)
- `CHANGES.md` (C-01)
