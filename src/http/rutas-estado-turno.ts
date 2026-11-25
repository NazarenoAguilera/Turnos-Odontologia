import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseSync } from 'node:sqlite';
import { cambiarEstadoTurno } from '../application/cambiar-estado-turno.js';
import type { Reloj } from '../application/crear-turno.js';
import type { EstadoTurno } from '../domain/turno.js';

export interface OpcionesRutasEstadoTurno {
  db: DatabaseSync;
  reloj: Reloj;
}

/** Una ruta por acción (decisión P1 del Explore); todas llaman al mismo caso de uso. */
const ACCIONES: ReadonlyArray<readonly [accion: string, hacia: EstadoTurno]> = [
  ['cancelar', 'cancelado'],
  ['confirmar', 'confirmado'],
  ['ausente', 'ausente'],
  ['atendido', 'atendido'],
];

const entero = { type: 'integer' } as const;
const texto = { type: 'string' } as const;

const esquema = {
  // `id` entero >= 1: "abc" o "0" responden 400 SOLICITUD_INVALIDA por el manejador de errores.
  params: {
    type: 'object',
    required: ['id'],
    additionalProperties: false,
    properties: { id: { type: 'integer', minimum: 1 } },
  },
  // Sin body schema: el cuerpo se ignora (design D4).
  response: {
    200: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'pacienteId', 'profesionalId', 'sillonId', 'prestacionId', 'inicio', 'fin', 'duracionMin', 'estado'],
      properties: {
        id: entero,
        pacienteId: entero,
        profesionalId: entero,
        sillonId: entero,
        prestacionId: entero,
        inicio: texto,
        fin: texto,
        duracionMin: entero,
        estado: texto,
      },
    },
  },
} as const;

/** POST /turnos/:id/{cancelar|confirmar|ausente|atendido} (spec agenda-turnos, change C-05). */
export const rutasEstadoTurno: FastifyPluginAsync<OpcionesRutasEstadoTurno> = async (app, { db, reloj }) => {
  for (const [accion, hacia] of ACCIONES) {
    app.post<{ Params: { id: number } }>(`/turnos/:id/${accion}`, { schema: esquema }, async (request) =>
      cambiarEstadoTurno(db, request.params.id, hacia, reloj));
  }
};
