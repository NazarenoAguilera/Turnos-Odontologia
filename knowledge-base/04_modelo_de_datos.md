# Modelo de Datos

> Fuentes: `docs/discovery/discovery.md` (puntos 5 y 7). Persistencia: SQLite (`node:sqlite`).

## Dominios

| Dominio | Entidades | Descripción |
|---|---|---|
| Recursos | Profesional, Sillón, Prestación | Lo que se agenda y con qué duración |
| Disponibilidad | HorarioAtencion, Bloqueo | Cuándo puede atender cada profesional |
| Turnos | Turno, EventoAuditoria | La reserva y su historial |
| Pacientes | Paciente | Ficha mínima (datos ficticios en ejemplos y tests) |
| Acceso | Usuario | Persona que opera el sistema con un rol |

## ERD

```
Usuario (rol) ──0..1── Profesional
                          │ 1
                          ├──< HorarioAtencion (n)
                          ├──< Bloqueo (n)
                          │ 1
Paciente 1 ──< Turno >── 1 Sillon
                 │  >── 1 Prestacion
                 │ 1
                 └──< EventoAuditoria (n)
```

Cada Turno referencia exactamente un Paciente, un Profesional, un Sillón y una Prestación.

## Entidades

### Profesional
- `id` INTEGER PK
- `nombre` TEXT NOT NULL
- `matricula` TEXT NULL (ficticia en ejemplos)
- `activo` INTEGER (0/1) DEFAULT 1
- Relaciones: 1–n HorarioAtencion, 1–n Bloqueo, 1–n Turno
- Constraint: no se puede asignar un turno nuevo a un profesional inactivo

### Sillon
- `id` INTEGER PK
- `nombre` TEXT NOT NULL UNIQUE (por ejemplo, "Sillón 1", "Box 2")
- `activo` INTEGER (0/1) DEFAULT 1
- Relaciones: 1–n Turno

### Prestacion
- `id` INTEGER PK
- `nombre` TEXT NOT NULL UNIQUE
- `duracion_min` INTEGER NOT NULL, CHECK (`duracion_min` > 0 AND `duracion_min` % 15 = 0). Ver PA-02.
- `activa` INTEGER (0/1) DEFAULT 1

### HorarioAtencion
- `id` INTEGER PK
- `profesional_id` INTEGER FK → Profesional
- `dia_semana` INTEGER CHECK 1..7 (1 = lunes, ISO 8601)
- `hora_desde` TEXT `HH:MM`, `hora_hasta` TEXT `HH:MM`, CHECK `hora_desde` < `hora_hasta`
- Semántica: franja semiabierta [desde, hasta)

### Bloqueo
- `id` INTEGER PK
- `profesional_id` INTEGER FK → Profesional
- `inicio` TEXT ISO 8601, `fin` TEXT ISO 8601, CHECK `inicio` < `fin`
- `motivo` TEXT (feriado, vacaciones, otro)
- Semántica: intervalo semiabierto [inicio, fin)

### Paciente
- `id` INTEGER PK
- `nombre` TEXT NOT NULL, `apellido` TEXT NOT NULL
- `telefono` TEXT NULL, `email` TEXT NULL
- `obra_social` TEXT NULL (solo como dato en v1)
- Regla: en el repositorio solo existen pacientes ficticios (RN-PA-01)

### Turno
- `id` INTEGER PK
- `paciente_id` FK → Paciente, `profesional_id` FK → Profesional, `sillon_id` FK → Sillon, `prestacion_id` FK → Prestacion
- `inicio_min` INTEGER: minutos desde la época Unix (instante absoluto)
- `fin_min` INTEGER: `inicio_min` + `duracion_min`
- `duracion_min` INTEGER NOT NULL CHECK > 0 (por defecto, la de la prestación)
- `estado` TEXT CHECK IN (`reservado`, `confirmado`, `cancelado`, `ausente`, `atendido`) DEFAULT `reservado`
- `creado_en` TEXT ISO 8601, `actualizado_en` TEXT ISO 8601
- Índices: (`profesional_id`, `inicio_min`, `fin_min`) y (`sillon_id`, `inicio_min`, `fin_min`). Aceleran la búsqueda de solapamientos.
- Constraint de negocio (RN-TU-03, RN-TU-04): no hay solapamiento con otro turno no cancelado del mismo profesional o del mismo sillón. Se garantiza con la transacción `BEGIN IMMEDIATE` (DD-04), porque SQLite no tiene restricciones de exclusión por rango.

### EventoAuditoria
- `id` INTEGER PK
- `turno_id` FK → Turno
- `accion` TEXT CHECK IN (`creado`, `cancelado`, `reprogramado`, `estado_cambiado`)
- `usuario_id` FK → Usuario NULL (hasta resolver la autenticación, ver PA-07)
- `ocurrido_en` TEXT ISO 8601
- `antes` TEXT JSON NULL, `despues` TEXT JSON NULL
- Inmutable: solo se insertan filas (RN-AU-02)

### Usuario
- `id` INTEGER PK, `nombre` TEXT, `rol` TEXT CHECK IN (`administrador`, `recepcion`, `odontologo`), `profesional_id` FK NULL

## Seed data inicial (ficticio)

Todos los nombres son inventados y no corresponden a personas reales.

| Entidad | Datos |
|---|---|
| Profesionales | Dra. Ana Prueba (lun–vie 08:00–14:00), Dr. Bruno Ejemplo (lun–vie 14:00–20:00), Dra. Carla Demo (mar y jue 09:00–17:00) |
| Sillones | Sillón 1, Sillón 2, Box 3 |
| Prestaciones | Consulta (15 min), Limpieza (30 min), Extracción simple (45 min), Endodoncia (90 min) |
| Pacientes | Paciente Ficticio Uno, Paciente Ficticio Dos, Paciente Ficticio Tres (teléfonos `+54 9 11 0000-000X`) |
| Usuarios | admin (administrador), recepcion (recepción), un usuario por profesional (odontólogo) |
| Bloqueos | Un feriado de ejemplo para todos los profesionales |
