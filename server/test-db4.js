const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const result = await prisma.$queryRaw`
            SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size
        `;
        console.log("Database size:", result);
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
