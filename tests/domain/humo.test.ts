import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';

describe('entorno de tests', () => {
  it('ejecuta Vitest y tiene SQLite integrado de Node disponible', () => {
    const db = new DatabaseSync(':memory:');
    const fila = db.prepare('SELECT 1 + 1 AS resultado').get() as { resultado: number };
    expect(fila.resultado).toBe(2);
    db.close();
  });
});
