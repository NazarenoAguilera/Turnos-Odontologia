# Descripción General

> Fuentes: `docs/discovery/discovery.md` (puntos 8 y 9). Stack elegido por el usuario el 2026-11-17 (ver DD-01 en `09_decisiones_y_supuestos.md`).

## Stack tecnológico

| Capa | Tecnología | Versión mínima | Motivo |
|---|---|---|---|
| Lenguaje | TypeScript | 5.x | Tipado del dominio (intervalos, estados, errores) |
| Runtime | Node.js | 24.x | Ya instalado en el entorno; trae SQLite integrado |
| API HTTP | Fastify | 5.x | Liviano, con validación de esquemas JSON integrada |
| Persistencia | SQLite vía `node:sqlite` (`DatabaseSync`) | SQLite 3.4x (integrado en Node 24) | Sin servidor ni Docker: los tests corren con `npm test` |
| Tests | Vitest | 3.x | Rápido, nativo para TypeScript, un test por escenario del spec |
| Ejecución TS | `tsx` (dev) / `tsc` (build) | — | Correr TypeScript sin paso de compilación en desarrollo |

Verificado en el entorno: Node v24.20.0 con `node:sqlite` operativo (SQLite 3.53.4).

## Arquitectura general

Monolito modular con dominio puro en el centro. La API HTTP es un adaptador delgado: no hace falta interfaz gráfica.

```
 Cliente HTTP (tests, curl, futura UI)
            │
            ▼
 ┌──────────────────────┐
 │  http/ (Fastify)     │  rutas, validación de esquema, mapeo de errores → códigos HTTP
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │  application/        │  casos de uso: crearTurno, cancelarTurno, reprogramarTurno, consultarAgenda
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐      ┌──────────────────────────────┐
 │  domain/             │◄─────│  infrastructure/ (SQLite)    │
 │  Intervalo, Turno,   │      │  repositorios + transacción  │
 │  reglas RN-TU-*      │      │  BEGIN IMMEDIATE             │
 └──────────────────────┘      └──────────────────────────────┘
```

- **Dominio puro**: la regla de solapamiento (RN-TU-03) es una función sin dependencias, testeable de forma aislada.
- **Garantía en la persistencia**: el chequeo de solapamiento y la inserción ocurren dentro de una transacción `BEGIN IMMEDIATE`. SQLite serializa a los escritores, así que dos reservas concurrentes no pueden crear un solapamiento (DD-04).

## Integraciones externas

| Servicio | Propósito | Tipo | Versión |
|---|---|---|---|
| — | Ninguna integración externa en v1 (decisión del Discovery) | — | v1 |
| WhatsApp Business API (oficial) | Recordatorios y confirmación | REST + webhooks | v1.x |
| Email (SMTP o proveedor) | Recordatorios | SMTP/REST | v1.x |
| ARCA | Facturación electrónica | Web services | Posterior |
| Mercado Pago | Señas y cobros | REST + webhooks | Posterior |
| Google Calendar | Sincronización de agenda | REST | Posterior |

## API REST (v1)

Todas las respuestas son JSON. Las fechas y horas usan ISO 8601 con offset de Argentina (`-03:00`).

| Recurso | Método y ruta | Descripción |
|---|---|---|
| Turnos | `POST /turnos` | Crear turno (paciente, profesional, sillón, prestación, inicio, duración opcional) |
| | `GET /turnos?desde&hasta&profesionalId&sillonId` | Consultar agenda (vista diaria o semanal según el rango) |
| | `GET /turnos/:id` | Detalle de un turno |
| | `POST /turnos/:id/cancelar` | Cancelar: pasa a `cancelado` y libera los recursos |
| | `POST /turnos/:id/reprogramar` | Mover a otro inicio, sillón o profesional con las mismas validaciones |
| | `POST /turnos/:id/estado` | Cambiar a `confirmado`, `ausente` o `atendido` |
| Profesionales | `GET/POST /profesionales`, `GET/PATCH /profesionales/:id` | Gestión de profesionales |
| Horarios | `GET/PUT /profesionales/:id/horarios` | Franjas de atención semanales |
| Bloqueos | `GET/POST/DELETE /profesionales/:id/bloqueos` | Feriados, vacaciones y ausencias |
| Sillones | `GET/POST /sillones`, `PATCH /sillones/:id` | Sillones o boxes |
| Prestaciones | `GET/POST /prestaciones`, `PATCH /prestaciones/:id` | Prestaciones con duración por defecto |
| Pacientes | `GET/POST /pacientes`, `GET/PATCH /pacientes/:id` | Ficha mínima (datos ficticios en ejemplos) |
| Auditoría | `GET /turnos/:id/auditoria` | Historial de eventos del turno |

**Errores de negocio**: `409 Conflict` para los solapamientos (`TURNO_SOLAPADO_PROFESIONAL`, `TURNO_SOLAPADO_SILLON`). `422 Unprocessable Entity` para las demás violaciones de reglas (`INICIO_FUERA_DE_GRILLA`, `DURACION_INVALIDA`, `FUERA_DE_HORARIO`, `EN_BLOQUEO`, `TRANSICION_INVALIDA`). `404 RECURSO_INEXISTENTE` para los recursos inexistentes y `400 SOLICITUD_INVALIDA` para pedidos mal formados (faltan datos, sobran campos o el inicio no tiene zona horaria); ambos códigos se agregaron en el change `crear-turno-sin-solapamientos`. El formato es `{ "error": { "codigo", "mensaje", "detalle" } }`.
