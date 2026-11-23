# Design system — turnos-odontologia

Mode: system-and-mockups
Revision: 1
Approval: approved (2026-11-23, by user)
Decision source: el usuario (líder del grupo) eligió `system-and-mockups` el 2026-11-23, al sumar una interfaz web mínima en v1 (DD-08). Reemplaza el modo `deferred` registrado en la fundación del 2026-11-17.

## Qué es

La base visual común de la interfaz web (`web/`): colores, tipografía, espaciado, componentes y estados. Las pantallas y los mockups de cada change la importan; no copian valores sueltos.

- Identidad pedida por el grupo (plan de trabajo del 2026-11-22): consultorio odontológico, verde/menta, tipografía clara.
- Público: recepción y odontólogos de consultorios de 2 a 5 profesionales (ver `knowledge-base/03_actores_y_roles.md`). Uso principal en escritorio; tiene que funcionar en un celular.
- Tema claro únicamente en v1.

## Archivos

| Archivo | Para qué |
|---|---|
| `tokens.css` | Única fuente de colores, tipografía, espaciado, radios, sombras, foco y movimiento (incluye `prefers-reduced-motion`) |
| `brand.md` | Nombre, tono, logo y reglas de uso |
| `brand.js` | Constante `BRAND_NAME` y enlace de `[data-brand-name]` para las vistas previas HTML |
| `assets/logo.svg` | Logo **provisorio** (dice "PROVISORIO") |
| `components.html` | Referencia viva: menú lateral, botones, formulario Nuevo turno, avisos 409/422, agenda con estados, vacío y carga |
| `previews/` | Capturas renderizadas a 1440×900 y 390×844 (y página completa) |

## Cómo se usa en `web/`

1. `web/src/main.tsx` importa `../../design-system/tokens.css` (o una copia sincronizada; ver `knowledge-base/08_arquitectura_propuesta.md`).
2. Los componentes usan solo las variables (`var(--color-primary-600)`, `var(--space-4)`, …). Si hace falta un valor nuevo, se agrega acá y se sube la revisión.
3. Los textos de la interfaz van en español rioplatense y con datos ficticios (RN-PA-01).

## Mockups por change (modo `system-and-mockups`)

Antes del Apply de cada change visual (C-11, C-07 con su pantalla Agenda, C-05 con el botón Cancelar, y C-06/C-03 si se hacen):

1. El integrante crea `openspec/changes/<change>/mockups/` con HTML local que importa `../../../../design-system/tokens.css`, una vista por pantalla y estado.
2. Renderiza a 390×844 y 1440×900 y guarda las capturas en `mockups/previews/`.
3. Registra `## UI Mockups` en el `design.md` del change con `Design system revision: 1` y `Approval: pending`.
4. El líder revisa y aprueba (`Approval: approved (<fecha>, by <nombre>)`). Recién ahí arranca el Apply.

## Pendientes `(TBD)`

| Pendiente | Dónde se reemplaza |
|---|---|
| Nombre comercial definitivo (hoy "Turnos Odontología") | `BRAND_NAME` en `brand.js` y `brand.md` |
| Logo definitivo | Reemplazar `assets/logo.svg` manteniendo el nombre del archivo |
| Modo oscuro | Agregar un bloque de variables en `tokens.css` y subir la revisión |

Cambiar un token o un asset compartido sube `Revision:`, vuelve `Approval:` a `pending` y obliga a revisar los mockups afectados.
