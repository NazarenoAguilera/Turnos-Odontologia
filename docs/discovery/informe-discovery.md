# Informe de Discovery — Sistemas odontológicos de gestión de turnos y agenda

**Materia**: Desarrollo de Software — Trabajo Global (UTN-FRM)
**Integrantes**: (completar)
**Fecha**: 16 de noviembre de 2026
**Proyecto**: turnos-odontologia
**Alcance**: Argentina (prioridad), Latinoamérica y soluciones internacionales de referencia
**Notas por sistema**: `docs/discovery/sources/<sistema>.md` (esquema fijo, una por sistema)
**Checklist de Discovery (11 puntos)**: `docs/discovery/discovery.md`

---

## Resumen ejecutivo

**Qué se investigó.** Se relevaron 17 sistemas de gestión de turnos y agenda odontológica: 7 argentinos, 5 latinoamericanos y 5 internacionales de referencia. Se obtuvieron datos de 16; Doctoralia Argentina no respondió. La fuente fueron sus sitios oficiales, consultados el 16/11/2026. Cada dato se clasificó como funcionalidad comprobada, afirmación comercial o "No evidenciado".

**Principales hallazgos.**

1. El mercado argentino ya ofrece suites completas en pesos: agenda, recordatorios por WhatsApp, odontograma, caja, obras sociales y, en varios casos, facturación ARCA. Los mejor puntuados son Dentia (4,15/5), DentalCore (3,95) y DentalSoft (3,75).
2. La evidencia pública es pobre. Casi todo es afirmación comercial y solo dos proveedores tienen centro de ayuda accesible.
3. **Ningún sistema demuestra cómo evita solapamientos por profesional y por sillón/box a la vez.** Tampoco cómo trata un turno que empieza justo cuando termina otro. La lista de espera no aparece en ningún producto de la región.
4. El cumplimiento de datos de salud es desparejo: solo dos sistemas declaran la Ley 26.529, y ambos alojan los datos fuera del país.

**MVP recomendado.** En lugar de competir en la suite clínica completa, el producto ataca el vacío verificable: un **motor de agenda con doble restricción** (profesional y sillón/box) y duración por prestación. Usa intervalos semiabiertos [inicio, fin) y no admite sobreturnos, con estados de turno y auditoría de cambios. La reserva online, WhatsApp oficial y la lista de espera son los diferenciadores siguientes. Lo clínico y lo fiscal (odontograma, ARCA, obras sociales) queda para etapas posteriores.

---

## Metodología y criterios de evidencia

Se relevaron 17 sistemas a partir de búsquedas web y de la lectura directa de sus **sitios oficiales**: página principal, precios, funcionalidades, preguntas frecuentes, centro de ayuda, política de privacidad y términos. No se usaron comparativas de terceros como fuente de funcionalidades, porque casi todas las publican competidores o afiliados. Se obtuvieron datos de 16 sistemas. El sitio de Doctoralia Argentina rechazó la conexión y no se relevó.

Cada dato lleva una marca de evidencia:

| Marca | Significado |
|---|---|
| **[C] Comprobada** | Publicada en documentación, centro de ayuda, preguntas frecuentes con detalle operativo, términos o política de privacidad, o visible en una captura del producto |
| **[A] Afirmación comercial** | Texto de marketing de la landing, sin demostración |
| **No evidenciado** | No aparece en las páginas leídas. No significa que la función no exista: significa que no está demostrada públicamente |

**Limitaciones del relevamiento**:

- La lectura fue automatizada y limitada a entre 2 y 5 páginas por sitio. No se probaron demos ni se crearon cuentas.
- La mayoría de los proveedores no publica un centro de ayuda legible. En Bilog y Dentalink solo se leyeron los índices o títulos de artículos.
- ZYRA arma su contenido con JavaScript, por lo que se leyó con un navegador real. La landing de AgendaPro se leyó parcialmente (55%).
- El manual de Open Dental devolvió un error 403.
- Los montos se transcriben tal como figuran en cada sitio, en la moneda indicada. No se convirtieron ni se compararon con tipos de cambio.

---

## A. Tabla comparativa

Orden por **relevancia para Argentina**. El criterio combina tres factores: origen o presencia local, adaptación al mercado (pesos, ARCA, obras sociales, Mercado Pago) y foco odontológico.

### A.1 Identificación y modelo comercial

