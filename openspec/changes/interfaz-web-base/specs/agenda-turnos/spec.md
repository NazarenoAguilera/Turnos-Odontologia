# Spec Delta

## ADDED Requirements

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
