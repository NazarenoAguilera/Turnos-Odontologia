# Actores y Roles

> Fuentes: `docs/discovery/discovery.md` (punto 2), `docs/discovery/informe-discovery.md` (D.3).

## Actores del sistema

| Actor | Descripción | Cómo interactúa (v1) |
|---|---|---|
| Recepción | Personal administrativo del consultorio | Crea, cancela, reprograma y cambia el estado de los turnos; da de alta pacientes |
| Odontólogo | Profesional que atiende en un sillón/box | Consulta su agenda; puede crear turnos y marcarlos como atendidos o ausentes |
| Administrador del consultorio | Dueño o responsable del consultorio (puede ser también odontólogo) | Configura profesionales, sillones, prestaciones, horarios, bloqueos y roles; consulta la auditoría |
| Paciente | Persona que recibe la atención | **No usa el sistema en v1**. Es el sujeto del turno. La reserva online llega en v1.x |
| Sistema (reloj) | Proceso interno | Registra la fecha y hora de cada evento de auditoría |

## RBAC — Matriz de permisos

C = crear · R = leer · U = actualizar · D = eliminar · ✓ = acción permitida · — = sin permiso.

| Recurso / acción | Administrador | Recepción | Odontólogo |
|---|---|---|---|
| Profesionales | CRUD | R | R (propio) |
| Horarios de atención | CRUD | R | R (propios) |
| Bloqueos | CRUD | CR | CR (propios) |
| Sillones/boxes | CRUD | R | R |
| Prestaciones | CRUD | R | R |
| Pacientes | CRUD | CRU | R |
| Turno: crear | ✓ | ✓ | ✓ (solo con sí mismo como profesional) |
| Turno: cancelar | ✓ | ✓ | ✓ (propios) |
| Turno: reprogramar | ✓ | ✓ | — |
| Turno: confirmar | ✓ | ✓ | — |
| Turno: marcar ausente o atendido | ✓ | ✓ | ✓ (propios) |
| Agenda (consulta) | Todas | Todas | Propia y sillones |
| Auditoría | R | R (de turnos) | — |

> La autorización por rol se define en v1. La autenticación real (login y sesiones) queda abierta: ver PA-07 en `10_preguntas_abiertas.md` y DD-07.

## Rutas públicas

- `GET /health`: estado del servicio, sin datos.
- No hay rutas públicas de reserva en v1. El link de reserva para pacientes es v1.x.
