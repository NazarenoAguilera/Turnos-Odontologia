# CHANGES — Secuencia de Implementación

> Índice canónico de todos los changes del proyecto **Turnos Odontología** (API REST + módulo de dominio + interfaz web mínima en `web/`, DD-08).
> Cada change es atómico: un agente o integrante puede implementarlo en una sesión (~4-6 horas) y se cierra con su propio PR a `master`.
> **Leer este archivo antes de invocar la skill de propuesta instalada.**
> Alcance: solo el MVP v1 "imprescindible" (sección D.3 de `docs/discovery/informe-discovery.md`). Todo lo demás está en la FASE 5 como backlog fuera del MVP.
> Entrega del trabajo: 2026-11-25 23:00.

---

## Cómo usar este documento

1. **Identificá el change** a implementar: tomá el primero con estado `[ ]` cuyas dependencias estén todas en `[x]` (guiate por el árbol y los GATES).
2. **Leé la KB** indicada en "Leer antes" del change, más las reglas `RN-*` que cite. La KB es la fuente de verdad del negocio; este índice solo ordena el trabajo.
3. **Corré la skill de propuesta** instalada en tu cliente (flujo OPSX: `openspec` CLI) con el slug exacto del change en kebab-case, por ejemplo `crear-turno-sin-solapamientos`.
4. **Implementá y archivá** el change siguiendo el flujo OPSX (apply, verify, archive). Un change = una rama por integrante = un PR a `master`.
5. **Marcá el checkbox** `[x]` en el campo **Estado** de este archivo y avisá al resto del equipo qué GATE se desbloqueó.

> **Para la consigna (Etapa 6)**: el change central `C-01` `crear-turno-sin-solapamientos` ya pasó por el ciclo OPSX completo (archivado el 2026-11-17).
>
> **Ajuste del 2026-11-23 (DD-08)**: después de ver el ejemplo de la cátedra, el equipo decidió sumar una interfaz web mínima y cerrar el "MVP defendible" (C-01 + C-05 + C-07) con pantallas. Se agregó `C-11` `interfaz-web-base`. Para la entrega solo se hacen **C-11, C-07 y C-05** (obligatorios) y, si sobra tiempo, **C-06 y C-03**. C-02, C-04, C-08, C-09 y C-10 quedan como roadmap. Ver §Plan del equipo.

Reglas transversales (valen para todos los changes):
- Solo datos ficticios en código, seeds, tests y ejemplos (RN-PA-01). Sin secretos en el repo (RN-GL-03).
- Una operación rechazada no modifica datos ni genera auditoría (RN-GL-01); los errores devuelven `codigo` estable y mensaje en español (RN-GL-02).
- Un test por escenario (feliz, error de negocio y borde como mínimo), base `:memory:` nueva por test.
- Changes visuales (C-11, la pantalla de C-07, el botón de C-05, y C-06/C-03 si se hacen): importan `design-system/tokens.css` y no empiezan el Apply sin un mockup en `openspec/changes/<change>/mockups/` aprobado por el líder (`design-system/README.md`, modo `system-and-mockups`). Los escenarios del spec describen la API; la pantalla se prueba a mano y se deja una captura en el verify.
- Preguntas abiertas que condicionan un change: `PA-07` antes del spec de C-08; `PA-03`, `PA-04` y `PA-09` antes del spec de C-03; `PA-05` antes del spec de C-06. `PA-02` y `PA-06` ya están resueltas. Ver `knowledge-base/10_preguntas_abiertas.md`.

---

## Árbol de dependencias

```
C-01 crear-turno-sin-solapamientos   ⭐ CAMBIO CENTRAL (US-010) — autocontenido, sin dependencias
 │      (incluye base del proyecto, tablas, dominio, seed ficticio y POST /turnos)
 │
 ├── C-11 interfaz-web-base                     (web/ con Vite + React, GET de catálogos, pantalla Nuevo turno)
 │      └── pantalla Agenda de C-07 ──► botón Cancelar de C-05 / botón Reprogramar de C-06
 ├── C-02 catalogo-de-recursos                  (CRUD profesional, sillón, prestación)
 ├── C-03 horarios-y-bloqueos                   (CRUD horario de atención y bloqueo; pantalla Configuración opcional)
 ├── C-04 ficha-minima-de-paciente              (CRUD paciente)
 ├── C-05 cancelar-y-cambiar-estado-de-turno    (API + botón Cancelar en la Agenda)
 ├── C-06 reprogramar-turno                     (API + botón Reprogramar en la Agenda)
 └── C-07 agenda-diaria-y-semanal               (API + pantalla Agenda)
        │
        └── C-02..C-07 y C-11 (todos) ──► C-08 roles-basicos
                                           └── C-09 consulta-de-auditoria
                                                └── C-10 cierre-y-entrega
```

