import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding StackLoop database...');

  // 1. Users
  const adminUser = await prisma.user.upsert({
    where: { githubId: BigInt(1) },
    update: {},
    create: {
      githubId: BigInt(1),
      username: 'octocat',
      displayName: 'The Octocat',
      email: 'octocat@github.com',
      avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
      bio: 'Building open-source tools for developers everywhere.',
      role: 'admin',
      isVerified: true,
      isActive: true,
    },
  });

  const developerUser = await prisma.user.upsert({
    where: { githubId: BigInt(2) },
    update: {},
    create: {
      githubId: BigInt(2),
      username: 'dev-alex',
      displayName: 'Alex Rivers',
      email: 'alex@example.com',
      avatarUrl: 'https://avatars.githubusercontent.com/u/9919?v=4',
      bio: 'Fullstack engineer & AI explorer.',
      role: 'user',
      isVerified: true,
      isActive: true,
    },
  });

  // 2. Categories
  const categories = [
    { slug: 'ai-ml', name: 'AI & Machine Learning', description: 'Large Language Models, neural networks, and inference engines' },
    { slug: 'web-dev', name: 'Web Development', description: 'Modern frontend, backend frameworks, and fullstack toolkits' },
    { slug: 'devops-cloud', name: 'DevOps & Cloud', description: 'Containers, CI/CD, orchestration, and infrastructure as code' },
    { slug: 'developer-tools', name: 'Developer Tools', description: 'CLIs, linters, runtimes, and productivity utilities' },
    { slug: 'databases', name: 'Databases & Storage', description: 'Relational databases, key-value stores, and vector search' },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryMap.set(cat.slug, record.id);
  }

  // 3. Technologies
  const technologies = [
    { slug: 'typescript', name: 'TypeScript', category: 'language' },
    { slug: 'python', name: 'Python', category: 'language' },
    { slug: 'rust', name: 'Rust', category: 'language' },
    { slug: 'go', name: 'Go', category: 'language' },
    { slug: 'nextjs', name: 'Next.js', category: 'framework' },
    { slug: 'react', name: 'React', category: 'framework' },
    { slug: 'fastapi', name: 'FastAPI', category: 'framework' },
    { slug: 'postgresql', name: 'PostgreSQL', category: 'database' },
    { slug: 'docker', name: 'Docker', category: 'devops' },
    { slug: 'gemini', name: 'Google Gemini', category: 'ai' },
  ];

  const techMap = new Map<string, string>();
  for (const tech of technologies) {
    const record = await prisma.technology.upsert({
      where: { slug: tech.slug },
      update: {},
      create: tech,
    });
    techMap.set(tech.slug, record.id);
  }

  // 4. Repositories
  const sampleRepos = [
    {
      githubId: BigInt(1001),
      ownerLogin: 'aryanjsx',
      name: 'Stackloop',
      fullName: 'aryanjsx/Stackloop',
      description: 'AI-powered GitHub repository discovery platform with Gemini 3.8 and Google Cloud.',
      repositoryUrl: 'https://github.com/aryanjsx/Stackloop',
      homepageUrl: 'https://stackloop.dev',
      defaultBranch: 'main',
      language: 'TypeScript',
      stargazersCount: 342,
      forksCount: 48,
      openIssuesCount: 6,
      watchersCount: 42,
      isVerified: true,
      lastPushAt: new Date(),
      techSlugs: ['typescript', 'nextjs', 'postgresql', 'gemini'],
      catSlugs: ['ai-ml', 'web-dev', 'developer-tools'],
      aiSummary: 'StackLoop is an AI-powered repository discovery engine that crawls open-source GitHub projects, synthesizes architectures using Gemini, and recommends relevant software.',
    },
    {
      githubId: BigInt(1002),
      ownerLogin: 'facebook',
      name: 'react',
      fullName: 'facebook/react',
      description: 'The library for web and native user interfaces.',
      repositoryUrl: 'https://github.com/facebook/react',
      homepageUrl: 'https://react.dev',
      defaultBranch: 'main',
      language: 'JavaScript',
      stargazersCount: 228000,
      forksCount: 46000,
      openIssuesCount: 950,
      watchersCount: 6700,
      isVerified: true,
      lastPushAt: new Date(),
      techSlugs: ['react', 'typescript'],
      catSlugs: ['web-dev'],
      aiSummary: 'React is an open-source component-based front-end JavaScript library for building declarative user interfaces.',
    },
    {
      githubId: BigInt(1003),
      ownerLogin: 'vercel',
      name: 'next.js',
      fullName: 'vercel/next.js',
      description: 'The React Framework for the Web.',
      repositoryUrl: 'https://github.com/vercel/next.js',
      homepageUrl: 'https://nextjs.org',
      defaultBranch: 'canary',
      language: 'TypeScript',
      stargazersCount: 125000,
      forksCount: 26000,
      openIssuesCount: 2400,
      watchersCount: 3100,
      isVerified: true,
      lastPushAt: new Date(),
      techSlugs: ['nextjs', 'react', 'typescript'],
      catSlugs: ['web-dev'],
      aiSummary: 'Next.js provides hybrid static and server rendering, TypeScript support, route pre-fetching, and smart bundling for production web apps.',
    },
    {
      githubId: BigInt(1004),
      ownerLogin: 'tiangolo',
      name: 'fastapi',
      fullName: 'tiangolo/fastapi',
      description: 'FastAPI framework, high performance, easy to learn, fast to code, ready for production.',
      repositoryUrl: 'https://github.com/tiangolo/fastapi',
      homepageUrl: 'https://fastapi.tiangolo.com',
      defaultBranch: 'master',
      language: 'Python',
      stargazersCount: 78000,
      forksCount: 6500,
      openIssuesCount: 420,
      watchersCount: 1500,
      isVerified: true,
      lastPushAt: new Date(),
      techSlugs: ['python', 'fastapi'],
      catSlugs: ['web-dev', 'developer-tools'],
      aiSummary: 'FastAPI is a modern, fast web framework for building APIs with Python 3.8+ based on standard Python type hints.',
    },
    {
      githubId: BigInt(1005),
      ownerLogin: 'astral-sh',
      name: 'uv',
      fullName: 'astral-sh/uv',
      description: 'An extremely fast Python package and project manager, written in Rust.',
      repositoryUrl: 'https://github.com/astral-sh/uv',
      homepageUrl: 'https://docs.astral.sh/uv',
      defaultBranch: 'main',
      language: 'Rust',
      stargazersCount: 41000,
      forksCount: 1200,
      openIssuesCount: 210,
      watchersCount: 450,
      isVerified: true,
      lastPushAt: new Date(),
      techSlugs: ['rust', 'python'],
      catSlugs: ['developer-tools'],
      aiSummary: 'uv is an extremely fast Python package installer and resolver designed as a drop-in replacement for pip and virtualenv workflows.',
    },
  ];

  for (const repoData of sampleRepos) {
    const { techSlugs, catSlugs, aiSummary, ...baseRepo } = repoData;

    const repo = await prisma.repository.upsert({
      where: { githubId: baseRepo.githubId },
      update: baseRepo,
      create: baseRepo,
    });

    // Link Technologies
    for (const slug of techSlugs) {
      const techId = techMap.get(slug);
      if (techId) {
        await prisma.repositoryTechnology.upsert({
          where: { repositoryId_technologyId: { repositoryId: repo.id, technologyId: techId } },
          update: {},
          create: { repositoryId: repo.id, technologyId: techId },
        });
      }
    }

    // Link Categories
    for (const slug of catSlugs) {
      const catId = categoryMap.get(slug);
      if (catId) {
        await prisma.repositoryCategory.upsert({
          where: { repositoryId_categoryId: { repositoryId: repo.id, categoryId: catId } },
          update: {},
          create: { repositoryId: repo.id, categoryId: catId },
        });
      }
    }

    // AI Metadata
    await prisma.repositoryAiMetadata.upsert({
      where: { repositoryId_summaryVersion: { repositoryId: repo.id, summaryVersion: 'v1' } },
      update: { summaryText: aiSummary },
      create: {
        repositoryId: repo.id,
        summaryText: aiSummary,
        summaryVersion: 'v1',
        aiModel: 'gemini-2.0-flash',
        confidenceScore: 0.95,
      },
    });

    // Bookmark for developerUser
    if (repo.fullName === 'aryanjsx/Stackloop' || repo.fullName === 'vercel/next.js') {
      await prisma.savedRepository.upsert({
        where: { userId_repositoryId: { userId: developerUser.id, repositoryId: repo.id } },
        update: {},
        create: {
          userId: developerUser.id,
          repositoryId: repo.id,
        },
      });
    }
  }

  // 5. Featured Collection
  const collection = await prisma.collection.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      userId: adminUser.id,
      name: 'Essential AI & Fullstack Tools',
      description: 'Handpicked open source tools for crafting modern web and AI applications.',
      isPublic: true,
      isFeatured: true,
    },
  });

  const stackloopRepo = await prisma.repository.findUnique({ where: { githubId: BigInt(1001) } });
  if (stackloopRepo) {
    await prisma.collectionRepository.upsert({
      where: { collectionId_repositoryId: { collectionId: collection.id, repositoryId: stackloopRepo.id } },
      update: {},
      create: { collectionId: collection.id, repositoryId: stackloopRepo.id },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