| # | Sistema | Proveedor / país | URL oficial | Segmento | Modalidad | Modelo comercial (tal cual publicado) | Fecha |
|---|---|---|---|---|---|---|---|
| 1 | Dentia | Brezzo Matías Alejandro / Argentina (Córdoba) | https://dentia.tech/ | Consultorios y clínicas, multisucursal | SaaS web + app instalable (PWA) | Básico $20.000, Pro $30.000, Elite $40.000 por mes; prueba de 30 días; sin contrato [C] | 2026-11-16 |
| 2 | DentalCore | Alfredo Di Tullio / Argentina (La Plata) | https://dentalcore.app/ | Consultorios y clínicas | SaaS + app de escritorio Windows | $75.000/mes con 2 usuarios + $15.000 por usuario (la FAQ indica USD 50 + USD 10: contradicción); prueba de 7 días; sin plan gratuito [C] | 2026-11-16 |
| 3 | DentalSoft | DentalSoft / Argentina (La Plata, Rosario) | https://dentalsoft.com.ar/ | Odontólogos, consultorios, clínicas | SaaS | Gratis 3 meses (50 turnos); Gestión $30.000; Pro $60.000 por mes por profesional [A]; suba con preaviso de 30 días [C] | 2026-11-16 |
| 4 | Bilog | Bilog / Argentina | https://bilog.com.ar/ | Independientes, clínicas, obras sociales, facultades | Híbrida: web, escritorio y app móvil | No publicado; mensual sin permanencia; recordatorios a cotizar [A] | 2026-11-16 |
| 5 | ZYRA | No evidenciado / Argentina (Córdoba) | https://www.appzyra.ar/ | Independientes a centros multiprofesionales | SaaS | Starter $15.000, Profesional $29.000, Premium $39.000 ARS por mes; prueba de 30 días [A] | 2026-11-16 |
| 6 | OdontoClinIA | Emprinet 4.0 S.A. / Argentina (Río Cuarto) | https://www.clinia.com.ar/odontologia | Consultorios, clínicas, centros de salud municipales, cadenas | SaaS con instancia propia | No publicado; cotización por institución y módulos; "costo por usuario $0" [A/C] | 2026-11-16 |
| 7 | DentalTec | Tándem Digital (a confirmar) / Argentina | https://web.dentaltec.com.ar/ | Odontólogos y círculos, federaciones y confederaciones | 100% web | No publicado; costo por odontólogo; WhatsApp desde USD 9 cada 50 mensajes [A] | 2026-11-16 |
| 8 | Dentalink | Engenis SpA (Healthatom) / Chile | https://www.softwaredentalink.com/ | Consultorios, clínicas, multisucursal, laboratorios | SaaS | No publicado; mensual, semestral o anual; Contact Center IA USD 50/mes [A] | 2026-11-16 |
| 9 | AgendaPro | AgendaPro Inc. / No evidenciado (opera en AR) | https://agendapro.com/ar/dental/software-odontologico | Consultorios y clínicas (horizontal: salud, belleza) | Nube + app iOS/Android | Individual $7.900, Full $15.900, PRO IA $69.900 por mes, IVA incluido; add-ons pagos [A] | 2026-11-16 |
| 10 | Turnito | Grupo Vansur / LatAm (versión AR) | https://turnito.app/ar/ | Cualquier rubro; vertical médica | Web | Gratis (100 reservas/mes, 5% de comisión); Plus $12.000, Advance $24.500, Pro $42.000 por mes, IVA incluido [A] | 2026-11-16 |
| 11 | Dentidesk | Dentidesk / Chile | https://www.dentidesk.com/ | Clínicas dentales, instituciones, sindicatos | Web + apps móviles | No publicado; prueba de 15 días [A] | 2026-11-16 |
| 12 | Medilink | Healthatom / LatAm | https://www.softwaremedilink.com/ | Centros de salud (sin vertical odontológica) | SaaS | No publicado; precio por médico; sin permanencia [A] | 2026-11-16 |
| 13 | Clinic Cloud | Doctoralia España SL / España | https://clinic-cloud.com/ | Consultas, clínicas, franquicias | Nube (AWS) | Mini 29 €, Pro 49 €, Max 79 € por mes + IVA; prueba gratuita [A] | 2026-11-16 |
| 14 | Medesk | Medesk / No evidenciado (internacional) | https://www.medesk.net/es/solutiones/odontologia | Clínicas dentales y médicos privados | SaaS | No publicado en la página leída; "Empieza gratis" [A] | 2026-11-16 |
| 15 | Curve Dental | CD Newco, LLC / EE.UU. | https://www.curvedental.com/ | Prácticas independientes y grupos multisede (DSO) | Nube + app móvil | No publicado; a cotizar [A] | 2026-11-16 |
| 16 | Open Dental | Open Dental Software / EE.UU. | https://www.opendental.com/ | Prácticas de cualquier tamaño | Escritorio + servicios web | USD 199/mes por ubicación, contrato de 12 meses; servicios web aparte [A] | 2026-11-16 |
| — | Doctoralia AR | Docplanner | https://www.doctoralia.com.ar/ | — | — | **No relevado**: el sitio rechazó la conexión | 2026-11-16 |

### A.2 Funcionalidades por dimensión

Leyenda: **Comprobado** = funcionalidad comprobada [C] · **Comercial** = afirmación comercial del proveedor [A] · **Parcial** = cubierto solo en parte (el detalle está en la nota del sistema) · **No evidenciado** = sin respaldo público en las páginas leídas.

