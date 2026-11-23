# Arquitectura Propuesta

> Fuentes: `02_descripcion_general.md`, `09_decisiones_y_supuestos.md`. Restricciones de la consigna: `docs/discovery/discovery.md` (punto 9).

## Patrones aplicados

| Patrón | Dónde se usa | Por qué |
|---|---|---|
| Arquitectura hexagonal liviana (dominio, aplicación, infraestructura, http) | Todo el backend | Las reglas de agenda se testean sin HTTP ni base de datos |
| Value Object `Intervalo` semiabierto | `domain/intervalo.ts` | Un único lugar para la regla de superposición (RN-TU-02), sin duplicarla |
| Casos de uso (application services) | `application/` | Un caso de uso por historia: crear, cancelar, reprogramar y consultar |
| Repositorio | `infrastructure/sqlite/` | Aislar SQLite; permite una base en memoria para los tests |
| Unit of Work con `BEGIN IMMEDIATE` | Creación y reprogramación de turnos | Atomicidad entre chequeo e inserción frente a la concurrencia (RN-TU-13) |
| Errores de dominio tipados | `domain/errores.ts` | Códigos estables que la capa HTTP mapea a 409, 422 o 404 |
| Reloj inyectable | `application/` | Fechas deterministas en tests y auditoría |

## Estructura de directorios

```
turnos-odontologia/
├── src/
│   ├── domain/            # Intervalo, Turno, EstadoTurno, reglas y errores (sin dependencias)
│   ├── application/       # casos de uso: crearTurno, cancelarTurno, reprogramarTurno, consultarAgenda
│   ├── infrastructure/
│   │   └── sqlite/        # conexión node:sqlite, esquema, repositorios, transacciones, seed ficticio
│   ├── http/              # app Fastify, rutas, esquemas JSON, mapeo de errores
│   └── main.ts            # arranque del servidor
├── tests/
│   ├── domain/            # tests unitarios de reglas (intervalo, grilla, transiciones)
│   └── e2e/               # un test por escenario del spec contra la API (base en memoria)
├── web/                   # interfaz web mínima (DD-08): Vite + React + TypeScript, package.json propio
│   ├── src/
│   │   ├── api/           # cliente fetch de /api y traducción de errores { codigo, mensaje }
│   │   ├── components/    # layout con menú lateral, botones, avisos, insignias de estado
│   │   └── pages/         # NuevoTurno (C-11), Agenda (C-07)
│   └── vite.config.ts     # proxy /api → http://127.0.0.1:3000
├── design-system/         # tokens.css, brand, components.html y previews (revisión 1)
├── knowledge-base/
├── openspec/
├── docs/
├── package.json           # scripts: dev, build, test, start
├── tsconfig.json
└── README.md              # cómo instalar y correr los tests
```

## Interfaz web

Agregada el 2026-11-23 por DD-08. Es un cliente más de la API: **no repite reglas de negocio**. Los solapamientos, la grilla y las duraciones los decide siempre el backend, y la pantalla muestra el `codigo` y el `mensaje` que devuelve.

- **Stack**: Vite + React + TypeScript en `web/`, creado con `npm create vite@latest web -- --template react-ts`. Tiene su propio `package.json`; la raíz no cambia.
- **Conexión con la API**: `web/vite.config.ts` define un proxy: todo lo que empiece con `/api` va a `http://127.0.0.1:3000` sin el prefijo (`/api/turnos` → `/turnos`). Como el navegador ve un solo origen, la API **no necesita CORS**.
- **Diseño**: `web/src/main.tsx` importa `../../design-system/tokens.css` y los componentes usan solo esas variables. Si Vite rechaza servir un archivo de fuera de `web/`, se agrega `server.fs.allow: [".."]` en `vite.config.ts`. Los colores y textos siguen `design-system/brand.md`.
- **Fechas**: la pantalla arma el `inicio` en hora local del consultorio con offset ISO 8601, igual que la API (RN-AG-04). Las horas se muestran en `America/Argentina/Buenos_Aires`.
- **Datos**: solo los del seed ficticio (RN-PA-01). Las capturas de los verify tampoco pueden tener datos reales.
- **Sin login** hasta C-08 (DD-07): la interfaz se usa en la computadora de recepción y no se publica en internet.
- **Mockups**: cada pantalla nueva tiene un mockup HTML aprobado antes del Apply (`design-system/README.md`, modo `system-and-mockups`).

## Seguridad

- **Autenticación**: fuera del primer change. Se propone un token por usuario definido por variable de entorno o seed ficticio (ver PA-07). No se implementa login con contraseñas en v1.
- **Autorización**: middleware por rol según la matriz de `03_actores_y_roles.md`.
- **Validación de entradas**: esquemas JSON de Fastify en cada ruta, más las validaciones de dominio. Las consultas SQL siempre usan parámetros (sin concatenar strings).
- **Datos sensibles**: los datos de salud son sensibles según la Ley 25.326. En el repositorio solo hay datos ficticios (RN-PA-01). La historia clínica (Ley 26.529) está fuera de alcance en v1.
- **Secretos**: ninguno en el repositorio. Se usa `.env` (ignorado por git), con `.env.example` sin valores reales.
- **Auditoría**: tabla `evento_auditoria` de solo inserción.

## Variables de entorno

| Variable | Descripción | Ejemplo | Sensible |
|---|---|---|---|
| `PORT` | Puerto HTTP | `3000` | N |
| `DB_PATH` | Ruta del archivo SQLite (`:memory:` en tests) | `./data/turnos.db` | N |
| `TZ_CONSULTORIO` | Zona horaria del consultorio | `America/Argentina/Buenos_Aires` | N |
| `SEED_FICTICIO` | Carga datos de ejemplo al iniciar | `true` | N |
| `AUTH_TOKENS` | Tokens de prueba por usuario, si se implementa PA-07 | `(definir en .env, nunca en git)` | Y |

## Testing

- **Vitest**, con un archivo o bloque por escenario del spec (feliz, error de negocio y borde como mínimo).
- Base `:memory:` nueva por test: aislamiento total, sin servicios externos.
- Test de concurrencia: dos creaciones simultáneas en conflicto → exactamente un turno persistido.
- Comando único: `npm test`. El README documenta `npm install` y `npm test`.
- **Interfaz web**: los escenarios del spec describen la API y se testean automáticamente. Las pantallas se verifican a mano contra su mockup aprobado, con capturas a 390×844 y 1440×900 guardadas en el verify del change. `npm run build` dentro de `web/` tiene que compilar sin errores.
- **Levantar todo para probar**: terminal 1 en la raíz, `npm run dev` (API en `http://127.0.0.1:3000`); terminal 2, `cd web` y `npm run dev` (interfaz en `http://localhost:5173`).
