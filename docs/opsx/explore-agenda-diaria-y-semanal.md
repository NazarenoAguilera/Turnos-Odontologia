# Explore — `agenda-diaria-y-semanal` (C-07)

**Fecha**: 2026-11-24
**Fase OPSX**: Explore (obligatoria según la consigna)
**Change**: C-07 `agenda-diaria-y-semanal` · Historia: `US-020` · Rama: `lautaro`
**Skill**: `openspec-explore` (sin implementación de código)

## Estado del repositorio al iniciar

- **Rama actual**: `lautaro`, alineada con `master` en el commit `e69382e` (ajuste DD-08 y fundación del design system).
- **Changes activos**: ninguno (`openspec list --json` devuelve lista vacía).
- **Specs vigentes**: `agenda-turnos` (`openspec/specs/agenda-turnos/spec.md`, 11 requirements del change C-01 `crear-turno-sin-solapamientos`, archivado el 2026-11-17).
- **Código existente relevante (C-01)**:
  - `src/domain/intervalo.ts`: value object `Intervalo(inicio, fin)` semiabierto `[inicio, fin)` en minutos Unix enteros con `seSuperponeCon(otro)`.
  - `src/domain/tiempo.ts`: `ZONA_CONSULTORIO = 'America/Argentina/Buenos_Aires'`, `instanteDesdeIso`, `horaLocal`, `aIsoLocal`, `MS_POR_MINUTO`.
  - `src/domain/turno.ts` y `src/domain/errores.ts`: tipo `EstadoTurno` (`reservado`, `confirmado`, `cancelado`, `ausente`, `atendido`) y `ErrorDeNegocio` con `CodigoError`.
  - `src/infrastructure/sqlite/esquema.ts`: tablas `profesional`, `sillon`, `prestacion`, `paciente`, `turno` e `evento_auditoria`; índices `idx_turno_profesional (profesional_id, inicio_min, fin_min)` e `idx_turno_sillon (sillon_id, inicio_min, fin_min)`.
  - `src/infrastructure/sqlite/repositorios.ts` y `seed.ts`: consultas parametrizadas de C-01 y seed ficticio (`Dra. Ana Prueba`, `Dr. Bruno Ejemplo`, `Dra. Carla Demo`; `Sillón 1`, `Sillón 2`, `Box 3`; `Consulta`, `Limpieza`, `Extracción simple`, `Endodoncia`; `Paciente Ficticio Uno`, `Dos` y `Tres`).
  - `src/http/app.ts`: `construirApp()` con Fastify 5, `removeAdditional: false`, manejo centralizado de `ErrorDeNegocio`, `GET /health` y `POST /turnos`.
- **Estado de dependencias (`CHANGES.md`)**:
  - `C-01` (dependencia de la API de C-07): completado y archivado (GATE 0 abierto).
  - `C-11` `interfaz-web-base` (dependencia de la pantalla Agenda de C-07): todavía **no mergeado** en `master` (no existe `web/` ni los `GET` de catálogos `profesionales` y `sillones`).
- **Preguntas abiertas (`knowledge-base/10_preguntas_abiertas.md`)**: ninguna `PA-*` abierta bloquea a C-07.

## El problema

Permitir consultar la agenda diaria y semanal mediante un único endpoint de lectura `GET /turnos?desde&hasta[&profesionalId][&sillonId][&incluirCancelados]`, y luego exponerla en la pantalla **Agenda** dentro de `web/` (DD-08).

La vista diaria y la vista semanal son el **mismo endpoint** cambiando únicamente el rango `[desde, hasta)` expresado en hora local del consultorio (`America/Argentina/Buenos_Aires`, RN-AG-04).