| # | Sistema | Multi-profesional | Sillón / box | Duración por prestación | Prevención de solapamientos | Bloqueos | Reserva online 24/7 | WhatsApp | Confirmación / cancelación / reprogramación | Lista de espera | Recordatorios | Recupero / controles | Odontograma | Periodontograma | RX / imágenes | Presupuesto / plan | Caja / cobros | Señas / Mercado Pago | Obras sociales | ARCA | Roles / auditoría | Exportación | Normativa AR declarada |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Dentia | Comercial | No evidenciado | No evidenciado | Parcial (el asistente consulta la disponibilidad) | No evidenciado | Parcial (solo IA, plan Elite) | Comercial (asistente IA) | Comercial | No evidenciado | Comprobado | Comprobado | Comercial | Comprobado | Comercial (IA) | Comercial | Comercial | Comercial | Comercial | Comercial | Comprobado | Comprobado | Comprobado (25.326, 26.529) |
| 2 | DentalCore | Comercial | No evidenciado | No evidenciado | No evidenciado | Comercial | No evidenciado | Comercial (API oficial de Meta) | Parcial (confirmar y cancelar) | No evidenciado | Comprobado | Comercial | Comprobado | Comercial | Comercial | Parcial (plan sí; presupuesto No evidenciado) | Comercial | Comercial / Comprobado | Comprobado (65 OS) | Comprobado | Comprobado | Comprobado (FHIR) | Comprobado (25.326, 26.529) |
| 3 | DentalSoft | Comercial | No evidenciado | No evidenciado | Comercial | Comercial | Comercial (plan Pro) | Comercial | Comercial | No evidenciado | Comercial | Comercial | Comprobado (captura) | No evidenciado | Comercial | Comercial | Comercial | Comercial | Comercial | No evidenciado | Comprobado | Comprobado | Comprobado (25.326) |
| 4 | Bilog | Comercial | Parcial (consultorio) | No evidenciado | No evidenciado | No evidenciado | Parcial (link/QR) | Parcial (envío manual) | Parcial | No evidenciado | Comercial | No evidenciado | Comercial | No evidenciado | Comercial | Comprobado (índice) | Comprobado (índice) | No evidenciado | Comprobado (índice) | No evidenciado | Comprobado | No evidenciado | No evidenciado |
| 5 | ZYRA | Comercial | No evidenciado | No evidenciado | No evidenciado | No evidenciado | No evidenciado | Parcial (vinculación por QR, no API oficial) | Parcial (SI/NO) | No evidenciado | Comercial | Parcial (fidelización) | Comercial | No evidenciado | Comercial | Comercial | Comercial | No evidenciado | Comercial | Comercial (plan Premium) | Comercial | No evidenciado | No evidenciado |
| 6 | OdontoClinIA | Comercial | Comercial | No evidenciado | No evidenciado | No evidenciado | Parcial (turnero web/app) | Comprobado | Comercial | No evidenciado | Comercial | No evidenciado | Comercial (versionado) | No evidenciado | Parcial (adjuntos) | Comercial | Comercial | No evidenciado | Comprobado (PUCO) | Comprobado | Parcial | Parcial (PDF) | Parcial (base inscripta) |
| 7 | DentalTec | Comercial | No evidenciado | No evidenciado | No evidenciado | No evidenciado | No evidenciado | Comercial | Parcial (confirmación) | No evidenciado | Comercial | No evidenciado | Comercial | No evidenciado | Parcial | No evidenciado | No evidenciado | No evidenciado | Comercial (validación) | Comercial | Comercial | Comercial | No evidenciado |
| 8 | Dentalink | Comercial | No evidenciado | No evidenciado | No evidenciado | No evidenciado | Comercial | Comercial | Parcial (confirmar y reagendar) | No evidenciado | Comercial | Comercial | Comercial | Comercial | Comercial (IA) | Comercial | Comercial | No evidenciado | Comprobado (títulos AR) | No evidenciado | Comercial | Comercial | No evidenciado |
| 9 | AgendaPro | Comercial | Comercial | Comercial | No evidenciado | No evidenciado | Comercial | Comercial (IA) | Comercial | No evidenciado | Comercial | Comercial | Parcial (solo planes Salud) | No evidenciado | Parcial | Parcial | Comercial | Comercial | No evidenciado | No evidenciado ("Próximamente") | No evidenciado | No evidenciado | No evidenciado |
| 10 | Turnito | Comercial | No evidenciado | Comercial | Parcial (muestra solo horarios libres) | Comercial | Comercial | Comercial | Comercial | No evidenciado | Comercial | Parcial (recurrentes) | No evidenciado | No evidenciado | No evidenciado | No evidenciado | Parcial | Comercial | Parcial (campo) | No evidenciado | No evidenciado | Comercial | No evidenciado |
| 11 | Dentidesk | Comprobado | No evidenciado | No evidenciado | No evidenciado | Comercial | Parcial (link) | No evidenciado ("próximamente") | Comercial (email) | No evidenciado | Comercial (email) | Comercial | Comprobado | Parcial | Comercial | Comercial | Parcial | No evidenciado | Parcial (convenios) | No evidenciado (SII Chile) | Comercial | No evidenciado | No evidenciado |
| 12 | Medilink | Comercial | Parcial (recursos) | No evidenciado | No evidenciado | No evidenciado | Parcial | Comercial | Parcial (add-on) | No evidenciado | Comercial | Parcial | No evidenciado | No evidenciado | No evidenciado | Parcial | Comercial | No evidenciado | No evidenciado | No evidenciado | No evidenciado | Parcial | No evidenciado |
| 13 | Clinic Cloud | Comercial | Comercial (salas y boxes) | No evidenciado | No evidenciado | No evidenciado | Comercial (vía Doctoralia) | Comercial | Parcial | No evidenciado | Comercial | Comercial (campañas) | Parcial (plan Max) | Comercial | Comercial | Comercial | Comercial | No evidenciado | No evidenciado (mutuas ES) | No evidenciado | Comercial | No evidenciado | No evidenciado (RGPD) |
| 14 | Medesk | Comercial | No evidenciado | No evidenciado | No evidenciado | No evidenciado | Comercial | No evidenciado | Parcial | No evidenciado | Comercial | Parcial | Comercial | No evidenciado | No evidenciado | No evidenciado | Comercial | No evidenciado | No evidenciado | No evidenciado | Comercial | No evidenciado | No evidenciado (RGPD) |
| 15 | Curve Dental | Comercial | Comercial (operatorios) | Comercial | No evidenciado | Comercial | Parcial (autoagendamiento) | No evidenciado (SMS) | Comercial | Comercial (aviso corto) | Comercial | Comercial (recare) | Comercial | Comercial | Comercial | Comercial | Comercial | No evidenciado | No evidenciado (seguros EE.UU.) | No evidenciado | Parcial | Parcial | No evidenciado (HIPAA) |
| 16 | Open Dental | Comercial | No evidenciado | No evidenciado | No evidenciado | Comercial | Comercial (Web Sched) | No evidenciado (SMS) | Parcial (confirmación automática) | Comercial (ASAP List) | Comercial | Comercial (recall) | Comercial | No evidenciado | Comercial | No evidenciado | Parcial | No evidenciado | No evidenciado | No evidenciado | No evidenciado | No evidenciado | No evidenciado |

