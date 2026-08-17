const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.oglesoewiiosrwaizrvm:Abdo%4056751790@db.oglesoewiiosrwaizrvm.supabase.co:5432/postgres",
    },
  },
});
async function main() {
    try {
        const result = await prisma.$queryRaw`SHOW default_transaction_read_only`;
        console.log("default_transaction_read_only (direct):", result);
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
