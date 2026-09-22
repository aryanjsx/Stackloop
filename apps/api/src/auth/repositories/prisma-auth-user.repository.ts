import type { PrismaClient } from '@prisma/client';
import { isUserRole, type AuthUser, type AuthUserRepository, type GithubProfile } from '../types.js';

export class PrismaAuthUserRepository implements AuthUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    return user ? toAuthUser(user) : null;
  }

  /**
   * Creates the account on first sign-in, or refreshes the mirrored profile on subsequent
   * sign-ins. Keyed on `githubId` rather than username, because a GitHub user can rename
   * themselves while keeping the same id.
   *
   * `role` is deliberately absent from both branches: it is authorisation state owned by
   * StackLoop, and must never be driven by data coming back from the provider.
   */
  async upsertFromGithub(profile: GithubProfile, at: Date): Promise<AuthUser> {
    const user = await this.prisma.user.upsert({
      where: { githubId: BigInt(profile.id) },
      create: {
        githubId: BigInt(profile.id),
        username: profile.login,
        displayName: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        company: profile.company,
        location: profile.location,
        websiteUrl: profile.websiteUrl,
        isVerified: true,
        githubConnectedAt: at,
        lastLoginAt: at,
      },
      update: {
        username: profile.login,
        displayName: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        company: profile.company,
        location: profile.location,
        websiteUrl: profile.websiteUrl,
        lastLoginAt: at,
        // Signing in again undoes a soft delete, restoring the prior account rather than
        // orphaning it behind the unique githubId.
        deletedAt: null,
      },
    });

    return toAuthUser(user);
  }
}

function toAuthUser(user: {
  id: string;
  githubId: bigint;
  username: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  isVerified: boolean;
}): AuthUser {
  return {
    id: user.id,
    // Safe: GitHub ids are far below Number.MAX_SAFE_INTEGER. Converted here so the value can
    // be serialised to JSON, which cannot represent BigInt.
    githubId: Number(user.githubId),
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    // An unrecognised role in the database must not be trusted as though it were valid;
    // fall back to the least-privileged role.
    role: isUserRole(user.role) ? user.role : 'user',
    isActive: user.isActive,
    isVerified: user.isVerified,
  };
}
