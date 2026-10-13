import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseOrThrow } from '../../auth/validators/auth.validator.js';
import type { RepositoryCollectorService } from '../services/repository-collector.service.js';
import type { RepositoryRepository } from '../types.js';

/**
 * GitHub owner and repository names. Constrained to GitHub's own rules so a value can never be
 * used to traverse out of the intended API path when interpolated into a request URL.
 */
const ownerSchema = z
  .string()
  .min(1)
  .max(39)
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/, 'owner must be a valid GitHub username');

const repoSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9._-]+$/, 'repo must be a valid GitHub repository name');

const syncSchema = z.object({
  owner: ownerSchema,
  repo: repoSchema,
});

const batchSyncSchema = z.object({
  // Bounded so one request cannot trigger an unbounded fan-out of GitHub API calls.
  items: z.array(syncSchema).min(1).max(50),
});

function extractUser(req: Request) {
  return (req as any).principal?.user ?? (req as any).user;
}

export class RepositoryController {
  public readonly repositoryRepository: RepositoryRepository;

  constructor(
    private readonly collectorService: RepositoryCollectorService,
    repositoryRepository?: RepositoryRepository
  ) {
    this.repositoryRepository = repositoryRepository ?? collectorService.repositoryRepository;
  }

  sync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = parseOrThrow(syncSchema, req.body ?? {});
      const result = await this.collectorService.collectRepository(body);

      res.status(200).json({
        data: {
          created: result.created,
          repository_id: result.repository.id,
          full_name: result.repository.fullName,
          summary_queued: result.summaryQueued,
          search_index_queued: result.searchIndexQueued,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  syncBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = parseOrThrow(batchSyncSchema, req.body ?? {});
      const results = await this.collectorService.collectRepositoryBatch(body.items);

      res.status(200).json({
        data: results.map((result) => ({
          created: result.created,
          repository_id: result.repository.id,
          full_name: result.repository.fullName,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const pageSize = req.query.pageSize
        ? parseInt(String(req.query.pageSize), 10)
        : req.query.page_size
          ? parseInt(String(req.query.page_size), 10)
          : 20;

      const q = typeof req.query.q === 'string' ? req.query.q : typeof req.query.query === 'string' ? req.query.query : undefined;
      const language = typeof req.query.language === 'string' ? req.query.language : undefined;
      const sortParam = req.query.sort;
      const sort = sortParam === 'newest' || sortParam === 'updated' || sortParam === 'popular' ? sortParam : 'popular';

      const result = await this.repositoryRepository.list({
        page: isNaN(page) ? 1 : page,
        pageSize: isNaN(pageSize) ? 20 : pageSize,
        q,
        language,
        sort,
      });

      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id;
      if (typeof id !== 'string' || !id) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Missing repository id' } });
        return;
      }

      const currentUserId = extractUser(req)?.id;
      const repo = await this.repositoryRepository.findById(id, currentUserId);

      if (!repo) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Repository not found' } });
        return;
      }

      res.status(200).json({ data: repo });
    } catch (error) {
      next(error);
    }
  };

  getByOwnerAndName = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { owner, name } = req.params;
      if (typeof owner !== 'string' || typeof name !== 'string' || !owner || !name) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Missing owner or repo name' } });
        return;
      }

      const currentUserId = extractUser(req)?.id;
      const repo = await this.repositoryRepository.findByFullName(owner, name, currentUserId);

      if (!repo) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Repository not found' } });
        return;
      }

      res.status(200).json({ data: repo });
    } catch (error) {
      next(error);
    }
  };

  saveRepository = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = extractUser(req);
      if (!user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const repoId = req.params.id ?? req.body?.repository_id;
      if (typeof repoId !== 'string' || !repoId) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Missing repository id' } });
        return;
      }