La API de C-05, C-06 y C-07 depende solo de C-01 y se puede hacer en paralelo con C-11. Lo que depende de C-11 es la parte de pantalla: la Agenda (C-07) usa el layout de C-11, y los botones de C-05 y C-06 van en la Agenda de C-07.

### Paralelismo por fase (equipo de 3)

```
GATE 0: C-01 ✓ + Paso 0 (ajuste de fundación, DD-08) ✓      ← FORK (2 ramas en paralelo)
  → C-11 interfaz-web-base                     [Lucas — rama lucas]
  → C-07 agenda-diaria-y-semanal (API)         [Lautaro — rama lautaro]

GATE 0b: C-11 mergeado en master
  → C-07 pantalla Agenda                       [Lautaro]
  → C-05 cancelar-y-cambiar-estado-de-turno (API)   [Lucas]

GATE 0c: C-07 mergeado en master
  → C-05 botón Cancelar en la Agenda           [Lucas]

Si sobra tiempo (todo lo anterior mergeado el martes 24 a la noche):
  → C-06 reprogramar-turno                     [Lucas]
  → C-03 horarios-y-bloqueos                   [Lautaro]

Después de la entrega (roadmap):
GATE 1: C-02 ✓ y C-03 ✓ y C-04 ✓ y C-05 ✓ y C-06 ✓ y C-07 ✓ y C-11 ✓
  → C-08 roles-basicos
GATE 2: C-08 ✓ → C-09 consulta-de-auditoria
GATE 3: C-09 ✓ → C-10 cierre-y-entrega
```

C-02, C-03 y C-04 agregan solo endpoints CRUD sobre tablas que ya existen desde C-01; no se bloquean entre sí ni bloquean a C-05, C-06, C-07 y C-11.

### Camino crítico

```
Entrega (25/11):  C-01 ⭐ ✓ → C-11 ✓ → C-07 ✓ → C-05 ✓        (MVP defendible con pantallas)
MVP completo:     C-01 ⭐ → (C-02 a C-07 y C-11) → C-08 → C-09 → C-10
```

- El "MVP defendible" es `C-01` + `C-05` + `C-07`; con DD-08 se le suma `C-11` para tener pantallas. El resto se recorta.
- Regla del equipo: es mejor mostrar 3 changes bien hechos (spec, tests en verde y pantalla funcionando) que 6 a medias.

### Plan del equipo (3 integrantes, PA-06)

| Integrante | Rol | Rama | Changes |
|---|---|---|---|
| Nazareno | Líder: dueño del repo, Paso 0, revisa y mergea los PR, video y entrega | `master` | Paso 0 (ajuste de fundación, DD-08) |
| Lucas | Integrante | `lucas` | C-11 → C-05 → (C-06 si sobra tiempo) |
| Lautaro | Integrante | `lautaro` | C-07 (API y después pantalla) → (C-03 si sobra tiempo) |

**Orden de merges a `master`**: Paso 0 (directo, antes de proteger `master`) → C-11 → C-07 → C-05 → extras (C-06, C-03).

- Lucas y Lautaro trabajan al mismo tiempo, cada uno en su rama. Lo único secuencial son los merges.
- Cada integrante commitea desde su máquina, una vez por fase del ciclo OPSX, y abre un PR por change. El líder mergea con "Create a merge commit" (no squash) y las ramas no se borran.
- Antes de cada PR: `git pull origin master`, `npm test` en verde.

---

## FASE 1 — Núcleo de la agenda (único change de la consigna)

> Autocontenido a propósito: absorbe lo mínimo que necesita (base del proyecto, tablas, dominio y datos de prueba) para que sea un único ciclo OPSX. No incluye CRUD de recursos: esos llegan en la FASE 2.