**Lectura crítica de A.2**: casi toda la evidencia es de tipo [A]. Hay tres hallazgos directamente relevantes para este proyecto:

1. **Ningún sistema evidencia prevención de solapamientos por sillón/box.** DentalSoft declara detección de solapamiento [A], pero no por sillón. OdontoClinIA, AgendaPro y Clinic Cloud declaran el sillón o box como recurso, pero no dicen cómo evitan las reservas dobles.
2. **La lista de espera solo aparece en productos de EE.UU.** (Curve Dental, Open Dental). No figura en ningún sistema argentino ni latinoamericano relevado.
3. **La duración variable por prestación** está evidenciada en pocos sistemas (AgendaPro, Turnito, Curve). Es clave en odontología, donde una limpieza y una endodoncia ocupan el sillón durante tiempos muy distintos.

### A.3 Fortalezas, limitaciones y evidencia de adopción

| # | Sistema | Fortalezas evidentes | Limitaciones evidentes | Adopción publicada |
|---|---|---|---|---|
| 1 | Dentia | Suite completa en pesos con precios públicos; la política de privacidad más explícita (25.326 y 26.529) [C]; auditoría, 2FA, exportación [C] | Datos procesados en Brasil, EE.UU. y 19 países vía IA, varios fuera de la Disposición 60-E/2016 (declarado) [C]; sin backups declarados; la reserva sin IA no aparece | "+100 clínicas" [A] |
| 2 | DentalCore | Mayor detalle en seguridad: backups cifrados con prueba de restauración, auditoría no editable, exportación HL7 FHIR [C]; WhatsApp por API oficial de Meta [A] | Sin reserva online para pacientes; precio con moneda contradictoria; datos alojados en EE.UU. [C] | No evidenciado |
| 3 | DentalSoft | Plan gratuito y precios públicos; detección de solapamientos y sobreturnos [A]; Ley 25.326 en la política [C] | Funciones clave solo en el plan Pro ($60.000 por profesional); sin ARCA; enlaces de ayuda vacíos | 11 reseñas en Google (5,0) [A] |
| 4 | Bilog | Trayectoria (+20 años); centro de documentación público por módulo [C, índice]; liquidación de obras sociales | Sin precios ni prueba; recordatorios de envío manual y cotizados aparte; sin política de privacidad visible; sin integraciones evidenciadas | +1.500 clínicas, +5.000 usuarios [A] |
| 5 | ZYRA | Precios bajos en ARS; stock de insumos (poco frecuente); ARCA integrada al cobro [A] | WhatsApp por QR (no API oficial: riesgo de bloqueo del número); producto joven | "+15 clínicas activas" [A] |
| 6 | OdontoClinIA | Odontograma versionado con control de edición simultánea [A]; integraciones con organismos públicos (PUCO, RENAPER, SUMAR, ReNaPDiS) [C]; base inscripta ante la DNPDP [C] | Sin precios; foco mezclado con salud pública; ubicación de datos no declarada | 15 municipios (módulo PAMI, no odontología) [C] |
| 7 | DentalTec | El nicho más específico: validación de obras sociales y jerarquía de círculos odontológicos [A] | Evidencia solo comercial; sin política de privacidad, precios, reserva online ni caja | "2.000+ profesionales" [A] |
| 8 | Dentalink | Oferta funcional amplia; módulo específico para Argentina en el centro de ayuda [C, títulos] | Sin precios; sin ARCA ni Mercado Pago; normativa argentina no evidenciada | +15.000 clínicas, +20 países [A] |
| 9 | AgendaPro | Mejor experiencia del paciente declarada: sillón, duración por práctica, 24/7, IA multicanal, señas [A]; precios bajos en ARS | Lo clínico (odontograma, ficha) no está en los planes dentales con precio visible; facturación "Próximamente" | Cifras inconsistentes (+30.000 negocios, +135.000 profesionales) [A] |
| 10 | Turnito | Plan gratuito sin vencimiento; reserva por link, QR o web embebida; control de ausentismo con bloqueo automático [A] | Sin capa clínica odontológica | 4,8 con 164 reseñas en Google [A] |
| 11 | Dentidesk | Fichas por especialidad; odontograma con nomenclaturas configurables [C] | Sin WhatsApp; sin funciones para Argentina | Testimonios de Chile [A] |
| 12 | Medilink | Suite de IA incluida; precio por médico | No es odontológico; sin presencia argentina evidenciada | +15.000 clientes [A] |
| 13 | Clinic Cloud | Salas y boxes; precios públicos escalonados; IA documental [A] | Fiscalidad española; odontograma solo en el plan Max | +3.000 clínicas en España [A] |
| 14 | Medesk | Telemedicina; Google Calendar; RGPD [A] | Sin WhatsApp ni adaptación argentina | 50 países, 15.000 médicos [A] |
| 15 | Curve Dental | Agenda por operatorio, Smart Fill y lista de aviso corto: referente de UX [A] | Solo EE.UU./Canadá; sin precio | 100.000+ usuarios [A] |
| 16 | Open Dental | Confirmación automática y ASAP List; precio público [A] | Escritorio, en inglés, servicios web con costo extra; "código abierto" no verificado | No evidenciado |

