# Design

## Context

`C-01` (`crear-turno-sin-solapamientos`) dejó establecida la arquitectura hexagonal (`src/domain`, `src/application`, `src/infrastructure/sqlite`, `src/http`) y el esquema SQLite con las tablas `profesional`, `sillon`, `prestacion`, `paciente`, `turno` y `evento_auditoria`. Ver `proposal.md` para la motivación y `docs/opsx/explore-agenda-diaria-y-semanal.md` para el relevamiento técnico completo.

Este change se ejecuta en dos tramos por la secuencia de dependencias definida en `CHANGES.md`:
- **Tramo 1 (API, GATE 0)**: depende solo de `C-01` (ya archivado) y se implementa ahora en la rama `lautaro`.
- **Tramo 2 (Pantalla Agenda, GATE 0b)**: depende del merge de `C-11` (`interfaz-web-base`), que proveerá `web/`, el layout base, el proxy `/api` y los endpoints `GET /profesionales` y `GET /sillones`, además de la aprobación de los mockups HTML según `design-system/README.md` (modo `system-and-mockups`).

## Goals / Non-Goals

**Goals:**
- Exponer `GET /turnos` para vistas diaria y semanal reutilizando `Intervalo` y `tiempo.ts` sin duplicar reglas de intersección ni hardcodear offsets.
- Devolver turnos enriquecidos con nombres legibles de paciente, profesional, sillón y prestación, indexando el rango temporal en SQLite.
- Proveer la pantalla **Agenda** en `web/` fiel a `design-system/tokens.css` y lista para alojar los botones de acción de `C-05`.

**Non-Goals:**
- Botones o endpoints de cancelación, confirmación o reprogramación (`C-05`, `C-06`).
- Filtrado o restricción de acceso por rol/odontólogo (`C-08`, RBAC).
- Endpoints CRUD o de catálogos de recursos (`C-11`, `C-02`, `C-04`) ni validaciones de horarios/bloqueos (`C-03`).

## Decisions

### D1 — Formato de `desde` y `hasta` y reutilización de `domain/tiempo.ts`
`desde` y `hasta` son obligatorios en formato ISO 8601 con offset explícito, consistente con `POST /turnos` y `RN-AG-04`.
- `instanteDesdeIso(iso, campo = 'inicio')` en `src/domain/tiempo.ts` aceptará el nombre del parámetro para que los mensajes y `detalle` reporten exactamente `desde` o `hasta`.
- Si `desdeMs >= hastaMs` (rango vacío o invertido), se lanza `ErrorDeNegocio('SOLICITUD_INVALIDA', 'El parámetro "desde" debe ser anterior a "hasta".', { desde, hasta })`, mapeado a `400`.
- **Alternativa descartada**: aceptar fechas `YYYY-MM-DD` sin hora o crear un código `422 RANGO_INVALIDO`; habría introducido un formato inconsistente con `POST /turnos` y un código de error fuera de `02_descripcion_general.md`.

### D2 — Intersección semiabierta con `Intervalo` (regla dura / RN-TU-02)
Para un rango `[desdeMs, hastaMs)` con `desdeMs < hastaMs`, los extremos se convierten a minutos Unix enteros mediante `desdeMin = Math.floor(desdeMs / MS_POR_MINUTO)` y `hastaMin = Math.ceil(hastaMs / MS_POR_MINUTO)`, construyendo `new Intervalo(desdeMin, hastaMin)` (siempre válido porque `desdeMin < hastaMin`).
- Matemáticamente, un turno almacenado en minutos enteros `[a, b)` interseca `[desdeMs, hastaMs)` si y solo si `a < Math.ceil(hastaMs / MS_POR_MINUTO)` y `Math.floor(desdeMs / MS_POR_MINUTO) < b`, incluso cuando `desde` o `hasta` traen segundos (p. ej. `23:59:59-03:00`).
- SQLite realiza el pre-filtro indexado y el caso de uso `consultarAgenda` confirma la intersección con `rango.seSuperponeCon(new Intervalo(fila.inicioMin, fila.finMin))`, manteniendo a `Intervalo` como única fuente de verdad de la regla semiabierta.
- **Alternativa descartada**: decidir la intersección únicamente en la consulta SQL, lo que violaría la regla dura del proyecto sobre `Intervalo`.

### D3 — Contrato de respuesta `{ turnos: [...] }` y nombres planos
`GET /turnos` responde `200` con `{ turnos: TurnoEnAgenda[] }`. Cada elemento conserva los campos de `TurnoCreado` (`id`, `pacienteId`, `profesionalId`, `sillonId`, `prestacionId`, `inicio`, `fin`, `duracionMin`, `estado`) y agrega `pacienteNombre` (`${nombre} ${apellido}`), `profesionalNombre`, `sillonNombre` y `prestacionNombre`.
- `inicio` y `fin` se formatean con `aIsoLocal(min * MS_POR_MINUTO)` usando la zona IANA `America/Argentina/Buenos_Aires`.
- **Alternativa descartada**: devolver un array raíz `[...]` o subobjetos anidados (`paciente: { id, nombre }`); el objeto `{ turnos }` es extensible y los campos planos facilitan el render directo en la tabla de Agenda y su uso posterior en `C-05`.