### [C-01] `crear-turno-sin-solapamientos` ⭐
- **Estado**: `[x]` completado — archivado el 2026-11-17 en `openspec/changes/archive/2026-11-17-crear-turno-sin-solapamientos/`; spec vigente `openspec/specs/agenda-turnos/` (75 tests en verde)
- **Scope**:
  - Cubre US-010, el caso de uso central del MVP
  - **Base del proyecto**: scaffold TypeScript + Node 24 (`package.json` con scripts `dev`, `build`, `test`, `start`; `tsconfig.json`), Vitest, estructura hexagonal `src/domain`, `src/application`, `src/infrastructure/sqlite`, `src/http`, `src/main.ts`, `tests/domain`, `tests/e2e`
  - Servidor Fastify con `GET /health` y mapeo de errores de dominio a 404/409/422 con `codigo` y mensaje en español (RN-GL-02)
  - Configuración por variables de entorno `PORT`, `DB_PATH`, `TZ_CONSULTORIO`, `SEED_FICTICIO`; `.env.example` sin valores reales; `.gitignore` con `.env` y `data/`; reloj inyectable (`Clock`)
  - `README.md` mínimo con `npm install` y `npm test`
  - **Decisiones del Explore (2026-11-17)**: alcance acotado a solapamientos, grilla y duración; las validaciones de horario de atención y bloqueos pasan a C-03. PA-01: `sillonId` obligatorio. PA-02: duración > 0 y múltiplo de 15. Ver `docs/opsx/explore-crear-turno-sin-solapamientos.md`
  - **Dominio puro**: value object `Intervalo` semiabierto en `src/domain/intervalo.ts` (superposición `a < d y c < b`, RN-TU-02); conversión de hora local `America/Argentina/Buenos_Aires` a instantes en minutos Unix (DD-03, RN-AG-04)
  - **Esquema SQLite** (conexión `node:sqlite`, base `:memory:` nueva por test): tablas `profesional`, `sillon` (`nombre` UNIQUE), `prestacion` (CHECK `duracion_min` > 0 y múltiplo de 15), `paciente`, `turno` (`inicio_min`, `fin_min`, `duracion_min`, `sillon_id` NOT NULL, `estado` con CHECK, índices por profesional y por sillón) y `evento_auditoria` (solo inserción)
  - **Seed y fixtures ficticios** usados por los tests: profesionales Dra. Ana Prueba, Dr. Bruno Ejemplo y Dra. Carla Demo; Sillón 1, Sillón 2 y Box 3; prestaciones Consulta 15, Limpieza 30, Extracción simple 45 y Endodoncia 90; Paciente Ficticio Uno, Dos y Tres
  - **`POST /turnos`** (`pacienteId`, `profesionalId`, `sillonId`, `prestacionId`, `inicio` ISO 8601, `duracionMin` opcional): 201 con el turno, 404 si falta un recurso, 422 `RECURSO_INACTIVO`, 409 por solapamiento
  - `crearTurno` calcula `duracion` (la indicada o la de la prestación) y `fin = inicio + duracion`; valida grilla de 15 minutos (`INICIO_FUERA_DE_GRILLA`) y duración (`DURACION_INVALIDA`). La regla de medianoche (RN-AG-05) se quitó en la revisión del propose (ver PA-09)
  - **Concurrencia**: `DatabaseSync` es sincrónico, así que la carrera real ocurre entre conexiones. `BEGIN IMMEDIATE` con `busy_timeout`; el test usa 2 conexiones a un archivo SQLite temporal
  - **Fuera de alcance de C-01**: horarios de atención y bloqueos (`FUERA_DE_HORARIO`, `EN_BLOQUEO`), que van en C-03
  - Verificación de solapamiento con `BEGIN IMMEDIATE`: busca turnos no cancelados con `inicio_min < :fin AND :inicio < fin_min AND (profesional_id = :p OR sillon_id = :s)`; clasifica en `TURNO_SOLAPADO_PROFESIONAL` y/o `TURNO_SOLAPADO_SILLON` (si chocan ambos, informa los dos), con los turnos en conflicto en `detalle`
  - Inserta el turno en estado `reservado` y el evento de auditoría `creado` en la misma transacción; `usuario_id` nulo hasta C-08
  - Sin sobreturnos: ningún parámetro fuerza un solapamiento (RN-TU-07)
  - **No incluye**: endpoints CRUD de profesionales, sillones, prestaciones, pacientes, horarios ni bloqueos (C-02 a C-04); los recursos se cargan por seed y fixtures
  - Tests (uno por escenario): caso feliz; solapamiento por profesional; solapamiento por sillón con otro profesional; ambos conflictos a la vez; borde contiguo aceptado (10:00-10:30 y 10:30-11:00); turno cancelado no bloquea; inicio 10:10; duración 0 y 20; recurso inactivo; 404; dos creaciones concurrentes resultan en exactamente un turno; rechazo no deja datos ni auditoría; tabla de bordes de `Intervalo` (contiguo, contenido, idéntico, disjunto); `/health` devuelve 200
