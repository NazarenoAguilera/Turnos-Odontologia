import type { DatabaseSync } from 'node:sqlite';
import { ErrorDeNegocio } from '../domain/errores.js';
import { aIsoLocal, MS_POR_MINUTO } from '../domain/tiempo.js';
import { exigirTransicion, type EstadoTurno } from '../domain/turno.js';
import { enTransaccionInmediata } from '../infrastructure/sqlite/conexion.js';
import { actualizarEstadoTurno, insertarEventoAuditoria, obtenerTurno } from '../infrastructure/sqlite/repositorios.js';
import { relojDelSistema, type Reloj, type TurnoCreado } from './crear-turno.js';

/**
 * Caso de uso: cancelar, confirmar o marcar ausente/atendido un turno (US-011, US-013).
 * Lee, valida la transición (RN-TU-09), actualiza y audita dentro de BEGIN IMMEDIATE:
 * dos pedidos sobre el mismo turno no pueden partir del mismo estado (RN-TU-13), y un
 * rechazo no deja cambios ni auditoría (RN-GL-01). Devuelve el turno en la misma forma
 * que POST /turnos (design D2).
 */
export function cambiarEstadoTurno(
  db: DatabaseSync,
  turnoId: number,
  hacia: EstadoTurno,
  reloj: Reloj = relojDelSistema,
): TurnoCreado {
  return enTransaccionInmediata(db, () => {
    const turno = obtenerTurno(db, turnoId);
    if (!turno) {
      throw new ErrorDeNegocio('RECURSO_INEXISTENTE', `No existe turno con id ${turnoId}.`, { recurso: 'turno', id: turnoId });
    }
    exigirTransicion(turno.estado, hacia);

    const ahora = reloj.ahora().toISOString();
    actualizarEstadoTurno(db, turnoId, hacia, ahora);
    insertarEventoAuditoria(db, {
      turnoId,
      accion: hacia === 'cancelado' ? 'cancelado' : 'estado_cambiado',
      ocurridoEn: ahora,
      antes: { estado: turno.estado },
      despues: { estado: hacia },
    });

    return {
      id: turno.id,
      pacienteId: turno.pacienteId,
      profesionalId: turno.profesionalId,
      sillonId: turno.sillonId,
      prestacionId: turno.prestacionId,
      inicio: aIsoLocal(turno.inicioMin * MS_POR_MINUTO),
      fin: aIsoLocal(turno.finMin * MS_POR_MINUTO),
      duracionMin: turno.duracionMin,
      estado: hacia,
    };
  });
}
