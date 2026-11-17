import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import type { DatabaseSync } from 'node:sqlite';
import { crearTurno, relojDelSistema, type DatosCrearTurno, type Reloj } from '../application/crear-turno.js';
import { ErrorDeNegocio, type CodigoError } from '../domain/errores.js';

export interface OpcionesApp {
  db: DatabaseSync;
  reloj?: Reloj;
  logger?: boolean;
}

/** Código de negocio → estado HTTP (design D6). */
const ESTADO_HTTP: Record<CodigoError, number> = {
  SOLICITUD_INVALIDA: 400,
  RECURSO_INEXISTENTE: 404,
  TURNO_SOLAPADO_PROFESIONAL: 409,
  TURNO_SOLAPADO_SILLON: 409,
  INICIO_FUERA_DE_GRILLA: 422,
  DURACION_INVALIDA: 422,
  RECURSO_INACTIVO: 422,
};

const idPositivo = { type: 'integer', minimum: 1 } as const;

const esquemaCrearTurno = {
  body: {
    type: 'object',
    required: ['pacienteId', 'profesionalId', 'sillonId', 'prestacionId', 'inicio'],
    additionalProperties: false,
    properties: {
      pacienteId: idPositivo,
      profesionalId: idPositivo,
      sillonId: idPositivo,
      prestacionId: idPositivo,
      inicio: { type: 'string', minLength: 1 },
      duracionMin: { type: 'integer' },
    },
  },
} as const;

/** Construye la app Fastify con sus rutas y el manejo de errores único. */
export function construirApp({ db, reloj = relojDelSistema, logger = false }: OpcionesApp): FastifyInstance {
  const app = Fastify({ logger });

  app.setErrorHandler((error: FastifyError | ErrorDeNegocio, request, reply) => {
    if (error instanceof ErrorDeNegocio) {
      return reply.code(ESTADO_HTTP[error.codigo]).send({
        error: { codigo: error.codigo, mensaje: error.message, detalle: error.detalle },
      });
    }
    const statusCode = error.statusCode ?? 500;
    if (error.validation || (statusCode >= 400 && statusCode < 500)) {
      return reply.code(400).send({
        error: {
          codigo: 'SOLICITUD_INVALIDA',
          mensaje: 'La solicitud no tiene el formato esperado.',
          detalle: { motivo: error.message },
        },
      });
    }
    request.log.error({ err: error }, 'Error inesperado');
    return reply.code(500).send({
      error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado.', detalle: {} },
    });
  });

  app.get('/health', async () => ({ estado: 'ok' }));

  app.post<{ Body: DatosCrearTurno }>('/turnos', { schema: esquemaCrearTurno }, async (request, reply) => {
    const turno = crearTurno(db, request.body, reloj);
    return reply.code(201).send(turno);
  });

  return app;
}