- **Dependencias**: ninguna
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` RN-TU-01 a RN-TU-08, RN-TU-13, RN-AG-03, RN-AG-04, RN-AU-01, RN-GL-01 a RN-GL-03, RN-PA-01
  - `docs/opsx/explore-crear-turno-sin-solapamientos.md`
  - `knowledge-base/06_funcionalidades.md` US-010
  - `knowledge-base/07_flujos_principales.md` Flujo 1
  - `knowledge-base/04_modelo_de_datos.md` todas las entidades y §Seed data inicial
  - `knowledge-base/08_arquitectura_propuesta.md` §Patrones aplicados, §Estructura de directorios, §Variables de entorno, §Testing
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-01 a DD-04, DD-06, SU-01 (y `10_preguntas_abiertas.md` PA-02)

---

## FASE 2 — Gestión de recursos y datos (CRUD sobre tablas existentes)

> Los tres changes dependen solo de C-01 y se hacen en paralelo. Agregan endpoints, casos de uso y tests sobre las tablas y el seed que C-01 ya creó.

### [C-02] `catalogo-de-recursos`
- **Estado**: `[ ]` pendiente
- **Scope**:
  - Cubre US-001, US-002 y US-003
  - Casos de uso de alta, edición y desactivación (baja lógica con `activo`/`activa`) sobre `profesional`, `sillon` y `prestacion`
  - Endpoints: `POST/GET/PATCH /profesionales`, `POST/GET/PATCH /sillones`, `POST/GET/PATCH /prestaciones`
  - Validación de esquema JSON de Fastify; `DURACION_INVALIDA` (422) para duración no válida; nombre de sillón duplicado responde 409
  - Un recurso desactivado deja de aceptar turnos nuevos (la regla ya la aplica C-01; se prueba de punta a punta)
  - Tests: alta feliz, nombre de sillón duplicado, duración 0 y 20 rechazadas, desactivar un recurso y verificar que `POST /turnos` lo rechaza
- **Dependencias**: `C-01`
- **Governance**: BAJO
- **Leer antes**:
  - `knowledge-base/04_modelo_de_datos.md` §Profesional, §Sillon, §Prestacion
  - `knowledge-base/06_funcionalidades.md` US-001, US-002, US-003
  - `knowledge-base/05_reglas_de_negocio.md` RN-TU-06, RN-AG-03, RN-PA-01
  - `knowledge-base/10_preguntas_abiertas.md` PA-02

### [C-03] `horarios-y-bloqueos`
- **Estado**: `[ ]` pendiente — extra para la entrega: solo si todo lo obligatorio está mergeado el 24/11 a la noche (Lautaro)
- **Scope**:
  - Cubre US-004
  - Esquema: tablas `horario_atencion` y `bloqueo` (movidas desde C-01 en el Explore del 2026-11-17), con seed ficticio de horarios y un feriado de ejemplo
  - Endpoints: `POST/GET/DELETE /profesionales/:id/horarios` y `POST/GET/DELETE /profesionales/:id/bloqueos`, por profesional (ver PA-03 y PA-04)
  - Validación: `dia_semana` 1..7 ISO, `hora_desde` < `hora_hasta`, bloqueo con `inicio` < `fin`; franjas y bloqueos semiabiertos
  - Dominio: funciones `estaDentroDeHorario` ([inicio, fin) ⊆ [desde, hasta)) y `seSuperponeConBloqueo`, que reutilizan `Intervalo` de C-01
  - **Suma a `POST /turnos`** (y a la reprogramación) las validaciones `FUERA_DE_HORARIO` (RN-AG-01) y `EN_BLOQUEO` (RN-AG-02)
  - Tests: franja inválida rechazada; turno fuera de horario rechazado; turno que termina justo al cierre aceptado; bloqueo que lo roza rechazado (turno que termina justo al inicio del bloqueo sí se acepta); borrar un bloqueo libera la franja
  - **Pantalla Configuración** (opcional, si se hace en la entrega): alta y baja de horarios y bloqueos por profesional; requiere mockup aprobado y C-11 mergeado
- **Dependencias**: `C-01` (API); `C-11` mergeado (pantalla opcional)
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/04_modelo_de_datos.md` §HorarioAtencion, §Bloqueo
  - `knowledge-base/05_reglas_de_negocio.md` RN-TU-02, RN-AG-01, RN-AG-02, RN-AG-04
  - `knowledge-base/06_funcionalidades.md` US-004
  - `knowledge-base/10_preguntas_abiertas.md` PA-03, PA-04

