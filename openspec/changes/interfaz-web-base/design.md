# Design

## Context

- Motivación y alcance: ver `proposal.md`. Relevamiento y decisiones confirmadas: `docs/opsx/explore-interfaz-web-base.md` (P1–P4 y R1–R5).
- La API (C-01) tiene solo `GET /health` y `POST /turnos`, armados en `construirApp` (`src/http/app.ts`) con un `setErrorHandler` único que ya devuelve `{ error: { codigo, mensaje, detalle } }`. Ninguna ruta tiene `response` schema.
- Esquema: `profesional.activo`, `sillon.activo`, `prestacion.activa` (en femenino) y `paciente` **sin** baja lógica. Seed ficticio con ids fijos (`SEED`).
- `POST /turnos` devuelve el turno solo con ids, más `inicio`/`fin` ISO con offset. El 409 trae `detalle.conflictos: [{ recurso, turnoId, inicio, fin }]`.
- En paralelo, Lautaro (C-07) agrega `GET /turnos` en la rama `lautaro`. Los dos cambios tocan la capa HTTP.
- No existe `web/`. El design-system (revisión 1) está en `design-system/` y `components.html` ya tiene el layout, el formulario y los avisos de referencia.

## Goals / Non-Goals

**Goals:**
- GET de catálogos con contrato fijo (campos y orden) y sin filtrar datos personales de más.
- Un `web/` que se levante con dos comandos y que C-07 y C-05 puedan extender (layout, cliente de API, componentes de aviso).
- Cero reglas de negocio en el front: la pantalla solo traduce `codigo` → texto.
- Separar el trabajo en dos tramos: la API no espera el mockup y las pantallas sí (P4).

**Non-Goals:**
- Router, manejo de estado global o librerías de UI. Con dos ítems de menú alcanza con estado local.
- Tests automáticos de componentes o de punta a punta en el navegador. Las pantallas se verifican a mano contra el mockup.
- Compartir código TypeScript entre la raíz y `web/`.
- Vista móvil: la pantalla se diseña y verifica solo para escritorio (1440×900). Ver "Ajuste de alcance".

## Decisions

### D1 — Rutas de catálogos en un plugin propio
`src/http/rutas-catalogos.ts` exporta un plugin de Fastify con los 4 GET y recibe `db` por opciones. `construirApp` lo registra con una línea (`app.register(rutasCatalogos, { db })`).
- **Por qué**: C-07 también agrega rutas. Si los dos editamos el bloque de rutas de `app.ts`, el merge choca. El plugin hijo hereda el `setErrorHandler` del padre, así que el formato de error no cambia.
- **Alternativa**: rutas inline en `app.ts`, como `POST /turnos`. Es más corto, pero genera conflictos seguros con la rama `lautaro`.

### D2 — Listados en el repositorio, sin caso de uso de aplicación
Funciones `listarProfesionalesActivos`, `listarSillonesActivos`, `listarPrestacionesActivas` y `listarPacientes` en `repositorios.ts`, con sentencias preparadas y `ORDER BY` en SQL. Hacen `SELECT` solo de las columnas que se exponen, y la ruta las llama directo.
- **Por qué**: son lecturas sin reglas. Un caso de uso en `application/` solo pasaría los datos de mano. Seleccionar solo las columnas expuestas es la primera barrera para no filtrar datos de pacientes.
- **Orden**: profesionales, sillones y prestaciones `ORDER BY nombre`; pacientes `ORDER BY apellido, nombre`. Collation `BINARY` de SQLite, suficiente con los nombres del seed.
- **Alternativa**: un caso de uso por catálogo. Se descarta porque agrega capas sin lógica.

### D3 — `response` schema en cada GET
Cada ruta declara `response: { 200: { type: 'array', items: { type: 'object', additionalProperties: false, required: [...], properties: {...} } } }`.
- **Por qué**: Fastify serializa con el schema y descarta cualquier propiedad que no esté declarada. Es la segunda barrera para `GET /pacientes` (Ley 25.326): aunque alguien sume `telefono` a la consulta, no sale. Además documenta el contrato y serializa más rápido.
- Mapeo de nombres: `duracion_min` → `duracionMin` en el repositorio, igual que el resto del código.

