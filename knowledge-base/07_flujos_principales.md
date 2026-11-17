# Flujos Principales

> Fuentes: `05_reglas_de_negocio.md`, `06_funcionalidades.md`.

## Flujo 1: Crear turno sin solapamientos

**Disparador**: `POST /turnos`
**Actor**: Recepción (u odontólogo para sí mismo)

**Pasos**:
1. **HTTP** valida el esquema del cuerpo: `pacienteId`, `profesionalId`, `sillonId`, `prestacionId`, `inicio` en ISO 8601 y `duracionMin` opcional.
2. **Aplicación** carga el paciente, el profesional, el sillón y la prestación. Responde `404` si alguno no existe y `422 RECURSO_INACTIVO` si está inactivo (RN-AG-03).
3. **Dominio** calcula `duracion` (la indicada o la de la prestación) y `fin = inicio + duracion`. Valida la grilla de 15 minutos (RN-TU-05) y la duración (RN-TU-06). La restricción de medianoche (RN-AG-05) está pendiente de confirmación (PA-09).
4. **Dominio** valida la franja de atención del profesional para ese día (RN-AG-01) y la ausencia de bloqueos superpuestos (RN-AG-02).
5. **Infraestructura** abre una transacción `BEGIN IMMEDIATE`, que bloquea a otros escritores.
6. Dentro de la transacción, busca turnos no cancelados con `inicio_min < :fin AND :inicio < fin_min` y `(profesional_id = :p OR sillon_id = :s)` (RN-TU-02 a 04).
7. Si hay conflictos, **Dominio** los clasifica por profesional o por sillón. Se hace `ROLLBACK` y se responde `409` con los códigos y los turnos en conflicto.
8. Si no hay conflictos, inserta el turno en estado `reservado` y el evento de auditoría `creado`, y hace `COMMIT`.
9. **HTTP** responde `201` con el turno creado.

**Diagrama de secuencia**:
```
Recepción → HTTP → Aplicación → Dominio (validaciones puras)
                               → Repositorio: BEGIN IMMEDIATE
                                   SELECT solapados (profesional OR sillón)
                                   ├─ hay → ROLLBACK → 409
                                   └─ no  → INSERT turno + auditoría → COMMIT → 201
```

**Casos de error**:
- Profesional ocupado en [inicio, fin) → `409 TURNO_SOLAPADO_PROFESIONAL`
- Sillón ocupado en [inicio, fin) → `409 TURNO_SOLAPADO_SILLON` (si chocan ambos, se informan los dos)
- Inicio 10:10 → `422 INICIO_FUERA_DE_GRILLA`
- Duración 0 o 20 → `422 DURACION_INVALIDA`
- Fuera de la franja de atención → `422 FUERA_DE_HORARIO`
- Superpuesto con un feriado → `422 EN_BLOQUEO`
- Dos pedidos concurrentes que chocan → uno `201` y el otro `409` (RN-TU-13)

**Ejemplo de borde (RN-TU-02)**: existe un turno de 10:00 a 10:30 en el Sillón 1. Un nuevo turno de 10:30 a 11:00 en el Sillón 1 **se acepta**, porque 10:30 < 10:30 es falso y no hay superposición.

## Flujo 2: Cancelar turno

**Disparador**: `POST /turnos/:id/cancelar`
**Actor**: Recepción o administrador (u odontólogo, si el turno es propio)

**Pasos**:
1. Carga el turno. Si no existe, responde `404`.
2. Valida la transición a `cancelado` (RN-TU-09). Si no es válida, responde `422 TRANSICION_INVALIDA`.
3. En una transacción, actualiza el estado e inserta el evento `cancelado`.
4. Responde `200`. Desde ese momento el horario queda libre para el profesional y el sillón (RN-TU-10).

## Flujo 3: Reprogramar turno

**Disparador**: `POST /turnos/:id/reprogramar` con nuevo `inicio` y, opcionalmente, `sillonId`, `profesionalId` o `duracionMin`
**Actor**: Recepción o administrador

**Pasos**:
1. Carga el turno y valida que esté `reservado` o `confirmado`.
2. Ejecuta los pasos 2 a 7 del Flujo 1 con los nuevos valores, **excluyendo el `id` del propio turno** en la búsqueda de solapamientos (RN-TU-12).
3. Si no hay conflictos, actualiza el turno (estado `reservado`) e inserta el evento `reprogramado` con antes y después.

## Flujo 4: Consultar agenda

**Disparador**: `GET /turnos?desde&hasta[&profesionalId][&sillonId][&incluirCancelados]`
**Actor**: Cualquier rol (con el alcance de su matriz RBAC)

**Pasos**:
1. Convierte `desde` y `hasta` a instantes (RN-AG-04).
2. Busca los turnos con `inicio_min < :hasta AND :desde < fin_min`, aplicando los filtros.
3. Devuelve la lista ordenada por inicio, con los nombres del paciente, el profesional, el sillón y la prestación.
