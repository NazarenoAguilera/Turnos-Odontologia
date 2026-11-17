# Reglas de Negocio

> Fuentes: `docs/discovery/discovery.md` (punto 7, confirmado por el usuario el 2026-11-16), `docs/discovery/informe-discovery.md` (C.3 y C.4).
> Cada regla tiene un código único `RN-{DOMINIO}-{NN}` para trazabilidad hacia specs y tests.

## Dominio: Turnos (RN-TU)

- **RN-TU-01**: Un turno ocupa **a la vez** un profesional y un sillón/box durante el intervalo semiabierto **[inicio, fin)**, donde fin = inicio + duración. Todo turno requiere un sillón/box (supuesto confirmado en el Discovery).
- **RN-TU-02**: Dos intervalos [a, b) y [c, d) se superponen **si y solo si a < d y c < b**. Un turno que empieza exactamente cuando termina otro (b = c) **no** se superpone. Este es el caso de borde central del producto, porque ningún competidor relevado documenta cómo lo resuelve.
- **RN-TU-03**: No puede existir un turno no cancelado que se superponga con otro turno no cancelado **del mismo profesional**. Si ocurre, la operación se rechaza con `TURNO_SOLAPADO_PROFESIONAL`.
- **RN-TU-04**: No puede existir un turno no cancelado que se superponga con otro turno no cancelado **del mismo sillón/box**. Si ocurre, se rechaza con `TURNO_SOLAPADO_SILLON`. Si chocan los dos recursos, se informan ambos conflictos.
- **RN-TU-05**: El inicio del turno se alinea a una grilla de 15 minutos (minuto 00, 15, 30 o 45, con segundos en cero). Si no, se rechaza con `INICIO_FUERA_DE_GRILLA`.
- **RN-TU-06**: La duración por defecto es la de la prestación. Recepción puede editarla al crear o reprogramar. Debe ser mayor que cero y múltiplo de 15 minutos (ver PA-02); si no, se rechaza con `DURACION_INVALIDA`.
- **RN-TU-07**: No hay sobreturnos en v1. Ningún rol puede forzar un solapamiento.
- **RN-TU-08**: Al crearse, el turno queda en estado `reservado`.
- **RN-TU-09**: Transiciones válidas:
  - `reservado` → `confirmado` | `cancelado` | `ausente` | `atendido`
  - `confirmado` → `cancelado` | `ausente` | `atendido`
  - `cancelado`, `ausente` y `atendido` son estados finales.
  - Cualquier otra transición se rechaza con `TRANSICION_INVALIDA`.
- **RN-TU-10**: Solo el estado `cancelado` libera al profesional y al sillón. Los turnos `ausente` y `atendido` siguen contando como ocupación (supuesto confirmado).
- **RN-TU-11**: La cancelación no exige anticipación mínima en v1. El turno pasa a `cancelado` y el cambio se audita.
- **RN-TU-12**: La reprogramación aplica las mismas validaciones que la creación (RN-TU-02 a 06 y RN-AG-01 a 03), **excluyendo al propio turno** de la comprobación de solapamientos. Solo se reprograman turnos `reservado` o `confirmado`. Al reprogramar, el estado vuelve a `reservado`.
- **RN-TU-13**: La verificación de solapamiento y la escritura del turno son atómicas. Dos operaciones concurrentes nunca pueden dejar persistidos dos turnos superpuestos (riesgo de concurrencia del Discovery).

## Dominio: Agenda y disponibilidad (RN-AG)

- **RN-AG-01**: El turno debe caer completamente dentro de una franja de atención del profesional para ese día de la semana. Formalmente, [inicio, fin) ⊆ [desde, hasta). Si no, se rechaza con `FUERA_DE_HORARIO`. Un turno que termina justo a la hora de cierre es válido.
- **RN-AG-02**: El turno no puede superponerse con un bloqueo del profesional (feriado, vacaciones), con la misma semántica semiabierta de RN-TU-02. Si se superpone, se rechaza con `EN_BLOQUEO`.
- **RN-AG-03**: El profesional, el sillón y la prestación deben existir y estar activos. Si no existen, se responde `404`. Si están inactivos, `422` con `RECURSO_INACTIVO`.
- **RN-AG-04**: Las horas se interpretan en la zona horaria del consultorio, `America/Argentina/Buenos_Aires` (UTC−03:00, sin horario de verano vigente). Internamente se guardan como instantes absolutos (DD-03).
- **RN-AG-05**: Un turno no puede cruzar la medianoche (inicio y fin en el mismo día local).

## Dominio: Pacientes y datos (RN-PA)

- **RN-PA-01**: Nunca se almacenan datos reales de pacientes en el repositorio, los ejemplos, los tests, los seeds ni las capturas. Todo dato de ejemplo es ficticio.
- **RN-PA-02**: Un paciente requiere nombre y apellido. El teléfono, el email y la obra social son opcionales. La obra social es solo un dato en v1 (sin liquidación).

## Dominio: Roles y autorización (RN-RO)

- **RN-RO-01**: Solo el administrador configura profesionales, sillones, prestaciones y horarios (matriz en `03_actores_y_roles.md`).
- **RN-RO-02**: Un odontólogo solo puede crear turnos en los que él mismo sea el profesional.

## Dominio: Auditoría (RN-AU)

- **RN-AU-01**: Toda creación, cancelación, reprogramación o cambio de estado de un turno genera un `EventoAuditoria` con acción, fecha y hora, usuario (cuando exista autenticación) y valores antes y después.
- **RN-AU-02**: Los eventos de auditoría son inmutables: no se editan ni se borran.

## Excepciones globales

- **RN-GL-01**: Una operación rechazada no modifica ningún dato ni genera evento de auditoría.
- **RN-GL-02**: Los errores de negocio devuelven un código estable (`codigo`) y un mensaje legible en español. Los solapamientos indican el o los turnos en conflicto en `detalle`.
- **RN-GL-03**: No se guardan secretos ni credenciales en el repositorio. La configuración sensible va por variables de entorno.