### D4 — `web/` con la plantilla `react-ts` de Vite y sin router
`npm create vite@latest web -- --template react-ts`. El layout (`components/Layout`) tiene un menú con dos ítems: "Nuevo turno" activo y "Agenda" deshabilitado (`aria-disabled`) con la etiqueta "Próximamente" (R4). La página activa es un estado local de `App`.
- **Por qué**: hay una sola pantalla real. C-07 puede sumar un estado más o meter `react-router` si lo necesita.
- **Alternativa**: `react-router` desde ahora. Se descarta: es una dependencia de más para una pantalla.

### D5 — Proxy y tokens en `vite.config.ts`
- `server.proxy['/api'] = { target: 'http://127.0.0.1:3000', rewrite: p => p.replace(/^\/api/, '') }`. El navegador ve un solo origen, así que no hace falta CORS.
- `web/src/main.tsx` importa `../../design-system/tokens.css`, y `server.fs.allow: ['..']` permite servir ese archivo de fuera de `web/`. En el build, Vite lo incluye en el bundle.
- Los estilos de los componentes se reimplementan en `web/src/estilos.css` con las mismas clases y variables de `components.html`, sin valores sueltos.

### D6 — Cliente de API tipado y errores como valores
`web/src/api/cliente.ts` expone `obtenerCatalogos()` (los 4 GET en paralelo) y `reservarTurno(datos)`. `reservarTurno` devuelve `{ ok: true, turno } | { ok: false, error: { estado, codigo, mensaje, detalle } }`. Un fallo de red o un cuerpo que no es JSON se convierte en `codigo: 'SIN_CONEXION'`, con estado 0.
- **Por qué**: la pantalla hace un `switch` sobre `codigo`, sin `try/catch` dispersos.
- **Textos**: `web/src/api/mensajes.ts` mapea `codigo` → `{ titulo, ayuda, tono }` según la tabla del explore (409 → `danger`, 422 → `warning`, 400/404/500/sin conexión → `danger`). Un código desconocido (por ejemplo `FUERA_DE_HORARIO` cuando llegue C-03) muestra el `mensaje` del backend tal cual. El código técnico va al final, en monoespaciada (`brand.md`).
- **Conflictos**: para el 409, cada conflicto se muestra como "Choca con el turno de HH:MM a HH:MM (profesional | sillón)". La hora sale del texto ISO que ya devuelve la API en hora local, sin aritmética de fechas en el front.

### D7 — `inicio` con offset calculado con `Intl` (R1)
`web/src/fechas.ts` → `inicioIso(fecha: 'YYYY-MM-DD', hora: 'HH:MM', zona = 'America/Argentina/Buenos_Aires'): string`. Arma el instante tentativo `Date.UTC(...)` con la hora de pared, le pide a `Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'longOffset' })` el offset de la zona en ese momento (`GMT-03:00`) y devuelve `2026-12-01T10:00:00-03:00`.
- **Por qué**: cumple la regla dura de no hardcodear `-03:00` y no depende del huso de la PC de recepción.
- **Alternativas**: importar `src/domain/tiempo.ts` (acopla los paquetes y arrastra las extensiones `.js` de NodeNext) o usar el offset del navegador (está mal si la PC no está en hora argentina). Ver el explore, H3.
- **Tests** (Vitest en `web/`, P3): una fecha de diciembre da `-03:00`; con otra zona (`Europe/Madrid`, invierno) da `+01:00`, lo que prueba que no está fijo; `GMT` sin horas da `+00:00`; y el resultado no depende de `process.env.TZ`.

### D8 — Comportamiento de la pantalla Nuevo turno
- Al montar: carga los catálogos y muestra el texto "Cargando…" (`role="status"`). Si falla, muestra un aviso con "Reintentar".
- Fecha por defecto: hoy en la zona del consultorio. Hora vacía, con `step="900"`, que es solo una ayuda.
- Reservar: deshabilita el botón (`aria-busy`, "Reservando…") y no permite doble envío.
- Éxito: aviso verde con nombres y horario. Los nombres salen de los catálogos cargados: paciente "Nombre Apellido", profesional, sillón, y "martes 1/12, 10:00 a 10:30". Se limpia la hora y se conservan los demás campos para reservar otro turno rápido.
- Error: se conservan todos los campos y el aviso queda arriba del botón (`role="alert"`). En 422 `INICIO_FUERA_DE_GRILLA` el campo Hora se marca `invalid`.
- No se manda `duracionMin`, así que vale la de la prestación. El select de prestaciones muestra "Limpieza (30 min)".

