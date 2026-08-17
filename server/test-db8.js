const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const result = await prisma.$queryRaw`
            SELECT name, setting, source FROM pg_settings WHERE name = 'default_transaction_read_only';
        `;
        console.log("Setting:", result);
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
