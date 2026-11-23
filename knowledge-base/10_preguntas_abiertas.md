# Preguntas Abiertas

> Fuentes: `docs/discovery/discovery.md` (punto 11), `docs/discovery/informe-discovery.md` (celdas "No evidenciado", C.3, limitaciones de la metodología).

## Inconsistencias detectadas

### IN-01 — Moneda del precio de DentalCore
**Documento A dice**: home y página de precios: "$75.000 por mes con 2 usuarios" (pesos).
**Documento B dice**: FAQ del mismo sitio: "USD 50 por mes con 2 usuarios".
**Impacto**: bajo para el producto; afecta la comparación de precios del informe (A.1 y B).
**Resolución propuesta**: mantener ambos valores citados como contradicción del proveedor (ya registrado en el informe).

### IN-02 — Confirmaciones "automáticas" de Bilog
**Documento A dice**: home: "confirmaciones automáticas".
**Documento B dice**: página de recordatorios: el envío masivo es manual, "de forma manual, pero más ágil".
**Impacto**: el puntaje de Bilog en "Turnos y automatización" puede estar sobreestimado o subestimado.
**Resolución propuesta**: verificarlo en una demo (Bilog está entre los 5 prioritarios de D.1).

### IN-03 — Duración múltiplo de 15
**Documento A dice**: Discovery: el inicio va en grilla de 15 minutos y la duración es editable.
**Documento B dice**: la KB asume que la duración también es múltiplo de 15 (SU-03, RN-TU-06).
**Impacto**: cambia una validación del primer change.
**Resolución**: ✅ resuelta el 2026-11-17. El usuario confirmó PA-02 (múltiplo de 15) en el Explore de C-01, así que la KB queda como estaba.

## Preguntas abiertas de producto (priorizadas)

| ID | Prioridad | Pregunta | Bloquea | Decisor |
|---|---|---|---|---|
| PA-01 | ✅ Resuelta (2026-11-17) | ¿Hay prestaciones que no requieren sillón/box? → **No: `sillonId` es obligatorio en todo turno.** Una consulta sin sillón se modela como un box más. | — | Usuario, en el Explore de C-01 |
| PA-02 | ✅ Resuelta (2026-11-17) | ¿La duración debe ser múltiplo de 15 minutos? → **Sí: duración > 0 y múltiplo de 15**, si no `422 DURACION_INVALIDA`. | — | Usuario, en el Explore de C-01 |
| PA-03 | Media | ¿El horario de atención se define por profesional (supuesto actual), por sillón o por consultorio? | Change de configuración | Usuario |
| PA-04 | Media | ¿Hacen falta bloqueos por sillón (mantenimiento, rotura), además de por profesional? | Change de configuración | Usuario |
| PA-05 | Media | ¿Un turno reprogramado vuelve a `reservado` o conserva `confirmado`? (SU-04) | Change de reprogramar | Usuario |
| PA-06 | ✅ Resuelta (2026-11-23) | ¿El trabajo es individual o en grupo? → **Grupo de 3**: Nazareno (líder, `master`), Lucas (rama `lucas`) y Lautaro (rama `lautaro`). Un PR por change hacia `master`, que solo mergea el líder. Ver CHANGES.md §Plan del equipo. | — | Equipo |
| PA-07 | Media | ¿Qué esquema de autenticación se usa en v1: token por usuario desde variables de entorno o login real? (DD-07) | Change de roles | Equipo técnico |
| PA-09 | Baja | ¿Hace falta prohibir que un turno cruce la medianoche (RN-AG-05, supuesto SU-04)? Se quitó de C-01 en la revisión del propose (2026-11-17) por no estar confirmada. Con horarios de atención (C-03), la regla puede volverse innecesaria. | C-03 | Usuario |
| PA-08 | Baja | ¿Hace falta un tiempo de limpieza entre turnos del mismo sillón, o va dentro de la duración? (DD-02) | v1.x | Usuario |

## Puntos "No evidenciado" del Discovery (para validar en demos)

La consigna prohíbe crear cuentas con datos reales o contactar proveedores. Estos puntos quedan como preguntas abiertas de mercado.

| ID | Prioridad | Pregunta | Fuente |
|---|---|---|---|
| ME-01 | Alta | ¿Cómo previenen los competidores los solapamientos por profesional y por sillón a la vez? Ningún sitio lo documenta. Es la base del diferencial del producto. | Informe A.2, C.3.1 |
| ME-02 | Alta | ¿La "detección automática de solapamiento" de DentalSoft considera el sillón y los turnos contiguos? | Informe D.1.3, verificación de fuentes #3 |
| ME-03 | Media | ¿Existe lista de espera en algún sistema argentino o latinoamericano? No evidenciado en ninguno (solo Curve y Open Dental). | Informe C.3.2 |
| ME-04 | Media | ¿Qué método de WhatsApp usa cada proveedor (API oficial o vinculación por QR)? Solo DentalCore declara la API oficial; ZYRA usa QR. | Informe C.3.6 |
| ME-05 | Media | ¿Qué proveedores cumplen la Ley 26.529 y dónde alojan los datos? Solo Dentia y DentalCore la declaran, y ambos alojan fuera del país. | Informe C.3.5 |
| ME-06 | Baja | ¿Cuáles son los precios de Bilog, DentalTec, OdontoClinIA, Dentalink, Medilink, Dentidesk y Curve? No están publicados. | Informe A.1 |
| ME-07 | Baja | Doctoralia Argentina no se pudo relevar (el sitio rechazó la conexión). ¿Es un competidor relevante? | Informe, Referencias |
| ME-08 | Baja | ¿Open Dental es de código abierto? No se pudo verificar (el manual devolvió HTTP 403). | Informe A.3 |
| ME-09 | Baja | ¿La duración variable por prestación existe en los sistemas odontológicos argentinos? Solo la declaran AgendaPro y Turnito (horizontales). | Informe C.3.3 |

## Discovery de arquitectura (kb.discovery)

Todos los campos se infirieron o se confirmaron con confianza: el stack lo eligió el usuario (DD-01) y el problema viene del Discovery. No quedan campos `[DISCOVERY]` sin resolver.