### D9 — Tests y scripts
- Raíz: `tests/e2e/catalogos.test.ts`, un `it` por escenario del spec `catalogos`, con `app.inject` y base `:memory:` nueva. Los escenarios con recursos inactivos hacen `UPDATE` previo con sentencia preparada. Los escenarios del delta de `agenda-turnos` van en `tests/e2e/turnos.test.ts`.
- `web/`: `vitest` como dependencia de desarrollo y script `"test": "vitest run"`, con un solo archivo `src/fechas.test.ts`.
- El Verify corre `npm test` en la raíz, `npm test` y `npm run build` en `web/`, y la verificación manual con capturas.

### D10 — Orden de implementación en dos tramos (P4)
1. **Tramo API** (no espera el mockup): D1–D3 y D9 de la raíz.
2. **Tramo pantallas** (espera `Approval: approved`): D4–D8, los tests de `web/` y el README.

### Ajuste de alcance (2026-11-24, Lucas)

Después del Propose se recortó el alcance de las pantallas:

1. **Solo escritorio.** La vista móvil queda fuera de este change. Sin media queries para celular en `web/`, sin mockups ni capturas a 390×844, y la verificación manual es solo a 1440×900.
2. **Carga con texto simple.** Mientras llegan los catálogos se muestra "Cargando…" en lugar del skeleton animado.
3. **Orden de profesionales sin cambios.** Se mantiene el orden alfabético por `nombre` ("Dr. Bruno Ejemplo" antes que "Dra. Ana Prueba"), como dice el spec `catalogos`.

**Motivo**: el plazo. La entrega es el 25/11 a las 23:00 y, después de C-11, Lucas sigue con C-05. La recepción usa la computadora de escritorio (DD-08), así que el móvil no bloquea la demo. El skeleton es solo cosmético.

**Desvío del design-system**: `design-system/README.md` pide capturas a 390×844 para cada change visual. Este change no las tiene a propósito. Si se retoma la vista móvil, va en un change aparte con su propio mockup.

## Risks / Trade-offs

- [Nazareno no aprueba el mockup a tiempo] → El tramo API se mergea igual en el PR si hace falta. Las pantallas se ajustan a las observaciones antes de abrir el PR completo.
- [Merge con la rama `lautaro` en `app.ts`] → D1 deja una sola línea de diferencia. Hay que avisarle a Lautaro que registre sus rutas también como plugin.
- [Orden alfabético raro: "Dr. Bruno" antes que "Dra. Ana"] → Es el orden por `nombre` tal cual está guardado. Se acepta en v1; C-02 puede separar título y apellido.
- [Transición de horario de verano si Argentina vuelve a tenerlo] → `Intl` usa la base de zonas del navegador. Calcular el offset en el instante tentativo puede equivocarse una hora en el borde exacto del cambio. Se acepta: hoy no hay DST y la grilla no cae en esos bordes.
- [`tokens.css` fuera de `web/`] → `server.fs.allow` en dev. El build lo copia en el bundle, así que no hace falta duplicarlo.
- [Sin tests automáticos de la UI] → Se mitiga con la verificación manual contra el mockup y las capturas en el verify (DD-08).

## Migration Plan

Sin migración de datos ni cambios de esquema. Para levantar todo: terminal 1 en la raíz con `npm run dev`, terminal 2 con `cd web`, `npm install` y `npm run dev`; se abre `http://localhost:5173`. Para revertir, alcanza con quitar `web/` y la línea `app.register` de `app.ts`.

## UI Mockups

Design system revision: 1
Approval: pending

Mockups en `openspec/changes/interfaz-web-base/mockups/` (importan `../../../../design-system/tokens.css`):

| Archivo | Qué muestra |
|---|---|
| `index.html` | Índice con un enlace por estado |
| `nuevo-turno.html?estado=listo` | Formulario completo, listo para reservar |
| `nuevo-turno.html?estado=cargando` | Carga de catálogos (texto "Cargando…") |
| `nuevo-turno.html?estado=reservando` | Botón "Reservando…" deshabilitado |
| `nuevo-turno.html?estado=exito` | Aviso verde "Turno reservado" |
| `nuevo-turno.html?estado=error-409` | Aviso rojo de sillón ocupado con el conflicto |
| `nuevo-turno.html?estado=error-422` | Aviso ámbar de grilla de 15 minutos y campo Hora marcado |
| `nuevo-turno.html?estado=sin-conexion` | Aviso rojo de sin conexión con "Reintentar" |

Capturas a 1440×900 en `mockups/previews/` (solo escritorio, ver "Ajuste de alcance"). Todos los datos son ficticios del seed.

Para aprobar, el líder cambia la línea a `Approval: approved (<fecha>, by Nazareno)`.
