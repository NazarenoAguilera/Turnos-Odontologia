# Verificación — `cancelar-y-cambiar-estado-de-turno` (C-05)

**Fecha**: 2026-11-24
**Rama**: `lucas`. Base: commit `44815a8` más el informe y las capturas de este paso.
**Resultado**: **206 tests en verde** (175 en la raíz y 31 en `web/`), los dos builds compilan, el lint de `web/` no da advertencias y la verificación manual está hecha a 1440×900. Las 14 tareas de `tasks.md` están completas.

## Ejecución automática

| Dónde | Comando | Resultado |
|---|---|---|
| Raíz | `npm test` | 17 archivos, **175/175** en verde: los 123 previos (C-01, C-11, C-07) más 52 nuevos |
| Raíz | `npm run build` | `tsc` sin errores |
| `web/` | `npm test` | 3 archivos, **31/31** en verde: los 27 previos más 4 nuevos |
| `web/` | `npm run build` | `tsc -b && vite build` sin errores |
| `web/` | `npm run lint` | oxlint, 0 advertencias |

Tests nuevos:

| Archivo | Tests | Qué cubren |
|---|---|---|
| `tests/domain/turno.test.ts` | 29 | Las 25 combinaciones `desde × hacia` de RN-TU-09, los estados finales sin salida y `exigirTransicion` (código, detalle y mensaje en español) |
| `tests/infra/repositorios.test.ts` | 3 | `obtenerTurno` (existente e inexistente) y `actualizarEstadoTurno` (solo cambia `estado` y `actualizado_en`) |
| `tests/application/cambiar-estado-turno.test.ts` | 4 | Cancelar con auditoría `cancelado` y antes/después, confirmar con `estado_cambiado`, 404 sin auditoría, transición inválida sin cambios ni auditoría |
| `tests/e2e/estado-turno.test.ts` | 16 | Un test por escenario del spec (matriz abajo) |
| `web/src/api/cliente.test.ts` | 3 | `cambiarEstado`: URL y método sin cuerpo, normalización del 422 y `SIN_CONEXION` |
| `web/src/api/mensajes.test.ts` | 1 | Texto y tono `warning` de `TRANSICION_INVALIDA` |

## Matriz escenario → test (16/16)

Spec: delta de `agenda-turnos`. Todos los tests están en `tests/e2e/estado-turno.test.ts` con el mismo nombre que el escenario.

| # | Requisito | Escenario | Tipo |
|---|---|---|---|
| 1 | Cancelar un turno | Cancelar un turno reservado | Feliz |
| 2 | Cancelar un turno | Cancelar un turno confirmado | Feliz |
| 3 | Cancelar un turno | Cancelar y volver a reservar el mismo horario con los mismos recursos | **Borde** |
| 4 | Confirmar un turno | Confirmar un turno reservado | Feliz |
| 5 | Marcar un turno como ausente o atendido | Marcar atendido un turno confirmado | Feliz |
| 6 | Marcar un turno como ausente o atendido | Marcar ausente un turno reservado | Feliz |
| 7 | Rechazo de transiciones inválidas | Cancelar un turno atendido | **Error de negocio** (`TRANSICION_INVALIDA`) |
| 8 | Rechazo de transiciones inválidas | Cancelar un turno ya cancelado | Error de negocio |
| 9 | Rechazo de transiciones inválidas | Confirmar un turno ausente | Error de negocio |
| 10 | Rechazo de transiciones inválidas | Confirmar un turno ya confirmado | Error de negocio / borde (X → X) |
| 11 | Transición sobre un turno inexistente o con id inválido | Turno inexistente | Error (404) |
| 12 | Transición sobre un turno inexistente o con id inválido | Id con formato inválido | Borde (400) |
| 13 | Los turnos ausentes y atendidos siguen ocupando la agenda | Turno atendido sigue bloqueando el sillón | Borde |
| 14 | Los turnos ausentes y atendidos siguen ocupando la agenda | Turno ausente sigue bloqueando al profesional | Borde |
| 15 | Auditoría de las transiciones | Evento al cancelar | Feliz |
| 16 | Auditoría de las transiciones | Evento al confirmar | Feliz |

Los tres tipos que pide la consigna están cubiertos:
- **Feliz:** escenario 1.
- **Error de negocio:** escenario 7. Responde `422 TRANSICION_INVALIDA`, el turno queda `atendido` y no aparecen eventos de auditoría nuevos.
- **Borde:** escenario 3. Antes de cancelar, la misma reserva da `409`; después de cancelar da `201`, y la base queda con un turno `cancelado` y uno `reservado` en ese horario.

Los estados finales se preparan siempre con las rutas de la API, sin `UPDATE` directo.

## Verificación de la API real

Con la API levantada sobre una base SQLite temporal nueva (seed ficticio), corrí los ejemplos del README tal como están escritos:
- Crear → `201`.
- `POST /turnos/1/cancelar` → `200` con estado `cancelado`.
- Volver a reservar el mismo horario → `201`.
- Cancelar otra vez → `422 TRANSICION_INVALIDA` con el mensaje "No se puede pasar un turno cancelado a cancelado.".

## Verificación manual de la pantalla

La API y la web se levantaron sobre otra base temporal nueva. Los turnos de prueba se crearon por la API para el **día de la ejecución** (martes 24/11, la fecha que abre la Agenda por defecto), con datos ficticios:
- 09:00, atendido: Paciente Ficticio Dos, Dr. Bruno Ejemplo, Sillón 2.
- 10:00, confirmado: Paciente Ficticio Uno, Dra. Ana Prueba, Sillón 1.
- 10:30, reservado: Paciente Ficticio Tres, Dra. Ana Prueba, Sillón 1.
- 11:00, ausente: Paciente Ficticio Dos, Dr. Bruno Ejemplo, Box 3.

