# Proposal

## Why

La v1 solo se puede usar con `curl`: recepción no tiene forma de reservar un turno sin conocer los ids ni escribir un ISO 8601 a mano. DD-08 (2026-11-23) sumó una interfaz web mínima, y para eso faltan dos cosas que hoy no existen: endpoints para listar pacientes, profesionales, sillones y prestaciones, y la base de `web/` con el layout y la pantalla Nuevo turno.

**Por qué este change**: es el primero de la cadena de la entrega (C-11 → C-07 → C-05). Sin el layout y los catálogos, ni la Agenda de C-07 ni el botón Cancelar de C-05 tienen dónde vivir. Además muestra en pantalla el núcleo ya construido en C-01 (la API rechaza los solapamientos y la interfaz lo explica), sin agregar reglas de negocio nuevas.

## What Changes

- Nuevos endpoints de solo lectura:
  - `GET /pacientes` → todos los pacientes con `id`, `nombre` y `apellido`. No expone teléfono, email ni obra social. No hay baja lógica de pacientes, así que no se filtra por activo.
  - `GET /profesionales` y `GET /sillones` → solo los activos, con `id` y `nombre`.
  - `GET /prestaciones` → solo las activas, con `id`, `nombre` y `duracionMin`.
  - Todos responden `200` con un arreglo plano ordenado (vacío si no hay datos) y tienen `response` schema.
- Se explicita el contrato de error de `POST /turnos`: todo rechazo responde `{ "error": { "codigo", "mensaje", "detalle" } }`, con un `codigo` estable y un `mensaje` en español. La interfaz depende de ese formato.
- Nueva carpeta `web/` (Vite + React + TypeScript, `package.json` propio):
  - Proxy `/api/*` → `http://127.0.0.1:3000/*`, sin el prefijo y sin CORS.
  - Layout con menú lateral: Nuevo turno, y Agenda marcada "Próximamente" hasta C-07.
  - Pantalla Nuevo turno: selects cargados desde la API, fecha y hora, botón Reservar que llama a `POST /turnos`, y avisos de éxito o de error legibles (409, 422, 400, 404, error de conexión).
  - Una función que arma el `inicio` con el offset de `America/Argentina/Buenos_Aires` usando `Intl` (sin `-03:00` fijo), testeada con Vitest dentro de `web/`.
  - Estilos solo con las variables de `design-system/tokens.css` (revisión 1).
- Mockups HTML de las pantallas en `mockups/` para que los apruebe el líder.
- **Fuera de alcance**: login y roles (DD-07, C-08); alta y edición de recursos (C-02, C-04); la pantalla Agenda (C-07); cualquier regla de negocio en el front (la API decide todo, DD-08); despliegue público.

## Capabilities

### New Capabilities
- `catalogos`: consulta de solo lectura de los recursos con los que se arma un turno (pacientes, profesionales, sillones y prestaciones): qué se lista, qué campos se exponen y cómo se ordena. C-02 y C-04 van a sumar el alta y la edición sobre esta misma capability.

### Modified Capabilities
- `agenda-turnos`: se agrega el requisito del formato de error de `POST /turnos` (`codigo` estable y `mensaje` en español dentro de `error`), que hoy está implementado y testeado pero no escrito como requisito.

## Impact

- **Backend**:
  - `src/infrastructure/sqlite/repositorios.ts`: funciones de listado con sentencias preparadas.
  - `src/http/rutas-catalogos.ts` (nuevo): plugin Fastify con los 4 GET. `src/http/app.ts` solo lo registra, para no chocar con las rutas de C-07.
  - `tests/e2e/catalogos.test.ts` (nuevo) y un test del formato de error en `tests/e2e/turnos.test.ts`.
- **Frontend**: `web/` completo (nuevo), con `vite.config.ts`, `src/api/`, `src/components/`, `src/pages/NuevoTurno` y el helper de fechas con su test.
- **Dependencias**: las que instala la plantilla `react-ts` de Vite, más `vitest` dentro de `web/`. La raíz no suma dependencias.
- **API**: 4 endpoints GET nuevos. `POST /turnos` no cambia.
- **Datos**: sin cambios de esquema. Solo el seed ficticio.
- **Documentación**: `README.md` con cómo levantar la API y la interfaz juntas.
- **Equipo**: la API arranca antes de que se aprueben los mockups; las pantallas esperan la aprobación de Nazareno (decisión P4 del Explore).
