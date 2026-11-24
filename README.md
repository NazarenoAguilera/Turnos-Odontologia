# turnos-odontologia

Agenda odontológica para consultorios argentinos de 2 a 5 profesionales. El sistema crea turnos sin solapamientos **por profesional y por sillón/box**: cada turno ocupa a la vez un profesional y un sillón durante el intervalo semiabierto [inicio, fin). Los turnos contiguos se aceptan, por ejemplo uno de 10:00 a 10:30 y otro de 10:30 a 11:00.

Es el Trabajo Global de Desarrollo de Software (UTN-FRM), hecho con Spec-Driven Development (OpenSpec) y Active Stack.

> Todos los datos de ejemplo son **ficticios**. Nunca se usan datos reales de pacientes.

## Requisitos

- **Node.js 24 o superior** (incluye SQLite integrado, `node:sqlite`). Verificalo con `node --version`.
- npm (viene con Node).

No hace falta Docker, una base de datos externa ni cuentas en servicios.

## Instalar y correr los tests

```bash
git clone <url-del-repositorio> turnos-odontologia
cd turnos-odontologia
npm install
npm test
```

`npm test` ejecuta toda la suite con Vitest: dominio, persistencia, caso de uso, API HTTP y concurrencia. Debe terminar con todos los tests en verde.

## Levantar la API

```bash
npm run build
npm start
```

Por defecto escucha en `http://127.0.0.1:3000`, guarda los datos en `./data/turnos.db` y carga datos ficticios de ejemplo. Para cambiarlo, creá un archivo `.env` en la raíz (Node lo lee automáticamente si existe):

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PORT` | Puerto HTTP | `3000` |
| `DB_PATH` | Archivo SQLite (`:memory:` para una base efímera) | `./data/turnos.db` |
| `SEED_FICTICIO` | Cargar profesionales, sillones, prestaciones y pacientes ficticios | `true` |

El archivo `.env` no se commitea.

### Ejemplo: crear un turno

Con los datos ficticios cargados: profesional 1 = Dra. Ana Prueba, sillón 1 = Sillón 1, prestación 2 = Limpieza (30 min), paciente 1 = Paciente Ficticio Uno.

```bash
curl -X POST http://127.0.0.1:3000/turnos -H "content-type: application/json" -d "{\"pacienteId\":1,\"profesionalId\":1,\"sillonId\":1,\"prestacionId\":2,\"inicio\":\"2026-12-01T10:00:00-03:00\"}"
```

Respuesta `201`:

```json
{ "id": 1, "pacienteId": 1, "profesionalId": 1, "sillonId": 1, "prestacionId": 2,
  "inicio": "2026-12-01T10:00:00-03:00", "fin": "2026-12-01T10:30:00-03:00",
  "duracionMin": 30, "estado": "reservado" }
```

Si se pide el mismo sillón en un horario superpuesto, la respuesta es `409`:

```json
{ "error": { "codigo": "TURNO_SOLAPADO_SILLON",
  "mensaje": "El sillón ya tiene un turno que se superpone con el horario pedido.",
  "detalle": { "conflictos": [ { "recurso": "sillon", "turnoId": 1,
    "inicio": "2026-12-01T10:00:00-03:00", "fin": "2026-12-01T10:30:00-03:00" } ] } } }
```

| Código | HTTP | Cuándo |
|---|---|---|
| `TURNO_SOLAPADO_PROFESIONAL` | 409 | El profesional ya tiene un turno superpuesto (también si chocan profesional y sillón) |
| `TURNO_SOLAPADO_SILLON` | 409 | El sillón ya tiene un turno superpuesto |
| `INICIO_FUERA_DE_GRILLA` | 422 | El inicio no cae en :00, :15, :30 o :45 |
| `DURACION_INVALIDA` | 422 | La duración no es mayor que 0 ni múltiplo de 15 |
| `RECURSO_INACTIVO` | 422 | El paciente, profesional, sillón o prestación existe pero está inactivo |
| `RECURSO_INEXISTENTE` | 404 | No existe el recurso indicado |
| `SOLICITUD_INVALIDA` | 400 | Faltan datos, hay datos de más o el formato es inválido (por ejemplo, un inicio sin zona horaria) |

### Catálogos

Para elegir los datos de un turno sin conocer los ids, la API lista los recursos (solo lectura, ordenados por nombre):

| Ruta | Devuelve |
|---|---|
| `GET /pacientes` | Todos los pacientes con `id`, `nombre` y `apellido` (sin teléfono, email ni obra social) |
| `GET /profesionales` | Profesionales activos con `id` y `nombre` |
| `GET /sillones` | Sillones/boxes activos con `id` y `nombre` |
| `GET /prestaciones` | Prestaciones activas con `id`, `nombre` y `duracionMin` |

## Interfaz web

La carpeta `web/` tiene la interfaz de recepción (Vite + React + TypeScript), con la pantalla **Nuevo turno**. Es un cliente de la API: no repite reglas de negocio y muestra los errores que devuelve el backend. Por ahora es solo para escritorio y no tiene login.

Se usan **dos terminales**, las dos parados en la raíz del repositorio.

Terminal 1, la API en modo desarrollo (`http://127.0.0.1:3000`, con datos ficticios):

```bash
npm run dev
```

Terminal 2, la interfaz. La primera vez instalá sus dependencias:

```bash
cd web
npm install
npm run dev
```

Abrí `http://localhost:5173`. Vite reenvía todo lo que empieza con `/api` a la API (por ejemplo, `/api/turnos` → `/turnos`), así que no hace falta configurar CORS.

Tests y build de la interfaz (dentro de `web/`):

```bash
cd web
npm test
npm run build
```

> En Windows, si al cortar `npm run dev` con Ctrl+C queda un proceso ocupando el puerto 3000 o 5173, cerrá esa terminal o terminá el proceso `node` desde el Administrador de tareas.

## Estructura

```
src/domain/          reglas puras: Intervalo [inicio, fin), grilla, duración, conflictos
src/application/     caso de uso crearTurno (transacción BEGIN IMMEDIATE)
src/infrastructure/  SQLite: esquema, repositorios, datos ficticios
src/http/            API Fastify: POST /turnos, GET de catálogos, GET /health
tests/               un test por escenario del spec, más tests unitarios y de concurrencia
web/                 interfaz web (Vite + React): pantalla Nuevo turno
design-system/       tokens, marca y componentes visuales de la interfaz
knowledge-base/      base de conocimiento del proyecto
openspec/            specs y changes (Spec-Driven Development)
docs/                informe de Discovery y registros del ciclo OPSX
```

Contexto completo: [AGENTS.md](AGENTS.md), [CHANGES.md](CHANGES.md) y [knowledge-base/](knowledge-base/README.md).