```
   Consulta de rango [desde, hasta) = [10:00, 12:00)

   Hora:        09:30   10:00   10:30   11:00   12:00   12:30
                  |       |       |       |       |       |
   Rango:                 [=======================)
   T1 (09:30-10:00) [=====)                                 -> EXCLUIDO (contiguo: 10:00 < 10:00 falso)
   T2 (09:30-10:30) [=============)                         -> INCLUIDO (cruza borde inicial)
   T3 (10:30-11:00)               [=======)                 -> INCLUIDO (dentro del rango)
   T4 (11:30-12:30)                       [=======+=======) -> INCLUIDO (cruza borde final)
   T5 (12:00-12:30)                               [=======) -> EXCLUIDO (contiguo: 12:00 < 12:00 falso)
   T6 (10:00-10:30)       [=======)  estado=cancelado       -> EXCLUIDO salvo incluirCancelados=true
```

## Flujo de arquitectura previsto

```
  Cliente HTTP (tests / curl / web/ Agenda via /api/turnos)
        |
        v
  http/app.ts (GET /turnos)
        |  - Valida querystring con JSON Schema (desde, hasta, profesionalId?, sillonId?, incluirCancelados?)
        v
  application/consultar-agenda.ts
        |  - Parsea desde/hasta con dominio de tiempo (RN-AG-04) y construye Intervalo [desde, hasta)
        |  - Consulta repositorio SQLite parametrizado (pre-filtro indexado + JOIN nombres)
        |  - Verifica interseccion con Intervalo.seSuperponeCon() (regla dura, RN-TU-02)
        |  - Formatea inicio y fin con aIsoLocal() en America/Argentina/Buenos_Aires
        v
  infrastructure/sqlite/repositorios.ts
        |  - SELECT ... FROM turno JOIN paciente/profesional/sillon/prestacion
        |  - WHERE inicio_min < :hasta AND :desde < fin_min (+ filtros opcionales)
        |  - ORDER BY inicio_min ASC, id ASC
```

## Hallazgos técnicos del código actual (para el design)

1. **Reutilización estricta de `Intervalo` (regla dura / RN-TU-02)**:
   - Igual que `crearTurno` con `buscarTurnosQuePodrianChocar` + `verificarSinConflictos`, SQLite hace el pre-filtro indexado (`inicio_min < :hasta AND :desde < fin_min`) y el dominio/aplicación confirma la intersección con `Intervalo.seSuperponeCon()`.
   - `Intervalo` exige minutos enteros y `inicio < fin`. Para cualquier rango `[desdeMs, hastaMs)` con `desdeMs < hastaMs` (incluso si llega con segundos como `23:59:59-03:00`), un turno `[a, b)` en minutos enteros interseca `[desdeMs, hastaMs)` si y solo si `a < Math.ceil(hastaMs / MS_POR_MINUTO)` y `Math.floor(desdeMs / MS_POR_MINUTO) < b`. Así se construye `new Intervalo(Math.floor(desdeMs / MS_POR_MINUTO), Math.ceil(hastaMs / MS_POR_MINUTO))` sin perder exactitud ni romper el invariante entero de `Intervalo`.

2. **Reutilización de `instanteDesdeIso` (`src/domain/tiempo.ts`)**:
   - Actualmente `instanteDesdeIso(iso)` genera el mensaje y detalle fijos para el campo `'inicio'`. Conviene admitir un parámetro opcional `campo: string = 'inicio'` para que los errores de `desde` y `hasta` informen el campo exacto en `detalle` y `mensaje`.

3. **Nombre completo del paciente en la tabla `paciente`**:
   - En `esquema.ts`, `profesional`, `sillon` y `prestacion` tienen columna `nombre`, mientras `paciente` separa `nombre` y `apellido` (ej. `'Paciente'` y `'Ficticio Uno'`). El contrato de `GET /turnos` debe resolver cómo exponer el nombre del paciente (por ejemplo, concatenado en `pacienteNombre: "Paciente Ficticio Uno"` en la capa de aplicación/repositorio, sin alterar `esquema.ts`).