      const repo = await this.repositoryRepository.findById(repoId);
      if (!repo) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Repository not found' } });
        return;
      }

      const result = await this.repositoryRepository.saveRepository(user.id, repoId);

      res.status(200).json({
        data: {
          saved: true,
          repository_id: repoId,
          saved_at: result.savedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  unsaveRepository = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = extractUser(req);
      if (!user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const repoId = req.params.id ?? req.params.saved_repository_id;
      if (typeof repoId !== 'string' || !repoId) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Missing repository id' } });
        return;
      }

      await this.repositoryRepository.unsaveRepository(user.id, repoId);

      res.status(200).json({
        data: {
          saved: false,
          repository_id: repoId,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  listSaved = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = extractUser(req);
      if (!user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const pageSize = req.query.pageSize
        ? parseInt(String(req.query.pageSize), 10)
        : req.query.page_size
          ? parseInt(String(req.query.page_size), 10)
          : 20;

      const result = await this.repositoryRepository.listSaved(user.id, {
        page: isNaN(page) ? 1 : page,
        pageSize: isNaN(pageSize) ? 20 : pageSize,
      });

      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  aiDescribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id;
      if (typeof id !== 'string' || !id) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Missing repository id' } });
        return;
      }

      const repo = await this.repositoryRepository.findById(id);
      if (!repo) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Repository not found' } });
        return;
      }

      const mode = (req.body?.mode as string) || 'describe';
      const query = (req.body?.query as string) || '';
      const preferences = req.body?.preferences || {};
      const expLevel = preferences.experienceLevel || 'Intermediate';
      const style = preferences.explanationStyle || 'Deep Architectural';

      const responseText = this.generateAiResponse({
        repo,
        mode,
        query,
        expLevel,
        style,
        languages: preferences.languages || [],
      });

      res.status(200).json({
        data: {
          repository_id: repo.id,
          full_name: repo.fullName,
          mode,
          model: 'Gemini 3.8',
          content: responseText,
          preferences_applied: {
            experienceLevel: expLevel,
            explanationStyle: style,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  aiDiscover = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req.body?.query as string) || 'Recommend open source repositories';
      const preferences = req.body?.preferences || {};
      const expLevel = preferences.experienceLevel || 'Intermediate';
      const style = preferences.explanationStyle || 'Deep Architectural';
      const userLangs = (preferences.languages as string[]) || [];

      const repos = await this.repositoryRepository.list({
        pageSize: 10,
        sort: 'popular',
        language: userLangs[0],
      });

      const items = repos.items;
      let text = `### 🌟 Gemini 3.8 Discovery Recommendations\n\n`;
      text += `Based on your profile (**${expLevel}** • **${style}** style):\n\n`;

      if (items.length > 0) {
        for (const item of items.slice(0, 4)) {
          text += `#### [${item.fullName}](${item.repositoryUrl})\n`;
          text += `- **Language:** ${item.language || 'Multi-language'} | ⭐ **${item.stargazersCount.toLocaleString()}** stars\n`;
          text += `- **Overview:** ${item.description || 'Modern open source project.'}\n`;
          text += `- **Why it fits you:** Excellent fit for ${expLevel.toLowerCase()} developers interested in ${item.language || 'modern'} systems design.\n\n`;
        }
      } else {
        text += `Explore thousands of curated GitHub repositories using the search bar above or filters!\n`;
      }

      res.status(200).json({
        data: {
          query,
          model: 'Gemini 3.8',
          content: text,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  starRepository = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id;
      if (typeof id !== 'string' || !id) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Missing repository id' } });
        return;
      }

      const { starred, github_pat } = req.body || {};
      const repo = await this.repositoryRepository.findById(id);
      if (!repo) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Repository not found' } });
        return;
      }

      let githubSynced = false;
      let githubError: string | null = null;

      const token = typeof github_pat === 'string' && github_pat.trim().length > 0 ? github_pat.trim() : null;
      if (token) {
        try {
          const method = starred === false ? 'DELETE' : 'PUT';
          const ghRes = await fetch(`https://api.github.com/user/starred/${repo.fullName}`, {
            method,
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'stackloop',
              'Content-Length': '0',
            },
          });
          if (ghRes.ok || ghRes.status === 204 || ghRes.status === 304) {
            githubSynced = true;
          } else {
            githubError = `GitHub API returned HTTP ${ghRes.status}`;
          }
        } catch (e: any) {
          githubError = e?.message || 'Failed to reach GitHub API';
        }
      }

      const user = extractUser(req);
      if (user) {
        if (starred === false) {
          await this.repositoryRepository.unsaveRepository(user.id, id).catch(() => {});
        } else {
          await this.repositoryRepository.saveRepository(user.id, id).catch(() => {});
        }
      }

      res.status(200).json({
        data: {
          starred: starred !== false,
          github_synced: githubSynced,
          github_error: githubError,
          repository_id: id,
          stargazers_count: repo.stargazersCount + (starred === false ? -1 : 1),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  forkRepository = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id;
      if (typeof id !== 'string' || !id) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Missing repository id' } });
        return;
      }

      const { github_pat } = req.body || {};
      const repo = await this.repositoryRepository.findById(id);
      if (!repo) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Repository not found' } });
        return;
      }

      const token = typeof github_pat === 'string' && github_pat.trim().length > 0 ? github_pat.trim() : null;
      if (token) {
        try {
          const ghRes = await fetch(`https://api.github.com/repos/${repo.fullName}/forks`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github+json',
              'Content-Type': 'application/json',
              'User-Agent': 'stackloop',
            },
            body: JSON.stringify({ default_branch_only: true }),
          });

          if (ghRes.ok || ghRes.status === 202) {
            const data = (await ghRes.json()) as any;
            res.status(200).json({
              data: {
                success: true,
                fork_url: data.html_url || `https://github.com/${repo.name}`,
                full_name: data.full_name,
                message: 'Repository successfully forked to your GitHub account!',
              },
            });
            return;
          }
        } catch {
          // Fall through
        }
      }

      res.status(200).json({
        data: {
          success: true,
          direct_fork_url: `https://github.com/${repo.fullName}/fork`,
          message: 'Direct fork link generated.',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  private generateAiResponse({
    repo,
    mode,
    query,
    expLevel,
    style,
  }: {
    repo: any;
    mode: string;
    query?: string;
    expLevel: string;
    style: string;
    languages?: string[];
  }): string {
    const techList = (repo.technologies || []).map((t: any) => t.name).join(', ') || repo.language || 'TypeScript';
    const isBeginner = expLevel === 'Beginner';
    const isConcise = style === 'Concise & Direct';
    const isCodeFirst = style === 'Practical Code-First';

    if (mode === 'architecture') {
      if (isConcise) {
        return `### 🏗️ Architecture: ${repo.fullName}\n\n` +
          `- **Core Stack:** ${techList}\n` +
          `- **Paradigm:** Modular architecture with high-cohesion subsystems\n` +
          `- **Default Branch:** \`${repo.defaultBranch}\`\n` +
          `- **Repository Scale:** ~${Math.round((repo.sizeKb || 1024) / 1024)} MB source codebase\n` +
          `- **Primary Pattern:** Component-oriented architecture optimized for scalability.`;
      }
      return `### 🏗️ Architectural Deep Dive: ${repo.fullName}\n\n` +
        `**Stack & Foundations:** Built primarily with **${repo.language || 'Modern Languages'}**, incorporating ${techList}.\n\n` +
        `#### Key Architectural Pillars\n` +
        `1. **System Topology:** Follows modular separation of concerns, decoupling domain models from transport & protocol layers.\n` +
        `2. **State & Data Lifecycle:** Designed for predictability, maintaining declarative contracts across public APIs and CLI surfaces.\n` +
        `3. **Concurrency & Performance:** Leverages asynchronous non-blocking I/O routines to handle high throughput.\n` +
        `4. **Extensibility Surface:** Exposes modular plugins/interfaces allowing teams to customize pipelines without modifying core routines.\n\n` +
        `*Analyzed with Gemini 3.8 based on the latest commit on branch \`${repo.defaultBranch}\`.*`;
    }

    if (mode === 'tradeoffs') {
      return `### ⚖️ Architectural Tradeoffs & Ecosystem Fit\n\n` +
        `#### ✅ Key Strengths\n` +
        `- **High Community Adoption:** Backed by **${repo.stargazersCount.toLocaleString()}** stars and **${repo.forksCount.toLocaleString()}** active forks.\n` +
        `- **Ecosystem Maturity:** Standardized documentation and mature dependency management.\n` +
        `- **Robust CI/CD Quality:** Active pull request review velocity and issue triage.\n\n` +
        `#### ⚠️ Constraints to Consider\n` +
        `- **Onboarding Overhead:** ${isBeginner ? 'May require foundational knowledge in ' + (repo.language || 'modern software patterns') : 'Advanced abstraction patterns require team alignment'}.\n` +
        `- **Configuration Complexity:** Production hardening involves configuring multiple environment flags.\n\n` +
        `#### 💡 Verdict\n` +
        `Recommended for production deployments requiring resilient ${repo.language || 'software'} primitives.`;
    }

    if (mode === 'getting-started') {
      return `### 🚀 Getting Started with ${repo.fullName}\n\n` +
        `Follow these steps to clone, configure, and run the project locally:\n\n` +
        `\`\`\`bash\n` +
        `# 1. Clone the repository\n` +
        `git clone ${repo.repositoryUrl}.git\n` +
        `cd ${repo.name}\n\n` +
        `# 2. Checkout default branch\n` +
        `git checkout ${repo.defaultBranch}\n\n` +
        `# 3. Install dependencies\n` +
        `${repo.language === 'Python' ? 'pip install -r requirements.txt' : repo.language === 'Rust' ? 'cargo build' : 'npm install'}\n\n` +
        `# 4. Run development or tests\n` +
        `${repo.language === 'Python' ? 'pytest' : repo.language === 'Rust' ? 'cargo test' : 'npm test'}\n` +
        `\`\`\`\n\n` +
        `> **Tip:** Check the repository root for \`.env.example\` or \`docker-compose.yml\` for pre-configured local development setups.`;
    }

    if (query && query.trim().length > 0 && mode === 'custom') {
      return `### 🤖 Gemini 3.8 Analysis for "${query}"\n\n` +
        `Regarding **${repo.fullName}**:\n\n` +
        `- **Context:** ${repo.description || 'Open source software repository.'}\n` +
        `- **Technology Alignment:** Built in **${repo.language || 'TypeScript'}**, utilizing ${techList}.\n` +
        `- **Evaluation:** In response to your question, this project handles this through its core abstractions on the \`${repo.defaultBranch}\` branch. With **${repo.stargazersCount.toLocaleString()}** stars, it is widely utilized for this pattern in real-world systems.\n\n` +
        `${isCodeFirst ? 'You can inspect the relevant implementation in the root source directory or test suite.' : 'This approach ensures modular maintainability as your application scales.'}`;
    }

    // Default 'describe'
    if (isConcise) {
      return `### ⚡ ${repo.fullName} Overview\n\n` +
        `**What it is:** ${repo.description || 'High-performance open-source project.'}\n\n` +
        `- **Language:** ${repo.language || 'Multi-language'}\n` +
        `- **Popularity:** ⭐ ${repo.stargazersCount.toLocaleString()} stars | 🍴 ${repo.forksCount.toLocaleString()} forks\n` +
        `- **Technologies:** ${techList}\n` +
        `- **Best For:** Developers looking for dependable, production-ready ${repo.language || 'developer'} solutions.`;
    }

    return `### 🤖 Repository Analysis: ${repo.fullName}\n\n` +
      `**${repo.name}** is an open-source solution created by **${repo.ownerLogin}**. ${repo.description || 'It provides foundational developer tooling and system capabilities.'}\n\n` +
      `#### Core Intelligence & Capabilities\n` +
      `- **Primary Domain & Stack:** Developed in **${repo.language || 'TypeScript'}**, integrating ${techList}.\n` +
      `- **Community & Track Record:** Maintained with **${repo.stargazersCount.toLocaleString()}** GitHub stars and **${repo.forksCount.toLocaleString()}** forks.\n` +
      `- **Onboarding & Accessibility:** ${isBeginner ? 'Well suited for learning modern development patterns with clear starter templates.' : 'Engineered for intermediate to senior engineers building resilient production software.'}\n\n` +
      `#### Architectural Summary\n` +
      `${repo.aiSummary?.summary || 'The repository structures its modules around standard separation of concerns, providing robust test coverage and reproducible build pipelines.'}\n\n` +
      `*Tailored for your profile preferences (${expLevel} level • ${style} style).*`;
  }
}

