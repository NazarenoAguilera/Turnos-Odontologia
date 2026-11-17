import { ErrorDeNegocio } from './errores.js';
import { Intervalo } from './intervalo.js';
import { aIsoLocal, MS_POR_MINUTO } from './tiempo.js';
import type { EstadoTurno } from './turno.js';

/** Turno ya existente que podría ocupar al profesional o al sillón pedidos. */
export interface TurnoOcupante {
  id: number;
  profesionalId: number;
  sillonId: number;
  inicioMin: number;
  finMin: number;
  estado: EstadoTurno;
}

export interface PedidoDeTurno {
  profesionalId: number;
  sillonId: number;
  intervalo: Intervalo;
}

export type RecursoEnConflicto = 'profesional' | 'sillon';

export interface Conflicto {
  recurso: RecursoEnConflicto;
  turnoId: number;
  inicio: string;
  fin: string;
}

/**
 * Lanza un ErrorDeNegocio 409 si el pedido se superpone con algún turno no cancelado
 * del mismo profesional (RN-TU-03) o del mismo sillón (RN-TU-04). La superposición se
 * decide SIEMPRE con Intervalo (RN-TU-02). Si chocan ambos recursos, el código es
 * TURNO_SOLAPADO_PROFESIONAL y el detalle lista todos los conflictos (design D6).
 */
export function verificarSinConflictos(pedido: PedidoDeTurno, candidatos: TurnoOcupante[]): void {
  const conflictos: Conflicto[] = [];

  for (const t of candidatos) {
    if (t.estado === 'cancelado') continue;
    if (!pedido.intervalo.seSuperponeCon(new Intervalo(t.inicioMin, t.finMin))) continue;

    const describir = (recurso: RecursoEnConflicto): Conflicto => ({
      recurso,
      turnoId: t.id,
      inicio: aIsoLocal(t.inicioMin * MS_POR_MINUTO),
      fin: aIsoLocal(t.finMin * MS_POR_MINUTO),
    });
    if (t.profesionalId === pedido.profesionalId) conflictos.push(describir('profesional'));
    if (t.sillonId === pedido.sillonId) conflictos.push(describir('sillon'));
  }

  if (conflictos.length === 0) return;

  const chocaProfesional = conflictos.some((c) => c.recurso === 'profesional');
  throw new ErrorDeNegocio(
    chocaProfesional ? 'TURNO_SOLAPADO_PROFESIONAL' : 'TURNO_SOLAPADO_SILLON',
    chocaProfesional
      ? 'El profesional ya tiene un turno que se superpone con el horario pedido.'
      : 'El sillón ya tiene un turno que se superpone con el horario pedido.',
    { conflictos },
  );
}
