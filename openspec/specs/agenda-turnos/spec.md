# agenda-turnos Specification

## Purpose

Permite reservar turnos en la agenda de un consultorio odontológico garantizando que un turno nunca se superponga con otro del mismo profesional ni del mismo sillón/box.

> Convenciones de los escenarios: todos los datos son ficticios. "Dra. Ana Prueba" y "Dr. Bruno Ejemplo" son profesionales; "Sillón 1" y "Sillón 2" son sillones; "Limpieza" es una prestación de 30 minutos; "Paciente Ficticio Uno" es un paciente. Las horas son locales del consultorio (America/Argentina/Buenos_Aires, UTC−03:00) del martes 2026-12-01, salvo que se indique otra cosa.

## Requirements

### Requirement: Crear un turno reservado
El sistema SHALL crear un turno para un paciente, un profesional, un sillón/box y una prestación existentes y activos cuando el intervalo [inicio, fin) está libre para ese profesional y ese sillón. El turno queda en estado `reservado`, fin = inicio + duración, y la respuesta es `201` con el turno creado. La duración por defecto es la de la prestación.

#### Scenario: Caso feliz con la duración de la prestación
- **GIVEN** la Dra. Ana Prueba y el Sillón 1 no tienen turnos el martes 2026-12-01
- **WHEN** se pide `POST /turnos` para Paciente Ficticio Uno, Dra. Ana Prueba, Sillón 1 y Limpieza con inicio `2026-12-01T10:00:00-03:00` y sin duración
- **THEN** la respuesta es `201`
- **AND** el turno tiene estado `reservado`, `duracionMin` 30, inicio `2026-12-01T10:00:00-03:00` y fin `2026-12-01T10:30:00-03:00`

#### Scenario: Duración indicada al crear
- **GIVEN** la Dra. Ana Prueba y el Sillón 1 están libres
- **WHEN** se crea un turno de Limpieza a las 10:00 con `duracionMin` 45
- **THEN** la respuesta es `201` y el turno termina a las 10:45

### Requirement: Sin solapamiento por profesional
El sistema MUST rechazar la creación de un turno cuyo intervalo se superpone con el de otro turno no cancelado del mismo profesional, aunque sea en otro sillón. La respuesta es `409` con código `TURNO_SOLAPADO_PROFESIONAL` y el detalle de los turnos en conflicto, y no se persiste nada.

#### Scenario: Superposición parcial con el mismo profesional
- **GIVEN** la Dra. Ana Prueba tiene un turno reservado de 10:00 a 10:30 en el Sillón 1
- **WHEN** se pide un turno para la Dra. Ana Prueba en el Sillón 2 de 10:15 a 10:45
- **THEN** la respuesta es `409` con código `TURNO_SOLAPADO_PROFESIONAL`
- **AND** el detalle incluye el turno de 10:00 a 10:30 con recurso `profesional`
- **AND** la agenda conserva un único turno de la Dra. Ana Prueba

#### Scenario: Turno contenido dentro de otro del mismo profesional
- **GIVEN** el Dr. Bruno Ejemplo tiene un turno de 10:00 a 11:30 en el Sillón 1
- **WHEN** se pide un turno para el Dr. Bruno Ejemplo en el Sillón 2 de 10:30 a 11:00
- **THEN** la respuesta es `409` con código `TURNO_SOLAPADO_PROFESIONAL`

### Requirement: Sin solapamiento por sillón
El sistema MUST rechazar la creación de un turno cuyo intervalo se superpone con el de otro turno no cancelado del mismo sillón/box, aunque sea de otro profesional. La respuesta es `409` con código `TURNO_SOLAPADO_SILLON` y el detalle de los turnos en conflicto, y no se persiste nada.

#### Scenario: Mismo sillón ocupado por otro profesional
- **GIVEN** la Dra. Ana Prueba tiene un turno de 10:00 a 10:30 en el Sillón 1
- **WHEN** se pide un turno para el Dr. Bruno Ejemplo en el Sillón 1 de 10:15 a 10:45
- **THEN** la respuesta es `409` con código `TURNO_SOLAPADO_SILLON`
- **AND** el detalle incluye el turno de 10:00 a 10:30 con recurso `sillon`

