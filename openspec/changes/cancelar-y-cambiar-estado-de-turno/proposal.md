# Proposal

## Why

Hoy un turno solo se puede crear: si el paciente avisa que no viene, recepción no tiene cómo liberar el horario, y la agenda tampoco refleja si el turno se confirmó, se atendió o el paciente faltó. Un turno mal cargado bloquea al profesional y al sillón para siempre.

**Por qué este change**: completa el "MVP defendible" de la entrega del 25/11 (C-01 + C-07 + C-05). Sin él, la agenda que ya muestra C-07 no se puede corregir. Cubre US-011 y US-013 con reglas verificables (máquina de estados de RN-TU-09, y "solo `cancelado` libera" de RN-TU-10). Además es chico, porque el esquema y la auditoría de C-01 ya admiten estos estados.

## What Changes

- Cuatro endpoints de transición sin cuerpo, uno por acción (decisión P1 del Explore):
  - `POST /turnos/:id/cancelar` → `cancelado`
  - `POST /turnos/:id/confirmar` → `confirmado`
  - `POST /turnos/:id/ausente` → `ausente`
  - `POST /turnos/:id/atendido` → `atendido`
- Máquina de estados de RN-TU-09: `reservado` → `confirmado` | `cancelado` | `ausente` | `atendido`; `confirmado` → `cancelado` | `ausente` | `atendido`; `cancelado`, `ausente` y `atendido` son finales. Cualquier otra transición responde `422 TRANSICION_INVALIDA` y no cambia nada.
- Respuesta `200` con el turno actualizado, en la misma forma que `POST /turnos`. Turno inexistente → `404 RECURSO_INEXISTENTE`; id con formato inválido → `400 SOLICITUD_INVALIDA`.
- Cancelar libera al profesional y al sillón: se puede volver a reservar ese mismo horario. `ausente` y `atendido` siguen ocupando (RN-TU-10). No hay anticipación mínima ni restricción de fecha (RN-TU-11).
- Cada transición deja un evento de auditoría en la misma transacción: `cancelado`, o `estado_cambiado` para las otras tres, con el estado anterior y el nuevo. Un rechazo no deja evento (RN-AU-01, RN-GL-01).
- Pantalla Agenda (C-07), solo escritorio:
  - Botón **Cancelar** en los turnos `reservado` y `confirmado`, con confirmación (`window.confirm`) antes de llamar a la API.
  - Botón **Confirmar** en los turnos `reservado`.
  - Aviso de resultado (éxito o error) y recarga de la agenda después de cada acción.
- Mockup de la Agenda con los botones en `mockups/` para que lo apruebe el líder.
- **Fuera de alcance**:
  - Botones Ausente y Atendido en la pantalla (P3): quedan solo en la API.
  - Reprogramar (C-06).
  - Roles y usuario en la auditoría (C-08).
  - Vista móvil.
  - Un test de concurrencia nuevo para las transiciones (P5).

## Capabilities

### New Capabilities
- (ninguna)

### Modified Capabilities
- `agenda-turnos`: se agregan los requisitos de cancelar, confirmar y marcar ausente o atendido; el rechazo de transiciones inválidas; que `ausente` y `atendido` sigan ocupando el horario, y la auditoría de las transiciones. La spec ya anticipaba que cancelar y reprogramar la iban a extender.

## Impact

- **Backend**:
  - `src/domain/`: `transicionValida` y el código `TRANSICION_INVALIDA`.
  - `src/application/`: caso de uso `cambiarEstadoTurno`.
  - `src/infrastructure/sqlite/repositorios.ts`: `obtenerTurno` y `actualizarEstadoTurno`.
  - Plugin nuevo `src/http/rutas-estado-turno.ts`, más una línea en `app.ts` y el 422 en el mapa de errores.
- **Tests**: unitarios de la máquina de estados, de aplicación y e2e por escenario.
- **Frontend**:
  - `web/src/api/cliente.ts`: función de transición.
  - `web/src/api/mensajes.ts`: texto de `TRANSICION_INVALIDA`.
  - `web/src/components/TablaTurnos.tsx`: botones en la columna Acciones.
  - `web/src/pages/Agenda.tsx`: acción, aviso y recarga.
  - `web/src/estilos.css`: `.btn-danger` del design-system.
- **Datos**: sin cambios de esquema. Las columnas y los valores de auditoría ya existen desde C-01.
- **Documentación**: la tabla API de `knowledge-base/02_descripcion_general.md` ya se corrigió en el Explore. El README suma los endpoints nuevos.
- **Equipo**: la API arranca apenas se apruebe este Propose. La pantalla espera la aprobación del mockup por Nazareno (P4).
