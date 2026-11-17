import { DatabaseSync } from 'node:sqlite';
import { aplicarEsquema } from './esquema.js';

export interface OpcionesBase {
  /** Milisegundos que una conexión espera un lock antes de fallar (design D4). */
  busyTimeoutMs?: number;
}

/**
 * Abre una conexión SQLite (archivo o ":memory:"), activa las claves foráneas,
 * configura busy_timeout y crea el esquema si no existe.
 */
export function abrirBase(ruta: string = ':memory:', opciones: OpcionesBase = {}): DatabaseSync {
  const db = new DatabaseSync(ruta);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`PRAGMA busy_timeout = ${Math.trunc(opciones.busyTimeoutMs ?? 5000)};`);
  aplicarEsquema(db);
  return db;
}

/**
 * Ejecuta `trabajo` dentro de una transacción BEGIN IMMEDIATE: toma el lock de escritura
 * antes de leer, así el chequeo de solapamientos no puede quedar obsoleto (RN-TU-13).
 * Hace COMMIT si todo sale bien y ROLLBACK ante cualquier error.
 */
export function enTransaccionInmediata<T>(db: DatabaseSync, trabajo: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const resultado = trabajo();
    db.exec('COMMIT');
    return resultado;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