### Requirement: Informe de ambos conflictos
Cuando el turno pedido choca a la vez con un turno del mismo profesional y con un turno del mismo sillón, el sistema SHALL responder `409` con código `TURNO_SOLAPADO_PROFESIONAL` e incluir en el detalle todos los conflictos, indicando el recurso de cada uno (`profesional` o `sillon`).

#### Scenario: Profesional y sillón ocupados
- **GIVEN** la Dra. Ana Prueba tiene un turno de 10:00 a 10:30 en el Sillón 2
- **AND** el Dr. Bruno Ejemplo tiene un turno de 10:00 a 10:30 en el Sillón 1
- **WHEN** se pide un turno para la Dra. Ana Prueba en el Sillón 1 de 10:00 a 10:30
- **THEN** la respuesta es `409` con código `TURNO_SOLAPADO_PROFESIONAL`
- **AND** el detalle incluye un conflicto con recurso `profesional` y otro con recurso `sillon`

### Requirement: Intervalos semiabiertos
El sistema SHALL tratar cada turno como el intervalo semiabierto [inicio, fin). Dos turnos se superponen si y solo si cada uno empieza antes de que termine el otro. Un turno que empieza exactamente cuando termina otro del mismo profesional o del mismo sillón no se superpone y MUST aceptarse.

#### Scenario: Turno que empieza justo cuando termina otro
- **GIVEN** la Dra. Ana Prueba tiene un turno de 10:00 a 10:30 en el Sillón 1
- **WHEN** se pide un turno para la Dra. Ana Prueba en el Sillón 1 de 10:30 a 11:00
- **THEN** la respuesta es `201`
- **AND** la agenda tiene los dos turnos

#### Scenario: Turno que termina justo cuando empieza otro
- **GIVEN** el Sillón 1 tiene un turno de 11:00 a 11:30
- **WHEN** se pide un turno para el Dr. Bruno Ejemplo en el Sillón 1 de 10:30 a 11:00
- **THEN** la respuesta es `201`

### Requirement: Los turnos cancelados no ocupan la agenda
El sistema SHALL ignorar los turnos en estado `cancelado` al verificar solapamientos. Los turnos en cualquier otro estado sí ocupan al profesional y al sillón.

#### Scenario: Horario de un turno cancelado
- **GIVEN** la Dra. Ana Prueba tenía un turno de 10:00 a 10:30 en el Sillón 1 que está en estado `cancelado`
- **WHEN** se pide un turno para la Dra. Ana Prueba en el Sillón 1 de 10:00 a 10:30
- **THEN** la respuesta es `201`

### Requirement: Inicio en la grilla de 15 minutos
El sistema MUST rechazar un turno cuyo inicio, expresado en hora local del consultorio, no cae en el minuto 00, 15, 30 o 45 con segundos en cero. La respuesta es `422` con código `INICIO_FUERA_DE_GRILLA`.

#### Scenario: Inicio fuera de la grilla
- **WHEN** se pide un turno con inicio `2026-12-01T10:10:00-03:00`
- **THEN** la respuesta es `422` con código `INICIO_FUERA_DE_GRILLA`
- **AND** no se crea ningún turno

### Requirement: Duración válida
El sistema MUST rechazar un turno cuya duración, indicada o tomada de la prestación, no es mayor que cero o no es múltiplo de 15 minutos. La respuesta es `422` con código `DURACION_INVALIDA`.

#### Scenario: Duración que no es múltiplo de 15
- **WHEN** se pide un turno a las 10:00 con `duracionMin` 20
- **THEN** la respuesta es `422` con código `DURACION_INVALIDA`

#### Scenario: Duración cero
- **WHEN** se pide un turno a las 10:00 con `duracionMin` 0
- **THEN** la respuesta es `422` con código `DURACION_INVALIDA`

### Requirement: Recursos obligatorios, existentes y activos
El sistema MUST exigir paciente, profesional, sillón/box y prestación en todo pedido. Si falta un dato obligatorio o tiene un formato inválido (incluido un inicio sin offset), responde `400` con código `SOLICITUD_INVALIDA`. Si un recurso no existe, `404` con código `RECURSO_INEXISTENTE`. Si existe pero está inactivo, `422` con código `RECURSO_INACTIVO`.

