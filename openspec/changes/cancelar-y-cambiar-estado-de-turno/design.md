# Design

## Context

- Motivación y alcance: ver `proposal.md`. Relevamiento y decisiones confirmadas (P1–P5, R1–R7): `docs/opsx/explore-cancelar-y-cambiar-estado-de-turno.md`.
- **Esquema**: el esquema de C-01 ya tiene todo lo necesario:
  - `turno.estado` con CHECK de los 5 estados y `actualizado_en`.
  - `evento_auditoria.accion` admite `cancelado` y `estado_cambiado`, y la tabla es de solo inserción (triggers).
- **Solapamientos**: `buscarTurnosQuePodrianChocar` ya excluye `estado = 'cancelado'`. Por eso liberar el horario no requiere lógica nueva, y `ausente`/`atendido` ya bloquean.
- **Concurrencia**: `enTransaccionInmediata` (BEGIN IMMEDIATE) ya existe y la usa `crearTurno`.
- **Errores**: `ErrorDeNegocio` y el mapa `ESTADO_HTTP` de `app.ts` traducen códigos a HTTP. Falta `TRANSICION_INVALIDA`.
- **Agenda (C-07)**:
  - `TablaTurnos` (presentacional) tiene una columna "Acciones" vacía y se usa en Día y en Semana.
  - `Agenda` recarga con el contador `intento`.
  - `estilos.css` no tiene `.btn-danger`.

## Goals / Non-Goals

**Goals:**
- Un único caso de uso para las cuatro transiciones, con la regla de RN-TU-09 en una función pura de dominio.
- Transición atómica: leer, validar, actualizar y auditar sin ventana para que otro pedido intercale.
- Botones Cancelar y Confirmar en la Agenda sin repetir la regla de negocio: la API decide y la pantalla recarga.

**Non-Goals:**
- `GET /turnos/:id` (la KB lo lista, pero ningún escenario de C-05 lo necesita).
- Deshacer una cancelación (RN-TU-09: `cancelado` es final).
- Restricciones por fecha u horario actual (R6).
- Botones Ausente y Atendido en la pantalla (P3), y vista móvil (P4).

## Decisions

### D1 — Máquina de estados como tabla en el dominio
`src/domain/turno.ts` suma la tabla `TRANSICIONES: Record<EstadoTurno, readonly EstadoTurno[]>` con RN-TU-09, más `transicionValida(desde, hacia): boolean` y `exigirTransicion(desde, hacia)`. Esta última lanza `ErrorDeNegocio('TRANSICION_INVALIDA', mensaje, { estadoActual, estadoPedido })`. El mensaje es en español, por ejemplo: "No se puede pasar un turno atendido a cancelado."
- **Por qué**: es la única fuente de la regla, sin `if` repartidos, y se testea con una tabla de las 25 combinaciones (5×5). Repetir el estado (X → X) es inválido porque no está en la tabla.
- **Alternativa**: validar en SQL con `UPDATE … WHERE estado IN (…)`. Se descarta porque la regla quedaría en la infraestructura y el error no podría decir de qué estado venía.

### D2 — Caso de uso único `cambiarEstadoTurno`
`src/application/cambiar-estado-turno.ts` → `cambiarEstadoTurno(db, turnoId, hacia, reloj)`. Dentro de `enTransaccionInmediata`:
1. `obtenerTurno(db, id)` → si no existe, `RECURSO_INEXISTENTE` con `{ recurso: 'turno', id }`.
2. `exigirTransicion(turno.estado, hacia)`.
3. `actualizarEstadoTurno(db, id, hacia, ahora)`, que actualiza `estado` y `actualizado_en`.
4. `insertarEventoAuditoria`: `accion` = `hacia === 'cancelado' ? 'cancelado' : 'estado_cambiado'`; `antes = { estado: anterior }`; `despues = { estado: hacia }`.
5. Devuelve el turno en la forma de `TurnoCreado` (R1), con `inicio`/`fin` a ISO usando `aIsoLocal`.

- **Por qué**: las cuatro acciones son la misma operación con distinto destino. Hacerlo todo dentro del lock (R2) evita que dos pedidos lean el mismo estado y que gane el último (RN-TU-13). Si cualquier paso falla, el ROLLBACK cumple RN-GL-01.
- **Tipo de retorno**: se reutiliza `TurnoCreado` de `crear-turno.ts`. Si queda raro el nombre, se puede renombrar a `TurnoDto` en el Apply sin cambiar el contrato HTTP.

### D3 — Repositorio
- `obtenerTurno(db, id)`: `SELECT id, paciente_id, profesional_id, sillon_id, prestacion_id, inicio_min, fin_min, duracion_min, estado FROM turno WHERE id = ?`.
- `actualizarEstadoTurno(db, id, estado, actualizadoEn)`: `UPDATE turno SET estado = ?, actualizado_en = ? WHERE id = ?`.

Las dos son sentencias preparadas fijas, sin SQL armado a mano.

