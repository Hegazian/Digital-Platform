const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // uses .env DATABASE_URL
async function main() {
    try {
        const user = await prisma.user.findFirst();
        console.log("Found user");
        await prisma.user.update({ where: { id: user.id }, data: { name: user.name + '1' } });
        console.log("Updated user");
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
