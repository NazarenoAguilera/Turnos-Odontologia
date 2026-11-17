# Contexto de Mercado

> Archivo extra (no canónico). Resume el informe de Discovery para que el roadmap y los changes mantengan el foco en el vacío detectado.
> Fuente: `docs/discovery/informe-discovery.md` (consulta del 2026-11-16, verificación manual del 2026-11-17).

## Competidores relevados

16 sistemas con datos y 1 no relevado (Doctoralia Argentina). Puntaje ponderado de 0 a 5 (sección B del informe):

| Rank | Sistema | Origen | Puntaje | Rol para este proyecto |
|---|---|---|---|---|
| 1 | Dentia | Argentina | 4,15 | Competidor prioritario (demo) |
| 2 | DentalCore | Argentina | 3,95 | Competidor prioritario (demo) |
| 3 | DentalSoft | Argentina | 3,75 | Competidor prioritario (demo); el único que declara detección de solapamientos |
| 4 | Dentalink | Chile | 3,70 | Competidor prioritario (demo) |
| 5 | AgendaPro | Chile/LatAm | 3,45 | Referente de experiencia de usuario: sillón y duración por práctica |
| 6 | Curve Dental | EE.UU. | 3,30 | Referente de experiencia de usuario: agenda por operatorio, Smart Fill |
| 7 | ZYRA | Argentina | 3,20 | — |
| 8 | OdontoClinIA | Argentina | 3,15 | — |
| 9 | Clinic Cloud | España | 3,05 | — |
| 10 | Bilog | Argentina | 2,90 | Competidor prioritario (demo); probable incumbente |
| 11 | DentalTec | Argentina | 2,65 | — |
| 12 | Turnito | LatAm | 2,60 | Referente de experiencia de usuario: reserva por link, pricing |
| 13–16 | Medesk, Open Dental, Medilink, Dentidesk | Varios | 2,25–2,55 | Open Dental: referente de lista de espera (ASAP List) |

## Estándar de mercado (no diferencia)

Agenda multiprofesional en la nube, recordatorios por WhatsApp o email, historia clínica con odontograma, presupuestos, caja, obras sociales y reportes básicos.

## Vacíos que ataca este producto

1. **Reglas de agenda opacas**: nadie demuestra la prevención de solapamientos por profesional **y** por sillón, ni el tratamiento de turnos contiguos. **Lo ataca el MVP v1** (RN-TU-01 a RN-TU-04 y RN-TU-13).
2. **Sin lista de espera** en la región. Se aborda en v1.x.
3. **Duración por prestación** poco evidenciada en los sistemas odontológicos argentinos. **Entra en el MVP v1** (RN-TU-06).
4. **Cumplimiento de datos de salud desparejo** y **WhatsApp sin API oficial**. Se aborda en v1.x.

## Implicancias para el roadmap

- El primer change debe ser el núcleo: **crear turno sin solapamientos por profesional y por sillón/box** (US-010).
- Lo que el Discovery dejó para etapas posteriores (odontograma, ARCA, Mercado Pago, liquidaciones) **no** debe aparecer en el camino crítico del MVP.
