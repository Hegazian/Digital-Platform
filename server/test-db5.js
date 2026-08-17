const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const result = await prisma.$queryRaw`
            SELECT current_user, session_user;
        `;
        console.log("Current user:", result);
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
