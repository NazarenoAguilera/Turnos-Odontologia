# Verificación — `agenda-diaria-y-semanal` (C-07)

**Fecha**: 2026-11-24
**Rama**: `lautaro` (base: commit `202ba70` más las correcciones y este informe de verify)
**Resultado**: **150 tests en verde** (123 en la raíz y 27 en `web/`), ambos builds compilan sin errores, el lint de `web/` no reporta advertencias y la pantalla **Agenda** fue probada manualmente contra los mockups aprobados con capturas a `1440×900` y `390×844`. Las **15/15** tareas de `tasks.md` están completas.

## Ejecución automática

| Dónde | Comando | Resultado |
|---|---|---|
| Raíz | `npm test` | 15 archivos, **123/123** en verde (92 heredados de C-01 + C-11 y **31 nuevos** de C-07) |
| Raíz | `npm run build` | `tsc -p tsconfig.json` sin errores |
| `web/` | `npm --prefix web test` | 3 archivos, **27/27** en verde (19 heredados de C-11 y **8 nuevos** de C-07) |
| `web/` | `npm --prefix web run lint` | `oxlint` sobre 15 archivos: **0 errores, 0 advertencias** |
| `web/` | `npm --prefix web run build` | `tsc -b && vite build` sin errores (26 módulos transformados) |

### Tests nuevos de C-07

En la raíz (**+31 tests**):

| Archivo | Tests nuevos | Qué cubren |
|---|---|---|
| `tests/e2e/agenda.test.ts` | 18 | Un test por cada uno de los 16 escenarios del spec + coerción inválida (`incluirCancelados=talvez`, `profesionalId=0`) + verificación de cero efectos en `turno` y `evento_auditoria` |
| `tests/domain/agenda.test.ts` | 6 | `intervaloDeRango` (válido, segundos con `floor`/`ceil`, rango vacío/invertido, fechas sin offset) y `filtrarTurnosEnRango` (borde inicial/final y exclusión de contiguos) |
| `tests/application/consultar-agenda.test.ts` | 4 | Caso feliz con orden y nombres completos, bordes semiabiertos, filtros/cancelados y rango invertido sin efectos |
| `tests/domain/tiempo.test.ts` | +1 | Reporte exacto del campo `desde` / `hasta` en `ErrorDeNegocio` de `instanteDesdeIso` |
| `tests/infra/esquema.test.ts` | +1 | Creación del índice `idx_turno_rango` junto a `idx_turno_profesional` e `idx_turno_sillon` |
| `tests/infra/repositorios.test.ts` | +1 | `listarTurnosEnRango` con `JOIN` de nombres, orden por `inicio_min, id`, filtros opcionales y cancelados |

En `web/` (**+8 tests**):

| Archivo | Tests nuevos | Qué cubren |
|---|---|---|
| `web/src/api/cliente.test.ts` | +4 | `obtenerCatalogosAgenda` en paralelo y `consultarAgenda` (querystring con/sin filtros, errores `400` y `SIN_CONEXION`) |
| `web/src/fechas.test.ts` | +4 | `sumarDias`, `lunesDeSemana`, `rangoAgenda` (día, semana y zona `Europe/Madrid` sin offset fijo), `fechaDeIso`, `tituloDia` y `tituloSemana` |

## Matriz escenario → test (16/16)

Todos los escenarios del delta spec `openspec/changes/agenda-diaria-y-semanal/specs/agenda-turnos/spec.md` están cubiertos 1-a-1 en `tests/e2e/agenda.test.ts`:

| # | Requisito | Escenario | Test (`tests/e2e/agenda.test.ts`) |
|---|---|---|---|
| 1 | Consultar agenda por rango diario y semanal | Caso feliz de agenda diaria con orden cronológico y nombres de recursos | `Requirement: Consultar agenda por rango diario y semanal › Caso feliz de agenda diaria con orden cronológico y nombres de recursos` |
| 2 | Consultar agenda por rango diario y semanal | Caso feliz de agenda semanal | `Requirement: Consultar agenda por rango diario y semanal › Caso feliz de agenda semanal` |
| 3 | Consultar agenda por rango diario y semanal | Rango sin turnos devuelve lista vacía | `Requirement: Consultar agenda por rango diario y semanal › Rango sin turnos devuelve lista vacía` |
| 4 | Intersección semiabierta con el rango consultado | Turno que cruza el borde inicial del rango | `Requirement: Intersección semiabierta con el rango consultado › Turno que cruza el borde inicial del rango` |
| 5 | Intersección semiabierta con el rango consultado | Turno que cruza el borde final del rango | `Requirement: Intersección semiabierta con el rango consultado › Turno que cruza el borde final del rango` |
| 6 | Intersección semiabierta con el rango consultado | Turnos contiguos a los bordes del rango quedan excluidos | `Requirement: Intersección semiabierta con el rango consultado › Turnos contiguos a los bordes del rango quedan excluidos` |
| 7 | Filtrado de agenda por profesional y por sillón | Filtrar por profesional | `Requirement: Filtrado de agenda por profesional y por sillón › Filtrar por profesional` |
| 8 | Filtrado de agenda por profesional y por sillón | Filtrar por sillón | `Requirement: Filtrado de agenda por profesional y por sillón › Filtrar por sillón` |
| 9 | Filtrado de agenda por profesional y por sillón | Filtrar por profesional y sillón combinados | `Requirement: Filtrado de agenda por profesional y por sillón › Filtrar por profesional y sillón combinados` |
| 10 | Filtrado de agenda por profesional y por sillón | Filtro por recurso inexistente devuelve lista vacía | `Requirement: Filtrado de agenda por profesional y por sillón › Filtro por recurso inexistente devuelve lista vacía` |
| 11 | Exclusión e inclusión de turnos cancelados | Cancelados excluidos por defecto y demás estados incluidos | `Requirement: Exclusión e inclusión de turnos cancelados › Cancelados excluidos por defecto y demás estados incluidos` |
| 12 | Exclusión e inclusión de turnos cancelados | Cancelados incluidos cuando incluirCancelados es true | `Requirement: Exclusión e inclusión de turnos cancelados › Cancelados incluidos cuando incluirCancelados es true` |
| 13 | Validación de parámetros de consulta de agenda | Rango invertido o vacío rechazado | `Requirement: Validación de parámetros de consulta de agenda › Rango invertido o vacío rechazado` |
| 14 | Validación de parámetros de consulta de agenda | Falta parámetro obligatorio hasta | `Requirement: Validación de parámetros de consulta de agenda › Falta parámetro obligatorio hasta` |
| 15 | Validación de parámetros de consulta de agenda | Fecha sin zona horaria rechazada | `Requirement: Validación de parámetros de consulta de agenda › Fecha sin zona horaria rechazada` |
| 16 | Validación de parámetros de consulta de agenda | Parámetro de consulta desconocido rechazado | `Requirement: Validación de parámetros de consulta de agenda › Parámetro de consulta desconocido rechazado` |