### [C-04] `ficha-minima-de-paciente`
- **Estado**: `[ ]` pendiente
- **Scope**:
  - Cubre US-030
  - Endpoints: `POST /pacientes`, `GET /pacientes/:id`, `PATCH /pacientes/:id`, `GET /pacientes?busqueda=`
  - Validación de nombre y apellido obligatorios (422); `telefono`, `email` y `obra_social` opcionales
  - Tests: alta feliz, faltante de apellido rechazado, verificación de que ningún seed ni fixture usa datos reales
- **Dependencias**: `C-01`
- **Governance**: BAJO
- **Leer antes**:
  - `knowledge-base/04_modelo_de_datos.md` §Paciente
  - `knowledge-base/06_funcionalidades.md` US-030
  - `knowledge-base/05_reglas_de_negocio.md` RN-PA-01, RN-PA-02

---

## FASE 3 — Interfaz web, ciclo de vida del turno y agenda

> La API de C-05, C-06 y C-07 sale de C-01 y es independiente entre sí (y de la FASE 2). La parte de pantalla depende de C-11 (ver el árbol). Una rama por integrante.

### [C-11] `interfaz-web-base`
- **Estado**: `[x]` completado — archivado el 2026-11-24 en `openspec/changes/archive/2026-11-24-interfaz-web-base/`; specs vigentes `openspec/specs/catalogos/` (nueva) y `openspec/specs/agenda-turnos/` (formato de error); 92 tests en la raíz y 19 en `web/`, en verde. Verify en `docs/opsx/verify-interfaz-web-base.md`. Lucas, rama `lucas`; GATE 0b se abre cuando el PR se mergee en `master`
- **Scope**:
  - Origen: DD-08 (interfaz web mínima en v1). Primer change visual: usa el design-system (revisión 1) y requiere mockup aprobado antes del Apply
  - Carpeta `web/` con Vite + React + TypeScript (`npm create vite@latest web -- --template react-ts`) y sus scripts (`cd web`, `npm run dev`)
  - Proxy en `web/vite.config.ts`: `/api/*` → `http://127.0.0.1:3000/*` sin el prefijo; la API no necesita CORS
  - API de solo lectura, con tests: `GET /pacientes`, `GET /profesionales`, `GET /sillones` y `GET /prestaciones` (solo los activos). El alta y la edición siguen siendo C-02 y C-04
  - Layout con menú lateral (Nuevo turno, Agenda) con los estilos de `design-system/tokens.css`; Agenda queda como "próximamente" hasta C-07
  - Pantalla Nuevo turno: selects de paciente, profesional, sillón y prestación cargados desde la API; fecha y hora; botón Reservar que llama a `POST /turnos`; muestra el turno creado o el error del backend (409 por superposición, 422 fuera de grilla o duración inválida, 400) en forma legible
  - Escenarios del spec: de la API (GET de catálogos y que el error de `POST /turnos` llegue con `codigo` y mensaje). La pantalla se verifica a mano con captura
  - Fuera de alcance: login y roles (DD-07, C-08), alta y edición de recursos (C-02, C-04)
- **Dependencias**: `C-01` y el Paso 0 (DD-08)
- **Governance**: BAJO
- **Leer antes**:
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-08
  - `knowledge-base/08_arquitectura_propuesta.md` §Interfaz web
  - `knowledge-base/02_descripcion_general.md` §API REST y códigos de error
  - `design-system/README.md`, `design-system/components.html`
  - `openspec/specs/agenda-turnos/spec.md`