### D4 — Rutas en un plugin, una por acción (P1, R4)
`src/http/rutas-estado-turno.ts` registra un mapa fijo `{ cancelar: 'cancelado', confirmar: 'confirmado', ausente: 'ausente', atendido: 'atendido' }` y, por cada entrada, `app.post('/turnos/:id/<accion>', …)`. Tiene:
- `params` schema: `id` integer ≥ 1. Así `abc` o `0` responden `400 SOLICITUD_INVALIDA` con el manejador de errores existente.
- `response` 200 schema con los campos de `TurnoCreado` y `additionalProperties: false`.
- Sin `body` schema: el cuerpo se ignora.

`app.ts` suma una línea (`app.register(rutasEstadoTurno, { db, reloj })`) y `TRANSICION_INVALIDA: 422` en `ESTADO_HTTP`.

- **Por qué un plugin**: igual que `rutas-catalogos.ts`, mantiene `app.ts` chico y evita choques con C-06.
- **Alternativa**: cuatro rutas escritas a mano. Se descarta porque solo cambia el estado destino.

### D5 — Cliente y mensajes en `web/`
- `cliente.ts` → `cambiarEstado(id: number, accion: 'cancelar' | 'confirmar'): Promise<Resultado<TurnoCreado>>` hace `POST /api/turnos/:id/<accion>` sin cuerpo, con el mismo `pedir` que normaliza errores y `SIN_CONEXION`.
- `mensajes.ts` suma `TRANSICION_INVALIDA` → título "El turno ya no se puede cambiar a ese estado", ayuda "Alguien lo modificó antes. Actualizamos la agenda con su estado actual.", tono `warning`.

### D6 — Botones en la Agenda (P2, P3, R7)
- **`TablaTurnos`** recibe props opcionales: `onPedirCancelacion?(turno)`, `onCancelar?(turno)`, `onConfirmar?(turno)`, `onVolver?()`, `turnoConfirmandoId?: number` y `turnoOcupadoId?: number`.
  - En la columna Acciones muestra **Confirmar** (`btn-secondary btn-sm`) si el turno está `reservado`, y **Cancelar** (`btn-danger btn-sm`) si está `reservado` o `confirmado`.
  - Ocultar los botones en otros estados es presentación: si alguien igual dispara la acción, la API responde 422.
  - Si `turnoConfirmandoId` es el de la fila, los botones de esa fila se reemplazan por la **confirmación en la fila**: el texto "¿Cancelar este turno? No se puede deshacer." arriba, y debajo "Sí, cancelar turno" (`btn-danger btn-sm`) y "Volver" (`btn-secondary btn-sm`). La fila se marca con `tr.confirmando`, que usa el fondo de peligro suave.
  - La confirmación tiene `role="group"` con un `aria-label` que nombra la hora del turno. Al abrirse, el foco va a **"Volver"**, la opción segura, y `Escape` equivale a "Volver".
  - Mientras una fila está confirmando, las acciones de las demás filas quedan deshabilitadas: hay una sola confirmación abierta a la vez.
  - Sigue siendo presentacional, así que los botones y la confirmación aparecen también en la vista Semana sin código extra.
- **`Agenda`** se encarga de la acción:
  1. **Cancelar**: el clic en "Cancelar" solo abre la confirmación en la fila (`turnoConfirmandoId`), sin llamar a la API. "Volver" la cierra sin cambios. Recién "Sí, cancelar turno" sigue con el paso 2. "Confirmar" no pide confirmación: no es irreversible, porque el turno sigue pudiendo cancelarse.
  2. Marca el turno como ocupado. El botón que disparó la acción ("Sí, cancelar turno" o "Confirmar") pasa a "Cancelando…" o "Confirmando…" con `aria-busy`, y todas las acciones de la tabla, incluido "Volver", se deshabilitan para evitar doble envío.
  3. Llama a `cambiarEstado`.
  4. Muestra un aviso arriba de la tabla:
     - Éxito: "Turno cancelado · <paciente> · <profesional> · <sillón> · HH:MM a HH:MM. El horario quedó libre.", o "Turno confirmado · …".
     - Error: `describirError`.
  5. Recarga con `setIntento(n + 1)`, salvo con `SIN_CONEXION`, donde no tiene sentido recargar. La agenda queda siempre con el estado real de la API, sin parchear la lista a mano.
  - El aviso desaparece al cambiar de fecha, vista o filtro. Cambiar de fecha, vista o filtro también cierra una confirmación abierta.
- **`estilos.css`** suma `.btn-danger` y `.btn-danger:hover`, iguales a `design-system/components.html`, y `.acciones-fila` (botones a la derecha).

