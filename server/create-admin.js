require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Admin';

  if (!email || !password) {
    console.error('Usage: node create-admin.js <email> <password> [name]');
    process.exit(1);
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
        isActive: true,
      },
      update: {
        password: hashedPassword,
        name,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log('✅ Admin account created/updated successfully!');
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
