/**
 * Intervalo semiabierto [inicio, fin) expresado en minutos enteros.
 *
 * Es el ÚNICO lugar del sistema donde se decide si dos intervalos se superponen
 * (regla dura del proyecto; RN-TU-02, DD-02). Dos intervalos [a, b) y [c, d) se
 * superponen si y solo si a < d y c < b, por lo que un turno que empieza justo
 * cuando termina otro NO se superpone.
 */
export class Intervalo {
  readonly inicio: number;
  readonly fin: number;

  constructor(inicio: number, fin: number) {
    if (!Number.isInteger(inicio) || !Number.isInteger(fin)) {
      throw new RangeError('Los extremos de un intervalo deben ser minutos enteros.');
    }
    if (inicio >= fin) {
      throw new RangeError('El inicio de un intervalo debe ser anterior a su fin.');
    }
    this.inicio = inicio;
    this.fin = fin;
  }

  seSuperponeCon(otro: Intervalo): boolean {
    return this.inicio < otro.fin && otro.inicio < this.fin;
  }
}
