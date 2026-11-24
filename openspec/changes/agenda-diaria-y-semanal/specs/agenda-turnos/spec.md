# Spec Delta

## ADDED Requirements

### Requirement: Consultar agenda por rango diario y semanal
El sistema SHALL exponer `GET /turnos` con `desde` y `hasta` (ISO 8601 con offset) para consultar la agenda diaria o semanal. SHALL responder `200` con `{ "turnos": [...] }` ordenados por inicio ascendente (desempate por `id`), incluyendo IDs y nombres de paciente, profesional, sillón y prestación, duración, estado y horas locales en `America/Argentina/Buenos_Aires`.

#### Scenario: Caso feliz de agenda diaria con orden cronológico y nombres de recursos
- **GIVEN** el martes 2026-12-01 existen un turno para Paciente Ficticio Dos con Dr. Bruno Ejemplo en Sillón 2 (Consulta, 11:00 a 11:15) y otro para Paciente Ficticio Uno con Dra. Ana Prueba en Sillón 1 (Limpieza, 09:00 a 09:30), creados en ese orden
- **WHEN** se consulta `GET /turnos?desde=2026-12-01T00:00:00-03:00&hasta=2026-12-02T00:00:00-03:00`
- **THEN** la respuesta es `200`
- **AND** `turnos` contiene 2 elementos ordenados por inicio: primero el de 09:00 y segundo el de 11:00
- **AND** el primer elemento incluye `pacienteNombre` `"Paciente Ficticio Uno"`, `profesionalNombre` `"Dra. Ana Prueba"`, `sillonNombre` `"Sillón 1"`, `prestacionNombre` `"Limpieza"`, `inicio` `"2026-12-01T09:00:00-03:00"`, `fin` `"2026-12-01T09:30:00-03:00"`, `duracionMin` 30 y `estado` `"reservado"`

#### Scenario: Caso feliz de agenda semanal
- **GIVEN** existen un turno el martes 2026-12-01 a las 10:00, otro el viernes 2026-12-04 a las 15:00 y un tercero fuera de la semana el lunes 2026-12-07 a las 09:00
- **WHEN** se consulta `GET /turnos?desde=2026-11-30T00:00:00-03:00&hasta=2026-12-07T00:00:00-03:00`
- **THEN** la respuesta es `200`
- **AND** `turnos` contiene únicamente los 2 turnos de esa semana, ordenados cronológicamente (martes primero, viernes después)

#### Scenario: Rango sin turnos devuelve lista vacía
- **GIVEN** no hay turnos cargados para el miércoles 2026-12-02
- **WHEN** se consulta `GET /turnos?desde=2026-12-02T00:00:00-03:00&hasta=2026-12-03T00:00:00-03:00`
- **THEN** la respuesta es `200`
- **AND** el cuerpo es `{ "turnos": [] }`

### Requirement: Intersección semiabierta con el rango consultado
El sistema SHALL determinar qué turnos pertenecen a una consulta usando la intersección de intervalos semiabiertos (`turno.inicio < hasta` y `desde < turno.fin`) a través del value object `Intervalo`. Un turno que cruza cualquiera de los bordes del rango MUST incluirse, mientras que un turno contiguo que termina exactamente en `desde` o comienza exactamente en `hasta` MUST excluirse.

#### Scenario: Turno que cruza el borde inicial del rango
- **GIVEN** la Dra. Ana Prueba tiene un turno en Sillón 1 de `2026-12-01T09:30:00-03:00` a `2026-12-01T10:30:00-03:00`
- **WHEN** se consulta `GET /turnos?desde=2026-12-01T10:00:00-03:00&hasta=2026-12-01T12:00:00-03:00`
- **THEN** la respuesta es `200`
- **AND** `turnos` incluye el turno de 09:30 a 10:30

#### Scenario: Turno que cruza el borde final del rango
- **GIVEN** la Dra. Ana Prueba tiene un turno en Sillón 1 de `2026-12-01T11:30:00-03:00` a `2026-12-01T12:30:00-03:00`
- **WHEN** se consulta `GET /turnos?desde=2026-12-01T10:00:00-03:00&hasta=2026-12-01T12:00:00-03:00`
- **THEN** la respuesta es `200`
- **AND** `turnos` incluye el turno de 11:30 a 12:30

#### Scenario: Turnos contiguos a los bordes del rango quedan excluidos
- **GIVEN** existen un turno de `2026-12-01T09:30:00-03:00` a `2026-12-01T10:00:00-03:00` y otro de `2026-12-01T12:00:00-03:00` a `2026-12-01T12:30:00-03:00`
- **WHEN** se consulta `GET /turnos?desde=2026-12-01T10:00:00-03:00&hasta=2026-12-01T12:00:00-03:00`
- **THEN** la respuesta es `200`
- **AND** `turnos` está vacío

### Requirement: Filtrado de agenda por profesional y por sillón
El sistema SHALL aceptar los parámetros opcionales `profesionalId` y `sillonId` (enteros positivos) en `GET /turnos` para restringir los resultados de forma individual o combinada. Cuando un filtro apunta a un recurso sin turnos o inexistente, el sistema SHALL responder `200` con `{ "turnos": [] }`.

