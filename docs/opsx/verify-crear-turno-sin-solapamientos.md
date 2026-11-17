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

## Pendiente

- La tarea 1.1 está incompleta: falta `.env.example`. Los permisos del entorno no le permiten al agente escribir archivos `.env*`, así que lo tiene que crear una persona del equipo (contenido sugerido en el reporte del Apply). No afecta a los tests ni al arranque, porque todas las variables tienen valor por defecto.
- Fase **Verify** formal de la consigna: una persona del equipo tiene que correr `npm test` en su máquina (sirve como evidencia para el video).
