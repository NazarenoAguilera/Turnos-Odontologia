# Verificación — `crear-turno-sin-solapamientos`

**Fecha**: 2026-11-17
**Comando**: `npx vitest run --reporter=verbose` (equivalente a `npm test`)
**Resultado**: **11 archivos de test y 74 tests, todos en verde**. Código de salida 0.

## Comprobante de ejecución (evidencia)

Capturado con `active-stack evidence-capture`, que registra el comando, el código de salida y una copia redactada de la salida:

| Campo | Valor |
|---|---|
| Corrida | `a06f525991754ee1f1a05d8ca3596c9e` |
| Árbol | commit `23f14a7` + cambios sin commitear, huella sha256 `c3097e94…a84a5` |
| Comando | `npx vitest run --reporter=verbose` |
| Código de salida | 0 (`2026-11-17T04:16:35Z`) |
| Salida | sha256 `56c056ef…6de35c`, no truncada, capturada por el arnés |
| Requisito | `agenda-turnos` |

| Chequeo | Estado | Detalle |
|---|---|---|
| Integridad | ✔ | La huella recalculada de la copia redactada coincide con la del comprobante |
| Procedencia | ✔ (arnés) | El código de salida y el estado del árbol vienen de la captura del arnés, no de una declaración del agente. Ninguna persona del equipo lo re-ejecutó todavía |
| Suficiencia | ✔ | Cada escenario del spec tiene un test con su mismo nombre (matriz abajo) |

Otras comprobaciones hechas durante el Apply:

- **Clon limpio**: se copiaron los archivos versionables (sin `node_modules` ni `dist`) a una carpeta aparte y se siguió el README. `npm install` y `npm test` dieron 74/74 en verde.
- **Concurrencia repetida**: `tests/e2e/concurrencia.test.ts` pasó **10 de 10** ejecuciones seguidas, y no quedaron archivos temporales.
- **Sensibilidad del test de concurrencia**: con `BEGIN IMMEDIATE` reemplazado a propósito por `BEGIN`, el test **falla** ("database is locked"). Es decir, el test detecta si se quita la protección. Después se restauró `BEGIN IMMEDIATE`.
- **Compilación**: `npm run build` (TypeScript con `strict: true`) sin errores.
- **Servidor real**: `npm start` con pedidos HTTP reales. `GET /health` → 200; turno nuevo → 201; mismo sillón y horario con otro profesional → 409 `TURNO_SOLAPADO_SILLON`; turno contiguo de las 10:30 → 201.

## Matriz escenario → test (18/18)

| # | Requisito | Escenario del spec | Test |
|---|---|---|---|
| 1 | Crear un turno reservado | Caso feliz con la duración de la prestación | `tests/e2e/turnos.test.ts` y `tests/application/crear-turno.test.ts` |
| 2 | Crear un turno reservado | Duración indicada al crear | `tests/e2e/turnos.test.ts` y `tests/application/crear-turno.test.ts` |
| 3 | Sin solapamiento por profesional | Superposición parcial con el mismo profesional | `tests/e2e/turnos.test.ts` |
| 4 | Sin solapamiento por profesional | Turno contenido dentro de otro del mismo profesional | `tests/e2e/turnos.test.ts` |
| 5 | Sin solapamiento por sillón | Mismo sillón ocupado por otro profesional | `tests/e2e/turnos.test.ts` |
| 6 | Informe de ambos conflictos | Profesional y sillón ocupados | `tests/e2e/turnos.test.ts` |
| 7 | Intervalos semiabiertos | Turno que empieza justo cuando termina otro | `tests/e2e/turnos.test.ts` |
| 8 | Intervalos semiabiertos | Turno que termina justo cuando empieza otro | `tests/e2e/turnos.test.ts` |
| 9 | Los turnos cancelados no ocupan la agenda | Horario de un turno cancelado | `tests/e2e/turnos.test.ts` |
| 10 | Inicio en la grilla de 15 minutos | Inicio fuera de la grilla | `tests/e2e/turnos.test.ts` |
| 11 | Duración válida | Duración que no es múltiplo de 15 | `tests/e2e/turnos.test.ts` |
| 12 | Duración válida | Duración cero | `tests/e2e/turnos.test.ts` |
| 13 | Recursos obligatorios, existentes y activos | Pedido sin sillón | `tests/e2e/turnos.test.ts` |
| 14 | Recursos obligatorios, existentes y activos | Profesional inexistente | `tests/e2e/turnos.test.ts` |
| 15 | Recursos obligatorios, existentes y activos | Sillón inactivo | `tests/e2e/turnos.test.ts` |
| 16 | Reservas concurrentes sin solapamiento | Dos reservas simultáneas del mismo sillón | `tests/e2e/concurrencia.test.ts` |
| 17 | Auditoría de la creación | Evento de auditoría al crear | `tests/e2e/turnos.test.ts` y `tests/application/crear-turno.test.ts` |
| 18 | Auditoría de la creación | Rechazo sin efectos | `tests/e2e/turnos.test.ts` y `tests/application/crear-turno.test.ts` |