#### Scenario: Filtrar por profesional
- **GIVEN** el martes 2026-12-01 la Dra. Ana Prueba tiene un turno a las 10:00 en Sillón 1 y el Dr. Bruno Ejemplo tiene un turno a las 10:00 en Sillón 2
- **WHEN** se consulta `GET /turnos` para ese día con `profesionalId` de la Dra. Ana Prueba
- **THEN** la respuesta es `200`
- **AND** `turnos` contiene únicamente el turno de la Dra. Ana Prueba

#### Scenario: Filtrar por sillón
- **GIVEN** el martes 2026-12-01 la Dra. Ana Prueba tiene un turno a las 10:00 en Sillón 1 y el Dr. Bruno Ejemplo tiene un turno a las 10:00 en Sillón 2
- **WHEN** se consulta `GET /turnos` para ese día con `sillonId` de Sillón 2
- **THEN** la respuesta es `200`
- **AND** `turnos` contiene únicamente el turno en Sillón 2

#### Scenario: Filtrar por profesional y sillón combinados
- **GIVEN** el martes 2026-12-01 la Dra. Ana Prueba tiene un turno a las 10:00 en Sillón 1 y otro a las 11:00 en Sillón 2, y el Dr. Bruno Ejemplo tiene un turno a las 12:00 en Sillón 1
- **WHEN** se consulta `GET /turnos` para ese día con `profesionalId` de la Dra. Ana Prueba y `sillonId` de Sillón 1
- **THEN** la respuesta es `200`
- **AND** `turnos` contiene únicamente el turno de las 10:00

#### Scenario: Filtro por recurso inexistente devuelve lista vacía
- **GIVEN** existen turnos cargados el martes 2026-12-01
- **WHEN** se consulta `GET /turnos` para ese día con `profesionalId=999`
- **THEN** la respuesta es `200`
- **AND** `turnos` está vacío

### Requirement: Exclusión e inclusión de turnos cancelados
El sistema SHALL excluir los turnos en estado `cancelado` por defecto en `GET /turnos`, manteniendo los turnos en estados `reservado`, `confirmado`, `ausente` y `atendido`. Cuando se envía `incluirCancelados=true`, el sistema SHALL incluir también los turnos en estado `cancelado`.

#### Scenario: Cancelados excluidos por defecto y demás estados incluidos
- **GIVEN** el martes 2026-12-01 existen cinco turnos en horarios distintos con estados `reservado`, `confirmado`, `ausente`, `atendido` y `cancelado`
- **WHEN** se consulta `GET /turnos` para ese día sin `incluirCancelados`
- **THEN** la respuesta es `200`
- **AND** `turnos` contiene los 4 turnos no cancelados (`reservado`, `confirmado`, `ausente` y `atendido`) y excluye el `cancelado`

#### Scenario: Cancelados incluidos cuando incluirCancelados es true
- **GIVEN** el martes 2026-12-01 existen un turno `reservado` a las 10:00 y un turno `cancelado` a las 11:00
- **WHEN** se consulta `GET /turnos` para ese día con `incluirCancelados=true`
- **THEN** la respuesta es `200`
- **AND** `turnos` contiene ambos turnos ordenados por inicio, con sus estados respectivos

### Requirement: Validación de parámetros de consulta de agenda
El sistema MUST rechazar con `400` y código `SOLICITUD_INVALIDA` toda consulta a `GET /turnos` a la que le falte `desde` o `hasta`, que incluya fechas sin offset horario o mal formadas, que tenga un rango vacío o invertido (`desde >= hasta`), que reciba tipos inválidos en los filtros o que envíe parámetros desconocidos. La consulta MUST NOT modificar datos ni generar eventos de auditoría.

#### Scenario: Rango invertido o vacío rechazado
- **WHEN** se consulta `GET /turnos?desde=2026-12-01T12:00:00-03:00&hasta=2026-12-01T10:00:00-03:00`
- **THEN** la respuesta es `400` con código `SOLICITUD_INVALIDA` y un mensaje legible en español

#### Scenario: Falta parámetro obligatorio hasta
- **WHEN** se consulta `GET /turnos?desde=2026-12-01T00:00:00-03:00`
- **THEN** la respuesta es `400` con código `SOLICITUD_INVALIDA`

#### Scenario: Fecha sin zona horaria rechazada
- **WHEN** se consulta `GET /turnos?desde=2026-12-01T00:00:00&hasta=2026-12-02T00:00:00-03:00`
- **THEN** la respuesta es `400` con código `SOLICITUD_INVALIDA`

#### Scenario: Parámetro de consulta desconocido rechazado
- **WHEN** se consulta `GET /turnos?desde=2026-12-01T00:00:00-03:00&hasta=2026-12-02T00:00:00-03:00&campoExtra=1`
- **THEN** la respuesta es `400` con código `SOLICITUD_INVALIDA`