Chrome headless manejó la pantalla como un usuario, con clics en el menú y en los botones de la fila.

| Captura (`openspec/changes/cancelar-y-cambiar-estado-de-turno/verify/`) | Pasos | Resultado |
|---|---|---|
| `botones-en-fila-desktop-1440x900.png` | Abrir la Agenda | "Confirmar" y "Cancelar" solo en el turno `reservado`; solo "Cancelar" en el `confirmado`; nada en `atendido` ni en `ausente` |
| `confirmacion-en-fila-desktop-1440x900.png` | "Cancelar" en el turno de las 10:30 | La fila pasa al fondo rojo suave con "¿Cancelar este turno? No se puede deshacer.", "Sí, cancelar turno" y "Volver". **El foco queda en "Volver"** y el "Cancelar" de la otra fila se deshabilita |
| `turno-cancelado-desktop-1440x900.png` | "Sí, cancelar turno" | Aviso "Turno cancelado · Paciente Ficticio Tres · Dra. Ana Prueba · Sillón 1 · 10:30 a 11:00. El horario quedó libre."; la agenda se recarga y la fila ya no aparece (cancelados ocultos) |
| `volver-a-reservar-desktop-1440x900.png` | Nuevo turno: Paciente Ficticio Tres, Limpieza, Dra. Ana Prueba, Sillón 1, mismo día, 10:30 | "Turno reservado … 10:30 a 11:00": el mismo horario, con el mismo profesional y el mismo sillón, se vuelve a reservar |
| `agenda-tras-volver-a-reservar-desktop-1440x900.png` (extra) | Agenda con "Mostrar cancelados" | En las 10:30 conviven el turno `cancelado` (tachado) y el nuevo `reservado` |
| `error-422-desktop-1440x900.png` | El turno de las 10:00 se marca `atendido` por la API, por fuera de la pantalla; después, "Cancelar" → "Sí, cancelar turno" en la pantalla, que todavía lo mostraba `confirmado` | Aviso "El turno ya no se puede cambiar a ese estado · Alguien lo modificó antes. Actualizamos la agenda con su estado actual. `422 TRANSICION_INVALIDA`"; la agenda recargada lo muestra `Atendido`, sin acciones |

**"Volver" y `Escape`**, comprobados en el navegador sobre el turno reservado de las 10:30:
- Los dos cierran la confirmación sin cambios.
- Mientras la confirmación está abierta, las acciones de las otras filas quedan deshabilitadas.
- Después se consultó la API: el turno seguía `reservado`.
- La consola del navegador no mostró errores de la aplicación.

Lucas hace además la prueba manual propia (tarea 6.3 del plan).

## Diferencias con el mockup aprobado

| # | Mockup | Implementación | Motivo |
|---|---|---|---|
| 1 | Datos del martes 1/12 | Datos del día de la ejecución (24/11) | La Agenda abre en "hoy"; los turnos de prueba se crearon para hoy, así no hace falta navegar de fecha. La disposición es la misma |
| 2 | Estado "error-422" sobre el turno de las 10:30 | El 422 se provocó sobre el turno confirmado de las 10:00 | El de las 10:30 ya se había cancelado en el paso anterior. El aviso y el comportamiento (recarga y turno sin acciones) son los mismos |
| 3 | Sin estado "confirmando" | "Confirmar" pasa a "Confirmando…" con `aria-busy` mientras espera la API | Simetría con "Cancelando…" (design D6); evita el doble envío |
| 4 | Foco y teclado no se ven en un mockup estático | Foco inicial en "Volver" y `Escape` = "Volver" | Accesibilidad de la confirmación (design D9) |
| 5 | Confirmación descripta solo para la vista Día | También funciona en la vista Semana | `TablaTurnos` se reutiliza en las dos vistas (design D6) |

Colores, botones (`btn-danger`, `btn-secondary`), la confirmación en la fila (pregunta arriba, botones abajo, ancho máximo) y los avisos usan las mismas clases y variables de `design-system/tokens.css` que el mockup.

## Reglas duras

| Regla | Estado |
|---|---|
| Solo datos ficticios | ✔ Seed ficticio en los tests, en la API de prueba y en las capturas |
| SQL sin concatenar | ✔ `obtenerTurno` y `actualizarEstadoTurno` son sentencias fijas con parámetros |
| Superposición solo con `Intervalo` | ✔ Las transiciones no comparan horarios; liberar u ocupar el horario sigue pasando por la búsqueda de candidatos y el `Intervalo` de C-01 |
| Sin offset `-03:00` fijo | ✔ La API usa `aIsoLocal`; la pantalla toma la hora del ISO que devuelve la API |
| Un rechazo no modifica nada | ✔ Lectura, validación, actualización y auditoría van en `BEGIN IMMEDIATE`; los tests de 404 y 422 comprueban que no hay cambios ni eventos |
| Commits en español con prefijo | ✔ Uno por fase, en la rama `lucas` |

## Observaciones

- **Sin test de concurrencia nuevo para las transiciones** (decisión P5): usan el mismo `BEGIN IMMEDIATE` que ya está probado en C-01. Queda como riesgo aceptado.
- **El orden de los tests de `web/` no se puso a prueba con la pantalla**: los componentes se verifican a mano, como en C-11 y C-07.
- **En Windows, cortar `npm run dev` deja procesos escuchando** en los puertos 3000 y 5173. Los cerré después de cada prueba, verificando el PID y la línea de comando.