### [C-05] `cancelar-y-cambiar-estado-de-turno`
- **Estado**: `[x]` completado — archivado el 2026-11-24 en `openspec/changes/archive/2026-11-24-cancelar-y-cambiar-estado-de-turno/`; spec vigente `openspec/specs/agenda-turnos/` (24 requisitos: suma cancelar, confirmar, ausente/atendido, transiciones inválidas y su auditoría); 175 tests en la raíz y 31 en `web/`, en verde. Verify en `docs/opsx/verify-cancelar-y-cambiar-estado-de-turno.md`. Lucas, rama `lucas`; queda cerrado cuando el PR se mergee en `master`
- **Scope**:
  - Cubre US-011 y US-013
  - Máquina de estados en dominio (`EstadoTurno`, `transicionValida`) con las transiciones de RN-TU-09; `TRANSICION_INVALIDA` (422) para cualquier otra
  - Endpoints: `POST /turnos/:id/cancelar`, `POST /turnos/:id/confirmar`, `POST /turnos/:id/ausente`, `POST /turnos/:id/atendido`
  - Cancelar libera profesional y sillón; `ausente` y `atendido` siguen ocupando (RN-TU-10); sin anticipación mínima (RN-TU-11)
  - Eventos de auditoría `cancelado` y `estado_cambiado` en la misma transacción
  - Tests: cancelar `reservado` y `confirmado`; tras cancelar se puede crear otro turno en el mismo horario y con los mismos recursos; cancelar `atendido`, `ausente` o ya `cancelado` rechazado; `ausente` y `atendido` siguen bloqueando; 404
  - **Pantalla**: botón Cancelar (y, si da el tiempo, Confirmar) en cada turno de la Agenda de C-07. Si C-07 se atrasa, el botón va provisoriamente en el aviso del turno creado de C-11
- **Dependencias**: `C-01` (API); `C-07` mergeado (botón en la Agenda)
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` RN-TU-09, RN-TU-10, RN-TU-11, RN-AU-01
  - `knowledge-base/06_funcionalidades.md` US-011, US-013
  - `knowledge-base/07_flujos_principales.md` Flujo 2

### [C-06] `reprogramar-turno`
- **Estado**: `[ ]` pendiente — extra para la entrega: solo si todo lo obligatorio está mergeado el 24/11 a la noche (Lucas)
- **Scope**:
  - Cubre US-012
  - Endpoint `POST /turnos/:id/reprogramar` (nuevo `inicio` y, opcionalmente, `sillonId`, `profesionalId`, `duracionMin`)
  - Reutiliza las validaciones y la transacción de C-01 con un parámetro `excluirTurnoId` para no chocar con el propio turno (RN-TU-12)
  - Solo se reprograman turnos `reservado` o `confirmado`; al reprogramar el estado vuelve a `reservado` (ver PA-05)
  - Evento de auditoría `reprogramado` con `antes` y `despues` en JSON
  - Tests: mover 15 minutos dentro de su propio intervalo es válido; choque con otro turno rechazado (profesional y sillón); cambio de sillón o profesional; reprogramar un `atendido` rechazado; el rechazo no modifica el turno original
  - **Pantalla** (si se hace): botón Reprogramar en la Agenda de C-07
- **Dependencias**: `C-01` (API); `C-07` mergeado (botón en la Agenda)
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` RN-TU-12, RN-TU-13, RN-AU-01
  - `knowledge-base/06_funcionalidades.md` US-012
  - `knowledge-base/07_flujos_principales.md` Flujo 3
  - `knowledge-base/10_preguntas_abiertas.md` PA-05

### [C-07] `agenda-diaria-y-semanal`
- **Estado**: `[x]` completado — archivado el 2026-11-24 en `openspec/changes/archive/2026-11-24-agenda-diaria-y-semanal/`; spec vigente `openspec/specs/agenda-turnos/` (5 requirements nuevos de consulta de agenda); 123 tests en la raíz y 27 en `web/`, en verde. Verify en `docs/opsx/verify-agenda-diaria-y-semanal.md`. Lautaro, rama `lautaro`; GATE 0c se abre cuando el PR se mergee en `master`
- **Scope**:
  - Cubre US-020
  - Endpoint `GET /turnos?desde&hasta[&profesionalId][&sillonId][&incluirCancelados]`
  - Consulta por intersección `inicio_min < :hasta AND :desde < fin_min`, orden por inicio, excluye cancelados por defecto
  - Respuesta con nombres de paciente, profesional, sillón y prestación
  - Conversión de `desde` y `hasta` en hora local del consultorio (RN-AG-04); la vista diaria y la semanal son el mismo endpoint con distinto rango
  - Tests: rango de un día y de una semana, filtro por profesional, filtro por sillón, cancelados excluidos e incluidos, turno que cruza el borde del rango, orden por inicio
  - **Pantalla Agenda** (cuando C-11 esté mergeado; requiere mockup aprobado): selector Día / Semana y flechas para moverse de fecha; filtros por profesional y por sillón; tabla o grilla con hora, paciente, profesional, sillón, prestación y estado; opción "mostrar cancelados". Los escenarios del spec son de la API; la pantalla se verifica a mano con captura
