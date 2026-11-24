# Explore — `interfaz-web-base` (C-11)

**Fecha**: 2026-11-24
**Fase OPSX**: Explore (obligatoria según la consigna)
**Modo**: directo, con la skill `openspec-explore`. Sin código.
**Responsable**: Lucas, rama `lucas`
**Governance**: BAJO (CHANGES.md), pero es el primer change visual: necesita mockup aprobado por el líder antes del Apply.

## Estado del repositorio al iniciar

- Rama `lucas`, limpia y al día con `master` (último commit `e69382e`, el Paso 0 de DD-08).
- `openspec list` → sin changes activos. Spec vigente: `agenda-turnos` (11 requirements, de C-01).
- **No existe `web/`.** Tampoco hay ningún `GET` de catálogos: la API solo tiene `GET /health` y `POST /turnos`.
- `design-system/` en revisión 1, aprobado el 2026-11-23: `tokens.css`, `brand.md`, `brand.js`, `assets/logo.svg` (provisorio), `components.html` y `previews/`.
- Tests de la raíz: Vitest con `include: ['tests/**/*.test.ts']` (75 en verde al archivar C-01). `tsconfig.json` compila solo `src/`, así que `web/` no lo toca.
- `.gitignore` ya cubre `web/node_modules/` y `web/dist/` (los patrones `node_modules/` y `dist/` no están anclados a la raíz).

## Qué pide C-11 (CHANGES.md)

```
  Navegador (localhost:5173)                     API Fastify (127.0.0.1:3000)
  +------------------------------+               +-----------------------------+
  | web/  Vite + React + TS      |               | GET  /pacientes      (nuevo)|
  |                              |  /api/* ----> | GET  /profesionales  (nuevo)|
  |  Layout: menu lateral        |  proxy Vite   | GET  /sillones       (nuevo)|
  |   - Nuevo turno   (C-11)     |  sin prefijo  | GET  /prestaciones   (nuevo)|
  |   - Agenda  "proximamente"   |  (sin CORS)   | POST /turnos         (C-01) |
  |                              |               | GET  /health         (C-01) |
  |  tokens.css del design-system|               +-----------------------------+
  +------------------------------+
```

1. `web/` creado con `npm create vite@latest web -- --template react-ts`, con su propio `package.json`.
2. Proxy en `web/vite.config.ts`: `/api/*` → `http://127.0.0.1:3000/*` quitando el prefijo.
3. API de solo lectura **con tests**: `GET /pacientes`, `/profesionales`, `/sillones`, `/prestaciones` (solo activos).
4. Layout con menú lateral (Nuevo turno, Agenda "próximamente") con `design-system/tokens.css`.
5. Pantalla Nuevo turno: 4 selects desde la API, fecha y hora, botón Reservar → `POST /turnos`; muestra el turno creado o el error (409, 422, 400) en forma legible.
6. Spec: escenarios de la API. La pantalla se verifica a mano con capturas a 390×844 y 1440×900.
7. Fuera de alcance: login/roles (DD-07, C-08), alta y edición de recursos (C-02, C-04).

## Relevamiento del código actual (`src/`)

| Archivo | Qué hay | Qué implica para C-11 |
|---|---|---|
| `http/app.ts` | `construirApp({ db, reloj, logger })`; un `setErrorHandler` único que devuelve `{ error: { codigo, mensaje, detalle } }`; `removeAdditional: false`; rutas `/health` y `POST /turnos` inline | Los GET nuevos se cuelgan acá. El formato de error ya es el que la pantalla tiene que leer. **No hay `response` schema** en ninguna ruta |
| `infrastructure/sqlite/repositorios.ts` | Solo lecturas por id (`obtenerRecurso`, `obtenerPrestacion`), búsqueda de candidatos e inserciones. Todo con sentencias preparadas | Faltan las funciones de listado (`listarProfesionalesActivos`, etc.) |
| `infrastructure/sqlite/esquema.ts` | `profesional.activo`, `sillon.activo`, `prestacion.activa` (femenino), **`paciente` sin columna de activo** | Ver hallazgo H1 |
| `infrastructure/sqlite/seed.ts` | 3 profesionales, 3 sillones (Sillón 1, Sillón 2, Box 3), 4 prestaciones, 3 pacientes, todo ficticio; ids fijos en `SEED` | Alcanza para la pantalla y para los tests de los GET |
| `application/crear-turno.ts` | Devuelve `TurnoCreado` **solo con ids** + `inicio`/`fin` ISO con offset, `duracionMin`, `estado` | El aviso "Turno reservado: Paciente Ficticio Uno · Dra. Ana Prueba · …" se arma en el front cruzando los ids con los catálogos ya cargados. No hace falta tocar el backend |
| `domain/conflictos.ts` | El 409 trae `detalle.conflictos: [{ recurso, turnoId, inicio, fin }]` | Alcanza para el texto del mockup ("Choca con el turno de 10:00 a 10:30 en Sillón 1"): el nombre del sillón o del profesional sale del formulario |
| `domain/tiempo.ts` | `instanteDesdeIso` exige offset; `aIsoLocal` calcula el offset con `Intl` y la zona IANA | La pantalla tiene que mandar `inicio` **con offset** y **sin hardcodear `-03:00`** (regla dura). Ver hallazgo H3 |
| `main.ts` | Escucha en `127.0.0.1:PORT` (3000 por defecto), carga el seed si `SEED_FICTICIO=true` | Coincide con el destino del proxy |

