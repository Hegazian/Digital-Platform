// Controlled one-time transition for existing MFA rows. Defaults to a read-only
// count; pass --apply only after backup and key recovery have been rehearsed.
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const PREFIX = 'mfa:v1:';
const rawKey = process.env.MFA_ENCRYPTION_KEY;
if (!rawKey) throw new Error('MFA_ENCRYPTION_KEY is required.');
const key = /^[a-f\d]{64}$/i.test(rawKey) ? Buffer.from(rawKey, 'hex') : Buffer.from(rawKey, 'base64');
if (key.length !== 32) throw new Error('MFA_ENCRYPTION_KEY must decode to 32 bytes.');

function encrypt(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${PREFIX}${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${body.toString('base64url')}`;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { mfaSecret: { not: null } },
      select: { id: true, mfaEnabled: true, mfaSecret: true },
    });
    const activePlaintext = users.filter((user) => user.mfaEnabled && !user.mfaSecret.startsWith(PREFIX));
    const inactiveSecrets = users.filter((user) => !user.mfaEnabled);
    console.log(`Found ${activePlaintext.length} active plaintext MFA secrets and ${inactiveSecrets.length} unconfirmed inactive secrets.`);
    if (!process.argv.includes('--apply')) {
      console.log('Read-only mode. Back up the database and rerun with --apply to encrypt active secrets and clear abandoned setup values.');
      return;
    }
    for (const user of activePlaintext) {
      await prisma.user.updateMany({
        where: { id: user.id, mfaEnabled: true, mfaSecret: user.mfaSecret },
        data: { mfaSecret: encrypt(user.mfaSecret) },
      });
    }
    for (const user of inactiveSecrets) {
      await prisma.user.updateMany({
        where: { id: user.id, mfaEnabled: false, mfaSecret: user.mfaSecret },
        data: { mfaSecret: null },
      });
    }
    const remaining = await prisma.user.count({
      where: { mfaEnabled: true, mfaSecret: { not: { startsWith: PREFIX } } },
    });
    if (remaining) throw new Error(`Post-check found ${remaining} active MFA rows not encrypted.`);
    console.log('MFA secret transition completed and verified. No secret values were printed.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