#### Scenario: Pedido sin sillón
- **WHEN** se pide un turno sin `sillonId`
- **THEN** la respuesta es `400` con código `SOLICITUD_INVALIDA`

#### Scenario: Profesional inexistente
- **WHEN** se pide un turno con un `profesionalId` que no existe
- **THEN** la respuesta es `404` con código `RECURSO_INEXISTENTE`

#### Scenario: Sillón inactivo
- **GIVEN** el Sillón 2 está inactivo
- **WHEN** se pide un turno en el Sillón 2
- **THEN** la respuesta es `422` con código `RECURSO_INACTIVO`

### Requirement: Reservas concurrentes sin solapamiento
El sistema MUST garantizar que dos pedidos de creación simultáneos que se superponen por profesional o por sillón nunca resulten en dos turnos persistidos superpuestos. Exactamente uno se crea y el otro recibe `409`.

#### Scenario: Dos reservas simultáneas del mismo sillón
- **GIVEN** el Sillón 1 está libre de 10:00 a 10:30
- **WHEN** dos conexiones distintas piden al mismo tiempo un turno en el Sillón 1 de 10:00 a 10:30 (una para la Dra. Ana Prueba y otra para el Dr. Bruno Ejemplo)
- **THEN** exactamente un pedido obtiene `201`
- **AND** el otro obtiene `409` con código `TURNO_SOLAPADO_SILLON`
- **AND** la base contiene un único turno en el Sillón 1 de 10:00 a 10:30

### Requirement: Auditoría de la creación
El sistema SHALL registrar un evento de auditoría `creado` por cada turno creado, con la fecha y hora del evento y los datos del turno. Un pedido rechazado MUST NOT crear turnos ni eventos de auditoría.

#### Scenario: Evento de auditoría al crear
- **WHEN** se crea un turno con éxito
- **THEN** existe un evento de auditoría `creado` asociado a ese turno

#### Scenario: Rechazo sin efectos
- **GIVEN** la Dra. Ana Prueba tiene un turno de 10:00 a 10:30
- **WHEN** se pide un turno superpuesto para la Dra. Ana Prueba y se rechaza con `409`
- **THEN** la cantidad de turnos y de eventos de auditoría no cambia

### Requirement: Formato de los errores de la creación de turnos
Todo rechazo de `POST /turnos` MUST responder un cuerpo JSON `{ "error": { "codigo", "mensaje", "detalle" } }`. `codigo` MUST ser uno de los códigos estables del spec (por ejemplo `TURNO_SOLAPADO_SILLON`), `mensaje` MUST ser un texto no vacío en español y `detalle` MUST ser un objeto. Los clientes, como la interfaz web, dependen de este formato para mostrar el error.

#### Scenario: Error de negocio por superposición con código y mensaje
- **GIVEN** la Dra. Ana Prueba tiene un turno de 10:00 a 10:30 en el Sillón 1
- **WHEN** se pide un turno para el Dr. Bruno Ejemplo en el Sillón 1 de 10:15 a 10:45
- **THEN** la respuesta es `409`
- **AND** `error.codigo` es `TURNO_SOLAPADO_SILLON`
- **AND** `error.mensaje` es un texto en español no vacío
- **AND** `error.detalle.conflictos` incluye el turno de 10:00 a 10:30 con `recurso` `sillon`, `inicio` y `fin` en ISO 8601 con offset

#### Scenario: Regla de grilla con el mismo formato
- **WHEN** se pide un turno con inicio `2026-12-01T10:10:00-03:00`
- **THEN** la respuesta es `422`
- **AND** el cuerpo tiene `error.codigo` `INICIO_FUERA_DE_GRILLA`, un `error.mensaje` no vacío y un `error.detalle` objeto

#### Scenario: Pedido mal formado con el mismo formato
- **WHEN** se pide un turno con un campo de más que la API no conoce
- **THEN** la respuesta es `400`
- **AND** el cuerpo tiene `error.codigo` `SOLICITUD_INVALIDA`, un `error.mensaje` no vacío y un `error.detalle` objeto