Códigos que la pantalla puede recibir de `POST /turnos` hoy:

| HTTP | `codigo` | Aviso (tono de `brand.md`) | Estilo |
|---|---|---|---|
| 201 | — | "Turno reservado" + resumen con nombres y horario | `alert-success` |
| 409 | `TURNO_SOLAPADO_PROFESIONAL` | "El profesional ya tiene un turno en ese horario" + conflictos | `alert-danger` |
| 409 | `TURNO_SOLAPADO_SILLON` | "El sillón ya está ocupado en ese horario" + conflictos | `alert-danger` |
| 422 | `INICIO_FUERA_DE_GRILLA` | "La hora tiene que caer en la grilla de 15 minutos" | `alert-warning` |
| 422 | `DURACION_INVALIDA` | "La duración no es válida" (con el form actual no debería pasar: no se manda `duracionMin`) | `alert-warning` |
| 422 | `RECURSO_INACTIVO` | "Ese recurso está dado de baja" (raro: los selects solo listan activos) | `alert-warning` |
| 404 | `RECURSO_INEXISTENTE` | "No encontramos ese dato, recargá la página" | `alert-danger` |
| 400 | `SOLICITUD_INVALIDA` | "Faltan datos o tienen otro formato" | `alert-danger` |
| 500 / red caída | `ERROR_INTERNO` / sin respuesta | "No pudimos conectar con el servidor" | `alert-danger` |

El código técnico va al final, en monoespaciada (`409 TURNO_SOLAPADO_SILLON`), como pide `brand.md`. Los códigos `FUERA_DE_HORARIO` y `EN_BLOQUEO` no existen todavía (C-03); conviene que el mapa tenga un caso por defecto que muestre el `mensaje` del backend tal cual.

## Design-system y mockups

- `components.html` ya trae casi todo lo que necesita la pantalla: layout `.app/.sidebar/.main`, nav con `aria-current`, `.card`, `.form-grid` de 2 columnas (1 en móvil), `.field/.control` con estado `invalid`, botones (incluido `aria-busy` "Reservando…"), avisos success/danger/warning y el corte móvil a 48rem (sidebar arriba, horizontal).
- El formulario de referencia tiene el orden Paciente / Prestación / Profesional / Sillón / Fecha / Hora (`type="time" step="900"`) y botones "Reservar turno" y "Limpiar".
- **No hay mockups de C-11 todavía.** Según `design-system/README.md` van en `openspec/changes/interfaz-web-base/mockups/` (importando `../../../../design-system/tokens.css`), con capturas a 390×844 y 1440×900 en `mockups/previews/` y la sección `## UI Mockups` en `design.md` con `Approval: pending`. Como esa carpeta vive dentro del change, **primero hay que correr el Propose** (que crea el change con el CLI) y después armar los mockups.
- Estados a mockear (una vista por pantalla y estado): formulario vacío/cargando catálogos (skeleton), formulario listo, reservando, éxito, 409, 422, error de conexión. En la nav, "Agenda" con la marca "Próximamente" (el `components.html` muestra "C-07", que es jerga interna; para el usuario conviene "Próximamente").
- `tokens.css` está fuera de `web/`: `main.tsx` lo importa con `../../design-system/tokens.css` y puede hacer falta `server.fs.allow: ['..']` en `vite.config.ts` (lo anticipa `08_arquitectura_propuesta.md`).

## Hallazgos (cosas que el Propose tiene que resolver)

