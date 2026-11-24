# Proposal

## Why

Una vez resuelta la creación de turnos sin solapamientos en C-01, recepción y los odontólogos necesitan ver qué turnos hay reservados en un día o una semana, filtrados por profesional o por sillón, para operar el consultorio y comprobar la disponibilidad real.

**Por qué elegimos este change**: es pieza central del "MVP defendible con pantallas" acordado para la entrega del 25/11 (`C-01 + C-11 + C-07 + C-05`), cubre la historia `US-020` de la base de conocimiento y su API depende solo de `C-01`, lo que permite avanzarlo en paralelo en la rama `lautaro` mientras se desarrolla `C-11`. Además, la pantalla Agenda que introduce sirve de base directa para los botones de acción de `C-05` (y `C-06` si se realiza).

## What Changes

- **API de consulta de agenda (`Tramo 1`, GATE 0)**:
  - Nuevo endpoint `GET /turnos?desde&hasta[&profesionalId][&sillonId][&incluirCancelados]`.
  - La vista diaria y la vista semanal usan el mismo endpoint cambiando el rango semiabierto `[desde, hasta)`, interpretado en la zona horaria del consultorio (`America/Argentina/Buenos_Aires`, RN-AG-04) con formato ISO 8601 y offset obligatorio.
  - Devuelve `200` con `{ turnos: [...] }` ordenados por inicio (desempate por `id`), incluyendo los datos del turno y los nombres legibles de paciente (`nombre + apellido`), profesional, sillón y prestación.
  - Excluye turnos `cancelado` por defecto (mantiene `reservado`, `confirmado`, `ausente` y `atendido`, RN-TU-10) y los incluye cuando `incluirCancelados=true`.
  - Verifica la intersección con `[desde, hasta)` mediante el value object `Intervalo` (RN-TU-02) y agrega índice de rango en SQLite (`idx_turno_rango`).
  - Valida parámetros de consulta y rechaza faltantes, formatos sin offset, campos desconocidos o rangos `desde >= hasta` con `400 SOLICITUD_INVALIDA`.
- **Pantalla Agenda en `web/` (`Tramo 2`, GATE 0b — tras el merge de `C-11` y aprobación de mockups)**:
  - Mockups HTML en `openspec/changes/agenda-diaria-y-semanal/mockups/` con capturas a 390×844 y 1440×900 usando `design-system/tokens.css` (revisión 1), aprobados por el líder antes del Apply visual.
  - Pantalla `web/src/pages/Agenda.tsx` integrada al layout de `C-11`, con selector segmentado Día / Semana (vista semanal en tabla agrupada por día), navegación de fecha (`‹` / `›`), filtros por profesional y por sillón (consumiendo los catálogos de `C-11`), opción "Mostrar cancelados", tabla con insignias de estado y columna de acciones preparada para `C-05`, más estados de carga (skeleton), vacío y error.
- **Fuera de alcance**:
  - Acciones de cancelar, confirmar o reprogramar turnos desde la agenda (`C-05`, `C-06`).
  - Restricción de visibilidad por rol/odontólogo (`C-08`, RBAC).
  - Endpoints de catálogos de recursos (`C-11`, `C-02`, `C-04`) y horarios/bloqueos (`C-03`).

## Capabilities

### New Capabilities
- (ninguna: se extiende la capacidad existente `agenda-turnos`)

### Modified Capabilities
- `agenda-turnos`: agrega la consulta de agenda diaria y semanal vía `GET /turnos` con intersección semiabierta `[desde, hasta)`, filtros opcionales por profesional, sillón y cancelados, y nombres enriquecidos de recursos. Los escenarios del spec cubren exclusivamente la API; la pantalla Agenda se verifica manualmente contra su mockup aprobado (DD-08).

## Impact

- **Backend (`Tramo 1`)**:
  - `src/domain/tiempo.ts`: parametrización opcional del nombre de campo en `instanteDesdeIso` y utilidad de rango si aplica.
  - `src/application/consultar-agenda.ts`: nuevo caso de uso `consultarAgenda`.
  - `src/infrastructure/sqlite/esquema.ts`: índice `idx_turno_rango ON turno (inicio_min, fin_min)`.
  - `src/infrastructure/sqlite/repositorios.ts`: consulta parametrizada con `JOIN` a `paciente`, `profesional`, `sillon` y `prestacion`.
  - `src/http/app.ts`: ruta `GET /turnos` con JSON Schema de `querystring` (`additionalProperties: false`).
  - `tests/`: tests unitarios/aplicación y e2e con `app.inject()` cubriendo cada escenario del spec (datos 100 % ficticios).
- **Frontend (`Tramo 2`, en `web/` tras GATE 0b)**:
  - `openspec/changes/agenda-diaria-y-semanal/mockups/`: mockups HTML y capturas en `mockups/previews/`.
  - `web/src/api/` y `web/src/pages/Agenda.tsx`: cliente de `GET /api/turnos` y pantalla Agenda usando solo variables de `design-system/tokens.css`.
- **Base de datos y compatibilidad**: no altera columnas existentes ni rompe `POST /turnos`; solo agrega un índice con `CREATE INDEX IF NOT EXISTS`.
