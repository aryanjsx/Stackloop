# Contributing to StackLoop

Thank you for your interest in contributing to StackLoop. We welcome contributions from developers of all experience levels, whether you are fixing a bug, improving documentation, refining the user experience, or proposing a new idea.

StackLoop is an open-source project built to make open source discovery and contribution easier. Your involvement helps us build a stronger platform for the wider developer community.

## Code of Conduct

Please make sure to read and follow our Code of Conduct before participating in the project. We expect all contributors to engage respectfully and constructively in issues, pull requests, and discussions.

## Ways to Contribute

There are many ways to contribute to StackLoop:

- Reporting bugs and issues
- Suggesting new features or improvements
- Improving documentation
- Writing or updating tests
- Refactoring and optimizing code
- Helping review pull requests
- Sharing feedback from real-world usage

## Reporting Bugs

If you encounter a bug, please open an issue before submitting a fix when possible.

When reporting a bug, include:

- A clear title describing the issue
- A concise summary of the problem
- Steps to reproduce the bug
- Expected behavior
- Actual behavior
- Relevant environment details, such as browser, OS, or runtime version

If applicable, include screenshots or error logs to make the issue easier to investigate.

## Suggesting Features

Feature ideas are welcome. Before opening a feature request, please check whether a similar proposal already exists.

When suggesting a feature, include:

- The problem the feature solves
- Why it would be valuable
- Any examples or use cases
- An explanation of how it fits the project’s goals

## Setting Up the Project Locally

### Prerequisites

- Node.js 20 or later
- pnpm 10 or later (`npm install -g pnpm`)
- PostgreSQL 14 or later

Python, Docker, and Redis appear in the architecture documents but are not needed yet; the AI
service and container configuration have not been built.

### Clone the Repository

```bash
git clone https://github.com/your-org/stackloop.git
cd stackloop
pnpm install
```

This is a pnpm workspace. Installing with npm or yarn will not link it correctly.

### Configure and Run

See [Local Installation](README.md#local-installation) in the README for environment setup,
database migration, and the development server. The short version:

```bash
cp configs/env/.env.example .env   # then fill in the values
pnpm --filter @stackloop/api exec prisma migrate deploy
pnpm --filter @stackloop/api dev
```

### Before Opening a Pull Request

```bash
pnpm test
pnpm typecheck
```

## Delivery Phases

StackLoop is built in sequential phases, and work is expected to stay within the phase currently
open. Before starting, check the [Phase Tracker](docs/phase-tracker.md) to see where the project
is and what the current phase still needs. If your idea belongs to a later phase, open an issue
so it can be scheduled rather than merged early.

New features require a [PRD](docs/prd.md) update first. Architecture changes that depart from the
specifications in `docs/` require an [ADR](docs/adr/).

## Development Workflow

1. Fork the repository.
2. Create a new branch for your work.
3. Make focused changes with clear intent.
4. Run relevant tests and checks locally.
5. Update documentation when behavior or usage changes.
6. Open a pull request with a clear summary.

## Branch Naming

Use descriptive branch names that make the purpose of the change clear.

Recommended patterns:

- `feature/short-description`
- `fix/short-description`
- `docs/short-description`
- `chore/short-description`
- `refactor/short-description`

## Commit Message Conventions

Use clear, conventional commit messages whenever possible.

Examples:

- `feat: add repository summary insights`
- `fix: resolve issue with recommendation loading`
- `docs: improve local setup instructions`
- `refactor: simplify repository card rendering`
- `test: add coverage for search filtering`

Keep commits focused and avoid bundling unrelated changes into a single commit.

## Pull Request Process

When opening a pull request:

- Use a clear title that describes the change
- Include a summary of the work completed
- Explain the motivation behind the change
- Note any relevant context, limitations, or follow-up work
- Link related issues when applicable

Pull requests should be small, well-scoped, and easy to review. Large changes should be discussed in advance whenever possible.

### Pull Request Checklist

Before submitting, confirm that:

- Your code builds or runs locally
- Relevant tests pass
- Documentation is updated where needed
- The change is limited to the intended scope
- You have reviewed your diff for clarity and correctness

## Code Style Guidelines

Please follow the existing style and conventions used in the repository.

General expectations:

- Write readable, maintainable code
- Prefer clear naming over clever abstractions
- Keep functions and components focused
- Avoid unnecessary complexity
- Follow the formatting conventions already used in the codebase

For frontend work, follow the conventions established in the Next.js and TypeScript code. For backend work, keep implementations consistent and well structured.

## Testing Expectations

Where practical, contributions should include tests.

Expectations:

- Add or update tests for bug fixes and new functionality
- Ensure test coverage is meaningful, not superficial
- Run relevant test suites before opening a pull request

If you are unsure whether a change needs tests, please ask in the discussion or pull request thread.

## Documentation Standards

Documentation is a core part of this project.

Please update documentation when you:

- Add a new feature
- Change existing behavior
- Introduce new configuration or setup requirements
- Improve contributor guidance

Keep documentation concise, accurate, and easy to follow.

## Review Process

All pull requests are reviewed before being merged. Reviewers may request changes for clarity, correctness, maintainability, or alignment with project goals.

Please be responsive to feedback and willing to iterate on your contribution. Constructive discussion is part of the collaborative process.

## Issue Labels

Issues may be labeled to help organize work, including:

- `bug`
- `enhancement`
- `documentation`
- `good first issue`
- `help wanted`
- `question`

These labels help contributors identify areas where help is most needed.

## Good First Issues

We especially welcome first-time contributors to look for issues labeled `good first issue`. These are typically smaller, well-scoped tasks that are suitable for newcomers.

If you are new to the project, starting with a smaller contribution is a great way to get involved and learn the codebase.

## Contributor Recognition

We appreciate every contribution, whether large or small. Contributors help shape the direction of the project and strengthen the community around it.

Maintainers may recognize contributors through:

- Pull request acknowledgements
- Issue and discussion participation
- Community highlights
- Project updates and releases

## Getting Help

If you have questions while contributing, feel free to open an issue or start a discussion. We are happy to help and appreciate thoughtful questions that improve the project for everyone.
