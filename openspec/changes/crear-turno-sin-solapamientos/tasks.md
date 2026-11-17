# Tasks

> Trazabilidad: cada escenario de `specs/agenda-turnos/spec.md` tiene al menos un test con su nombre. Todos los datos de prueba son ficticios.

## 1. Base del proyecto

- [ ] 1.1 Crear `package.json` (`type: module`, `engines.node >= 24`, scripts `dev`, `build`, `test`, `start`), `tsconfig.json`, `vitest.config.ts`, `.gitignore` (`node_modules/`, `dist/`, `.env`, `data/`) y `.env.example` sin valores reales; verificar que `npm install` termina sin errores
- [x] 1.2 Crear la estructura `src/domain`, `src/application`, `src/infrastructure/sqlite`, `src/http`, `src/main.ts`, `tests/domain`, `tests/e2e` y un test trivial; verificar que `npm test` corre en verde

## 2. Dominio: intervalos, tiempo y reglas

- [x] 2.1 Escribir primero los tests de `Intervalo` (contiguo antes y después no se superpone, superposición parcial, contenido, idéntico, disjunto, `inicio >= fin` inválido) e implementar `src/domain/intervalo.ts` con `seSuperponeCon`; verificar que `tests/domain/intervalo.test.ts` pasa
- [x] 2.2 Escribir primero los tests de conversión de tiempo (ISO con offset ↔ minutos Unix; hora local en `America/Argentina/Buenos_Aires`; inicio sin offset rechazado) e implementar `src/domain/tiempo.ts` sin offsets fijos en la lógica; verificar que los tests pasan
- [x] 2.3 Escribir primero los tests de las validaciones de turno (inicio 10:10 → `INICIO_FUERA_DE_GRILLA`; inicio con segundos distintos de cero → `INICIO_FUERA_DE_GRILLA`; duración 0 y 20 → `DURACION_INVALIDA`) e implementar `src/domain/turno.ts` y `src/domain/errores.ts` (`ErrorDeNegocio` con `codigo`, `mensaje` y `detalle`); verificar que los tests pasan
- [x] 2.4 Escribir primero los tests de clasificación de conflictos (solo profesional, solo sillón, ambos con `codigo` `TURNO_SOLAPADO_PROFESIONAL` y `detalle.conflictos` con `recurso`, y candidatos cancelados ignorados) e implementar la función de dominio que clasifica usando `Intervalo`; verificar que los tests pasan

## 3. Persistencia SQLite

- [x] 3.1 Implementar `src/infrastructure/sqlite/conexion.ts` (abre `DatabaseSync` con `DB_PATH`, aplica `PRAGMA foreign_keys = ON` y `busy_timeout`) y `esquema.ts` (tablas `profesional`, `sillon`, `prestacion` con CHECK de duración, `paciente`, `turno` con `sillon_id` NOT NULL, CHECK de `estado` e índices, y `evento_auditoria`); verificar con un test que una base `:memory:` nueva tiene las 6 tablas y que el CHECK rechaza una prestación de 20 minutos
- [x] 3.2 Implementar `seed.ts` con los datos ficticios de `knowledge-base/04_modelo_de_datos.md` (Dra. Ana Prueba, Dr. Bruno Ejemplo, Dra. Carla Demo; Sillón 1, Sillón 2, Box 3; Consulta 15, Limpieza 30, Extracción simple 45, Endodoncia 90; Paciente Ficticio Uno, Dos y Tres) y un test que verifica que se carga y que ningún teléfono sale del patrón ficticio `+54 9 11 0000-000X`
- [x] 3.3 Implementar los repositorios con SQL parametrizado: búsqueda de recursos por id y estado activo, búsqueda de candidatos superpuestos no cancelados por profesional o sillón, inserción de turno y de evento de auditoría; verificar con tests de repositorio contra `:memory:`

## 4. Caso de uso `crearTurno`

- [x] 4.1 Implementar `src/application/crear-turno.ts` con `Clock` inyectable: valida los recursos (`RECURSO_INEXISTENTE` / `RECURSO_INACTIVO`), calcula la duración por defecto, valida en el dominio y, dentro de `BEGIN IMMEDIATE`, busca candidatos, clasifica, inserta el turno `reservado` y el evento `creado`, y hace `COMMIT` (o `ROLLBACK` ante cualquier error); verificar con tests de aplicación para "Caso feliz con la duración de la prestación", "Duración indicada al crear", "Evento de auditoría al crear" y "Rechazo sin efectos"
- [x] 4.2 Escribir el test de concurrencia según D5 (dos conexiones a un archivo SQLite temporal, la segunda en un `worker_thread`, coordinación explícita sin `sleep`) para el escenario "Dos reservas simultáneas del mismo sillón"; verificar que pasa 10 veces seguidas (`npx vitest run tests/e2e/concurrencia.test.ts --repeat 10` o equivalente) y que el archivo temporal se borra

## 5. API HTTP

- [x] 5.1 Implementar `src/http/app.ts` (fábrica `construirApp({ db, clock })`), el manejador de errores que mapea los códigos a 400/404/409/422 con `{ error: { codigo, mensaje, detalle } }`, y `GET /health`; verificar con `app.inject` que `/health` devuelve 200 y que un error de esquema devuelve `400 SOLICITUD_INVALIDA`
- [x] 5.2 Implementar `POST /turnos` con JSON Schema (`additionalProperties: false`) que devuelve `201` con el turno (inicio y fin en ISO con offset local); verificar con tests e2e por `app.inject`, uno por escenario del spec: caso feliz, duración indicada, superposición parcial con el mismo profesional, turno contenido, mismo sillón con otro profesional, profesional y sillón ocupados, turno que empieza justo cuando termina otro, turno que termina justo cuando empieza otro, horario de un turno cancelado, inicio fuera de la grilla, duración que no es múltiplo de 15, duración cero, pedido sin sillón, profesional inexistente y sillón inactivo
- [x] 5.3 Implementar `src/main.ts` (lee `PORT`, `DB_PATH`, `SEED_FICTICIO` y levanta el servidor); verificar que `npm run build` compila sin errores de tipos y que `npm start` responde en `GET /health`

## 6. Documentación e integración

- [x] 6.1 Escribir `README.md` con requisitos (Node 24), `npm install`, `npm test`, `npm start`, variables de entorno y un ejemplo de `POST /turnos` con datos ficticios; verificar siguiendo el README desde un clon limpio que `npm test` queda en verde
- [x] 6.2 Verificación integral: `npm test` completo en verde y una matriz escenario → test en `docs/opsx/verify-crear-turno-sin-solapamientos.md` que confirma que los 18 escenarios del spec están cubiertos

## Workflow follow-up

- Verify: correr los tests y health checks, y documentar el resultado (obligatorio por la consigna).
- Archive: `openspec-archive-change` para sincronizar `specs/agenda-turnos` y archivar el change.
- Al archivar: agregar a la KB los códigos nuevos (`RECURSO_INEXISTENTE`, `SOLICITUD_INVALIDA`), marcar C-01 como `[x]` en `CHANGES.md` y sincronizar el estado del roadmap.
