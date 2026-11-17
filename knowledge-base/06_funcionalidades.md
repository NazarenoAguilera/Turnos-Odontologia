# Funcionalidades

> Fuentes: `docs/discovery/discovery.md` (puntos 3 y 5), `docs/discovery/informe-discovery.md` (D.3).
> Organizadas por épica y por historia de usuario (US-NNN). Las épicas 1 a 4 son el MVP v1. La épica 5 lista lo diferido.

## Épica 1: Configuración del consultorio

### US-001 — Gestionar profesionales
**Como** administrador
**Quiero** dar de alta, editar y desactivar profesionales
**Para** que la agenda refleje quién atiende en el consultorio

**Criterios de aceptación**:
- [ ] Se crea un profesional con nombre (la matrícula es opcional).
- [ ] Un profesional desactivado no recibe turnos nuevos.

**Reglas relacionadas**: RN-AG-03, RN-RO-01

### US-002 — Gestionar sillones/boxes
**Como** administrador
**Quiero** dar de alta y desactivar sillones o boxes
**Para** que cada turno tenga un lugar físico asignado

**Criterios de aceptación**:
- [ ] El nombre del sillón es único.
- [ ] Un sillón desactivado no recibe turnos nuevos.

**Reglas relacionadas**: RN-TU-01, RN-AG-03

### US-003 — Gestionar prestaciones con duración
**Como** administrador
**Quiero** definir prestaciones con su duración por defecto
**Para** que cada turno ocupe el tiempo real que lleva el tratamiento

**Criterios de aceptación**:
- [ ] La duración es mayor que cero y múltiplo de 15 minutos.
- [ ] La duración por defecto se aplica al crear un turno si no se indica otra.

**Reglas relacionadas**: RN-TU-06

### US-004 — Definir horarios de atención y bloqueos
**Como** administrador
**Quiero** cargar las franjas semanales de atención de cada profesional y sus bloqueos
**Para** que no se den turnos fuera de horario ni en feriados o vacaciones

**Criterios de aceptación**:
- [ ] Las franjas son semiabiertas [desde, hasta).
- [ ] Un bloqueo impide crear turnos que se superpongan con él.

**Reglas relacionadas**: RN-AG-01, RN-AG-02

## Épica 2: Turnos (núcleo del MVP)

### US-010 — Crear turno sin solapamientos por profesional y por sillón/box ⭐
**Como** recepción
**Quiero** crear un turno indicando paciente, profesional, sillón/box, prestación e inicio
**Para** reservarlo sin chocar con otro turno del mismo profesional ni del mismo sillón

**Criterios de aceptación**:
- [ ] **Caso feliz**: con el profesional y el sillón libres en [inicio, fin), el turno se crea en estado `reservado` y fin = inicio + duración.
- [ ] **Error de negocio (profesional)**: si el profesional tiene otro turno no cancelado superpuesto, se rechaza con `409 TURNO_SOLAPADO_PROFESIONAL` y no se persiste nada.
- [ ] **Error de negocio (sillón)**: si el sillón tiene otro turno no cancelado superpuesto, aunque sea de otro profesional, se rechaza con `409 TURNO_SOLAPADO_SILLON`.
- [ ] **Borde (contiguo)**: un turno que empieza exactamente cuando termina otro del mismo profesional o del mismo sillón **se acepta**.
- [ ] **Borde (cancelado)**: un turno cancelado en el mismo horario no bloquea la creación.
- [ ] El inicio fuera de la grilla de 15 minutos, una duración inválida, un horario fuera de la franja de atención o la superposición con un bloqueo se rechazan con `422` y su código.
- [ ] Dos creaciones concurrentes que chocan resultan en exactamente un turno creado.
- [ ] Se registra un evento de auditoría `creado`.

**Reglas relacionadas**: RN-TU-01 a RN-TU-08, RN-TU-13, RN-AG-01 a RN-AG-05, RN-AU-01

### US-011 — Cancelar turno y liberar el horario
**Como** recepción
**Quiero** cancelar un turno
**Para** liberar al profesional y al sillón para otro paciente

