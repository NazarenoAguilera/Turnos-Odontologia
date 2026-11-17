/** Códigos de error de negocio estables (ver design.md D6). */
export type CodigoError =
  | 'SOLICITUD_INVALIDA'
  | 'RECURSO_INEXISTENTE'
  | 'RECURSO_INACTIVO'
  | 'INICIO_FUERA_DE_GRILLA'
  | 'DURACION_INVALIDA'
  | 'TURNO_SOLAPADO_PROFESIONAL'
  | 'TURNO_SOLAPADO_SILLON';

/** Error de una regla de negocio, con un código estable y un mensaje en español. */
export class ErrorDeNegocio extends Error {
  readonly codigo: CodigoError;
  readonly detalle: Record<string, unknown>;

  constructor(codigo: CodigoError, mensaje: string, detalle: Record<string, unknown> = {}) {
    super(mensaje);
    this.name = 'ErrorDeNegocio';
    this.codigo = codigo;
    this.detalle = detalle;
  }
}
