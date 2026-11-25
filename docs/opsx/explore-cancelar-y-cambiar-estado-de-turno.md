# Explore — `cancelar-y-cambiar-estado-de-turno` (C-05)

**Fecha**: 2026-11-24
**Fase OPSX**: Explore (obligatoria según la consigna)
**Modo**: directo, con la skill `openspec-explore`. Sin código.
**Responsable**: Lucas, rama `lucas`
**Governance**: MEDIO (CHANGES.md). Es un change visual: el botón Cancelar necesita mockup aprobado antes del Apply de la pantalla.

## Estado del repositorio al iniciar

- `lucas` actualizada con `git pull origin master`, sin conflictos, hasta `adba73e` (merge del PR 2 de C-07). Ya incluye C-11 (PR 1) y C-07.
- Tests en verde: **123/123** en la raíz y **27/27** en `web/`.
- `openspec list` → sin changes activos. Specs vigentes: `agenda-turnos` (17 requisitos, C-01 + C-07) y `catalogos` (4, C-11).
- C-05 no tiene dependencias pendientes: C-01 está archivado y C-07 mergeado (GATE 0c abierto).

## Qué pide C-05 (CHANGES.md + KB)

- **US-011 Cancelar**: un turno `reservado` o `confirmado` pasa a `cancelado`. Después se puede crear otro turno en el mismo horario y con los mismos recursos. Cancelar uno `atendido`, `ausente` o ya `cancelado` responde `TRANSICION_INVALIDA`. Se audita como `cancelado`.
- **US-013 Cambiar estado**: solo las transiciones de RN-TU-09. `ausente` y `atendido` siguen ocupando el horario (RN-TU-10).
- **RN-TU-11**: sin anticipación mínima para cancelar.
- **RN-AU-01 / RN-GL-01**: toda transición deja un evento con antes y después, y un rechazo no modifica nada ni audita.
- **Flujo 2**: cargar el turno (404 si no existe), validar la transición (422), actualizar y auditar en una transacción, responder `200`.
- **Pantalla**: botón Cancelar (y Confirmar si da el tiempo) en cada turno de la Agenda de C-07.

Máquina de estados (RN-TU-09):

```
                    confirmar
     +-----------+ ----------> +------------+
     | reservado |             | confirmado |
     +-----------+             +------------+
       |  |  |                   |   |   |
       |  |  +------+   +--------+   |   |
       |  |  ausente|   |ausente     |   |
       |  |         v   v            |   |
       |  |      +---------+         |   |
       |  |      | ausente |  (final, OCUPA)
       |  |      +---------+         |   |
       |  | atendido                 |   | atendido
       |  +-------------->+----------+---v-+
       |                  |   atendido     |  (final, OCUPA)
       |                  +----------------+
       | cancelar                    | cancelar
       +-------------->+-------------v-+
                       |   cancelado   |  (final, LIBERA)
                       +---------------+

  Cualquier otra transicion (incluido X -> X) --> 422 TRANSICION_INVALIDA
```

## Relevamiento del código actual

| Lugar | Qué hay | Qué implica para C-05 |
|---|---|---|
| `src/domain/turno.ts` | Tipo `EstadoTurno` con los 5 estados; validación de grilla y duración | Falta `transicionValida(desde, hacia)`. Es una función pura, ideal para una tabla de tests con las 25 combinaciones |
| `src/domain/errores.ts` | `CodigoError` sin `TRANSICION_INVALIDA` | Hay que sumarlo, y también en `ESTADO_HTTP` de `app.ts` (422) |
| `src/infrastructure/sqlite/esquema.ts` | `turno.estado` con CHECK de los 5 valores y `actualizado_en`; `evento_auditoria.accion` ya admite `cancelado` y `estado_cambiado`; la auditoría es inmutable (triggers) | **No hace falta tocar el esquema** |
| `src/infrastructure/sqlite/repositorios.ts` | Lectura de recursos por id, candidatos de solapamiento (excluye `cancelado`), inserción de turno y auditoría, listados de catálogos y de agenda | Faltan `obtenerTurno(id)` y `actualizarEstadoTurno(id, estado, actualizadoEn)`. `buscarTurnosQuePodrianChocar` ya ignora los cancelados: liberar el horario **no requiere código nuevo** |
| `src/infrastructure/sqlite/conexion.ts` | `enTransaccionInmediata` (BEGIN IMMEDIATE) | Se reutiliza: leer el estado, validar, actualizar y auditar dentro del mismo lock (ver H3) |
| `src/application/` | `crearTurno` y `consultarAgenda` (de Lautaro) | Nuevo caso de uso `cambiarEstadoTurno(db, id, hacia, reloj)` |
| `src/http/app.ts` | `/health`, plugin `rutasCatalogos`, `GET /turnos` (C-07, **inline**) y `POST /turnos` | Las rutas nuevas van en un plugin propio (ver H6) |
| `tests/e2e/turnos.test.ts` | Escenarios de creación y auditoría | Modelo a seguir para los e2e de transiciones |