---

## B. Matriz de puntuación (0 a 5)

**Criterio**: cada dimensión se puntúa de 0 a 5 **sobre lo evidenciado** (C o A). Lo "No evidenciado" no suma. La columna "Evidencia" indica qué proporción del puntaje se apoya en [C]: Alta (mayoría C), Media (mezcla) o Baja (casi todo A). Un puntaje alto con evidencia baja debe confirmarse en una demo antes de tomarlo como dato.

Pesos: Turnos y automatización 25% · Clínica 20% · Integraciones locales y WhatsApp 15% · Administración, cobros y facturación 15% · Experiencia del paciente 10% · Seguridad, exportación y trazabilidad 10% · Precio y facilidad de adopción 5%.

| Rank | Sistema | Turnos (25%) | Clínica (20%) | Integr. (15%) | Admin. (15%) | Paciente (10%) | Seguridad (10%) | Precio (5%) | **Total ponderado** | Evidencia |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Dentia | 4 | 5 | 4 | 5 | 3 | 3 | 4 | **4,15** | Media |
| 2 | DentalCore | 3 | 5 | 4 | 5 | 2 | 5 | 3 | **3,95** | Media-alta |
| 3 | DentalSoft | 4 | 4 | 3 | 3 | 4 | 4 | 5 | **3,75** | Media |
| 4 | Dentalink | 4 | 5 | 2 | 4 | 4 | 3 | 2 | **3,70** | Baja |
| 5 | AgendaPro | 5 | 2 | 3 | 3 | 5 | 2 | 4 | **3,45** | Baja |
| 6 | Curve Dental | 5 | 5 | 0 | 2 | 4 | 3 | 1 | **3,30** | Baja |
| 7 | ZYRA | 3 | 4 | 3 | 4 | 2 | 2 | 4 | **3,20** | Baja |
| 8 | OdontoClinIA | 3 | 4 | 3 | 3 | 3 | 3 | 2 | **3,15** | Media |
| 9 | Clinic Cloud | 4 | 3 | 1 | 3 | 3 | 4 | 3 | **3,05** | Baja |
| 10 | Bilog | 3 | 4 | 1 | 4 | 3 | 2 | 2 | **2,90** | Media (índices) |
| 11 | DentalTec | 2 | 3 | 3 | 4 | 1 | 3 | 2 | **2,65** | Baja |
| 12 | Turnito | 4 | 0 | 3 | 2 | 5 | 1 | 5 | **2,60** | Baja |
| 13 | Medesk | 3 | 3 | 1 | 2 | 3 | 3 | 3 | **2,55** | Baja |
| 14 | Open Dental | 4 | 3 | 0 | 2 | 3 | 1 | 3 | **2,45** | Baja |
| 15 | Medilink | 3 | 2 | 1 | 3 | 3 | 2 | 2 | **2,35** | Baja |
| 16 | Dentidesk | 2 | 4 | 0 | 3 | 3 | 1 | 2 | **2,25** | Media-baja |