Por tipo de escenario:
- **Feliz:** 1, 2, 3, 7, 8, 9 y 12.
- **Error de negocio / validación:** 13, 14, 15 y 16.
- **Borde:** 4 (cruza borde inicial), 5 (cruza borde final), 6 (contiguos excluidos), 10 (recurso inexistente) y 11 (cancelados excluidos y estados `reservado`, `confirmado`, `ausente` y `atendido` incluidos).

## Correcciones realizadas durante el Verify

- **Eliminación de SQL interpolado en helpers de test**: se reemplazó `db.prepare(\`SELECT COUNT(*) AS n FROM ${tabla}\`)` en `tests/application/consultar-agenda.test.ts` y `tests/e2e/agenda.test.ts` por un mapa de sentencias SQL fijas (`SQL_CONTAR`), alineado con la regla dura del proyecto y el criterio aplicado en `C-01` y `C-11`.
- **Corrección previa en etapa de mockups (`390×844`)**: durante la revisión de previews del mockup (`openspec/changes/agenda-diaria-y-semanal/mockups/agenda.html`) se detectó desborde horizontal en móvil y se fijó `.app { grid-template-columns: minmax(0, 1fr); }`, `.page { min-width: 0; }` y `.table-wrap { width: 100%; max-width: 100%; min-width: 0; }`, llevado directamente a `web/src/estilos.css`.

## Verificación manual de la pantalla Agenda

**Hecha por Lautaro** contra los mockups aprobados (`Approval: approved (2026-11-24, by Nazareno)` en `openspec/changes/agenda-diaria-y-semanal/design.md`), con capturas tomadas en `1440×900` (escritorio) y `390×844` (móvil):

- Navegación habilitada entre **Nuevo turno** y **Agenda** en `web/src/components/Layout.tsx`.
- Vista **Día** y vista **Semana** (tabla agrupada por día) con controles `‹`, `›` y `Hoy`.
- Filtros por **Profesional**, **Sillón** y checkbox **Mostrar cancelados** (filas `.cancelado` tachadas e insignia gris).
- Estados completos verificados: carga (skeleton), vacío, error de API (`SIN_CONEXION` con `Reintentar`) y render con datos 100 % ficticios del seed.
- Referencia de mockups y previews aprobados en `openspec/changes/agenda-diaria-y-semanal/mockups/` (`index.html`, `agenda.html` y 12 capturas en `mockups/previews/`).

## Reglas duras

| Regla | Estado |
|---|---|
| Solo datos ficticios (`RN-PA-01`) | ✔ Seed ficticio en código, tests, mockups y capturas (`Paciente Ficticio Uno/Dos/Tres`, `Dra. Ana Prueba`, `Dr. Bruno Ejemplo`, `Dra. Carla Demo`) |
| SQL sin concatenar | ✔ `listarTurnosEnRango` usa una sentencia preparada fija con parámetros nombrados (`node:sqlite`); helpers de test corregidos a `SQL_CONTAR` fijo |
| Superposición solo con `Intervalo` (`RN-TU-02`) | ✔ `intervaloDeRango` y `filtrarTurnosEnRango` usan `Intervalo.seSuperponeCon()` en dominio/aplicación; la interfaz no calcula superposiciones |
| Sin offset `-03:00` fijo (`RN-AG-04`) | ✔ Backend usa `ZONA_CONSULTORIO` (`America/Argentina/Buenos_Aires`) en `tiempo.ts`; `web/src/fechas.ts` calcula offsets vía `Intl` y tests verifican con `Europe/Madrid` |
| Commits en español con prefijo en rama propia | ✔ Trabajo en rama `lautaro`, sin commits directos en `master` |
