const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        console.log("Attempting to disable read-only mode...");
        await prisma.$executeRaw`ALTER DATABASE postgres SET default_transaction_read_only = off`;
        console.log("Successfully altered database setting.");
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