Cálculo: Total = 0,25·T + 0,20·C + 0,15·I + 0,15·A + 0,10·P + 0,10·S + 0,05·$. Ejemplo (Dentia): 0,25·4 + 0,20·5 + 0,15·4 + 0,15·5 + 0,10·3 + 0,10·3 + 0,05·4 = 4,15.

**Observaciones sobre la matriz**:

- Los internacionales (Curve, Open Dental, Clinic Cloud) puntúan bien en turnos y clínica, pero 0 o 1 en integraciones locales: no son alternativas reales para un consultorio argentino.
- Ningún sistema supera 3 en "Turnos" si se exigiera evidencia [C]. La agenda es el área donde los proveedores **menos documentan** cómo funcionan sus reglas.
- Bilog, probablemente el más instalado en Argentina, queda en el puesto 10 por falta de evidencia pública, no necesariamente por falta de funciones. Es el caso más claro de "hay que ver la demo".

---

## C. Análisis competitivo

### C.1 Funcionalidades que ya son estándar de mercado

Todo sistema odontológico argentino relevado declara:

- Agenda por profesional en la nube.
- Recordatorios automáticos (WhatsApp y/o email) con confirmación del paciente.
- Historia clínica digital con odontograma.
- Presupuestos y planes de tratamiento.
- Caja diaria y registro de cobros.
- Gestión de obras sociales o aranceles.
- Reportes básicos de ingresos y ausentismo.
- Roles de usuario.

Un producto nuevo que no ofrezca esto no compite. Pero tampoco se diferencia por ofrecerlo.

### C.2 Funcionalidades diferenciadoras reales

| Diferenciador | Quién lo tiene | Evidencia |
|---|---|---|
| Facturación electrónica ARCA integrada | Dentia, DentalCore, ZYRA, OdontoClinIA, DentalTec | DentalCore y OdontoClinIA [C]; resto [A] |
| Validación de cobertura de obra social en tiempo real | DentalTec (webservices), OdontoClinIA (PUCO) | OdontoClinIA [C]; DentalTec [A] |
| Asistente de IA que agenda por WhatsApp contra la disponibilidad real | Dentia, DentalSoft, OdontoClinIA, AgendaPro, Dentalink | [A] en todos |
| Odontograma versionado con comparación y control de edición simultánea | OdontoClinIA | [A] |
| Exportación interoperable HL7 FHIR | DentalCore | [C] |
| Stock de insumos | ZYRA | [A] |
| Sillón/box como recurso de agenda | OdontoClinIA, AgendaPro, Clinic Cloud, Curve | [A] |
| Lista de espera que ofrece huecos liberados | Curve (aviso corto), Open Dental (ASAP List) | [A] |

### C.3 Vacíos frecuentes del mercado argentino

1. **Reglas de agenda opacas.** Ningún proveedor documenta cómo previene solapamientos, ni si lo hace por profesional y por sillón a la vez. Tampoco documentan cómo maneja un turno que empieza exactamente cuando termina otro. Es la base de la operación y nadie la demuestra.
2. **Sin lista de espera.** No aparece en ningún sistema argentino ni latinoamericano. Las cancelaciones de último momento quedan como huecos perdidos.
3. **Duración por prestación poco evidenciada** en los sistemas odontológicos argentinos. Solo la declaran productos horizontales (AgendaPro, Turnito).
4. **Evidencia pública pobre.** Solo Bilog y Dentalink tienen un centro de ayuda accesible, y en ambos casos solo se pudieron leer los índices. Casi toda la información es marketing, con cifras sin metodología (DentalTec, Bilog, Dentidesk).
5. **Cumplimiento de datos de salud desparejo.** Solo Dentia y DentalCore declaran la Ley 26.529 (historia clínica). Varios no publican política de privacidad (Bilog, DentalTec). Los dos que más transparentan declaran alojar datos fuera del país (EE.UU. y Brasil).
6. **WhatsApp sin garantías.** Solo DentalCore declara la API oficial de Meta. ZYRA vincula el número por QR (automatización no oficial). El resto no aclara el método. Esto impacta en la estabilidad y en el costo por mensaje.
7. **Precios ocultos o fragmentados.** Bilog, DentalTec, OdontoClinIA, Dentalink y Medilink no publican precios. Los que sí lo hacen reservan las funciones de turnos online y automatización para los planes caros (DentalSoft Pro, Dentia Elite).

### C.4 Oportunidades de innovación para un nuevo sistema

1. **Motor de agenda con doble restricción verificable**: un turno ocupa a la vez un profesional y un sillón/box, durante la duración de la prestación. Se modela con intervalos semiabiertos [inicio, fin): un turno de 10:00 a 10:30 no choca con otro que empieza a las 10:30. Las reglas se publican y se prueban. Es el corazón del producto y el vacío más claro del mercado.
2. **Lista de espera inteligente**: cuando se cancela un turno, se ofrece el hueco a los pacientes en espera compatibles (misma prestación, duración que entra y sillón disponible).
3. **Transparencia de cumplimiento como diferencial comercial**: política de privacidad con Ley 25.326 y Ley 26.529, ubicación de los datos declarada, auditoría de cambios de turnos y exportación completa.
4. **WhatsApp por API oficial** con costo por mensaje explícito.
5. **Precios públicos y autoservicio** con prueba sin tarjeta, al estilo Turnito, en un producto odontológico.
6. **Métricas de ocupación por sillón**: ningún sistema argentino las muestra, y son la variable económica clave de un consultorio.