- **Dependencias**: `C-01` (API); `C-11` mergeado (pantalla)
- **Governance**: BAJO
- **Leer antes**:
  - `design-system/README.md`, `design-system/components.html` (sección Agenda)
  - `knowledge-base/06_funcionalidades.md` US-020
  - `knowledge-base/07_flujos_principales.md` Flujo 4
  - `knowledge-base/05_reglas_de_negocio.md` RN-AG-04
  - `knowledge-base/04_modelo_de_datos.md` §Turno (índices)

---

## FASE 4 — Acceso, auditoría y cierre

### [C-08] `roles-basicos`
- **Estado**: `[ ]` pendiente
- **Scope**:
  - Cubre US-031
  - Esquema: tabla `usuario` (`rol` CHECK IN administrador, recepcion, odontologo; `profesional_id` nullable) y seed ficticio (admin, recepcion, un odontólogo por profesional)
  - Autenticación mínima según PA-07 y DD-07: token por usuario definido por variable de entorno `AUTH_TOKENS` (sin login con contraseñas ni sesiones); sin credenciales en el repo
  - Middleware de autorización de Fastify con la matriz RBAC de `03_actores_y_roles.md` aplicada a todas las rutas existentes de C-01 a C-07 y C-11 (y login o selector de usuario en `web/`); `401` sin token y `403` sin permiso
  - RN-RO-02: un odontólogo solo crea turnos propios y solo cancela, marca ausente o atendido los propios; agenda acotada según la matriz
  - Completa `usuario_id` en los eventos de auditoría nuevos (RN-AU-01)
  - Tests: tabla rol x acción (permitido y denegado), odontólogo crea turno de otro profesional rechazado, recepción no configura recursos, `/health` sigue público
- **Dependencias**: `C-02, C-03, C-04, C-05, C-06, C-07, C-11`
- **Governance**: CRITICO
- **Leer antes**:
  - `knowledge-base/03_actores_y_roles.md` §RBAC, §Rutas públicas
  - `knowledge-base/05_reglas_de_negocio.md` RN-RO-01, RN-RO-02, RN-AU-01, RN-GL-03
  - `knowledge-base/08_arquitectura_propuesta.md` §Seguridad, §Variables de entorno
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-07
  - `knowledge-base/10_preguntas_abiertas.md` PA-07

### [C-09] `consulta-de-auditoria`
- **Estado**: `[ ]` pendiente
- **Scope**:
  - Cubre US-032
  - Endpoint `GET /turnos/:id/auditoria`: eventos en orden cronológico con acción, usuario, fecha y hora, `antes` y `despues`
  - Permisos: administrador lee todo, recepción solo auditoría de turnos, odontólogo sin acceso (matriz RBAC de C-08)
  - Garantía de inmutabilidad (RN-AU-02): sin endpoints ni sentencias de update o delete sobre `evento_auditoria`; triggers de SQLite que abortan `UPDATE` y `DELETE`
  - Tests: historial completo creado, reprogramado y cancelado con usuarios; intento de modificar o borrar un evento falla; 403 para odontólogo; 404 para turno inexistente
