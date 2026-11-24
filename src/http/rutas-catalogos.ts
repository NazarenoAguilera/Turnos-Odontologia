import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseSync } from 'node:sqlite';
import {
  listarPacientes,
  listarPrestacionesActivas,
  listarProfesionalesActivos,
  listarSillonesActivos,
} from '../infrastructure/sqlite/repositorios.js';

export interface OpcionesRutasCatalogos {
  db: DatabaseSync;
}

const id = { type: 'integer' } as const;
const texto = { type: 'string' } as const;

/**
 * Esquema de respuesta: arreglo de objetos con EXACTAMENTE estas propiedades.
 * Fastify serializa con él y descarta cualquier otra columna (design D3): es la
 * segunda barrera para no exponer datos de contacto de pacientes.
 */
function respuestaLista(properties: Record<string, object>) {
  return {
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: Object.keys(properties),
          properties,
        },
      },
    },
  } as const;
}

/** GET de catálogos de solo lectura (spec `catalogos`). Plugin propio para no chocar con C-07 (design D1). */
export const rutasCatalogos: FastifyPluginAsync<OpcionesRutasCatalogos> = async (app, { db }) => {
  app.get('/profesionales', { schema: respuestaLista({ id, nombre: texto }) }, async () =>
    listarProfesionalesActivos(db));

  app.get('/sillones', { schema: respuestaLista({ id, nombre: texto }) }, async () =>
    listarSillonesActivos(db));

  app.get('/prestaciones', { schema: respuestaLista({ id, nombre: texto, duracionMin: { type: 'integer' } }) }, async () =>
    listarPrestacionesActivas(db));

  app.get('/pacientes', { schema: respuestaLista({ id, nombre: texto, apellido: texto }) }, async () =>
    listarPacientes(db));
};
