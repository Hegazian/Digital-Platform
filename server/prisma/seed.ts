import { PrismaClient, Role, SubscriptionPeriod } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding EduPlatform database...');

  // 1. Seed Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@eduplatform.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'System Super Admin',
        role: Role.ADMIN,
        isActive: true,
      },
    });
    console.log(`✅ Default Admin created: ${admin.email} (Password: ${adminPassword})`);
  } else {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: Role.ADMIN },
    });
    console.log(`✅ User ${adminEmail} updated to ADMIN.`);
  }

  // 2. Seed Subjects and Pricing Plans
  const defaultSubjects = [
    {
      id: 'subject-prog-sec1',
      nameEn: 'Programming Secondary 1',
      nameAr: 'البرمجة للصف الأول الثانوي',
      description: 'Introductory Python & Web Development for 1st Secondary students.',
      pricing: [
        { period: SubscriptionPeriod.MONTHLY, priceEgp: 200, priceUsd: 10 },
        { period: SubscriptionPeriod.SIX_MONTHS, priceEgp: 1000, priceUsd: 50 },
        { period: SubscriptionPeriod.YEARLY, priceEgp: 1800, priceUsd: 90 },
      ],
    },
    {
      id: 'subject-math-sec1',
      nameEn: 'Mathematics Secondary 1',
      nameAr: 'الرياضيات للصف الأول الثانوي',
      description: 'Algebra, Geometry, and Trigonometry for 1st Secondary students.',
      pricing: [
        { period: SubscriptionPeriod.MONTHLY, priceEgp: 250, priceUsd: 12 },
        { period: SubscriptionPeriod.SIX_MONTHS, priceEgp: 1200, priceUsd: 60 },
        { period: SubscriptionPeriod.YEARLY, priceEgp: 2200, priceUsd: 110 },
      ],
    },
    {
      id: 'subject-physics-sec1',
      nameEn: 'Physics Secondary 1',
      nameAr: 'الفيزياء للصف الأول الثانوي',
      description: 'Physics mechanics, forces, and motion for 1st Secondary students.',
      pricing: [
        { period: SubscriptionPeriod.MONTHLY, priceEgp: 250, priceUsd: 12 },
        { period: SubscriptionPeriod.SIX_MONTHS, priceEgp: 1200, priceUsd: 60 },
        { period: SubscriptionPeriod.YEARLY, priceEgp: 2200, priceUsd: 110 },
      ],
    },
  ];

  for (const s of defaultSubjects) {
    const subject = await prisma.subject.upsert({
      where: { id: s.id },
      update: {
        nameEn: s.nameEn,
        nameAr: s.nameAr,
        description: s.description,
      },
      create: {
        id: s.id,
        nameEn: s.nameEn,
        nameAr: s.nameAr,
        description: s.description,
      },
    });

    for (const p of s.pricing) {
      await prisma.subjectPricing.upsert({
        where: {
          subjectId_period: {
            subjectId: subject.id,
            period: p.period,
          },
        },
        update: {
          priceEgp: p.priceEgp,
          priceUsd: p.priceUsd,
          isActive: true,
        },
        create: {
          subjectId: subject.id,
          period: p.period,
          priceEgp: p.priceEgp,
          priceUsd: p.priceUsd,
          isActive: true,
        },
      });
    }

    console.log(`✅ Seeded subject: ${s.nameEn}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