**Criterios de aceptación**:
- [ ] Un turno `reservado` o `confirmado` pasa a `cancelado`.
- [ ] Después de cancelar, se puede crear otro turno en el mismo horario, con el mismo profesional y el mismo sillón.
- [ ] Cancelar un turno `atendido`, `ausente` o ya `cancelado` se rechaza con `TRANSICION_INVALIDA`.
- [ ] Se registra un evento de auditoría `cancelado`.

**Reglas relacionadas**: RN-TU-09, RN-TU-10, RN-TU-11, RN-AU-01

### US-012 — Reprogramar turno
**Como** recepción
**Quiero** mover un turno a otro horario, sillón o profesional
**Para** reubicar al paciente sin cancelar y crear de nuevo

**Criterios de aceptación**:
- [ ] Se aplican las mismas validaciones que en la creación.
- [ ] El propio turno no cuenta como conflicto: moverlo 15 minutos dentro de su mismo intervalo es válido si no choca con otro.
- [ ] Se registra un evento `reprogramado` con los valores antes y después.

**Reglas relacionadas**: RN-TU-12, RN-AU-01

### US-013 — Cambiar estado del turno
**Como** recepción u odontólogo
**Quiero** marcar un turno como confirmado, atendido o ausente
**Para** reflejar lo que pasó con la cita

**Criterios de aceptación**:
- [ ] Solo se permiten las transiciones de RN-TU-09.
- [ ] Los turnos `ausente` y `atendido` siguen ocupando el horario (no lo liberan).

**Reglas relacionadas**: RN-TU-09, RN-TU-10

## Épica 3: Agenda

### US-020 — Consultar agenda diaria y semanal
**Como** odontólogo o recepción
**Quiero** ver los turnos de un rango de fechas filtrados por profesional o por sillón
**Para** organizar el día y la semana

**Criterios de aceptación**:
- [ ] `GET /turnos?desde&hasta` devuelve los turnos que intersecan el rango, ordenados por inicio.
- [ ] Se puede filtrar por `profesionalId` y por `sillonId`.
- [ ] Los turnos cancelados se excluyen por defecto y se incluyen con `incluirCancelados=true`.

**Reglas relacionadas**: RN-AG-04

## Épica 4: Pacientes, roles y auditoría

### US-030 — Registrar paciente (ficha mínima)
**Como** recepción
**Quiero** dar de alta un paciente con nombre, apellido y contacto
**Para** asignarle turnos

**Criterios de aceptación**:
- [ ] El nombre y el apellido son obligatorios.
- [ ] Los ejemplos, seeds y tests usan datos ficticios.

**Reglas relacionadas**: RN-PA-01, RN-PA-02

### US-031 — Restringir acciones por rol
**Como** administrador
**Quiero** que cada rol solo pueda hacer lo que le corresponde
**Para** evitar cambios indebidos en la configuración y en la agenda

**Reglas relacionadas**: RN-RO-01, RN-RO-02

### US-032 — Consultar la auditoría de un turno
**Como** administrador
**Quiero** ver el historial de cambios de un turno
**Para** saber quién lo creó, movió o canceló, y cuándo

**Reglas relacionadas**: RN-AU-01, RN-AU-02

## Épica 5: Diferido (no forma parte del MVP v1)

| Funcionalidad | Etapa | Origen en el Discovery |
|---|---|---|
| Reserva online por link | v1.x | D.3 diferenciadores |
| Recordatorios y confirmación por WhatsApp (API oficial) y email | v1.x | D.3, C.3.6 |
| Lista de espera que ofrece huecos liberados | v1.x | C.3.2: vacío en todo el mercado regional |
| Métricas de ocupación por sillón y de ausentismo | v1.x | C.4.6 |
| Exportación completa y transparencia de cumplimiento | v1.x | C.3.5 |
| Odontograma, historia clínica, presupuestos | Posterior | C.1: estándar de mercado |
| Caja, Mercado Pago, ARCA, liquidaciones | Posterior | C.1 y C.2 |