**H1 — `paciente` no tiene "activo".** CHANGES.md dice "solo los activos" para los cuatro GET, pero la tabla `paciente` no tiene columna de baja lógica (y `obtenerRecurso` la trata como siempre activa). Recomendación: `GET /pacientes` devuelve todos; "solo activos" aplica a profesionales, sillones y prestaciones. No agregar la columna en C-11 (sería invadir C-04).

**H2 — Datos de pacientes que expone el GET.** La ficha tiene `telefono`, `email` y `obra_social` (datos personales, Ley 25.326). El select solo necesita `id` y el nombre. Recomendación: `GET /pacientes` devuelve `{ id, nombre, apellido }` y nada más, con `response` schema de Fastify para que no se filtre ningún campo. C-04 después puede sumar `GET /pacientes/:id` con la ficha completa.

**H3 — Armar `inicio` con offset en el navegador sin hardcodear `-03:00`.** La pantalla tiene fecha (`2026-12-01`) y hora (`10:00`) de pared del consultorio. Opciones:

| Opción | Cómo | Pros | Contras |
|---|---|---|---|
| A. Helper en `web/src` con `Intl` | Calcular el offset de `America/Argentina/Buenos_Aires` para esa fecha con `Intl.DateTimeFormat(..., { timeZoneName: 'longOffset' })` y armar `2026-12-01T10:00:00-03:00` | Respeta la regla dura; independiente del huso de la PC de recepción | Lógica de fechas duplicada (chica) respecto de `src/domain/tiempo.ts` |
| B. Importar `src/domain/tiempo.ts` desde `web/` | Import relativo fuera de `web/` | Una sola implementación | Acopla los dos paquetes; `tiempo.ts` importa `errores.ts` y usa extensiones `.js` de NodeNext |
| C. Usar el offset del navegador | `new Date(...).toISOString()` / `getTimezoneOffset()` | Trivial | Depende del huso de la PC: **incorrecto** si la PC no está en Argentina. Descartar |

Recomendación: **A**, con un test unitario del helper (es la única lógica no trivial del front).

**H4 — Dónde viven los tests.** El Vitest de la raíz solo mira `tests/**`. Los GET nuevos van en `tests/e2e/catalogos.test.ts` con `app.inject` y base `:memory:` (mismo patrón que `turnos.test.ts`). Para el helper de H3 hay dos caminos: Vitest propio en `web/` (suma configuración) o un test en la raíz que importe desde `web/src` (rompe la separación de paquetes). Recomendación: Vitest en `web/` con un solo archivo de test; el Verify corre `npm test` en la raíz y en `web/`, más `npm run build` en `web/`.

**H5 — Choques con la rama de Lautaro.** C-07 (API) agrega `GET /turnos` en `src/http/app.ts` en paralelo. Si los dos editamos el mismo bloque de rutas, el merge choca. Recomendación: poner los GET de catálogos en un archivo propio (`src/http/rutas-catalogos.ts`, registrado con `app.register`) y tocar `app.ts` en una sola línea. Avisarle a Lautaro que haga lo mismo con sus rutas.

**H6 — Forma de las respuestas de listado.** No hay convención todavía. Opciones: arreglo plano `[{ id, nombre, ... }]` o envoltorio `{ items: [...] }`. Recomendación: arreglo plano, ordenado por nombre (por apellido en pacientes), con `response` schema. Es lo más simple y C-02/C-04 lo pueden extender sin romper. Propiedades sugeridas:
- `GET /profesionales` → `{ id, nombre }` (la matrícula no hace falta en la pantalla)
- `GET /sillones` → `{ id, nombre }`
- `GET /prestaciones` → `{ id, nombre, duracionMin }` (la duración se muestra en el select: "Limpieza (30 min)")
- `GET /pacientes` → `{ id, nombre, apellido }`

**H7 — Capability del spec.** Los GET de catálogos no son "agenda-turnos". Recomendación: capability nueva `catalogos` (lectura de pacientes, profesionales, sillones y prestaciones) y, si hace falta, un escenario más en `agenda-turnos` solo si se cambia algo de `POST /turnos` (no debería: el formato de error ya está especificado). La pantalla no lleva spec propio: se verifica a mano contra el mockup.

**H8 — Plazo.** Hoy es 24/11 y la entrega es el 25/11 23:00. C-11 es el primer merge de la cadena (C-11 → C-07 pantalla → C-05 botón). El paso de mockup + aprobación del líder es el cuello de botella: conviene mandar los mockups apenas termine el Propose y avanzar con los GET (que no dependen del mockup) mientras se espera la aprobación… pero la regla dice que el Apply no arranca sin mockup aprobado. Resuelto en P4: la API arranca antes y las pantallas esperan la aprobación.

