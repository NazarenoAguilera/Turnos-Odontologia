// Nombre visible del producto. Cambiarlo acá actualiza todas las vistas previas
// HTML que marquen un elemento con [data-brand-name]. (TBD: nombre comercial)
export const BRAND_NAME = "Turnos Odontología";

export function bindBrandName(root = document) {
  for (const el of root.querySelectorAll("[data-brand-name]")) {
    el.textContent = BRAND_NAME;
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bindBrandName());
  } else {
    bindBrandName();
  }
}
