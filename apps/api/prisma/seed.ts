import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.createMany({
    data: [
      {
        githubId: 1,
        username: 'octocat',
        displayName: 'The Octocat',
        email: 'octocat@example.com',
        role: 'user',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.repository.createMany({
    data: [
      {
        githubId: 1001,
        ownerLogin: 'octo-org',
        name: 'stackloop',
        fullName: 'octo-org/stackloop',
        repositoryUrl: 'https://github.com/octo-org/stackloop',
        language: 'TypeScript',
        isVerified: true,
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