### La pantalla Agenda (C-07, Lautaro)

```
  Agenda.tsx (estado, filtros, rango)          TablaTurnos.tsx (presentacional)
  +-----------------------------------+        +------------------------------------+
  | vista dia/semana, fechaBase       |        | Hora | Paciente | ... | Estado | [ ] |
  | filtros profesional / sillon      | -----> |                               ^    |
  | incluirCancelados                 | turnos |      columna "Acciones" vacia,     |
  | intento (contador para recargar)  |        |      reservada para C-05 ----------+
  | consultarAgenda(...) en useEffect |        +------------------------------------+
  +-----------------------------------+
            ^   setIntento(n + 1) recarga la agenda
            |
     despues de cancelar ---> la fila pasa a "Cancelado" o desaparece
                              (si "Mostrar cancelados" esta apagado)
```

- `TablaTurnos` es presentacional y se usa en las dos vistas: en Semana se renderiza una tabla por día. Si los botones van en la tabla, aparecen en ambas vistas sin trabajo extra.
- `Agenda` ya tiene el mecanismo de recarga (`intento` + `reintentar`). Después de cancelar alcanza con incrementar `intento` para traer el estado real de la API, sin parchear la lista a mano.
- `tipos.ts` ya define `EstadoTurno` y `TurnoEnAgenda`. A `cliente.ts` le falta la función para el `POST` de transición.
- **`estilos.css` no tiene `.btn-danger`**: está en `design-system/components.html` ("Cancelar turno", rojo reservado para cancelar según `brand.md`), pero no se copió a `web/`.
- La insignia de estado y el estilo de fila `.cancelado` (tachado) ya existen.

## Hallazgos

**H1 — Contradicción en los endpoints.** CHANGES.md pide cuatro endpoints sin cuerpo (`POST /turnos/:id/cancelar`, `/confirmar`, `/ausente`, `/atendido`). La KB (`02_descripcion_general.md`, tabla API) dice `POST /turnos/:id/cancelar` y **`POST /turnos/:id/estado`** con el estado en el cuerpo. Flujo 2 solo habla de `/cancelar`.

| Opción | Pros | Contras |
|---|---|---|
| A. Cuatro rutas, una por acción (CHANGES) | URL autoexplicativa; sin cuerpo que validar; cada botón llama a su ruta | 4 rutas casi iguales (se resuelve con una tabla `accion → estado`) |
| B. `/cancelar` + `/estado` con `{ estado }` (KB) | Menos rutas; extensible | Cuerpo a validar (`enum` de 3 valores); `/estado` con `cancelado` duplicaría `/cancelar` |

Recomendación: **A**, que es la del roadmap más reciente. Por dentro, las cuatro rutas llaman al mismo caso de uso con el estado destino. Hay que corregir la tabla API de la KB en el mismo change para que no quede la contradicción.

**H2 — Qué devuelve una transición exitosa.** Flujo 2 dice `200` pero no el cuerpo. Opciones: el turno con ids, como `POST /turnos` (`TurnoCreado`), o el turno con nombres, como `GET /turnos` (`TurnoEnAgenda`). Recomendación: **la forma de `POST /turnos`** (ids, `inicio`, `fin`, `duracionMin`, `estado`), con `response` schema. La Agenda no lo necesita para pintar porque recarga con `intento`, y así no hay que hacer JOIN en la transición.

