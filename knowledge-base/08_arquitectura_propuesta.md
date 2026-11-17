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
├── knowledge-base/
├── openspec/
├── docs/
├── package.json           # scripts: dev, build, test, start
├── tsconfig.json
└── README.md              # cómo instalar y correr los tests
```

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