---

## D. Recomendación final

### D.1 Cinco competidores prioritarios para analizar mediante demo

| # | Sistema | Por qué |
|---|---|---|
| 1 | Dentia | Primero en la matriz (4,15); suite completa en pesos. Verificar en la demo: reglas de agenda (sillones, solapamientos) y comportamiento real del asistente de IA |
| 2 | DentalCore | Mejor evidencia de seguridad e interoperabilidad. Verificar: falta de reserva online, moneda del precio y vistas de agenda |
| 3 | DentalSoft | Único que declara detección de solapamientos y sobreturnos, con plan gratuito. Verificar: si el solapamiento considera sillones y cómo trata turnos contiguos |
| 4 | Dentalink | Competidor regional con módulo argentino. Verificar: contenido real del módulo de obras sociales y precios |
| 5 | Bilog | Probable incumbente local (+1.500 clínicas declaradas) con la menor evidencia pública. Verificar: automatización real de recordatorios y gestión de consultorios en la agenda |

### D.2 Tres productos de referencia para experiencia de usuario

| # | Sistema | Qué tomar como referencia |
|---|---|---|
| 1 | Turnito | Flujo de reserva del paciente (link, QR, web embebida), cancelación y reprogramación por link, control de ausentismo, pricing transparente |
| 2 | AgendaPro | Agenda por odontólogo, práctica y sillón con duración por práctica; señas al reservar |
| 3 | Curve Dental | Vista de agenda por operatorio (sillón), Smart Fill de huecos y lista de aviso corto. Complementar con la ASAP List de Open Dental para la lista de espera |

### D.3 MVP sugerido

**Imprescindibles (v1)**:

1. Alta de profesionales, sillones/boxes y prestaciones con duración propia.
2. Disponibilidad horaria por profesional y bloqueos (feriados, vacaciones).
3. **Creación de turnos sin solapamientos por profesional y por sillón/box**, con intervalos semiabiertos [inicio, fin) y mensajes de error claros ante un conflicto.
4. Estados del turno: reservado, confirmado, cancelado, ausente y atendido; cancelación y reprogramación que respetan las mismas reglas.
5. Agenda diaria y semanal, filtrable por profesional y por sillón.
6. Ficha mínima del paciente (datos de contacto y obra social como dato).
7. Roles básicos (administración, recepción, odontólogo) y registro de auditoría de cambios en turnos.

**Diferenciadores (v1.x, a continuación del núcleo)**:

1. Reserva online por link con disponibilidad real.
2. Recordatorio y confirmación por WhatsApp (API oficial) y email.
3. Lista de espera que ofrece los huecos liberados.
4. Métricas de ocupación por sillón y de ausentismo.
5. Transparencia de cumplimiento: Ley 25.326 y 26.529, ubicación de datos declarada y exportación completa.

**Para etapas posteriores**:

- Odontograma, periodontograma, historia clínica completa e imágenes/RX.
- Presupuestos y planes de tratamiento.
- Caja, señas con Mercado Pago y facturación electrónica ARCA.
- Liquidación de obras sociales y de honorarios.
- Asistente de IA conversacional.
- Campañas de recupero.
- Multisucursal, stock e integraciones con organismos (PUCO, ReNaPDiS).

**Justificación**: el MVP ataca el vacío más claro y verificable del mercado (reglas de agenda con doble recurso) en lugar de competir en la suite clínica completa, donde los incumbentes ya ofrecen lo estándar. Lo clínico y lo fiscal son estándar de mercado (C.1) y requieren mucha integración regulatoria; conviene sumarlo una vez validado el núcleo de agenda.

---

## Verificación de fuentes

La consigna pide comprobar personalmente al menos 5 fuentes, una de cada tipo, y anotar si lo que afirma el informe está realmente en esa URL. Las siguientes son las de mayor impacto en las conclusiones.

> **Estado: verificación manual pendiente.** Esta tabla la preparó el agente. Las columnas "Qué se encontró", "Corrección", "Fecha" y "Verificó" las debe completar **una persona del equipo**, abriendo cada URL en su navegador. Si algo no coincide, se corrige el informe con *Ajustar* y se registra el hallazgo acá (sirve para la reflexión).

