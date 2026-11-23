# Visión y Objetivos

> Fuentes: `docs/discovery/informe-discovery.md` (secciones C y D), `docs/discovery/discovery.md` (puntos 1, 2, 5 y 6).

## Propósito del sistema

**Una agenda odontológica que nunca reserva dos veces al mismo profesional ni al mismo sillón/box.**

En Argentina, los consultorios odontológicos de 2 a 5 profesionales que comparten sillones coordinan turnos en papel, planillas o WhatsApp. Los que usan software no tienen forma de comprobar cómo evita su sistema las reservas dobles: ninguno de los 16 sistemas relevados en el Discovery lo demuestra públicamente. Tampoco explican qué pasa con un turno que empieza justo cuando termina otro. El resultado son dobles reservas, sillones ociosos y conflictos en recepción.

Este sistema ataca ese vacío con un **motor de agenda de doble restricción**: cada turno ocupa a la vez un profesional y un sillón/box durante el tiempo de la prestación. Las reglas son explícitas, están documentadas y se verifican con tests automatizados.

## Objetivos por actor

| Actor | Objetivo principal | Objetivos secundarios |
|---|---|---|
| Recepción | Dar turnos sin conflictos de profesional ni de sillón | Cancelar y reprogramar rápido; ver la ocupación del día |
| Odontólogo | Saber a quién atiende, cuándo y en qué sillón | Crear turnos para sus propios pacientes |
| Administrador del consultorio | Que la agenda refleje la realidad del consultorio | Configurar profesionales, sillones, prestaciones, horarios, bloqueos y roles; auditar cambios |
| Paciente (no usa el sistema en v1) | Que su turno sea respetado | Reserva online y recordatorios en v1.x |

## Alcance v1 (MVP imprescindible)

- Alta y gestión de profesionales, sillones/boxes y prestaciones con duración por defecto.
- Horarios de atención por profesional y bloqueos (feriados, vacaciones).
- **Creación de turnos sin solapamientos por profesional y por sillón/box**, con intervalos semiabiertos [inicio, fin) y errores explícitos ante un conflicto.
- Estados del turno: reservado, confirmado, cancelado, ausente y atendido.
- Cancelación (libera los recursos) y reprogramación (con las mismas reglas que la creación).
- Agenda diaria y semanal, filtrable por profesional y por sillón (consulta por API).
- Ficha mínima de paciente: nombre, contacto y obra social como dato. Siempre con datos ficticios en ejemplos y tests.
- Roles básicos (administrador, recepción, odontólogo) y registro de auditoría de los cambios de turnos.
- **Interfaz web mínima** para recepción (agregada el 2026-11-23, DD-08): pantallas Nuevo turno y Agenda, con botón Cancelar. Sin login hasta el change de roles.

## Fuera de alcance

**v1.x (diferenciadores, después del núcleo):**

- Reserva online por link para pacientes.
- Recordatorios y confirmación por WhatsApp (API oficial) y email.
- Lista de espera que ofrece los huecos liberados.
- Métricas de ocupación por sillón y de ausentismo.

**Etapas posteriores:**

- Odontograma, periodontograma, historia clínica completa e imágenes/RX.
- Presupuestos y planes de tratamiento.
- Caja, cobros, señas con Mercado Pago y facturación electrónica ARCA.
- Liquidación de obras sociales y de honorarios.
- Asistente de IA, campañas, multisucursal, stock e integraciones con organismos (PUCO, ReNaPDiS).
- Interfaz gráfica completa (pantallas de configuración, reportes, portal del paciente): la v1 solo tiene la interfaz web mínima de DD-08.
- Sobreturnos: no existen en v1.

## Métricas de éxito

| Métrica | Objetivo v1 |
|---|---|
| Turnos superpuestos persistidos (mismo profesional o mismo sillón, no cancelados) | 0, incluso con reservas concurrentes |
| Escenarios del spec cubiertos por tests automatizados | 100% en verde |
| Reproducibilidad | Clonar, instalar y correr los tests solo con el `README.md` |
| Trazabilidad | Toda creación, cancelación o reprogramación de turno deja un evento de auditoría |
| Datos personales reales en el repositorio | 0 |
