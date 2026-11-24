# Verificación — `interfaz-web-base` (C-11)

**Fecha**: 2026-11-24
**Rama**: `lucas`. Base: commit `f23ce91` más el informe y las capturas de este paso.
**Resultado**: **111 tests en verde** (92 en la raíz y 19 en `web/`), los dos builds compilan, el lint de `web/` no da advertencias y la verificación manual está hecha a 1440×900. Las 16 tareas de `tasks.md` están completas.

## Ejecución automática

| Dónde | Comando | Resultado |
|---|---|---|
| Raíz | `npm test` | 12 archivos, **92/92** en verde: los 75 de C-01 más 17 nuevos |
| Raíz | `npm run build` | `tsc` sin errores |
| `web/` | `npm test` | 3 archivos, **19/19** en verde |
| `web/` | `npm run build` | `tsc -b && vite build` sin errores |
| `web/` | `npm run lint` | oxlint, 0 advertencias |

Los 17 tests nuevos de la raíz:

| Archivo | Tests | Qué cubren |
|---|---|---|
| `tests/e2e/catalogos.test.ts` | 9 | Un test por escenario del spec `catalogos` |
| `tests/e2e/turnos.test.ts` | 3 | Un test por escenario del delta de `agenda-turnos` |
| `tests/infra/repositorios.test.ts` | 5 | Listados del repositorio: columnas, orden y exclusión de inactivos |

Los 19 tests de `web/`:

| Archivo | Tests | Qué cubren |
|---|---|---|
| `src/fechas.test.ts` | 8 | Offset del `inicio` según la zona IANA, no fijo en `-03:00` ni tomado de la máquina, más los textos de fecha de los avisos |
| `src/api/cliente.test.ts` | 6 | El `POST` y los 4 `GET`, la normalización del error de la API y `SIN_CONEXION` |
| `src/api/mensajes.test.ts` | 5 | Textos y tono por código, y el caso por defecto con el mensaje del backend |

## Matriz escenario → test (12/12)

### Spec `catalogos` (nueva)

| # | Requisito | Escenario | Test (`tests/e2e/catalogos.test.ts`) |
|---|---|---|---|
| 1 | Listar profesionales activos | Profesionales del seed | `GET /profesionales › Profesionales del seed` |
| 2 | Listar profesionales activos | Profesional inactivo excluido | `GET /profesionales › Profesional inactivo excluido` |
| 3 | Listar profesionales activos | Sin profesionales activos | `GET /profesionales › Sin profesionales activos` |
| 4 | Listar sillones activos | Sillones del seed | `GET /sillones › Sillones del seed` |
| 5 | Listar sillones activos | Sillón inactivo excluido | `GET /sillones › Sillón inactivo excluido` |
| 6 | Listar prestaciones activas con su duración | Prestaciones del seed con duración | `GET /prestaciones › Prestaciones del seed con duración` |
| 7 | Listar prestaciones activas con su duración | Prestación inactiva excluida | `GET /prestaciones › Prestación inactiva excluida` |
| 8 | Listar pacientes sin datos de contacto | Pacientes del seed | `GET /pacientes › Pacientes del seed` |
| 9 | Listar pacientes sin datos de contacto | Sin datos de contacto en la respuesta | `GET /pacientes › Sin datos de contacto en la respuesta` |

### Delta de `agenda-turnos`

| # | Requisito | Escenario | Test (`tests/e2e/turnos.test.ts`) |
|---|---|---|---|
| 10 | Formato de los errores de la creación de turnos | Error de negocio por superposición con código y mensaje | mismo nombre |
| 11 | Formato de los errores de la creación de turnos | Regla de grilla con el mismo formato | mismo nombre |
| 12 | Formato de los errores de la creación de turnos | Pedido mal formado con el mismo formato | mismo nombre |

Por tipo de escenario, como pide la consigna:
- **Feliz:** 1, 4, 6 y 8.
- **Error de negocio:** 10 (409 por superposición) y 11 (422 de grilla).
- **Borde:** 2, 3, 5, 7, 9 y 12.

Los tests del delta de `agenda-turnos` pasaron sin tocar código de producción, porque la API ya respondía con ese formato desde C-01. El change lo dejó escrito como requisito.

## Verificación manual de la pantalla

**Hecha por Lucas** contra el mockup aprobado: la pantalla funciona, incluido el borde contiguo. Una Consulta de 10:00 a 10:15 y otro turno a las 10:15 en el mismo sillón se aceptan.

**Capturas**: se sacaron con la API levantada sobre una base SQLite temporal nueva (seed ficticio) y la web en `http://localhost:5173`. Chrome headless manejó la pantalla como un usuario: eligió las opciones, cargó fecha y hora y tocó "Reservar turno". Solo escritorio, 1440×900. Todos los datos son ficticios.