| # | Tipo de fuente | URL | Qué afirma el informe | Uso en el informe | Qué se encontró | Corrección | Fecha | Verificó |
|---|---|---|---|---|---|---|---|---|
| 1 | Política de privacidad | https://dentia.tech/politica-de-privacidad | Declara las leyes 25.326 (art. 8) y 26.529; procesa datos en Brasil, EE.UU. y en 19 países vía Azure; inscripción en el registro "en trámite" | Rank 1, C.3.5 | Pendiente | | | |
| 2 | Página de precios | https://dentalcore.app/pricing | $75.000/mes con 2 usuarios + $15.000 por usuario; prueba de 7 días; sin plan gratuito (y la FAQ dice USD 50) | Rank 2, A.1 | Pendiente | | | |
| 3 | Sitio oficial (landing) | https://dentalsoft.com.ar/ | "Urgencias y sobreturnos con detección automática de solapamiento"; planes Gratis, Gestión $30.000 y Pro $60.000 | C.3.1, D.1.3 | Pendiente | | | |
| 4 | Centro de ayuda | https://ayuda.softwaredentalink.com/es/collections/19196578-modulo-exclusivo-para-argentina | Existe un módulo exclusivo para Argentina con artículos de obras sociales y receta electrónica | Rank 4, D.1.4 | Pendiente | | | |
| 5 | Preguntas frecuentes | https://www.appzyra.ar/ (sección "Preguntas frecuentes") | WhatsApp se vincula escaneando un QR; ARCA con certificado digital y CAE | C.3.6 | Pendiente | | | |
| 6 | Página de precios | https://turnito.app/ar/planes/ | Plan gratuito con 100 reservas/mes y 5% de comisión; Plus $12.000, Advance $24.500, Pro $42.000 | D.2.1, C.4.5 | Pendiente | | | |
| 7 | Página de producto | https://www.curvedental.com/dental-scheduling-software | Vistas por operatorio, Smart Fill y lista de aviso corto | C.2, D.2.3 | Pendiente | | | |

---

## Referencias

Todas consultadas el 16 de noviembre de 2026.

**Argentina**

- Dentia — https://dentia.tech/ ; https://dentia.tech/politica-de-privacidad
- DentalCore — https://dentalcore.app/ ; https://dentalcore.app/pricing ; https://dentalcore.app/privacidad
- DentalSoft — https://dentalsoft.com.ar/ ; https://www.dentalsoft.com.ar/privacidad ; https://www.dentalsoft.com.ar/terminos ; https://www.dentalsoft.com.ar/funcionalidades
- Bilog — https://bilog.com.ar/ ; https://bilog.com.ar/llms.txt ; https://docs.bilog.com.ar/ ; https://bilog.com.ar/reminders-whatsapp/
- ZYRA — https://www.appzyra.ar/
- OdontoClinIA — https://www.clinia.com.ar/odontologia ; https://www.clinia.com.ar/seguridad ; https://www.clinia.com.ar/faq ; https://www.clinia.com.ar/privacidad
- DentalTec — https://web.dentaltec.com.ar/software-odontologos-argentina ; https://web.dentaltec.com.ar/funcionalidades ; https://web.dentaltec.com.ar/preguntas-frecuentes ; https://web.dentaltec.com.ar/casos-de-exito

**Latinoamérica**

- Dentalink — https://www.softwaredentalink.com/ ; https://web-es.softwaredentalink.com/en/planes ; https://ayuda.softwaredentalink.com/es/collections/19196578-modulo-exclusivo-para-argentina ; https://ayuda.softwaredentalink.com/es/articles/14744244-receta-electronica-argentina ; https://ayuda.softwaredentalink.com/es/articles/14304524-como-crear-una-obra-social
- AgendaPro — https://agendapro.com/ar/dental/software-odontologico ; https://agendapro.com/ar/planes
- Turnito — https://www.turnito.app/ ; https://turnito.app/funcionalidades/ ; https://turnito.app/ar/planes/ ; https://turnito.app/ar/app-turnos-medicos/
- Dentidesk — https://www.dentidesk.com/ ; https://www.dentidesk.com/dentidesk/feature ; https://www.dentidesk.com/dentidesk/solution
- Medilink — https://www.softwaremedilink.com/ ; https://www.softwaremedilink.com/planes

**Internacionales**

- Clinic Cloud — https://clinic-cloud.com/ ; https://clinic-cloud.com/tarifas ; https://clinic-cloud.com/agenda ; https://clinic-cloud.com/facturacion-electronica ; https://clinic-cloud.com/historias-clinicas-electronicas-digitales-software-gestion/
- Medesk — https://www.medesk.net/es/solutiones/odontologia
- Curve Dental — https://www.curvedental.com/ ; https://www.curvedental.com/pricing ; https://www.curvedental.com/dental-scheduling-software ; https://www.curvedental.com/dental-patient-engagement-software ; https://www.curvedental.com/dental-charting-software
- Open Dental — https://www.opendental.com/ ; https://www.opendental.com/site/order.html ; https://www.opendental.com/site/websched.html ; https://www.opendental.com/site/ereminders.html

**No relevados**

- Doctoralia Argentina — https://www.doctoralia.com.ar/ (conexión rechazada) ; https://pro.doctoralia.com.ar/ (el dominio no existe)
- Open Dental, manual — https://www.opendental.com/manual/ (HTTP 403)

**Contexto (no usado como fuente de funcionalidades)**

- Universidad de San Andrés, tesis de MBA que menciona el uso de agendas en papel en odontología argentina — https://repositorio.udesa.edu.ar/jspui/bitstream/10908/23801/1/%5bP%5d%20%5bW%5d%20MBA%20Nervi%2c%20Santiago%20Luis.pdf (no leída en detalle; solo el extracto del buscador)
