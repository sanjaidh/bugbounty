const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const challenges = await prisma.challenge.findMany({
    orderBy: { stageNumber: 'asc' },
    select: { stageNumber: true, title: true, answerHash: true, finalBaseCode: true }
  });
  console.log(JSON.stringify(challenges, null, 2));
  await prisma.$disconnect();
}

main();