Además, hay tests unitarios del dominio (`tests/domain/`: `Intervalo`, tiempo y zona horaria, grilla y duración, clasificación de conflictos) y de persistencia (`tests/infra/`: esquema, datos ficticios y repositorios, incluida la auditoría inmutable).

## Fase Verify (revisión contra spec, design y reglas duras)

Sin una skill de verify instalada, los tres chequeos del contrato de evidencia se hicieron directamente.

| Chequeo | Resultado |
|---|---|
| Completitud | 15/16 tareas (falta la 1.1, `.env.example`). Los 18 escenarios tienen test |
| Corrección: spec | ✔ Todos los escenarios en verde |
| Corrección: reglas duras | ✔ Sin offset fijo en la lógica (solo aparece en el texto de un mensaje de ejemplo). ✔ La superposición se decide siempre con `Intervalo`; el SQL solo prefiltra, como documenta D2. ✔ Solo datos ficticios |
| Coherencia: design ↔ código | D3, D4, D5, D6, D8 y D9 ✔. D7 ✖ → corregido (ver hallazgo 1) |

### Hallazgos y correcciones

| # | Prioridad | Hallazgo | Cómo se detectó | Corrección |
|---|---|---|---|---|
| 1 | Media | Un `POST /turnos` con un campo de más se aceptaba con **201**: Fastify, por defecto, descarta en silencio las propiedades extra. El design D7 y el README decían que se rechaza con 400 | Se probó un pedido con `campoInventado` por `app.inject` → 201 | `ajv.customOptions.removeAdditional: false` en `src/http/app.ts`. Test nuevo: "un campo de más responde 400 SOLICITUD_INVALIDA y no crea el turno (design D7)", primero en rojo y después en verde |
| 2 | Menor | `PRAGMA busy_timeout = ${…}` interpolaba un número en SQL, contra la regla dura "nunca concatenar valores en SQL" (sin riesgo real: era un valor interno) | Búsqueda de `prepare`/`exec` con `${` en `src/` | El timeout y las claves foráneas pasan como opciones de `new DatabaseSync(ruta, { timeout, enableForeignKeyConstraints })`. Lo cubren los tests de esquema existentes. El test de concurrencia sigue en verde (5 de 5 tras el cambio) |

Después de las correcciones: **75 tests en verde**, `npm run build` sin errores y ninguna interpolación de valores en SQL dentro de `src/`.

## Corrida independiente (persona del equipo)

Nazareno Aguilera corrió `npm test` en su propia terminal (PowerShell, Vitest v3.2.7) el 2026-11-17 a las 01:42:54 hora local, sobre el código con las correcciones del Verify:

```
Test Files  11 passed (11)
     Tests  75 passed (75)
  Duration  1.82s
```

Incluye `tests/e2e/turnos.test.ts` (20 tests) y `tests/e2e/concurrencia.test.ts` ("Dos reservas simultáneas del mismo sillón", en verde). Esta corrida aporta la **procedencia independiente** que el contrato de evidencia pide además de la captura del arnés. Hay captura de pantalla de la corrida.

**Estado del Verify: verificado.**

## Cierre

- Tareas: **16/16**. La tarea 1.1 (`.env.example`) la creó el equipo el 2026-11-17, porque los permisos del entorno no le permiten al agente escribir archivos `.env*`.
- Sin pendientes. El change queda listo para Archive.