4. **Índice para consulta sin filtros de recurso**:
   - Hoy existen `idx_turno_profesional (profesional_id, inicio_min, fin_min)` e `idx_turno_sillon (sillon_id, inicio_min, fin_min)`.
   - Cuando recepción consulta la agenda completa del día o de la semana (sin `profesionalId` ni `sillonId`), esos índices no cubren el filtro por rango. Agregar `CREATE INDEX IF NOT EXISTS idx_turno_rango ON turno (inicio_min, fin_min)` en `esquema.ts` deja indexados todos los patrones de consulta sin romper migraciones existentes.

5. **Validación de querystring en Fastify (`src/http/app.ts`)**:
   - La app está configurada con `ajv: { customOptions: { removeAdditional: false } }`. Con `additionalProperties: false` en el esquema `querystring`, cualquier parámetro desconocido responde `400 SOLICITUD_INVALIDA` (consistente con C-01).
   - Fastify coacciona `querystring` (`profesionalId` y `sillonId` a entero `>= 1`, `incluirCancelados` a booleano); hay que verificar en tests cómo trata valores inválidos (como `incluirCancelados=talvez` o `profesionalId=0`) para garantizar `400 SOLICITUD_INVALIDA`.

6. **Desempate determinista en el ordenamiento**:
   - Dos turnos de distintos profesionales/sillones pueden iniciar exactamente a la misma hora. Usar `ORDER BY t.inicio_min ASC, t.id ASC` garantiza un orden estable y reproducible tanto en los tests como en la interfaz web.

7. **Solo lectura y auditoría**:
   - `GET /turnos` es de solo lectura: no modifica tablas ni genera eventos en `evento_auditoria` (RN-GL-01).

## Alcance en dos tramos (API + pantalla Agenda)

Según `CHANGES.md` (§Paralelismo por fase y §C-07):

| Tramo | Gate | Qué incluye | Verificación |
|---|---|---|---|
| **Tramo 1 — API** | GATE 0 (listo ahora) | `GET /turnos?desde&hasta[&profesionalId][&sillonId][&incluirCancelados]`, caso de uso `consultarAgenda`, consulta SQLite con `JOIN`, índice de rango, tests unitarios y e2e | `npm test` + `npm run build` |
| **Tramo 2 — Pantalla Agenda** | GATE 0b (cuando `C-11` esté mergeado en `master`) | Mockup HTML en `openspec/changes/agenda-diaria-y-semanal/mockups/` (390x844 y 1440x900) aprobado por el líder -> pantalla `web/src/pages/Agenda.tsx` usando `design-system/tokens.css`, selector Día/Semana, flechas de fecha, filtros por profesional y sillón (alimentados por `GET /profesionales` y `GET /sillones` de C-11), checkbox "Mostrar cancelados", estados vacío/carga/error y columna de acciones lista para C-05 | Prueba manual contra mockup + capturas 390x844 y 1440x900 + `npm run build` en `web/` |

Referencia visual ya existente en `design-system/components.html` (revisión 1):
- Toolbar con control segmentado `Día | Semana` y navegación `‹ fecha ›` (sumar selects de profesional y sillón + checkbox "Mostrar cancelados").
- Tabla con columnas `Hora` (`tabular-nums`), `Paciente`, `Profesional`, `Sillón`, `Prestación`, `Estado` (insignias `badge-reservado`, `badge-confirmado`, `badge-atendido`, `badge-ausente`, `badge-cancelado`) y `Acciones` (vacía en C-07; botones llegan en C-05).
- Estilo `.cancelado` para turnos cancelados cuando se elige mostrarlos, más tarjetas de estado vacío y skeleton de carga.

## Decisiones propuestas (pendientes de confirmación antes de Propose)

