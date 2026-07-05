import { Inject, Injectable } from "@nestjs/common";
import {
  CommunityRole,
  CommunityVisibility,
  PostStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const communitySelect = {
  id: true,
  nom: true,
  description: true,
  visibility: true,
  createdAt: true,
  ownerId: true,
  owner: { select: { id: true, nom: true, prenom: true } },
  _count: { select: { members: true, posts: true } },
} satisfies Prisma.CommunitySelect;

const memberSelect = {
  id: true,
  userId: true,
  role: true,
  joinedAt: true,
  user: { select: { nom: true, prenom: true } },
} satisfies Prisma.CommunityMemberSelect;

const postSelect = {
  id: true,
  contenu: true,
  status: true,
  createdAt: true,
  authorId: true,
  author: { select: { id: true, nom: true, prenom: true } },
} satisfies Prisma.CommunityPostSelect;

@Injectable()
export class CommunitiesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Lister les communautes publiques */
  async findPublic(skip: number, take: number, search?: string) {
    const where: Prisma.CommunityWhereInput = {
      visibility: CommunityVisibility.PUBLIC,
      ...(search
        ? { nom: { contains: search, mode: "insensitive" } }
        : {}),
    };

    return this.prisma.community.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: communitySelect,
    });
  }

  /** Compter les communautes publiques */
  async countPublic(search?: string) {
    const where: Prisma.CommunityWhereInput = {
      visibility: CommunityVisibility.PUBLIC,
      ...(search
        ? { nom: { contains: search, mode: "insensitive" } }
        : {}),
    };

    return this.prisma.community.count({ where });
  }

  /** Mes communautes (ou je suis membre) */
  async findByUser(userId: string) {
    return this.prisma.community.findMany({
      where: {
        members: { some: { userId } },
      },
      orderBy: { createdAt: "desc" },
      select: communitySelect,
    });
  }

  /** Detail d'une communaute */
  async findById(id: string) {
    return this.prisma.community.findUnique({
      where: { id },
      select: communitySelect,
    });
  }

  /** Creer une communaute */
  async create(ownerId: string, data: Prisma.CommunityUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const community = await tx.community.create({
        data,
        select: communitySelect,
      });

      // Le createur devient automatiquement ADMIN de la communaute
      await tx.communityMember.create({
        data: {
          communityId: community.id,
          userId: ownerId,
          role: CommunityRole.OWNER,
        },
      });

      // Re-fetch pour inclure le count mis a jour
      return tx.community.findUniqueOrThrow({
        where: { id: community.id },
        select: communitySelect,
      });
    });
  }

  /** Mettre a jour une communaute */
  async update(id: string, data: Prisma.CommunityUpdateInput) {
    return this.prisma.community.update({
      where: { id },
      data,
      select: communitySelect,
    });
  }

  /** Supprimer une communaute */
  async delete(id: string) {
    return this.prisma.community.delete({ where: { id } });
  }

  /** Verifier si un utilisateur est membre */
  async findMembership(communityId: string, userId: string) {
    return this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: memberSelect,
    });
  }

  /** Rejoindre une communaute */
  async addMember(communityId: string, userId: string) {
    return this.prisma.communityMember.create({
      data: {
        communityId,
        userId,
        role: CommunityRole.MEMBER,
      },
      select: memberSelect,
    });
  }

  /** Quitter une communaute */
  async removeMember(communityId: string, userId: string) {
    return this.prisma.communityMember.delete({
      where: { communityId_userId: { communityId, userId } },
    });
  }

  /** Lister les membres */
  async findMembers(communityId: string) {
    return this.prisma.communityMember.findMany({
      where: { communityId },
      orderBy: { joinedAt: "asc" },
      select: memberSelect,
    });
  }

  /** Creer un post */
  async createPost(data: Prisma.CommunityPostUncheckedCreateInput) {
    return this.prisma.communityPost.create({
      data: { ...data, status: PostStatus.PUBLISHED },
      select: postSelect,
    });
  }

  /** Lister les posts d'une communaute */
  async findPosts(communityId: string, skip: number, take: number) {
    return this.prisma.communityPost.findMany({
      where: { communityId, status: PostStatus.PUBLISHED },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: postSelect,
    });
  }

  /** Compter les posts */
  async countPosts(communityId: string) {
    return this.prisma.communityPost.count({
      where: { communityId, status: PostStatus.PUBLISHED },
    });
  }

  /** Supprimer un post */
  async deletePost(postId: string) {
    return this.prisma.communityPost.update({
      where: { id: postId },
      data: { status: PostStatus.HIDDEN },
      select: postSelect,
    });
  }

  /** Trouver un post par son ID */
  async findPostById(postId: string) {
    return this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { ...postSelect, communityId: true },
    });
  }
}
