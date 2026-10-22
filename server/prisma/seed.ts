import { PrismaClient, ProductType } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Canonical Database Seeding...');

  // User accounts are never seeded. Provision the initial administrator with `npm run create:admin`.

  // 1. Secondary Stage
  const secondaryStage = await prisma.educationalStage.upsert({
    where: { code: 'STAGE_SECONDARY' },
    update: {
      nameEn: 'Secondary Stage (Thanaweya Amma)',
      nameAr: 'المرحلة الثانوية العامة',
      sortOrder: 1,
    },
    create: {
      code: 'STAGE_SECONDARY',
      nameEn: 'Secondary Stage (Thanaweya Amma)',
      nameAr: 'المرحلة الثانوية العامة',
      sortOrder: 1,
    },
  });
  console.log(`✅ Educational Stage Seeded: ${secondaryStage.nameEn}`);

  // 2. Grades in Secondary Stage
  const grades = [
    { code: 'SEC_1', nameEn: '1st Secondary', nameAr: 'الصف الأول الثانوي', sortOrder: 1 },
    { code: 'SEC_2', nameEn: '2nd Secondary', nameAr: 'الصف الثاني الثانوي', sortOrder: 2 },
    { code: 'SEC_3', nameEn: '3rd Secondary (Final Year)', nameAr: 'الصف الثالث الثانوي', sortOrder: 3 },
  ];

  for (const g of grades) {
    let existingGrade = await prisma.grade.findFirst({
      where: { code: g.code, stageId: secondaryStage.id },
    });

    if (!existingGrade) {
      existingGrade = await prisma.grade.create({
        data: {
          code: g.code,
          nameEn: g.nameEn,
          nameAr: g.nameAr,
          sortOrder: g.sortOrder,
          stageId: secondaryStage.id,
        },
      });
    }
    console.log(`✅ Grade Seeded: ${existingGrade.nameEn}`);
  }

  // 3. Academic Year
  let academicYear = await prisma.academicYear.findFirst({
    where: { name: '2026/2027' },
  });

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        name: '2026/2027',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-06-30'),
        isActive: true,
      },
    });
  }
  console.log(`✅ Academic Year Seeded: ${academicYear.name}`);

  // 4. Core Secondary Subjects & Products
  const subjectsData = [
    {
      nameEn: 'Physics (Electricity, Magnetism & Modern Physics)',
      nameAr: 'الفيزياء (الكهربية، المغناطيسية والحديثة)',
      description: 'Comprehensive physics curriculum with video experiments and problem solving.',
    },
    {
      nameEn: 'Pure & Applied Mathematics (Calculus & Mechanics)',
      nameAr: 'الرياضيات البحتة والتطبيقية (التفاضل والديناميكا)',
      description: 'Master secondary calculus, dynamics, and statics with interactive exercises.',
    },
    {
      nameEn: 'Computer Science & Python Programming',
      nameAr: 'علوم الحاسب والبرمجة بلغة بايثون',
      description: 'Interactive coding playgrounds, algorithms, and web technologies.',
    },
    {
      nameEn: 'Organic & Inorganic Chemistry',
      nameAr: 'الكيمياء العضوية وغير العضوية',
      description: 'Complete secondary chemistry guide with visual reactions and atomic theory.',
    },
  ];

  for (const s of subjectsData) {
    let subject = await prisma.subject.findFirst({
      where: { nameEn: s.nameEn },
    });

    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          nameEn: s.nameEn,
          nameAr: s.nameAr,
          description: s.description,
        },
      });
    }

    // Default Commerce Product for Subject
    const productId = `prod-${subject.id.slice(0, 8)}`;
    await prisma.product.upsert({
      where: { id: productId },
      update: {
        nameEn: `${s.nameEn} - Full Term Access`,
        nameAr: `${s.nameAr} - اشتراك الترم الكامل`,
        priceEgp: 350.0,
        priceUsd: 12.0,
        resourceId: subject.id,
      },
      create: {
        id: productId,
        nameEn: `${s.nameEn} - Full Term Access`,
        nameAr: `${s.nameAr} - اشتراك الترم الكامل`,
        productType: ProductType.SUBJECT,
        resourceId: subject.id,
        priceEgp: 350.0,
        priceUsd: 12.0,
        isActive: true,
      },
    });

    console.log(`✅ Subject & Product Seeded: ${s.nameEn}`);
  }

  console.log('🎉 Canonical Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
