# Tasks

> Trazabilidad: cada escenario de `specs/catalogos/spec.md` y de `specs/agenda-turnos/spec.md` tiene un test con su nombre. Todos los datos de prueba son ficticios.
>
> **Dos tramos (design D10, decisión P4)**: los grupos 1 a 3 (API) no esperan el mockup. Los grupos 4 a 7 (`web/`) **no arrancan** hasta que `design.md` diga `Approval: approved (…, by Nazareno)`.

## 1. API: repositorio de catálogos

- [ ] 1.1 Escribir primero tests de repositorio contra `:memory:` con seed para `listarProfesionalesActivos`, `listarSillonesActivos` y `listarPrestacionesActivas` (orden por nombre, inactivos excluidos, `duracionMin` mapeado) y para `listarPacientes` (orden por apellido y nombre, sin columnas de contacto en el resultado). Implementarlos en `src/infrastructure/sqlite/repositorios.ts` con sentencias preparadas que hacen `SELECT` solo de las columnas expuestas; verificar que `tests/infra/repositorios.test.ts` pasa

## 2. API: rutas GET de catálogos

- [ ] 2.1 Escribir primero `tests/e2e/catalogos.test.ts` con un `it` por escenario de `specs/catalogos/spec.md`: "Profesionales del seed", "Profesional inactivo excluido", "Sin profesionales activos", "Sillones del seed", "Sillón inactivo excluido", "Prestaciones del seed con duración", "Prestación inactiva excluida", "Pacientes del seed" y "Sin datos de contacto en la respuesta". Usar `app.inject`, una base `:memory:` nueva por test y `UPDATE` preparados para desactivar; verificar que fallan (RED)
- [ ] 2.2 Crear el plugin `src/http/rutas-catalogos.ts` con los 4 GET y su `response` schema (`additionalProperties: false`, design D3), y registrarlo en `construirApp` con una sola línea (`app.register`, design D1); verificar que `tests/e2e/catalogos.test.ts` pasa y que `git diff src/http/app.ts` muestra solo el import y el registro

## 3. API: formato de error de `POST /turnos`

- [ ] 3.1 Agregar en `tests/e2e/turnos.test.ts` los escenarios del delta de `agenda-turnos`: "Error de negocio por superposición con código y mensaje", "Regla de grilla con el mismo formato" y "Pedido mal formado con el mismo formato". Comprobar `error.codigo`, `error.mensaje` no vacío y `error.detalle` objeto (con `conflictos[].recurso`, `inicio` y `fin` en el 409); verificar que pasan sin tocar código de producción, o corregir lo que falle
- [ ] 3.2 Verificar el tramo API completo: `npm test` en la raíz, todo en verde (los 75 de C-01 más los nuevos), y `npm run build` sin errores

## 4. `web/`: base del proyecto (espera la aprobación del mockup)

- [ ] 4.1 Confirmar que `openspec/changes/interfaz-web-base/design.md` dice `Approval: approved`; si no, frenar acá
- [ ] 4.2 Crear `web/` con `npm create vite@latest web -- --template react-ts` y quitar el contenido de ejemplo de la plantilla (logos, `App.css`, contador); verificar que `cd web && npm install && npm run build` termina sin errores
- [ ] 4.3 Configurar `web/vite.config.ts` con el proxy `/api` → `http://127.0.0.1:3000` sin el prefijo y `server.fs.allow: ['..']` (design D5), e importar `../../design-system/tokens.css` en `web/src/main.tsx`; verificar con la API y la web levantadas que `http://localhost:5173/api/health` responde `{"estado":"ok"}`
- [ ] 4.4 Agregar `vitest` como dependencia de desarrollo de `web/` con el script `"test": "vitest run"`; verificar que `cd web && npm test` corre

## 5. `web/`: fechas y cliente de API

- [ ] 5.1 Escribir primero `web/src/fechas.test.ts` (design D7): `2026-12-01` `10:00` en `America/Argentina/Buenos_Aires` → `2026-12-01T10:00:00-03:00`; la misma fecha en `Europe/Madrid` → `+01:00`; una zona con offset cero → `+00:00`; el resultado no cambia con otro `process.env.TZ`. Implementar `web/src/fechas.ts` con `Intl` y sin `-03:00` fijo; verificar que `cd web && npm test` pasa
- [ ] 5.2 Implementar `web/src/api/cliente.ts` (`obtenerCatalogos`, `reservarTurno` con resultado `{ ok, turno } | { ok: false, error }`, fallo de red → `SIN_CONEXION`) y `web/src/api/mensajes.ts` (`codigo` → título, ayuda y tono, con un caso por defecto que usa el `mensaje` del backend), según design D6; verificar que `cd web && npm run build` compila con tipos estrictos

## 6. `web/`: layout y pantalla Nuevo turno

- [ ] 6.1 Implementar `web/src/estilos.css` (mismas clases y variables que `design-system/components.html`, sin valores sueltos) y `components/Layout` con el menú lateral: Nuevo turno activo y Agenda con `aria-disabled` y la marca "Próximamente". Solo escritorio: sin media queries para móvil (design, "Ajuste de alcance"); verificar a mano a 1440×900 contra `mockups/previews/nuevo-turno-listo-desktop-1440x900.png`
- [ ] 6.2 Implementar `components/Aviso` (success, warning y danger, con el código técnico en monoespaciada) y `pages/NuevoTurno` según design D8: carga con el texto "Cargando…", error de carga con Reintentar, selects desde la API, fecha por defecto de hoy en la zona del consultorio, Reservar con `aria-busy`, aviso de éxito con nombres, 409 con lista de conflictos, 422 de grilla con el campo Hora marcado, y conservación de los campos tras un error; verificar que `cd web && npm run build` compila
- [ ] 6.3 Verificar a mano con la API y la web levantadas, contra cada estado del mockup: reservar Paciente Ficticio Uno con la Dra. Ana Prueba en el Sillón 1 a las 10:00 (éxito), repetir con el Dr. Bruno Ejemplo en el Sillón 1 a las 10:15 (409 sillón), hora 10:10 (422) y API apagada (sin conexión). Guardar capturas a 1440×900 (solo escritorio) en `openspec/changes/interfaz-web-base/verify/`, solo con datos ficticios

## 7. Documentación e integración

- [ ] 7.1 Actualizar `README.md` con cómo levantar la API (`npm run dev`) y la interfaz (`cd web`, `npm install`, `npm run dev`, `http://localhost:5173`) y cómo correr los tests de `web/`; verificar siguiendo los pasos desde cero en una terminal nueva
- [ ] 7.2 Verificación integral: `npm test` y `npm run build` en la raíz; `npm test` y `npm run build` en `web/`; todo en verde

## Workflow follow-up

- Verify del change (obligatorio por la consigna) con el informe en `docs/opsx/verify-interfaz-web-base.md`.
- Commit por fase en la rama `lucas` y PR a `master`. Avisarle a Lautaro que registre sus rutas de C-07 como plugin (design D1).
- Archive del change y `[x]` de C-11 en `CHANGES.md` después del merge.