- **Dependencias**: `C-08`
- **Governance**: CRITICO
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` RN-AU-01, RN-AU-02, RN-GL-01
  - `knowledge-base/06_funcionalidades.md` US-032
  - `knowledge-base/04_modelo_de_datos.md` §EventoAuditoria
  - `knowledge-base/03_actores_y_roles.md` §RBAC (fila Auditoría)

### [C-10] `cierre-y-entrega`
- **Estado**: `[ ]` pendiente
- **Scope**:
  - `README.md` completo y reproducible: requisitos (Node 24), `npm install`, `npm test`, `npm run dev`, variables de entorno, ejemplos `curl` de cada escenario con datos ficticios
  - Checklist de aceptación: una pasada por cada criterio de aceptación de las US del MVP contra los tests existentes; completar los faltantes
  - Verificación de repo limpio: sin datos reales (RN-PA-01), sin secretos (RN-GL-03), `.env.example` completo
  - Revisión del historial de commits por fase en `master` y de las ramas y PRs por change (según PA-06)
  - Sin funcionalidad nueva
- **Dependencias**: `C-09`
- **Governance**: BAJO
- **Leer antes**:
  - `knowledge-base/06_funcionalidades.md` (todas las US del MVP)
  - `knowledge-base/08_arquitectura_propuesta.md` §Testing, §Variables de entorno
  - `knowledge-base/05_reglas_de_negocio.md` RN-PA-01, RN-GL-03
  - `docs/discovery/discovery.md` punto 9 (restricciones de entrega)

---

## FASE 5 — Backlog fuera del MVP (NO está en el camino crítico)

> Ninguno de estos ítems recibe código `C-NN` ni se implementa en la entrega de 2026-11-25. Se listan solo para no perder la visión. Origen: `knowledge-base/06_funcionalidades.md` Épica 5 y `docs/discovery/informe-discovery.md` D.3. Si se retoman, se numeran a continuación de C-11 y se reordenan.

| Etapa | Ítem | Por qué queda afuera |
|-------|------|----------------------|
| v1.x | Reserva online por link con disponibilidad real | Requiere una interfaz pública para pacientes (la de DD-08 es solo interna); DD-05 |
| v1.x | Recordatorios y confirmación por WhatsApp (API oficial) y email | Integración externa; DD-05 |
| v1.x | Lista de espera que ofrece los huecos liberados | Diferenciador, depende del núcleo estable |
| v1.x | Métricas de ocupación por sillón y de ausentismo | Depende de datos acumulados |
| v1.x | Transparencia de cumplimiento (Leyes 25.326 y 26.529) y exportación completa | Diferenciador |
| v1.x | Tiempo de limpieza entre turnos del mismo sillón (PA-08) | Pregunta abierta de baja prioridad |
| Posterior | Odontograma, periodontograma, historia clínica e imágenes/RX | Suite clínica, fuera del vacío de mercado atacado |
| Posterior | Presupuestos y planes de tratamiento | Suite clínica |
| Posterior | Caja, señas con Mercado Pago y facturación ARCA | Integración regulatoria y de pagos |
| Posterior | Liquidación de obras sociales y de honorarios | Integración regulatoria |
| Posterior | Asistente de IA, campañas de recupero | Fuera de alcance |
| Posterior | Multisucursal, stock, integraciones con organismos (PUCO, ReNaPDiS), Google Calendar | Fuera de alcance |

---

## Resumen

| ID | Change | Fase | Dependencias | Governance |
|----|--------|------|--------------|------------|
| C-01 | `crear-turno-sin-solapamientos` ⭐ | 1 | — | MEDIO |
| C-02 | `catalogo-de-recursos` | 2 | C-01 | BAJO |
| C-03 | `horarios-y-bloqueos` | 2 | C-01 | MEDIO |
| C-04 | `ficha-minima-de-paciente` | 2 | C-01 | BAJO |
| C-05 | `cancelar-y-cambiar-estado-de-turno` | 3 | C-01 | MEDIO |
| C-06 | `reprogramar-turno` | 3 | C-01 | MEDIO |
| C-07 | `agenda-diaria-y-semanal` | 3 | C-01 | BAJO |
| C-08 | `roles-basicos` | 4 | C-02 a C-07, C-11 | CRITICO |
| C-09 | `consulta-de-auditoria` | 4 | C-08 | CRITICO |
| C-10 | `cierre-y-entrega` | 4 | C-09 | BAJO |
| C-11 | `interfaz-web-base` | 3 | C-01 | BAJO |

**Primer change recomendado**: `C-01` (`crear-turno-sin-solapamientos`), sin dependencias — ✅ **completado y archivado el 2026-11-17**. GATE 0 desbloqueado.

**Próximos changes (entrega del 25/11)**: `C-11` y `C-07` archivados (pendiente merge de C-07 para abrir GATE 0c); sigue `C-05` (Lucas) y, si sobra tiempo, `C-06` / `C-03`. Ver §Plan del equipo.
