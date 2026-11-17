# Proposal

## Why

Los consultorios odontológicos de 2 a 5 profesionales comparten sillones, y hoy dan turnos sin ninguna garantía de no reservar dos veces al mismo profesional o al mismo sillón. El Discovery relevó 16 sistemas y ninguno demuestra públicamente cómo previene esos solapamientos ni cómo trata un turno que empieza justo cuando termina otro (`docs/discovery/informe-discovery.md`, C.3.1). Este change construye el núcleo que ataca ese vacío. Sin él no existe el producto.

**Por qué este change (elección para la Etapa 6)**: pertenece al MVP imprescindible de la sección D.3 del informe. Tiene reglas de negocio verificables (intervalos semiabiertos, doble restricción profesional y sillón, grilla y duración). Es una sola funcionalidad, crear un turno, lo bastante chica para terminarla, probarla y archivarla antes del 25/11/2026. Es el C-01 de `CHANGES.md`, sin dependencias.

## What Changes

- Base del proyecto: TypeScript sobre Node 24, Fastify, SQLite integrado (`node:sqlite`) y Vitest, con `npm install` y `npm test` documentados en el `README.md`.
- Nueva operación `POST /turnos` que crea un turno para un paciente, un profesional, un sillón/box y una prestación, a partir de un inicio en ISO 8601 y una duración opcional.
- El turno ocupa el intervalo semiabierto [inicio, fin), con fin = inicio + duración. La duración por defecto es la de la prestación.
- Se rechaza el turno que se superpone con otro turno no cancelado del mismo profesional (`409 TURNO_SOLAPADO_PROFESIONAL`) o del mismo sillón (`409 TURNO_SOLAPADO_SILLON`). Los turnos contiguos se aceptan.
- Validaciones: inicio en la grilla de 15 minutos, duración mayor que cero y múltiplo de 15, `sillonId` obligatorio, y recursos existentes y activos.
- La verificación de solapamiento y la inserción son atómicas frente a reservas concurrentes.
- Cada turno creado queda en estado `reservado` y deja un evento de auditoría `creado`.
- Datos de prueba ficticios (profesionales, sillones, prestaciones y pacientes) para los tests. No hay endpoints de alta ni edición de esos recursos.
- **Fuera de alcance** (decidido en el Explore del 2026-11-17): validación de horario de atención y de bloqueos (C-03); cancelar, reprogramar y cambiar estado (C-05, C-06); consulta de agenda (C-07); roles y autenticación (C-08); sobreturnos (no existen en v1); la restricción de que un turno no cruce la medianoche (RN-AG-05), que se quitó en la revisión del propose por ser un supuesto no confirmado (SU-04, PA-09).

## Capabilities

### New Capabilities
- `agenda-turnos`: reserva de turnos en la agenda del consultorio. Cubre la creación de un turno que ocupa a la vez un profesional y un sillón/box, las reglas de superposición, grilla y duración, y la atomicidad frente a reservas concurrentes. Los changes posteriores (cancelar, reprogramar, horarios) extenderán esta misma capacidad.

### Modified Capabilities
- (ninguna: no existen specs previos en el proyecto)

## Impact

- **Código nuevo**:
  - `src/domain/`: `Intervalo`, `Turno`, errores de dominio.
  - `src/application/`: caso de uso `crearTurno`.
  - `src/infrastructure/sqlite/`: esquema, repositorios, transacción y datos ficticios.
  - `src/http/`: app Fastify, `POST /turnos`, `GET /health`.
  - `tests/`.
- **API**: `POST /turnos` y `GET /health`. Formato de error `{ error: { codigo, mensaje, detalle } }`.
- **Dependencias**: `fastify`, y como dependencias de desarrollo `typescript`, `tsx`, `vitest` y `@types/node`. SQLite viene integrado en Node 24, sin dependencia externa.
- **Datos**: tablas `profesional`, `sillon`, `prestacion`, `paciente`, `turno` y `evento_auditoria` en SQLite. Solo datos ficticios.
- **Documentación**: `README.md` con instalación y ejecución de tests.