**H3 — Concurrencia en las transiciones.** Dos pedidos casi simultáneos sobre el mismo turno (por ejemplo, recepción cancela mientras el odontólogo marca atendido) no deben pasar los dos. Si se lee el estado, se valida y se escribe fuera de un lock, los dos ven `reservado` y gana el último. Recomendación: leer, validar, actualizar y auditar **dentro de `enTransaccionInmediata`**, igual que la creación (RN-TU-13 + RN-GL-01). Con `DatabaseSync` en un solo proceso la carrera es improbable, pero el patrón ya existe y cuesta una línea. El test de concurrencia de C-01 con dos conexiones podría replicarse; ver P5.

**H4 — Auditoría.** `accion = 'cancelado'` para cancelar y `'estado_cambiado'` para confirmar, ausente y atendido. `antes = { estado: <anterior> }` y `despues = { estado: <nuevo> }`, más el `turnoId` que ya tiene la fila. `usuario_id` sigue nulo hasta C-08. Un rechazo (404 o 422) no deja evento: se prueba contando filas, como "Rechazo sin efectos" de C-01.

**H5 — Liberar el horario ya funciona.** El requisito "Los turnos cancelados no ocupan la agenda" de C-01 ya garantiza que un turno `cancelado` no bloquea. Lo que C-05 tiene que probar de punta a punta es la **secuencia real**: crear → cancelar por la API → crear otra vez el mismo horario → `201`. También el inverso: marcar `ausente` o `atendido` → crear el mismo horario → `409`.

**H6 — Dónde van las rutas.** Lautaro dejó `GET /turnos` inline en `app.ts`. Para C-05 conviene repetir el patrón de C-11: un plugin `src/http/rutas-estado-turno.ts` registrado con una línea. Mantiene `app.ts` chico y evita choques si C-06 (reprogramar) se hace en paralelo.

**H7 — Validación del `:id`.** `params` con `id: integer >= 1`. `"abc"` o `0` responden `400 SOLICITUD_INVALIDA` (el manejador de errores ya lo mapea), y un id que no existe responde `404 RECURSO_INEXISTENTE` con `{ recurso: 'turno', id }`. Las rutas no reciben cuerpo: si llega uno con campos, `removeAdditional: false` no aplica a un body que no tiene schema. Hay que decidir si se ignora o se rechaza; recomiendo **ignorarlo** (no declarar body).

**H8 — Cambios de estado y tiempo.** RN-TU-11 dice que no hay anticipación mínima para cancelar. Pero la KB no dice nada sobre marcar `atendido` o `ausente` un turno **futuro** (por ejemplo, "atendido" para mañana). Recomendación: **no restringir en v1**, por coherencia con RN-TU-11 y para no inventar una regla. Queda como pregunta para el roadmap, no para este change.

**H9 — El botón en la pantalla.**
- Cancelar solo tiene sentido en `reservado` y `confirmado`. La pantalla puede ocultarlo en los demás estados **sin repetir la regla de negocio**: es presentación, y si alguien llama igual, la API responde 422. Lo mismo para Confirmar (solo en `reservado`).
- `cancelado` es un estado **final**: un clic equivocado no se puede deshacer (no hay "descancelar" en RN-TU-09). Pide un paso de confirmación (ver P2).
- Después de la acción: aviso de éxito ("Turno cancelado") o de error (422 si otro ya lo cambió, 404, sin conexión), y recarga con `intento`.
- Faltan `.btn-danger` (y `.btn-sm` existe) en `estilos.css`, y textos de `TRANSICION_INVALIDA` en `mensajes.ts`.

**H10 — Mockup y plazo.** CHANGES.md y `design-system/README.md` exigen mockup aprobado por el líder para "el botón de C-05". La entrega es el 25/11 a las 23:00. Igual que en C-11: la API (dominio, caso de uso, rutas, tests) no depende del mockup y puede arrancar apenas se apruebe el Propose. El mockup puede ser chico: la Agenda de C-07 con la columna de acciones, el paso de confirmación, el éxito y el 422. ¿Solo escritorio, como en C-11? Ver P4.

**H11 — Spec.** El Purpose de `agenda-turnos` dice que los changes posteriores (cancelar, reprogramar) la extienden. Recomendación: **delta ADDED en `agenda-turnos`** (no una capability nueva) con:
- Cancelar un turno
- Confirmar un turno
- Marcar ausente o atendido
- Transiciones inválidas
- Ausente y atendido siguen ocupando
- Auditoría de las transiciones