| # | Tema | Opción recomendada | Alternativa | Qué desbloquea |
|---|---|---|---|---|
| 1 | Formato de `desde` y `hasta` | **ISO 8601 con offset obligatorio** (ej. `2026-12-01T00:00:00-03:00` a `2026-12-02T00:00:00-03:00`), consistente con `POST /turnos` y RN-AG-04. | Aceptar también `YYYY-MM-DD` interpretado en `America/Argentina/Buenos_Aires`. | Esquema HTTP y parsing en `domain/tiempo.ts`. |
| 2 | Error cuando `desde >= hasta` | **`400 SOLICITUD_INVALIDA`** (reutiliza el código existente de parámetros inválidos, sin agregar códigos fuera de `02_descripcion_general.md`). | `422` con código nuevo `RANGO_INVALIDO`. | Spec de error y `CodigoError`. |
| 3 | Contrato de respuesta de `GET /turnos` | **Objeto `{ turnos: [...] }`** donde cada ítem mantiene los campos de `TurnoCreado` (`id`, `pacienteId`, `profesionalId`, `sillonId`, `prestacionId`, `inicio`, `fin`, `duracionMin`, `estado`) + campos planos `pacienteNombre`, `profesionalNombre`, `sillonNombre`, `prestacionNombre`. | Array directo `[...]` en la raíz, o recursos anidados (`paciente: { id, nombre }`). | Contrato entre backend (Tramo 1) y pantalla Agenda (Tramo 2) + C-05. |
| 4 | Filtro por `profesionalId` o `sillonId` inexistente | **`200` con `{ turnos: [] }`** (comportamiento estándar de filtros sobre colecciones REST). | `404 RECURSO_INEXISTENTE`. | Comportamiento del caso de uso y tests. |
| 5 | Organización de la vista **Semana** en la pantalla Agenda (Tramo 2) | **Tabla agrupada por día** (cabecera de cada día o columna Fecha + Hora) reutilizando el componente tabla de `design-system/components.html`, legible tanto en escritorio como en móvil (390 px). | Grilla de 7 columnas por horario (requiere scroll horizontal intenso en móvil). | Mockup HTML en GATE 0b. |

## Escenarios candidatos para el spec (`US-020`)

| Tipo | Escenario | Resultado esperado |
|---|---|---|
| Feliz | Consulta de rango de un día con varios turnos | `200`, devuelve los turnos ordenados por inicio con nombres de paciente, profesional, sillón y prestación, y horas en `-03:00` |
| Feliz | Consulta de rango semanal (7 días) | `200`, incluye todos los turnos no cancelados dentro de los 7 días ordenados cronológicamente |
| Filtro | Filtrar por `profesionalId` | `200`, devuelve solo los turnos de ese profesional |
| Filtro | Filtrar por `sillonId` (y combinado con `profesionalId`) | `200`, devuelve solo los turnos que cumplen ambos filtros |
| Borde | Cancelados excluidos por defecto e incluidos con `incluirCancelados=true` | Sin flag (o `false`), oculta `cancelado` pero incluye `reservado`, `confirmado`, `ausente` y `atendido`; con `true`, incluye también `cancelado` |
| Borde | Turno que cruza el borde del rango (`inicio < desde < fin` o `inicio < hasta < fin`) | `200`, el turno SÍ se incluye porque interseca `[desde, hasta)` |
| Borde | Turnos contiguos fuera del rango (`fin === desde` o `inicio === hasta`) | `200`, NO se incluyen (semántica semiabierta RN-TU-02) |
| Error / Validación | Falta `desde` o `hasta`, fecha sin offset o `desde >= hasta` | `400 SOLICITUD_INVALIDA` con mensaje legible en español |

## Reglas de negocio cubiertas

- `RN-TU-02` (intervalos semiabiertos `[inicio, fin)` y superposición exclusivamente vía `Intervalo`).
- `RN-TU-10` (solo `cancelado` se considera liberado y se excluye por defecto; `ausente` y `atendido` siguen figurando).
- `RN-AG-04` (zona horaria `America/Argentina/Buenos_Aires`, sin offset hardcodeado).
- `RN-PA-01` (100 % datos ficticios en ejemplos, tests, mockups y capturas).
- `RN-GL-01` y `RN-GL-02` (sin efectos secundarios en errores ni lecturas; formato de error `{ error: { codigo, mensaje, detalle } }`).

## Siguiente paso

Confirmar las 5 decisiones propuestas con el usuario y avanzar a **Propose** (`openspec-propose`) para `agenda-diaria-y-semanal` (proposal, design, delta spec y tasks).
