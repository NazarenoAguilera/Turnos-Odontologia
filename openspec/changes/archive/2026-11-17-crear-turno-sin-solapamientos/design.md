# Design

## Context

El repositorio no tiene código: este change crea el proyecto. El stack ya está decidido en la knowledge-base (DD-01): TypeScript, Node 24, Fastify, SQLite con `node:sqlite` y Vitest. La motivación está en `proposal.md` (Why) y el comportamiento exigido en `specs/agenda-turnos/spec.md`. Las decisiones de alcance del Explore (solo solapamientos; sillón obligatorio; duración múltiplo de 15) están en `docs/opsx/explore-crear-turno-sin-solapamientos.md`.

Hay tres restricciones que dan forma al diseño:

- Los tests deben correr con `npm install && npm test`, sin servicios externos.
- La regla de no superposición debe valer también con reservas concurrentes (RN-TU-13).
- Las reglas duras de `AGENTS.md`: un solo `Intervalo`, SQL parametrizado, zona IANA y datos ficticios.

## Goals / Non-Goals

**Goals:**
- Que la regla de superposición viva en un único lugar puro y testeable sin base de datos ni HTTP.
- Que el chequeo y la inserción sean atómicos frente a otra conexión.
- Una estructura de capas que los changes C-02 a C-07 puedan extender sin reescribir.

**Non-Goals:**
- Horarios de atención, bloqueos, cancelación, reprogramación, consulta de agenda, roles y autenticación (ver `proposal.md`).
- Migraciones versionadas: el esquema se crea con `CREATE TABLE IF NOT EXISTS` al abrir la base. Se revisará cuando un change necesite alterar tablas.
- Rendimiento a escala: el objetivo es un consultorio de 2 a 5 profesionales.

## Decisions

### D1 — Capas: dominio, aplicación, infraestructura, http
```
http (Fastify)  --> application (crearTurno) --> domain (Intervalo, reglas, errores)
                                  |
                                  v
                    infrastructure/sqlite (esquema, repositorios, transacción, seed)
```
El dominio no importa nada de Fastify ni de SQLite. **Alternativa descartada**: una ruta Fastify que hace todo, más rápida de escribir pero con reglas imposibles de testear aisladas, y que obligaría a duplicarlas en reprogramar (C-06).

### D2 — `Intervalo` como value object único
`Intervalo(inicioMin, finMin)` con `inicioMin < finMin` y `seSuperponeCon(otro) = this.inicio < otro.fin && otro.inicio < this.fin`. Toda comparación de turnos pasa por él (regla dura del proyecto). La consulta SQL de candidatos usa la misma condición para filtrar con índice, pero la **clasificación final** (profesional o sillón) la hace el dominio sobre los candidatos devueltos. **Alternativa descartada**: decidir solo en SQL, que duplicaría la regla sin una fuente única.

### D3 — Tiempo: minutos Unix internos, ISO 8601 con offset en la API
- **Entrada**: `inicio` ISO 8601 **con offset obligatorio**. Sin offset responde `400 SOLICITUD_INVALIDA`, porque la hora sería ambigua.
- **Almacenamiento**: `inicio_min` y `fin_min` como enteros (minutos desde la época), según DD-03.
- **Grilla**: se evalúa en hora local con `Intl.DateTimeFormat` y `timeZone: 'America/Argentina/Buenos_Aires'`. No hay offset fijo en la lógica (regla dura).
- **Salida**: `inicio` y `fin` en ISO 8601 con el offset local de esa zona.

**Alternativa descartada**: guardar strings ISO, cuya comparación lexicográfica falla con offsets distintos.

### D4 — Concurrencia: `BEGIN IMMEDIATE` y `busy_timeout`
`DatabaseSync` es sincrónico. En un solo proceso, el `SELECT` y el `INSERT` no se intercalan, así que la carrera real se da entre **conexiones** (dos procesos o dos instancias). El caso de uso abre `BEGIN IMMEDIATE`, que toma el lock de escritura antes de leer. Después consulta los candidatos (turnos no cancelados con `inicio_min < :fin AND :inicio < fin_min AND (profesional_id = :p OR sillon_id = :s)`), clasifica en el dominio e inserta el turno y la auditoría. Hace `COMMIT`, o `ROLLBACK` ante cualquier error. Cada conexión configura `PRAGMA busy_timeout = 5000` para que la segunda **espere** el lock en lugar de fallar con `SQLITE_BUSY`; al obtenerlo, ve el turno ya confirmado y responde `409`. **Alternativas descartadas**: validar fuera de la transacción, que tiene condición de carrera, o un mutex en memoria, que no protege entre procesos.

