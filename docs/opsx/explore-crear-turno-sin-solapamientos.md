# Explore — `crear-turno-sin-solapamientos` (C-01)

**Fecha**: 2026-11-17
**Fase OPSX**: Explore (obligatoria según la consigna)
**Modo**: directo, coordinado por `sdd-orchestrator` con la skill `openspec-explore`

## Estado del repositorio al iniciar

- No hay código: no existen `src/`, `tests/` ni `package.json`.
- No hay specs vigentes (`openspec list --specs` → "No specs found") ni changes activos.
- La fundación está completa: `knowledge-base/`, `CHANGES.md`, `AGENTS.md`/`CLAUDE.md` y `.atl/skill-registry.md`.
- El change C-01 construye el proyecto desde cero.

## El problema

Crear un turno (paciente + profesional + sillón/box + prestación) sin que se superponga con otro turno **no cancelado** del mismo profesional **ni** del mismo sillón. Los intervalos son semiabiertos [inicio, fin): dos turnos chocan si y solo si `a < d && c < b`.

```
   Agenda de un martes (grilla de 15 min)

            10:00   10:15   10:30   10:45   11:00
              |       |       |       |       |
  Dra. Ana    [== Limpieza 30 ==]
  Sillon 1    [== Limpieza 30 ==][== Endodoncia 90 ...........
  Dr. Bruno                      [== Endodoncia 90 ...........
                                 ^
                                 10:30: empieza justo cuando termina
                                 la limpieza -> NO se superpone

  Nuevo turno pedido: Dr. Bruno, Sillon 2, 10:15-10:45
     Profesional: Bruno ocupado 10:30-12:00 -> CHOCA
     Sillon 2: libre                         -> ok
     => 409 TURNO_SOLAPADO_PROFESIONAL
```

## Decisiones tomadas (confirmadas por el usuario)

| # | Tema | Decisión | Por qué |
|---|---|---|---|
| 1 | Alcance de C-01 | **Solo solapamientos**, más la grilla de 15 minutos y la validación de duración. Las validaciones de horario de atención (`FUERA_DE_HORARIO`) y de bloqueos (`EN_BLOQUEO`) pasan a C-03. | La consigna pide "una sola funcionalidad, lo bastante chica para terminarse". El foco queda en el vacío del mercado detectado en el Discovery. |
| 2 | PA-01 | **`sillonId` es obligatorio** en todo turno. Una consulta sin sillón se modela como un box o consultorio más. | Mantiene simple la doble validación. Confirma el supuesto SU-01. |
| 3 | PA-02 | **La duración debe ser mayor que cero y múltiplo de 15 minutos.** Si no, se responde `422 DURACION_INVALIDA`. | Es coherente con la grilla: todos los fines caen en :00, :15, :30 o :45 y no quedan huecos inutilizables. Confirma SU-03. |

## Escenarios candidatos para el spec (la consigna exige al menos 3)

| Tipo | Escenario | Resultado esperado |
|---|---|---|
| Feliz | Profesional y sillón libres en [inicio, fin) | `201`, turno en estado `reservado`, fin = inicio + duración |
| Error de negocio | Mismo profesional con otro turno superpuesto | `409 TURNO_SOLAPADO_PROFESIONAL`, no se persiste nada |
| Error de negocio | Mismo sillón con turno superpuesto de otro profesional | `409 TURNO_SOLAPADO_SILLON` |
| Error de negocio | Ambos recursos ocupados | `409` informando ambos conflictos |
| Borde | Turno 10:00–10:30 y otro 10:30–11:00 (mismo profesional y sillón) | Se acepta: son contiguos y no se superponen |
| Borde | Turno cancelado en el mismo horario | No bloquea la creación |
| Validación | Inicio 10:10 / duración 20 o 0 | `422 INICIO_FUERA_DE_GRILLA` / `422 DURACION_INVALIDA` |
| Concurrencia | Dos creaciones simultáneas que chocan | Exactamente un turno persistido |

## Hallazgo técnico (para el design)

`DatabaseSync` de `node:sqlite` es **sincrónico**. Dentro de un mismo proceso, dos requests no pueden intercalarse entre el `SELECT` de solapamientos y el `INSERT`. La carrera real aparece entre **dos conexiones o dos procesos** sobre el mismo archivo. Por eso:

- El test de concurrencia debe usar **dos conexiones a un archivo SQLite temporal** (no `:memory:`, que no se comparte entre conexiones).
- `BEGIN IMMEDIATE` necesita un `busy_timeout` configurado para que la segunda conexión espere el lock en lugar de fallar con `SQLITE_BUSY`.

## Cambios derivados

- `CHANGES.md`: C-01 sin tablas ni validaciones de horario y bloqueos; C-03 suma esas validaciones a `POST /turnos`.
- `knowledge-base/10_preguntas_abiertas.md`: PA-01 y PA-02 resueltas.
- `knowledge-base/09_decisiones_y_supuestos.md`: SU-01 y SU-03 confirmados.
- `knowledge-base/05_reglas_de_negocio.md`: RN-AG-01 y RN-AG-02 se implementan en C-03.

## Siguiente paso

**Propose** de `crear-turno-sin-solapamientos`: proposal, design, specs (escenarios dado/cuando/entonces) y tasks.