## Escenarios candidatos para el spec (`catalogos`)

| Tipo | Escenario |
|---|---|
| Feliz | `GET /profesionales` devuelve 200 con Dra. Ana Prueba, Dr. Bruno Ejemplo y Dra. Carla Demo ordenados por nombre |
| Feliz | `GET /prestaciones` incluye `duracionMin` (Limpieza 30) |
| Borde | Un sillón inactivo (Sillón 2) no aparece en `GET /sillones` |
| Borde | Una prestación inactiva no aparece en `GET /prestaciones` |
| Borde | `GET /pacientes` no expone `telefono`, `email` ni `obra_social` |
| Borde | Sin profesionales activos, `GET /profesionales` devuelve 200 con `[]` |

> Nota: los GET de solo lectura casi no tienen "error de negocio". El escenario de error que pide la consigna (feliz, error, borde) se cubre con "el error de `POST /turnos` llega con `codigo` y `mensaje`", que ya tiene tests en C-01; el Propose puede referenciarlo o sumar un escenario de integración.

## Flujo de la pantalla Nuevo turno

```
  [montaje] --GET x4 en paralelo--> [cargando: skeleton]
                                         |
                    +--------------------+------------------+
                    v                                       v
             [form listo]                          [error de carga]
                    |                               "No pudimos cargar..."
          completa y toca Reservar                  + boton Reintentar
                    v
          [reservando: boton aria-busy]
                    |
     +--------------+---------------+
     v              v               v
  [201 exito]   [409 / 422 / 400]  [sin conexion]
  aviso verde   aviso con mensaje   aviso rojo
  limpia hora   conserva el form    conserva el form
```

La pantalla **no valida reglas de negocio** (DD-08): ni solapamientos ni grilla. `step="900"` en la hora es una ayuda, no una regla; el que decide es el backend.

## Decisiones confirmadas (2026-11-24, Lucas)

| # | Pregunta | Decisión |
|---|---|---|
| P1 | Campos de `GET /pacientes` | Devuelve todos los pacientes (no hay baja lógica, H1) con **solo `id`, `nombre` y `apellido`** (H2). `telefono`, `email` y `obra_social` no se exponen; C-04 puede sumar la ficha completa en `GET /pacientes/:id` |
| P2 | Forma de los listados | **Arreglo plano** `[{ ... }]`, ordenado y con `response` schema (H6). Convención para C-02, C-04 y C-07 |
| P3 | Tests del front | **Sí, Vitest dentro de `web/`** para testear el helper que arma `inicio` con offset (H3, H4). Las pantallas se siguen verificando a mano contra el mockup |
| P4 | Orden frente al mockup | **La parte API (GET de catálogos y sus tests) arranca antes de que se apruebe el mockup.** Las pantallas (`web/`: layout y Nuevo turno) esperan la aprobación de Nazareno |

Con P4 el Apply se parte en dos tramos:

```
  Propose --> mockups (Approval: pending) --+--> Apply tramo 1: API de catalogos + tests
                                            |        (no espera la aprobacion)
                                            |
                                            +--> aprobacion de Nazareno
                                                     |
                                                     v
                                             Apply tramo 2: web/ (layout, Nuevo turno,
                                             helper de fechas con Vitest)
```

## Recomendaciones que siguen abiertas para el Propose

No se preguntaron explícitamente; el Propose las toma como punto de partida y se pueden ajustar al revisarlo.

| # | Tema | Recomendación |
|---|---|---|
| R1 | `inicio` con offset | Helper con `Intl` y zona IANA en `web/src` (opción A de H3) |
| R2 | Rutas | Plugin `src/http/rutas-catalogos.ts` para no chocar con C-07 (H5) |
| R3 | Spec | Capability nueva `catalogos` (H7) |
| R4 | Nav | "Agenda" deshabilitada con "Próximamente" |
| R5 | Campos del resto de los listados | Profesionales y sillones `{ id, nombre }`; prestaciones `{ id, nombre, duracionMin }` (H6) |

## Próximo paso

`/opsx:propose interfaz-web-base` con las decisiones confirmadas → mockups en `openspec/changes/interfaz-web-base/mockups/` → Apply tramo 1 (API) en paralelo con la revisión de Nazareno → aprobación → Apply tramo 2 (`web/`).