### D4 — Consulta SQL parametrizada e índice de rango
En `src/infrastructure/sqlite/esquema.ts` se agrega `CREATE INDEX IF NOT EXISTS idx_turno_rango ON turno (inicio_min, fin_min)` para cubrir consultas de toda la agenda sin filtro de profesional ni de sillón.
En `src/infrastructure/sqlite/repositorios.ts`, `listarTurnosEnRango(db, filtro)` usa una única sentencia `db.prepare(...)` con parámetros nombrados (`:desde`, `:hasta`, `:profesionalId`, `:sillonId`, `:incluirCancelados`) sin concatenar fragmentos SQL:
- `JOIN` a `paciente`, `profesional`, `sillon` y `prestacion`.
- Filtros opcionales evaluados con `(:profesionalId IS NULL OR t.profesional_id = :profesionalId)`, `(:sillonId IS NULL OR t.sillon_id = :sillonId)` y `(:incluirCancelados = 1 OR t.estado <> 'cancelado')`.
- Orden determinista `ORDER BY t.inicio_min ASC, t.id ASC`.
- **Alternativa descartada**: armar cláusulas `WHERE` dinámicas por concatenación de strings, para evitar cualquier riesgo frente a la regla dura de SQL parametrizado.

### D5 — Filtros con ID inexistente
Cuando `profesionalId` o `sillonId` no tiene turnos o no existe, `GET /turnos` devuelve `200` con `{ turnos: [] }`, siguiendo la semántica estándar de filtros sobre colecciones REST.
- **Alternativa descartada**: verificar existencia previa para responder `404 RECURSO_INEXISTENTE`, lo cual complejizaría innecesariamente la consulta sin beneficio para la pantalla Agenda.

### D6 — Validación de `querystring` en Fastify (`src/http/app.ts`)
La ruta `GET /turnos` declara un JSON Schema de `querystring` con:
- `required: ['desde', 'hasta']` y `additionalProperties: false` (con `removeAdditional: false` ya configurado en Fastify, cualquier parámetro desconocido responde `400 SOLICITUD_INVALIDA`).
- `desde` y `hasta`: `{ type: 'string', minLength: 1 }`.
- `profesionalId` y `sillonId`: `{ type: 'integer', minimum: 1 }`.
- `incluirCancelados`: `{ type: 'boolean' }` (AJV coacciona `'true'`/`'false'` y rechaza textos arbitrarios como `'talvez'` con `400 SOLICITUD_INVALIDA`).

### D7 — Pantalla Agenda en `web/` (Tramo 2, DD-08)
La pantalla `web/src/pages/Agenda.tsx` actúa como cliente delgado de `/api/turnos`, `/api/profesionales` y `/api/sillones` (vía proxy de Vite de `C-11`), sin replicar validaciones de negocio:
- Calcula el rango `[desde, hasta)` de la fecha o semana seleccionada en `America/Argentina/Buenos_Aires`.
- Selector segmentado **Día | Semana** y controles `‹` / `›`:
  - Vista **Día**: tabla con hora (`tabular-nums`), paciente, profesional, sillón, prestación, insignia de estado y columna vacía de acciones (reservada para `C-05`).
  - Vista **Semana**: **tabla agrupada por día** reutilizando los estilos de tabla de `design-system/components.html`, legible tanto en escritorio (1440×900) como en móvil (390×844) sin grilla de 7 columnas rígida.
- Filtros por profesional, sillón y checkbox "Mostrar cancelados" (filas con clase `.cancelado`).
- Estados completos: carga (skeleton), vacío con indicación de qué hacer, y error inline mostrando `codigo` y `mensaje` de la API.

## UI Mockups

- **Design system revision**: 1
- **Approval**: pending
- **Location**: `openspec/changes/agenda-diaria-y-semanal/mockups/` (a generar en GATE 0b, antes del Apply del Tramo 2)
- **Vistas requeridas y capturas** (`390×844` y `1440×900` en `mockups/previews/`):
  1. Vista **Día** con turnos (`reservado`, `confirmado`, `atendido`, `ausente`) y barra de filtros.
  2. Vista **Semana** en tabla agrupada por día.
  3. Opción **Mostrar cancelados** activa (fila `.cancelado` con insignia gris y paciente tachado).
  4. Estados **Vacío**, **Carga** (skeleton) y **Error** (aviso `.alert-danger`).
- **Restricciones**: todos los HTML importan `../../../../design-system/tokens.css` y usan solo datos ficticios (`RN-PA-01`). El Apply del Tramo 2 no comienza hasta registrar `Approval: approved (<fecha>, by <nombre>)`.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| `C-11` todavía no está mergeado en `master`. | Se desacopla el Tramo 1 (API, realizable ya) del Tramo 2 (pantalla Agenda tras GATE 0b y aprobación de mockups). |
| Cálculos de fecha local en navegador con zona distinta a Argentina. | Formatear y construir límites de día/semana en `web/` usando explícitamente `timeZone: 'America/Argentina/Buenos_Aires'` vía `Intl`, sin asumir la zona del sistema operativo ni hardcodear `-03:00`. |
| Coerción de `incluirCancelados` en querystring de Fastify. | Cubrir explícitamente casos válidos (`true`, `false`, omitido) e inválidos (`incluirCancelados=talvez`) en los tests e2e. |

## Migration Plan

La incorporación de `CREATE INDEX IF NOT EXISTS idx_turno_rango ON turno (inicio_min, fin_min)` en `esquema.ts` es idempotente y compatible con bases SQLite creadas previamente por `C-01`. Para revertir el cambio basta revertir los commits de la rama antes o después del merge.
