# Tasks

> Trazabilidad: cada escenario de `specs/agenda-turnos/spec.md` tiene un test con su mismo nombre. Todos los datos de prueba son ficticios.
>
> **Dos tramos (design D8, decisión P4)**: los grupos 1 a 4 (API) no esperan el mockup. Los grupos 5 y 6 (`web/`) **no arrancan** hasta que `design.md` diga `Approval: approved (…, by Nazareno)`.

## 1. Dominio: máquina de estados

- [x] 1.1 Escribir primero en `tests/domain/turno.test.ts` la tabla de las 25 combinaciones `desde × hacia` contra RN-TU-09 (incluye X → X inválido y los tres estados finales) y los casos de `exigirTransicion` (lanza `TRANSICION_INVALIDA` con `detalle` `{ estadoActual, estadoPedido }` y mensaje en español). Sumar `TRANSICION_INVALIDA` a `CodigoError` (`src/domain/errores.ts`) e implementar `TRANSICIONES`, `transicionValida` y `exigirTransicion` en `src/domain/turno.ts` (design D1); verificar que `npx vitest run tests/domain/turno.test.ts` pasa

## 2. Persistencia y caso de uso

- [x] 2.1 Escribir primero tests en `tests/infra/repositorios.test.ts` para `obtenerTurno` (existente y `undefined` si no existe) y `actualizarEstadoTurno` (cambia `estado` y `actualizado_en`, no toca el resto). Implementarlos en `src/infrastructure/sqlite/repositorios.ts` con sentencias preparadas fijas (design D3); verificar que los tests pasan
- [x] 2.2 Escribir primero `tests/application/cambiar-estado-turno.test.ts`: turno inexistente → `RECURSO_INEXISTENTE` sin auditoría; cancelar `reservado` → `cancelado` con evento `cancelado` y `antes`/`despues`; confirmar → evento `estado_cambiado`; transición inválida → `TRANSICION_INVALIDA` sin cambiar el turno ni auditar. Implementar `src/application/cambiar-estado-turno.ts` dentro de `enTransaccionInmediata` con reloj inyectable (design D2); verificar que los tests pasan

## 3. API: rutas de transición

- [x] 3.1 Escribir primero `tests/e2e/estado-turno.test.ts` con un `it` por escenario del delta de `agenda-turnos`:
  - Cancelar un turno reservado
  - Cancelar un turno confirmado
  - Cancelar y volver a reservar el mismo horario con los mismos recursos
  - Confirmar un turno reservado
  - Marcar atendido un turno confirmado
  - Marcar ausente un turno reservado
  - Cancelar un turno atendido
  - Cancelar un turno ya cancelado
  - Confirmar un turno ausente
  - Confirmar un turno ya confirmado
  - Turno inexistente
  - Id con formato inválido
  - Turno atendido sigue bloqueando el sillón
  - Turno ausente sigue bloqueando al profesional
  - Evento al cancelar
  - Evento al confirmar

  Usar `app.inject` y una base `:memory:` nueva por test; verificar que fallan (RED)
- [x] 3.2 Crear el plugin `src/http/rutas-estado-turno.ts` (mapa fijo acción → estado, `params` schema con `id` integer ≥ 1, `response` 200 schema, sin body schema) y registrarlo en `construirApp` con una línea; sumar `TRANSICION_INVALIDA: 422` en `ESTADO_HTTP` (design D4); verificar que `tests/e2e/estado-turno.test.ts` pasa y que `git diff src/http/app.ts` solo muestra el import, el registro y el 422
- [x] 3.3 Verificar el tramo API completo: `npm test` en la raíz todo en verde (los 123 previos más los nuevos) y `npm run build` sin errores

## 4. Documentación de la API

- [x] 4.1 Actualizar `README.md`: tabla con los cuatro endpoints de transición, sus respuestas (`200`, `404`, `422 TRANSICION_INVALIDA`, `400`), un ejemplo `curl` de cancelación con datos ficticios, y `TRANSICION_INVALIDA` en la tabla de códigos; verificar ejecutando el `curl` documentado contra la API levantada con una base temporal

## 5. `web/`: cliente y estilos (espera la aprobación del mockup)

- [ ] 5.1 Confirmar que `design.md` dice `Approval: approved`; si no, frenar acá
- [ ] 5.2 Escribir primero en `web/src/api/cliente.test.ts` los casos de `cambiarEstado` (URL `/api/turnos/:id/cancelar` y `/confirmar`, método POST sin cuerpo, normalización del 422 y `SIN_CONEXION`) y en `web/src/api/mensajes.test.ts` el texto y el tono `warning` de `TRANSICION_INVALIDA`. Implementarlos en `cliente.ts` y `mensajes.ts` (design D5); verificar que `cd web && npm test` pasa
- [ ] 5.3 Sumar `.btn-danger`, `.btn-danger:hover` y `.acciones-fila` a `web/src/estilos.css` con las mismas variables que `design-system/components.html`; verificar que `cd web && npm run build` compila

## 6. `web/`: botones en la Agenda

- [ ] 6.1 Agregar a `TablaTurnos` las props opcionales `onPedirCancelacion`, `onCancelar`, `onConfirmar`, `onVolver`, `turnoConfirmandoId` y `turnoOcupadoId` (design D6 y D9):
  - Botones en la columna Acciones: Confirmar solo en `reservado`; Cancelar en `reservado` y `confirmado`.
  - Confirmación en la fila: "¿Cancelar este turno? No se puede deshacer.", con "Sí, cancelar turno" (`btn-danger`) y "Volver". Tiene `role="group"`, foco inicial en "Volver" y `Escape` = Volver.
  - `tr.confirmando` en la fila que pregunta; el resto de las acciones deshabilitadas mientras hay una confirmación abierta o una acción en curso.

  Sumar `.confirmacion-fila` y `tr.confirmando` a `estilos.css`, iguales al mockup; verificar que `cd web && npm run build` y `npm run lint` pasan sin advertencias
- [ ] 6.2 En `Agenda.tsx`: estado `turnoConfirmandoId` ("Cancelar" lo abre, "Volver" o cambiar de fecha, vista o filtro lo cierran, sin llamar a la API); "Sí, cancelar turno" y "Confirmar" llaman a `cambiarEstado`; aviso de éxito o error arriba de la tabla (que se limpia al cambiar fecha, vista o filtro); recarga con `intento` salvo `SIN_CONEXION`. Verificar que `cd web && npm run build`, `npm run lint` y `npm test` pasan
- [ ] 6.3 Verificación manual con la API y la web levantadas, a 1440×900, contra cada estado del mockup: confirmar un turno reservado; cancelar uno confirmado (con "Sí, cancelar turno") y comprobar que el horario se puede volver a reservar desde Nuevo turno; abrir la confirmación y tocar "Volver" (y `Escape`) y comprobar que no cambia nada; provocar un 422 (cambiar el turno por la API antes de tocar el botón). Guardar capturas en `openspec/changes/cancelar-y-cambiar-estado-de-turno/verify/`, solo con datos ficticios

## 7. Integración

- [ ] 7.1 Verificación integral: `npm test` y `npm run build` en la raíz; `npm test`, `npm run build` y `npm run lint` en `web/`; todo en verde

## Workflow follow-up

- Verify del change (obligatorio por la consigna) con el informe en `docs/opsx/verify-cancelar-y-cambiar-estado-de-turno.md`.
- Commit por fase en la rama `lucas` y PR a `master`.
- Archive del change y `[x]` de C-05 en `CHANGES.md` después del merge.
