# Tasks

> Trazabilidad: cada escenario de `specs/agenda-turnos/spec.md` tiene al menos un test con su nombre. Todos los datos de prueba son ficticios (RN-PA-01).

## 1. Dominio y tiempo (Tramo 1 — API)

- [x] 1.1 Parametrizar `instanteDesdeIso(iso, campo = 'inicio')` en `src/domain/tiempo.ts` para reportar `desde` o `hasta` en `ErrorDeNegocio`, y verificar con tests unitarios en `tests/domain/tiempo.test.ts` (fechas con offset válido, rechazo sin offset informando el campo exacto y conversión en `America/Argentina/Buenos_Aires`).
- [x] 1.2 Agregar un helper de dominio para construir el `Intervalo` del rango `[desde, hasta)` (validando `desde < hasta` → `400 SOLICITUD_INVALIDA` y convirtiendo los extremos con `Math.floor`/`Math.ceil` a minutos Unix enteros) y verificar con tests unitarios de bordes en `tests/domain/` (cruza borde inicial, cruza borde final, contiguo antes y después excluido, rango vacío/invertido rechazado).

## 2. Persistencia SQLite (Tramo 1 — API)

- [x] 2.1 Agregar `CREATE INDEX IF NOT EXISTS idx_turno_rango ON turno (inicio_min, fin_min)` en `src/infrastructure/sqlite/esquema.ts` y verificar en `tests/infra/esquema.test.ts` que el índice se crea en una base `:memory:` nueva.
- [x] 2.2 Implementar `listarTurnosEnRango(db, filtro)` en `src/infrastructure/sqlite/repositorios.ts` con sentencia preparada y parámetros nombrados (sin concatenar valores), `JOIN` a `paciente`, `profesional`, `sillon` y `prestacion`, filtros opcionales y `ORDER BY t.inicio_min ASC, t.id ASC`; verificar con tests en `tests/infra/repositorios.test.ts`.

## 3. Caso de uso `consultarAgenda` (Tramo 1 — API)

- [x] 3.1 Implementar `src/application/consultar-agenda.ts` (`consultarAgenda(db, consulta)`): parsea `desde` y `hasta`, construye el `Intervalo` del rango, consulta el repositorio, confirma la intersección con `Intervalo.seSuperponeCon()`, compone `pacienteNombre` (`nombre + ' ' + apellido`) y formatea `inicio` y `fin` con `aIsoLocal()`; verificar con tests en `tests/application/consultar-agenda.test.ts`.

## 4. Endpoint HTTP `GET /turnos` y tests e2e (Tramo 1 — API)

- [x] 4.1 Registrar `GET /turnos` en `src/http/app.ts` con JSON Schema de `querystring` (`required: ['desde', 'hasta']`, `additionalProperties: false`, enteros positivos opcionales `profesionalId` y `sillonId`, booleano opcional `incluirCancelados`) respondiendo `200` con `{ turnos }`.
- [x] 4.2 Escribir tests e2e con `app.inject()` en `tests/e2e/agenda.test.ts`, uno por cada escenario de `specs/agenda-turnos/spec.md` (agenda diaria con orden y nombres, agenda semanal, rango vacío, turno que cruza borde inicial, turno que cruza borde final, contiguos excluidos, filtro por profesional, filtro por sillón, filtros combinados, recurso inexistente, cancelados excluidos con `reservado`/`confirmado`/`ausente`/`atendido` incluidos, `incluirCancelados=true`, rango invertido/vacío, falta `hasta`, fecha sin zona horaria, parámetro desconocido) más casos de coerción inválida (`incluirCancelados=talvez`, `profesionalId=0`) y verificación de cero efectos en `turno` y `evento_auditoria`.
- [x] 4.3 Verificar integración de Tramo 1: correr `npm test` y `npm run build` en la raíz y confirmar todos los tests (C-01 + C-07) y la compilación en verde.

## 5. Diseño visual — Mockups de pantalla Agenda (Tramo 2 — GATE 0b, tras merge de `C-11`)

- [ ] 5.1 Sincronizar la rama `lautaro` con `git pull origin master` una vez mergeado `C-11` (`interfaz-web-base`) y verificar el layout y endpoints de catálogos disponibles en `web/`.
- [ ] 5.2 Crear los mockups HTML en `openspec/changes/agenda-diaria-y-semanal/mockups/` importando `../../../../design-system/tokens.css` (revisión 1) y usando solo datos ficticios, cubriendo vista Día, vista Semana (tabla agrupada por día), Mostrar cancelados activo, Vacío, Carga (skeleton) y Error.
- [ ] 5.3 Renderizar capturas a 390×844 y 1440×900 en `openspec/changes/agenda-diaria-y-semanal/mockups/previews/` y obtener aprobación del líder (`Approval: approved` en `design.md`) antes de comenzar la Sección 6.

## 6. Pantalla Agenda en `web/` (Tramo 2 — tras aprobación de mockups)

- [ ] 6.1 Agregar la función cliente `consultarAgenda` en `web/src/api/` consumiendo `GET /api/turnos` y reutilizando el manejo de errores `{ codigo, mensaje }` de `C-11`.
- [ ] 6.2 Implementar `web/src/pages/Agenda.tsx` e integrarla en la navegación lateral del layout de `C-11`: selector Día / Semana, flechas `‹` / `›`, cálculo de `[desde, hasta)` en `America/Argentina/Buenos_Aires`, filtros de profesional y sillón (alimentados por `/api/profesionales` y `/api/sillones`), checkbox "Mostrar cancelados", tabla (agrupada por día en Semana) con insignias de estado, estilo `.cancelado`, columna de acciones preparada para `C-05` y estados vacío/carga/error usando exclusivamente variables de `design-system/tokens.css`.
- [ ] 6.3 Verificar que `npm run build` dentro de `web/` compila sin errores de TypeScript ni Vite.

## 7. Verify y cierre

- [ ] 7.1 Correr `npm test` y `npm run build` en la raíz y `npm run build` en `web/`; probar la pantalla Agenda manualmente contra el mockup aprobado con capturas a 390×844 y 1440×900 y registrar la verificación más la matriz escenario → test en `docs/opsx/verify-agenda-diaria-y-semanal.md`.

## Workflow follow-up

- Verify obligatorio: confirmar cobertura 100 % de los escenarios del spec y pruebas manuales con capturas.
- Archive: ejecutar `openspec-archive-change` para sincronizar `openspec/specs/agenda-turnos/spec.md` y archivar el change.
- Al archivar: marcar `C-07` como `[x]` en `CHANGES.md` y notificar el desbloqueo de GATE 0c para `C-05`.
