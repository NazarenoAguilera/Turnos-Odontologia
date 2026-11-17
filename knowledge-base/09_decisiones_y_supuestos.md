# Decisiones y Supuestos

> Fuentes: decisiones confirmadas por el usuario en el Discovery (2026-11-16) y en la elección del stack (2026-11-17); `docs/discovery/informe-discovery.md`.

## Decisiones documentadas

### DD-01 — Stack: TypeScript + Node 24 + Fastify + SQLite (`node:sqlite`) + Vitest
**Decisión**: implementar la v1 como API REST en TypeScript sobre Node 24, con SQLite integrado y tests en Vitest.
**Contexto**: la consigna deja el stack libre, no exige interfaz gráfica y pide que los tests se puedan correr solo con el README.
**Alternativas consideradas**: Go + SQLite; Python + FastAPI + SQLite; TypeScript + PostgreSQL con exclusion constraint (requiere Docker).
**Justificación**: Node ya está instalado; SQLite integrado evita servicios externos; `npm install && npm test` es el camino más reproducible.
**Trade-offs aceptados**: SQLite no tiene restricciones de exclusión por rango como PostgreSQL, así que la no superposición se garantiza en código transaccional (DD-04). Escala limitada a un consultorio, que es suficiente para el segmento elegido.

### DD-02 — Intervalos semiabiertos [inicio, fin)
**Decisión**: todo turno, franja y bloqueo es semiabierto, y la superposición se define como `a < d && c < b`.
**Contexto**: el vacío más claro del Discovery es que ningún competidor documenta cómo trata los turnos contiguos.
**Alternativas consideradas**: intervalos cerrados [inicio, fin], que impedirían turnos contiguos, o márgenes entre turnos.
**Justificación**: un turno de 10:00 a 10:30 y otro de 10:30 a 11:00 deben poder coexistir. Es el comportamiento esperado en un consultorio.
**Trade-offs aceptados**: no hay tiempo de limpieza automático entre turnos. Si hace falta, se modela como parte de la duración de la prestación.

### DD-03 — Tiempo como instantes absolutos en minutos
**Decisión**: se guardan `inicio_min` y `fin_min` como minutos desde la época Unix. La API recibe y devuelve ISO 8601 con offset `-03:00`.
**Contexto**: las comparaciones de intervalos deben ser exactas y rápidas. Un error de bordes rompe la regla central (riesgo del Discovery).
**Alternativas consideradas**: strings ISO comparados lexicográficamente; fecha y hora locales separadas.
**Justificación**: la comparación entera es trivial e indexable, y el minuto es la unidad mínima porque la grilla es de 15 minutos.
**Trade-offs aceptados**: los datos guardados son menos legibles en la base; se compensa con la conversión en la API.

### DD-04 — Concurrencia con `BEGIN IMMEDIATE`
**Decisión**: el chequeo de solapamiento y la escritura del turno ocurren en una transacción `BEGIN IMMEDIATE`.
**Contexto**: riesgo del Discovery: dos recepcionistas reservando el mismo sillón al mismo tiempo.
**Alternativas consideradas**: validar solo en la aplicación, que tiene condición de carrera; PostgreSQL con exclusion constraint (descartado en DD-01).
**Justificación**: SQLite permite un solo escritor a la vez; `IMMEDIATE` toma el lock de escritura antes del `SELECT`, así que el chequeo no puede quedar obsoleto.
**Trade-offs aceptados**: las escrituras se serializan. Es irrelevante para el volumen de un consultorio de 2 a 5 profesionales.

### DD-05 — Sin sobreturnos ni integraciones en v1
**Decisión**: ningún rol puede forzar un solapamiento, y no hay WhatsApp, ARCA, Mercado Pago ni Google Calendar en v1.
**Contexto**: el usuario lo decidió en el Discovery (puntos 7 y 8).
**Justificación**: mantiene el primer change chico, verificable y terminable antes del 25/11/2026.
**Trade-offs aceptados**: las urgencias se resuelven cancelando o reprogramando, sin sobreturno.

### DD-06 — Grilla de 15 minutos y duración por prestación editable
**Decisión**: el inicio se alinea a :00, :15, :30 o :45. La duración por defecto es la de la prestación y se puede editar al crear el turno.
**Contexto**: decisiones del usuario en el Discovery.
**Justificación**: evita huecos inutilizables y respeta que no todos los tratamientos duran lo mismo.

### DD-07 — Autenticación diferida
**Decisión**: el primer change no implementa login. Los roles se modelan y la autorización se agrega en un change propio.
**Contexto**: la consigna pide un único change chico; la autenticación no es el vacío del mercado que ataca el producto.
**Trade-offs aceptados**: hasta implementarla, la auditoría registra `usuario_id` nulo (ver PA-07).

## Supuestos inferidos

### SU-01 — Todo turno requiere un sillón/box ✅ Confirmado (PA-01, 2026-11-17)
**Supuesto**: no hay prestaciones sin sillón.
**Origen**: Discovery, supuesto confirmado por el usuario.
**Riesgo si es falso**: consultas sin sillón (por ejemplo, de escritorio) bloquearían un sillón innecesariamente.
**Cómo validar**: consultar a un odontólogo real; si existe el caso, hacer `sillonId` opcional por prestación (PA-01).

### SU-02 — Solo `cancelado` libera recursos
**Supuesto**: `ausente` y `atendido` siguen contando como ocupación.
**Origen**: Discovery, supuesto confirmado.
**Riesgo si es falso**: no se podría reasignar el horario de un paciente ausente. Es de bajo impacto, porque son turnos pasados.
**Cómo validar**: revisar en la demo de los competidores (DentalSoft, Dentia).

### SU-03 — Duración múltiplo de 15 minutos ✅ Confirmado (PA-02, 2026-11-17)
**Supuesto**: la duración (por defecto y editada) es múltiplo de 15, igual que la grilla.
**Origen**: inferido de la grilla de 15 minutos; confirmado por el usuario en el Explore de C-01.
**Riesgo si es falso**: rechazar una duración válida, como 20 minutos.
**Cómo validar**: confirmarlo con el usuario antes de aprobar el spec del primer change.

### SU-04 — Un turno no cruza la medianoche y la reprogramación vuelve a `reservado`
**Supuesto**: los turnos son del mismo día local, y un turno reprogramado necesita una nueva confirmación.
**Origen**: inferido; no surge del Discovery.
**Riesgo si es falso**: es bajo; ningún consultorio atiende de madrugada.
**Cómo validar**: revisarlo en Propose del change.

### SU-05 — Zona horaria única UTC−03:00
**Supuesto**: el consultorio opera en `America/Argentina/Buenos_Aires`, sin horario de verano.
**Origen**: mercado argentino (Discovery).
**Riesgo si es falso**: corrimientos de una hora si Argentina reintroduce el horario de verano; se mitiga usando la base de zonas horarias (IANA) en lugar de un offset fijo.
**Cómo validar**: usar la zona IANA en las conversiones, no un offset fijo.

### SU-06 — Consultorios de 2 a 5 profesionales comparten sillones
**Supuesto**: la doble restricción profesional y sillón es un dolor real del segmento.
**Origen**: hipótesis del Discovery (riesgo "supuesto sin probar").
**Riesgo si es falso**: el diferencial principal pierde valor.
**Cómo validar**: entrevistas a consultorios reales y demos de competidores.
