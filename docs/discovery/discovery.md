# Discovery — turnos-odontologia

**Fecha**: 2026-11-16
**Fuentes investigadas**: 16 sistemas con datos y 1 no relevado (ver `docs/discovery/sources/` y el informe completo en `docs/discovery/informe-discovery.md`)
**Estado**: checklist confirmado por el usuario el 2026-11-16

## 1. Problema que resuelve

En Argentina, los consultorios odontológicos de 2 a 5 profesionales que comparten sillones o boxes coordinan turnos en papel, planillas o WhatsApp. Si usan un sistema, ninguno de los relevados demuestra públicamente cómo evita reservar dos veces al mismo profesional o al mismo sillón. Tampoco cómo trata un turno que empieza justo cuando termina otro. Esto genera dobles reservas, sillones ociosos y conflictos en recepción.

## 2. Usuarios / roles

- **Recepción**: crea, cancela y reprograma turnos.
- **Odontólogo**: consulta su agenda y también puede crear turnos.
- **Administrador del consultorio**: configura profesionales, sillones/boxes, prestaciones con su duración, horarios de atención, bloqueos y roles.
- **Paciente**: es el sujeto del turno, pero no usa el sistema en la v1. La reserva online queda para la v1.x.

## 3. Casos de uso

1. Como recepción, quiero crear un turno para un paciente con un profesional, un sillón/box y una prestación, para que quede reservado sin superponerse con otro turno del mismo profesional ni del mismo sillón.
2. Como recepción, quiero cancelar un turno para liberar el horario del profesional y del sillón.
3. Como recepción, quiero reprogramar un turno a otro horario, respetando las mismas reglas que al crearlo.
4. Como odontólogo, quiero ver mi agenda diaria y semanal para saber a quién atiendo, cuándo y en qué sillón.
5. Como administrador, quiero configurar profesionales, sillones, prestaciones (con duración por defecto), horarios y bloqueos, para que la agenda refleje la realidad del consultorio.

## 4. Competidores / soluciones existentes

| Competidor | Problema que resuelve | Pricing | Diferenciadores |
|---|---|---|---|
| Dentia (AR) | Clínica en orden y WhatsApp atendido 24 h | $20.000 / $30.000 / $40.000 por mes | Asistente IA por WhatsApp, IA clínica |
| DentalCore (AR) | Ausencias, cobros y coberturas manuales, riesgo clínico | $75.000/mes con 2 usuarios (contradicción con USD 50) | Decisión clínica, API oficial de WhatsApp, exportación FHIR |
| DentalSoft (AR) | "Clínica en modo caos" | Gratis / $30.000 / $60.000 por mes | Detección de solapamientos y sobreturnos [A], plan gratuito |
| Bilog (AR) | Gestión integral y ausencias | No publicado | Trayectoria, incumbente (+1.500 clínicas [A]) |
| ZYRA (AR) | Huecos, stock y liquidaciones | $15.000 / $29.000 / $39.000 ARS por mes | Stock de insumos, ARCA |
| OdontoClinIA (AR) | Turnos y documentación clínica | No publicado (sin costo por usuario) | Odontograma versionado, PUCO y ReNaPDiS |
| DentalTec (AR) | Débitos de obras sociales | No publicado | Validación de obras sociales, círculos odontológicos |
| Dentalink (CL) | Gestión con IA | No publicado | Módulo Argentina en el centro de ayuda |
| AgendaPro (CL/LatAm) | Turnos sin planillas | $7.900 / $15.900 / $69.900 por mes | Sillón + duración por práctica, IA multicanal |
| Turnito (LatAm) | Turnos simples y gratis | Gratis / $12.000 / $24.500 / $42.000 | Plan gratuito, reserva por link y QR |
| Dentidesk, Medilink, Clinic Cloud, Medesk, Curve Dental, Open Dental | Ver informe | Ver informe | Referencias regionales e internacionales |

**Notas**: los cinco prioritarios para demo son Dentia, DentalCore, DentalSoft, Dentalink y Bilog. Los referentes de experiencia de usuario son Turnito, AgendaPro y Curve Dental (más la ASAP List de Open Dental para la lista de espera). Casi toda la evidencia es afirmación comercial [A]: los puntajes altos deben confirmarse antes de tomarlos como hechos.

## 5. Funcionalidades necesarias (MVP v1)

- Alta de profesionales, sillones/boxes y prestaciones con duración por defecto.
- Horarios de atención por profesional y bloqueos (feriados, vacaciones).
- Creación de turnos sin solapamientos por profesional y por sillón/box, con intervalos semiabiertos [inicio, fin) y mensajes claros ante un conflicto.
- Estados del turno: reservado, confirmado, cancelado, ausente y atendido. Cancelación y reprogramación con las mismas reglas.
- Agenda diaria y semanal filtrable por profesional y por sillón.
- Ficha mínima del paciente: contacto y obra social como dato. Siempre con datos ficticios en ejemplos y tests.
- Roles básicos (administración, recepción, odontólogo) y registro de auditoría de los cambios de turnos.

## 6. Funcionalidades opcionales

**Diferenciadores (v1.x)**:

- Reserva online por link con disponibilidad real.
- Recordatorio y confirmación por WhatsApp (API oficial) y email.
- Lista de espera que ofrece los huecos liberados.
- Métricas de ocupación por sillón y de ausentismo.
- Transparencia de cumplimiento: Ley 25.326 y 26.529, ubicación de datos declarada y exportación completa.

