require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  delete process.env.INITIAL_ADMIN_PASSWORD;
  const name = process.argv[3] || 'Admin';
  if (!email || !password || password.length < 12) {
    console.error('Set INITIAL_ADMIN_PASSWORD (12+ characters), then run: npm run create:admin -- <email> [name]');
    process.exitCode = 1;
    return;
  }
  if (process.env.ALLOW_INITIAL_ADMIN_PROVISIONING !== 'true') {
    console.error('Initial admin provisioning is disabled. Set ALLOW_INITIAL_ADMIN_PROVISIONING=true for this one-time operation, then unset it.');
    process.exitCode = 1;
    return;
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new Error('An account with this email already exists; this command never modifies existing accounts.');
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { email, password: hashedPassword, name, role: 'ADMIN', isActive: true } });
    console.log('Admin account created successfully.');
  } catch (error) {
    console.error('Admin provisioning failed:', error.message);
    process.exitCode = 1;
  } finally { await prisma.$disconnect(); }
}
createAdmin();
