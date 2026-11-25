# Spec Delta

## ADDED Requirements

### Requirement: Cancelar un turno
El sistema SHALL pasar a `cancelado` un turno `reservado` o `confirmado` cuando se pide `POST /turnos/:id/cancelar`, sin anticipación mínima. La respuesta es `200` con el turno actualizado. Desde ese momento el turno no ocupa al profesional ni al sillón.

#### Scenario: Cancelar un turno reservado
- **GIVEN** Paciente Ficticio Uno tiene un turno `reservado` con la Dra. Ana Prueba en el Sillón 1 de 10:00 a 10:30
- **WHEN** se pide `POST /turnos/:id/cancelar` para ese turno
- **THEN** la respuesta es `200`
- **AND** el turno devuelto tiene estado `cancelado` e inicio y fin sin cambios

#### Scenario: Cancelar un turno confirmado
- **GIVEN** un turno de la Dra. Ana Prueba de 10:00 a 10:30 en estado `confirmado`
- **WHEN** se pide `POST /turnos/:id/cancelar`
- **THEN** la respuesta es `200` y el turno queda `cancelado`

#### Scenario: Cancelar y volver a reservar el mismo horario con los mismos recursos
- **GIVEN** la Dra. Ana Prueba tiene un turno `reservado` de 10:00 a 10:30 en el Sillón 1
- **AND** un pedido de otro turno para la Dra. Ana Prueba en el Sillón 1 a las 10:00 responde `409`
- **WHEN** se cancela ese turno con `POST /turnos/:id/cancelar`
- **AND** se vuelve a pedir un turno para la Dra. Ana Prueba en el Sillón 1 de 10:00 a 10:30
- **THEN** la nueva reserva responde `201`
- **AND** la agenda tiene un turno `cancelado` y uno `reservado` en ese horario

### Requirement: Confirmar un turno
El sistema SHALL pasar a `confirmado` un turno `reservado` cuando se pide `POST /turnos/:id/confirmar`. La respuesta es `200` con el turno actualizado.

#### Scenario: Confirmar un turno reservado
- **GIVEN** un turno `reservado` de la Dra. Ana Prueba de 10:00 a 10:30
- **WHEN** se pide `POST /turnos/:id/confirmar`
- **THEN** la respuesta es `200` y el turno devuelto tiene estado `confirmado`

### Requirement: Marcar un turno como ausente o atendido
El sistema SHALL pasar a `ausente` o a `atendido` un turno `reservado` o `confirmado` cuando se pide `POST /turnos/:id/ausente` o `POST /turnos/:id/atendido`, sin restricción de fecha. La respuesta es `200` con el turno actualizado.

#### Scenario: Marcar atendido un turno confirmado
- **GIVEN** un turno `confirmado` de la Dra. Ana Prueba de 10:00 a 10:30
- **WHEN** se pide `POST /turnos/:id/atendido`
- **THEN** la respuesta es `200` y el turno queda `atendido`

#### Scenario: Marcar ausente un turno reservado
- **GIVEN** un turno `reservado` del Dr. Bruno Ejemplo de 11:00 a 11:30
- **WHEN** se pide `POST /turnos/:id/ausente`
- **THEN** la respuesta es `200` y el turno queda `ausente`

### Requirement: Rechazo de transiciones inválidas
El sistema MUST rechazar con `422` y código `TRANSICION_INVALIDA` toda transición que no esté en RN-TU-09. `cancelado`, `ausente` y `atendido` son estados finales, y repetir el estado actual también es inválido. El rechazo MUST NOT modificar el turno ni registrar auditoría.

#### Scenario: Cancelar un turno atendido
- **GIVEN** un turno de la Dra. Ana Prueba de 10:00 a 10:30 en estado `atendido`
- **WHEN** se pide `POST /turnos/:id/cancelar`
- **THEN** la respuesta es `422` con `error.codigo` `TRANSICION_INVALIDA` y un `error.mensaje` en español
- **AND** el turno sigue `atendido`
- **AND** la cantidad de eventos de auditoría no cambia

#### Scenario: Cancelar un turno ya cancelado
- **GIVEN** un turno en estado `cancelado`
- **WHEN** se pide `POST /turnos/:id/cancelar`
- **THEN** la respuesta es `422` con código `TRANSICION_INVALIDA`

#### Scenario: Confirmar un turno ausente
- **GIVEN** un turno en estado `ausente`
- **WHEN** se pide `POST /turnos/:id/confirmar`
- **THEN** la respuesta es `422` con código `TRANSICION_INVALIDA`

#### Scenario: Confirmar un turno ya confirmado
- **GIVEN** un turno en estado `confirmado`
- **WHEN** se pide `POST /turnos/:id/confirmar`
- **THEN** la respuesta es `422` con código `TRANSICION_INVALIDA`

### Requirement: Transición sobre un turno inexistente o con id inválido
El sistema MUST responder `404` con código `RECURSO_INEXISTENTE` si el turno no existe, y `400` con código `SOLICITUD_INVALIDA` si el id no es un entero positivo. En ambos casos no se modifica nada ni se registra auditoría.

#### Scenario: Turno inexistente
- **WHEN** se pide `POST /turnos/9999/cancelar` y no existe el turno 9999
- **THEN** la respuesta es `404` con código `RECURSO_INEXISTENTE`

#### Scenario: Id con formato inválido
- **WHEN** se pide `POST /turnos/abc/confirmar`
- **THEN** la respuesta es `400` con código `SOLICITUD_INVALIDA`

### Requirement: Los turnos ausentes y atendidos siguen ocupando la agenda
Un turno `ausente` o `atendido` MUST seguir ocupando al profesional y al sillón en su intervalo. Un nuevo turno que se superponga con él MUST rechazarse con `409`, igual que con un turno `reservado`.

#### Scenario: Turno atendido sigue bloqueando el sillón
- **GIVEN** la Dra. Ana Prueba tenía un turno de 10:00 a 10:30 en el Sillón 1 que se marcó `atendido`
- **WHEN** se pide un turno para el Dr. Bruno Ejemplo en el Sillón 1 de 10:00 a 10:30
- **THEN** la respuesta es `409` con código `TURNO_SOLAPADO_SILLON`

#### Scenario: Turno ausente sigue bloqueando al profesional
- **GIVEN** el Dr. Bruno Ejemplo tenía un turno de 11:00 a 11:30 en el Sillón 2 que se marcó `ausente`
- **WHEN** se pide un turno para el Dr. Bruno Ejemplo en el Sillón 1 de 11:00 a 11:30
- **THEN** la respuesta es `409` con código `TURNO_SOLAPADO_PROFESIONAL`

### Requirement: Auditoría de las transiciones
Cada transición aceptada SHALL registrar, en la misma operación, un evento de auditoría asociado al turno con la fecha y hora y los estados anterior y nuevo. La acción es `cancelado` al cancelar y `estado_cambiado` al confirmar o marcar ausente o atendido.

#### Scenario: Evento al cancelar
- **GIVEN** un turno `reservado`
- **WHEN** se cancela con éxito
- **THEN** existe un evento de auditoría `cancelado` de ese turno con estado anterior `reservado` y nuevo `cancelado`

#### Scenario: Evento al confirmar
- **GIVEN** un turno `reservado`
- **WHEN** se confirma con éxito
- **THEN** existe un evento de auditoría `estado_cambiado` de ese turno con estado anterior `reservado` y nuevo `confirmado`