"Los turnos cancelados no ocupan la agenda" no cambia; se cubre con un escenario nuevo de punta a punta dentro de "Cancelar un turno".

## Escenarios candidatos (spec `agenda-turnos`)

| Tipo | Escenario |
|---|---|
| Feliz | Cancelar un turno `reservado` → `200`, estado `cancelado`, evento `cancelado` |
| Feliz | Cancelar un turno `confirmado` → `200` |
| Feliz | Confirmar un turno `reservado` → `200`, estado `confirmado`, evento `estado_cambiado` |
| Feliz | Marcar `atendido` y marcar `ausente` desde `reservado` y desde `confirmado` |
| Feliz / borde | Tras cancelar, se crea otro turno con el mismo profesional, sillón y horario → `201` |
| Error de negocio | Cancelar un turno `atendido`, `ausente` o ya `cancelado` → `422 TRANSICION_INVALIDA`, sin cambios ni auditoría |
| Error de negocio | Confirmar un turno `confirmado` o `cancelado` → `422 TRANSICION_INVALIDA` |
| Borde | Turno `ausente` o `atendido` + nuevo turno en el mismo horario → `409` (siguen ocupando) |
| Error | Turno inexistente → `404 RECURSO_INEXISTENTE`; id `abc` → `400 SOLICITUD_INVALIDA` |

## Flujo de la pantalla (propuesta)

```
  Fila "reservado"/"confirmado"
        |
   clic "Cancelar"
        v
  [confirmacion: "Cancelar el turno de 10:00 de Paciente Ficticio Uno?"]
        |  No --> no pasa nada
        |  Si
        v
  [boton aria-busy "Cancelando..."] --POST /api/turnos/:id/cancelar-->
        |
   +----+---------------------+----------------------+
   v                          v                      v
  200                   422 / 404             sin conexion
  aviso "Turno cancelado" aviso con mensaje   aviso rojo
  recarga (intento+1)     recarga (intento+1)  (sin recargar)
```

## Decisiones confirmadas (2026-11-24, Lucas)

| # | Pregunta | Decisión |
|---|---|---|
| P1 | Forma de los endpoints | **Cuatro rutas sin cuerpo**, como CHANGES.md: `POST /turnos/:id/cancelar`, `/confirmar`, `/ausente` y `/atendido`. Se corrige la tabla API de `knowledge-base/02_descripcion_general.md` para que coincida (H1) |
| P2 | Confirmación antes de cancelar | **Sí, con `window.confirm`** antes de llamar a la API: `cancelado` es un estado final |
| P3 | Botones en la Agenda | **Cancelar y Confirmar**. Ausente y Atendido quedan solo en la API |
| P4 | Mockup y orden | **Solo escritorio (1440×900)**, como C-11. **Primero la API**, que no espera el mockup; la pantalla espera la aprobación de Nazareno |
| P5 | Test de concurrencia de transiciones | **No** se suma uno nuevo. La transacción `BEGIN IMMEDIATE` es el mismo mecanismo ya probado en C-01; queda como riesgo aceptado |

Recomendaciones aceptadas (R1 a R7):

| # | Tema | Decisión |
|---|---|---|
| R1 | Respuesta de la transición | `200` con el turno en la forma de `POST /turnos` y `response` schema (H2) |
| R2 | Atomicidad | Leer, validar, actualizar y auditar en `enTransaccionInmediata` (H3) |
| R3 | Auditoría | `cancelado` / `estado_cambiado` con `antes`/`despues` = `{ estado }` (H4) |
| R4 | Rutas | Plugin `src/http/rutas-estado-turno.ts` (H6) |
| R5 | Spec | Delta ADDED en `agenda-turnos` (H11) |
| R6 | Tiempo | Sin restricción de fecha para ninguna transición en v1 (H8) |
| R7 | Pantalla | Botones solo en los estados donde aplican, recarga con `intento`, `.btn-danger` copiado del design-system (H9) |

## Próximo paso

`/opsx:propose cancelar-y-cambiar-estado-de-turno` → mockup del botón (aprobación de Nazareno) → Apply en dos tramos.
