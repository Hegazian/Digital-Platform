import { describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../prisma';

describe('M0 upgrade on a pre-authVersion user table', () => {
  it('preserves existing accounts, retires old sessions and can be reapplied', async () => {
    const schema = `m0_upgrade_${randomUUID().replace(/-/g, '')}`;
    const sql = fs.readFileSync(path.resolve('prisma/upgrades/m0-auth-version.sql'), 'utf8');
    const statements = sql.split(';').map((statement) => statement.trim()).filter(Boolean);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe('CREATE TABLE "users" (id TEXT PRIMARY KEY, email TEXT NOT NULL, role TEXT NOT NULL)');
      await tx.$executeRawUnsafe("INSERT INTO users VALUES ('historic-user', 'historic@test.invalid', 'STUDENT')");
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
      const rows = await tx.$queryRawUnsafe<Array<{ id: string; email: string; role: string; authVersion: number }>>('SELECT * FROM users');
      expect(rows).toEqual([{ id: 'historic-user', email: 'historic@test.invalid', role: 'STUDENT', authVersion: 1 }]);
      await tx.$executeRawUnsafe("INSERT INTO users (id, email, role) VALUES ('new-user', 'new@test.invalid', 'TEACHER')");
      const fresh = await tx.$queryRawUnsafe<Array<{ authVersion: number }>>("SELECT \"authVersion\" FROM users WHERE id = 'new-user'");
      expect(fresh[0].authVersion).toBe(1);
      await tx.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    });
  });
});