### D7 — Tests
- **Dominio** (`tests/domain/turno.test.ts`): tabla de 25 combinaciones contra RN-TU-09, y `exigirTransicion` con su código y detalle.
- **Aplicación** (`tests/application/cambiar-estado-turno.test.ts`): turno inexistente, transición válida con auditoría, transición inválida sin cambios ni auditoría.
- **E2E** (`tests/e2e/estado-turno.test.ts`): un `it` por escenario del delta de `agenda-turnos`, con `app.inject` y base `:memory:` nueva. Los turnos en estados finales se preparan llamando a las rutas, no con UPDATE directo, salvo que haga falta un estado inalcanzable.
- **Web**: `cliente.test.ts` (URL, método y normalización) y `mensajes.test.ts` (`TRANSICION_INVALIDA`). La pantalla se prueba a mano contra el mockup.
- **Sin test de concurrencia nuevo** (P5).

### D8 — Orden en dos tramos (P4)
1. **API** (no espera el mockup): D1–D4 y sus tests, más README.
2. **Pantalla** (espera `Approval: approved`): D5–D6 y sus tests de `web/`.

### D9 — Ajuste del 2026-11-24: confirmación en la fila en lugar de `window.confirm`

**Cambio**: la decisión P2 del Explore (`window.confirm` antes de cancelar) se reemplaza por una confirmación **dentro de la misma fila** de la Agenda. Tiene el texto "¿Cancelar este turno? No se puede deshacer." y dos botones: **"Sí, cancelar turno"** (peligro) y **"Volver"**. Los detalles de comportamiento y accesibilidad están en D6.

**Motivo**: en un navegador en español, el diálogo nativo muestra "Aceptar" y "Cancelar". En esta pantalla, "Cancelar" significa *no* cancelar el turno, y eso es confuso justo en una acción irreversible (`cancelado` es un estado final). Con la confirmación en la fila, el botón dice lo que hace ("Sí, cancelar turno"), la salida segura dice "Volver", y la pregunta queda al lado del turno afectado. Además, sigue el design-system (colores y botones de `tokens.css`) en lugar de un diálogo cuyo aspecto depende del navegador.

**Alternativas**:
- Mantener `window.confirm` con una pregunta bien redactada: no elimina la ambigüedad del botón "Cancelar".
- Un modal propio: más código y manejo de foco, y saca la pregunta del contexto de la fila.

## Risks / Trade-offs

- [La confirmación en la fila ensancha la columna de acciones] → La pregunta va en su propia línea, arriba de los botones, con un ancho máximo. Así las demás columnas no se aprietan (se comprobó en el mockup a 1440×900). La fila confirmando queda más alta mientras dura la pregunta.
- [Dos pedidos simultáneos sobre el mismo turno] → BEGIN IMMEDIATE serializa y el segundo ve el estado nuevo y recibe 422. Sin test de concurrencia nuevo (P5), es el mismo mecanismo probado en C-01.
- [Marcar `atendido` un turno futuro] → Se permite (R6). La KB no lo prohíbe y no se inventa una regla.
- [Recarga completa de la agenda después de cada acción] → Una consulta más por clic. Es aceptable para 2 a 5 profesionales y evita que la tabla muestre un estado distinto al de la base.
- [`TurnoCreado` como nombre de retorno de una transición] → Es solo un nombre interno; el contrato HTTP es el mismo que el de `POST /turnos`.

## Migration Plan

Sin migraciones: el esquema no cambia. Para revertir, alcanza con revertir los commits del change.

## UI Mockups

Design system revision: 1
Approval: pending

Mockups en `openspec/changes/cancelar-y-cambiar-estado-de-turno/mockups/`. Parten de la Agenda de C-07 aprobada por Nazareno (mismos estilos y datos) y suman la columna de acciones. Importan `../../../../design-system/tokens.css`. Solo escritorio (P4).

| Archivo | Qué muestra |
|---|---|
| `index.html` | Índice con un enlace por estado |
| `agenda.html?estado=acciones` | Confirmar y Cancelar en el turno `reservado`; solo Cancelar en el `confirmado`; nada en `atendido` y `ausente` |
| `agenda.html?estado=confirmar-cancelacion` | Confirmación en la fila: "¿Cancelar este turno? No se puede deshacer.", con "Sí, cancelar turno" (peligro) y "Volver"; las demás acciones deshabilitadas |
| `agenda.html?estado=cancelando` | "Sí, cancelar turno" pasa a "Cancelando…" y "Volver" se deshabilita |
| `agenda.html?estado=cancelado-ok` | Aviso "Turno cancelado"; la fila ya no aparece tras recargar (cancelados ocultos) |
| `agenda.html?estado=confirmado-ok` | Aviso "Turno confirmado"; la insignia pasa a Confirmado y queda solo Cancelar |
| `agenda.html?estado=error-422` | Aviso `422 TRANSICION_INVALIDA`; la agenda recargada muestra el turno como Atendido, sin acciones |

Capturas a 1440×900 en `mockups/previews/agenda-<estado>-desktop-1440x900.png`. Todos los datos son ficticios.

Para aprobar, el líder cambia la línea a `Approval: approved (<fecha>, by Nazareno)`.
