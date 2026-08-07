import { randomUUID } from 'node:crypto';
export class RepositoryCollectorService {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async collectRepository(input) {
        const metadata = await this.deps.githubService.fetchRepository(input.owner, input.repo);
        const readme = await this.deps.githubService.fetchReadme(input.owner, input.repo);
        const topics = await this.deps.githubService.fetchTopics(input.owner, input.repo);
        const languages = await this.deps.githubService.fetchLanguages(input.owner, input.repo);
        const contributors = await this.deps.githubService.fetchContributors(input.owner, input.repo);
        const existing = await this.deps.repositoryRepository.findByGithubId(metadata.id);
        const isUpdate = Boolean(existing && this.shouldUpdate(existing, metadata));
        const record = {
            id: existing?.id ?? randomUUID(),
            githubId: metadata.id,
            ownerLogin: metadata.owner.login,
            name: metadata.name,
            fullName: metadata.full_name,
            description: metadata.description ?? undefined,
            homepageUrl: metadata.homepage ?? undefined,
            repositoryUrl: metadata.html_url,
            defaultBranch: metadata.default_branch,
            language: languages[0] ?? metadata.language ?? undefined,
            stargazersCount: metadata.stargazers_count,
            forksCount: metadata.forks_count,
            openIssuesCount: metadata.open_issues_count,
            watchersCount: metadata.watchers_count,
            sizeKb: Math.round(metadata.size / 1024),
            isArchived: metadata.archived,
            isDisabled: metadata.disabled,
            isPrivate: metadata.private,
            isVerified: false,
            lastPushAt: metadata.pushed_at ? new Date(metadata.pushed_at) : undefined,
            lastSyncedAt: new Date(),
            createdAt: existing?.createdAt ?? new Date(),
            updatedAt: new Date(),
            readme,
            topics,
            contributors,
        };
        const saved = await this.deps.repositoryRepository.upsert(record);
        const summaryJob = await this.deps.queueProducer.enqueueSummaryJob({ repositoryId: saved.id, githubId: saved.githubId });
        const searchJob = await this.deps.queueProducer.enqueueSearchIndexJob({ repositoryId: saved.id, githubId: saved.githubId });
        return {
            created: !existing,
            repository: saved,
            summaryQueued: summaryJob.queued,
            searchIndexQueued: searchJob.queued,
        };
    }
    async collectRepositoryBatch(inputs) {
        const results = [];
        for (const input of inputs) {
            results.push(await this.collectRepository(input));
        }
        return results;
    }
    shouldUpdate(existing, metadata) {
        return Boolean(existing.description !== (metadata.description ?? undefined) ||
            existing.stargazersCount !== metadata.stargazers_count ||
            existing.forksCount !== metadata.forks_count ||
            existing.openIssuesCount !== metadata.open_issues_count ||
            existing.language !== metadata.language);
    }
}