| Captura (`openspec/changes/interfaz-web-base/verify/`) | Pasos | Resultado en pantalla |
|---|---|---|
| `exito-desktop-1440x900.png` | Paciente Ficticio Uno, Limpieza, Dra. Ana Prueba, Sillón 1, 1/12/2026 10:00 | "Turno reservado · Paciente Ficticio Uno · Dra. Ana Prueba · Sillón 1 · Limpieza · martes 1/12, 10:00 a 10:30" |
| `borde-contiguo-desktop-1440x900.png` | Primero una Consulta de Paciente Ficticio Dos con el Dr. Bruno Ejemplo en el Sillón 2 a las 10:00 (10:00–10:15). Después Paciente Ficticio Tres, Consulta, Dra. Carla Demo, Sillón 2, 10:15 | "Turno reservado … Sillón 2 · Consulta · martes 1/12, 10:15 a 10:30": el turno contiguo se acepta |
| `error-409-sillon-desktop-1440x900.png` | Paciente Ficticio Dos, Limpieza, Dr. Bruno Ejemplo, Sillón 1, 10:15 | "El sillón ya está ocupado en ese horario · Choca con el turno de 10:00 a 10:30 en Sillón 1 · `409 TURNO_SOLAPADO_SILLON`" |
| `error-422-grilla-desktop-1440x900.png` | Paciente Ficticio Uno, Limpieza, Dra. Ana Prueba, Sillón 2, 10:10 | "La hora tiene que caer en la grilla de 15 minutos · `422 INICIO_FUERA_DE_GRILLA`", con el campo Hora marcado en rojo |
| `sin-conexion-desktop-1440x900.png` | Con la API apagada, se abre la pantalla | "No pudimos conectar con el servidor … `SIN_CONEXION`", con el botón Reintentar |

El proxy `/api` también se comprobó a mano: `http://localhost:5173/api/health` respondió `{"estado":"ok"}`.

## Diferencias con el mockup aprobado

| # | Mockup | Implementación | Motivo |
|---|---|---|---|
| 1 | Campo Hora con `step="900"` | Sin `step`, con `required` | Con `step`, Chrome bloquea las 10:10 con su propio cartel y el pedido nunca llega a la API. La grilla la decide el backend (DD-08). Registrado en `design.md` D8 |
| 2 | Fecha 1/12/2026 y selects en Uno / Limpieza / Ana / Sillón 1 | Fecha de hoy en la zona del consultorio, y cada select arranca en la primera opción en orden alfabético (Paciente Ficticio Dos, Consulta, Dr. Bruno Ejemplo, Box 3) | El mockup muestra un formulario ya completado. Los valores iniciales son los de design D8 y el orden es el del spec `catalogos` |
| 3 | El conflicto del 409 nombra solo el sillón | Si el conflicto es por profesional, dice "de <profesional>"; si es por sillón, "en <sillón>" | El mockup mostraba solo el caso del sillón, y el 409 por profesional también tiene que nombrar el recurso que choca |
| 4 | "Agenda" es un `<a aria-disabled>` con `title` | Es un `<button aria-disabled>` sin `title` | Accesibilidad: el `title` pisaba el nombre del ítem para los lectores de pantalla. Se ve igual |
| 5 | Vistas a 390×844 | Solo escritorio | Recorte de alcance del 2026-11-24 (`design.md`, "Ajuste de alcance") |
| 6 | El nombre de la marca se toma de `design-system/brand.js` | Constante con el mismo texto en `Layout.tsx` | `brand.js` manipula el DOM para las vistas HTML y no se importa en React. Si cambia el nombre comercial (TBD), hay que cambiarlo en los dos lugares |

Colores, tipografía, espaciado, avisos y menú lateral usan las mismas clases y variables de `design-system/tokens.css` que el mockup.

## Reglas duras

| Regla | Estado |
|---|---|
| Solo datos ficticios | ✔ Seed ficticio en los tests y en las capturas. `GET /pacientes` no expone teléfono, email ni obra social, y un test lo comprueba |
| SQL sin concatenar | ✔ Los listados usan sentencias fijas preparadas. Los helpers de test también usan sentencias fijas, sin interpolar nombres de tabla |
| Superposición solo con `Intervalo` | ✔ La interfaz no compara horarios; los decide la API |
| Sin offset `-03:00` fijo | ✔ `web/src/fechas.ts` calcula el offset con `Intl` y la zona IANA, y un test lo prueba con otras zonas y con otro `TZ` |
| Commits en español con prefijo | ✔ Uno por fase, en la rama `lucas` |

## Observaciones

- En Windows, cortar `npm run dev` puede dejar vivos a `tsx` o a `vite` escuchando en los puertos 3000 o 5173. Quedó anotado en el README.
- Pendiente fuera de este change: avisarle a Lautaro que registre las rutas de C-07 como plugin, igual que `rutas-catalogos.ts`, para que el merge en `src/http/app.ts` no choque.