**Etapas posteriores**:

- Odontograma, periodontograma, historia clínica completa e imágenes/RX.
- Presupuestos y planes de tratamiento.
- Caja, señas con Mercado Pago y facturación ARCA.
- Liquidación de obras sociales y de honorarios.
- Asistente de IA y campañas.
- Multisucursal, stock e integraciones con organismos (PUCO, ReNaPDiS).

## 7. Reglas de negocio

- Un turno ocupa **a la vez** un profesional y un sillón/box durante el intervalo semiabierto [inicio, fin), donde fin = inicio + duración.
- No puede haber dos turnos no cancelados del mismo profesional cuyos intervalos se superpongan. Lo mismo vale para el mismo sillón/box.
- Dos intervalos [a, b) y [c, d) se superponen si y solo si a < d y c < b. Por lo tanto, un turno que empieza exactamente cuando termina otro **no** se superpone.
- El inicio del turno se alinea a una grilla de 15 minutos (:00, :15, :30, :45).
- La duración por defecto viene de la prestación y recepción puede editarla al crear el turno. Debe ser mayor que cero.
- No se permiten sobreturnos en la v1: todo solapamiento se rechaza.
- La cancelación no exige anticipación mínima en la v1. El turno pasa a "cancelado", libera profesional y sillón, y el cambio queda auditado.
- La reprogramación aplica las mismas validaciones que la creación, excluyendo al propio turno de la comprobación de solapamientos.
- **Supuesto confirmado**: todo turno requiere un sillón/box.
- **Supuesto confirmado**: un turno debe caer dentro del horario de atención del profesional y fuera de sus bloqueos.
- **Supuesto confirmado**: solo el estado "cancelado" libera los recursos.
- Nunca se usan datos reales de pacientes en el repositorio, los ejemplos, los tests ni las capturas.

## 8. Integraciones

- Ninguna integración externa en la v1. Es una decisión consciente: la v1 es el núcleo de agenda.
- v1.x: WhatsApp Business API oficial y email para recordatorios y confirmaciones.
- Etapas posteriores: ARCA (facturación electrónica), Mercado Pago (señas), Google Calendar.

## 9. Restricciones

Derivadas de la consigna del Trabajo Global:

- Entrega: miércoles 25/11/2026, 23:00.
- Solo datos ficticios de pacientes. No se contacta a proveedores ni se crean cuentas con datos reales para evaluarlos.
- Sin secretos ni credenciales en el repositorio.
- Stack libre, definido en la knowledge-base. No hace falta interfaz gráfica: alcanza con una API o un módulo de dominio.
- Tests automatizados que cubran cada escenario del spec. El repositorio debe poder clonarse y correr los tests siguiendo solo el `README.md`.
- El historial de commits debe mostrar el proceso (fundación, discovery, change), sobre la rama `master`. Si el trabajo es en grupo (hasta 3), cada integrante tiene sus commits y hay PRs por change hacia `master`.
- Un único change en el ciclo OPSX, chico y terminable. El sugerido es "crear turno sin solapamientos por profesional y por sillón/box".
- No se requiere despliegue público.

## 10. Riesgos

- **Supuesto sin probar**: que el vacío "prevención de solapamientos por sillón" sea real y no solo falta de documentación. Toda la evidencia competitiva es mayormente comercial [A].
- **Supuesto sin probar**: que los consultorios de 2 a 5 profesionales compartan sillones con la frecuencia suficiente para que la doble restricción importe. No está validado con usuarios reales.
- **Riesgo técnico**: concurrencia. Dos recepcionistas podrían reservar el mismo profesional o sillón al mismo tiempo y crear un solapamiento que la validación previa no detecta. La regla debe garantizarse también en la persistencia.
- **Riesgo técnico**: manejo de fechas y horas (zona horaria de Argentina, límites de intervalos). Un error en la comparación de bordes rompe la regla central.
- **Riesgo de plazo**: 9 días hasta la entrega para fundación, change y evidencias.
- **Riesgo de evaluación**: la verificación manual de al menos 5 fuentes está pendiente y la debe hacer una persona del equipo.

## 11. Preguntas abiertas

Puntos que el Discovery dejó como "No evidenciado":

- ¿Cómo previenen los competidores los solapamientos por profesional y por sillón? Ningún sitio lo documenta. Verificar en demos sin crear cuentas con datos reales.
- ¿Existe lista de espera en algún sistema argentino? No evidenciado en ninguno.
- ¿Qué método usa cada proveedor para WhatsApp? Solo DentalCore declara la API oficial; ZYRA usa QR.
- ¿Qué proveedores cumplen la Ley 26.529? Solo Dentia y DentalCore la declaran.
- Precios de Bilog, DentalTec, OdontoClinIA, Dentalink, Medilink, Dentidesk y Curve: no publicados.
- Doctoralia Argentina: no relevado (el sitio no respondió).
- Open Dental: no se verificó que sea de código abierto; el manual devolvió 403.

Decisiones de producto pendientes:

- ¿Hay prestaciones que no requieren sillón (por ejemplo, una consulta en escritorio)? Por ahora se asume que todas lo requieren.
- ¿La duración editable debe ser múltiplo de 15 minutos, como el inicio?
- ¿Cómo se representa el horario de atención: por profesional, por sillón o por consultorio?
- ¿El trabajo es individual o en grupo? Afecta ramas, PRs y la ubicación de las skills (`.agents/`).
- Stack tecnológico: lo define `kb-creator`.