### D5 — Test de concurrencia con dos conexiones a un archivo temporal
`:memory:` no se comparte entre conexiones. El test crea un archivo SQLite en el directorio temporal del sistema y abre **dos** `DatabaseSync` sobre él. La primera inicia `BEGIN IMMEDIATE`, verifica e inserta sin confirmar. La segunda intenta crear el mismo turno: queda bloqueada hasta el `COMMIT`, con un `busy_timeout` corto en el test. Como `DatabaseSync` es sincrónico, la segunda conexión corre en un `worker_thread` (o en un proceso hijo) para que el bloqueo real ocurra. El test verifica que haya un `201` y un `409`, o su equivalente en el caso de uso, y que quede **un solo turno**. El archivo se borra al terminar.

### D6 — Errores de dominio tipados y formato HTTP
El dominio lanza `ErrorDeNegocio(codigo, mensaje, detalle)`. Un único manejador de Fastify los mapea así:

| Código | HTTP |
|---|---|
| `TURNO_SOLAPADO_PROFESIONAL`, `TURNO_SOLAPADO_SILLON` | 409 |
| `INICIO_FUERA_DE_GRILLA`, `DURACION_INVALIDA`, `RECURSO_INACTIVO` | 422 |
| `RECURSO_INEXISTENTE` | 404 |
| `SOLICITUD_INVALIDA` (error de validación de esquema) | 400 |

El cuerpo siempre es `{ error: { codigo, mensaje, detalle } }`, con el mensaje en español. Ante un doble conflicto, `codigo` es `TURNO_SOLAPADO_PROFESIONAL` y `detalle.conflictos` lista todos, cada uno con `recurso`. **Códigos nuevos respecto de la KB**:
- `RECURSO_INEXISTENTE`: la KB solo decía "404".
- `SOLICITUD_INVALIDA`: para errores de formato.

Se agregan a la KB al archivar.

### D7 — Validación de entrada con JSON Schema de Fastify
`POST /turnos` declara un esquema con `pacienteId`, `profesionalId`, `sillonId` y `prestacionId` (enteros positivos, obligatorios), `inicio` (string `date-time`, con el offset verificado en el dominio) y `duracionMin` (entero opcional). Se usa `additionalProperties: false`. Las reglas de negocio (grilla, duración, solapamiento) se validan en el dominio, no en el esquema, para que también apliquen fuera de HTTP.

### D8 — Persistencia y datos de prueba
- **Esquema**: `profesional`, `sillon` (`nombre` UNIQUE), `prestacion` (CHECK `duracion_min > 0 AND duracion_min % 15 = 0`), `paciente`, `turno` (FKs NOT NULL, incluido `sillon_id`; CHECK de `estado`; índices `(profesional_id, inicio_min, fin_min)` y `(sillon_id, inicio_min, fin_min)`) y `evento_auditoria` (solo inserción).
- **SQL**: siempre con `prepare()` y parámetros (regla dura).
- **Datos de prueba**: el seed ficticio de `knowledge-base/04_modelo_de_datos.md` se carga con una función que usan los tests y el arranque si `SEED_FICTICIO=true`. Los tests crean una base `:memory:` nueva cada uno.

### D9 — Reloj inyectable
`creado_en` y `ocurrido_en` salen de un `Clock` inyectado, de modo que los tests son deterministas.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| `node:sqlite` emite una advertencia de "experimental" en algunas versiones de Node 24 y podría cambiar su API. | Se aísla detrás de `infrastructure/sqlite` y se fija `engines.node >= 24` en `package.json`. En el entorno (v24.20.0) no emite advertencia. |
| El test de concurrencia puede ser frágil por tiempos. | Se coordinan los dos lados con un archivo temporal y una señal explícita (`Atomics.wait` o mensaje del worker) en lugar de `sleep`, con un `busy_timeout` amplio. |
| `Intl` podría no tener datos de zona en un Node sin ICU completo. | Node oficial trae ICU completo. Hay un test de conversión de zona que falla temprano si no está. |
| Escrituras serializadas por `BEGIN IMMEDIATE`. | Es irrelevante para el volumen de un consultorio (DD-04). |
| Los turnos de un profesional se pueden dar fuera de su horario hasta C-03. | Está aceptado y documentado (decisión del Explore). C-03 suma esa validación. |

## Migration Plan

No aplica: es el primer change y no hay datos previos. Para revertir, alcanza con revertir el commit, porque no hay despliegue.
