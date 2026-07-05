import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CommunityRole, CommunityVisibility } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationMetaDto } from "../../common/dto/response.dto";
import {
  CommunityMemberResponseDto,
  CommunityResponseDto,
  CreateCommunityDto,
  CreatePostDto,
  PostResponseDto,
  UpdateCommunityDto,
} from "./dto";
import { CommunitiesRepository } from "./communities.repository";
import { GamificationService } from "../gamification/gamification.service";

type CommunityRecord = NonNullable<
  Awaited<ReturnType<CommunitiesRepository["findById"]>>
>;
type MemberRecord = NonNullable<
  Awaited<ReturnType<CommunitiesRepository["findMembership"]>>
>;
type PostRecord = Awaited<
  ReturnType<CommunitiesRepository["findPosts"]>
>[number];

@Injectable()
export class CommunitiesService {
  constructor(
    @Inject(CommunitiesRepository)
    private readonly communitiesRepository: CommunitiesRepository,
    @Inject(GamificationService)
    private readonly gamificationService: GamificationService,
  ) {}

  /** Lister les communautes publiques */
  async findAll(pagination: PaginationDto, search?: string) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const [communities, total] = await Promise.all([
      this.communitiesRepository.findPublic(skip, limit, search),
      this.communitiesRepository.countPublic(search),
    ]);

    return {
      data: communities.map((c) => this.toCommunityResponse(c)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      } satisfies PaginationMetaDto,
    };
  }

  /** Mes communautes */
  async findMine(userId: string) {
    const communities = await this.communitiesRepository.findByUser(userId);
    return communities.map((c) => this.toCommunityResponse(c));
  }

  /** Detail d'une communaute */
  async findOne(id: string): Promise<CommunityResponseDto> {
    const community = await this.communitiesRepository.findById(id);
    if (!community) {
      throw new NotFoundException("Communaute introuvable");
    }
    return this.toCommunityResponse(community);
  }

  /** Creer une communaute */
  async create(
    userId: string,
    dto: CreateCommunityDto,
  ): Promise<CommunityResponseDto> {
    const community = await this.communitiesRepository.create(userId, {
      ownerId: userId,
      nom: dto.nom,
      description: dto.description,
      visibility: dto.visibility ?? CommunityVisibility.PUBLIC,
    });

    // Badge COMMUNITY_CREATOR — fire-and-forget
    this.gamificationService.checkAfterCommunityCreation(userId).catch(() => {});

    return this.toCommunityResponse(community);
  }

  /** Modifier une communaute (owner seulement) */
  async update(
    id: string,
    userId: string,
    dto: UpdateCommunityDto,
  ): Promise<CommunityResponseDto> {
    const community = await this.findOwnedCommunity(id, userId);

    const updated = await this.communitiesRepository.update(id, {
      nom: dto.nom,
      description: dto.description,
      visibility: dto.visibility,
    });

    return this.toCommunityResponse(updated);
  }

  /** Supprimer une communaute (owner seulement) */
  async delete(id: string, userId: string) {
    await this.findOwnedCommunity(id, userId);
    await this.communitiesRepository.delete(id);
    return { deleted: true };
  }

  /** Rejoindre une communaute */
  async join(communityId: string, userId: string) {
    const community = await this.communitiesRepository.findById(communityId);

    if (!community) {
      throw new NotFoundException("Communaute introuvable");
    }

    if (community.visibility === CommunityVisibility.PRIVATE) {
      throw new ForbiddenException(
        "Cette communaute est privee. Demandez une invitation.",
      );
    }

    const existing = await this.communitiesRepository.findMembership(
      communityId,
      userId,
    );

    if (existing) {
      throw new ConflictException("Vous etes deja membre de cette communaute");
    }

    const member = await this.communitiesRepository.addMember(
      communityId,
      userId,
    );

    return this.toMemberResponse(member);
  }

  /** Quitter une communaute */
  async leave(communityId: string, userId: string) {
    const community = await this.communitiesRepository.findById(communityId);

    if (!community) {
      throw new NotFoundException("Communaute introuvable");
    }

    // Le proprietaire ne peut pas quitter sa propre communaute
    if (community.ownerId === userId) {
      throw new ForbiddenException(
        "Le proprietaire ne peut pas quitter sa communaute. Supprimez-la ou transferez la propriete.",
      );
    }

    const membership = await this.communitiesRepository.findMembership(
      communityId,
      userId,
    );

    if (!membership) {
      throw new NotFoundException("Vous n'etes pas membre de cette communaute");
    }

    await this.communitiesRepository.removeMember(communityId, userId);
    return { left: true };
  }

  /** Lister les membres d'une communaute */
  async findMembers(
    communityId: string,
  ): Promise<CommunityMemberResponseDto[]> {
    const community = await this.communitiesRepository.findById(communityId);

    if (!community) {
      throw new NotFoundException("Communaute introuvable");
    }

    const members =
      await this.communitiesRepository.findMembers(communityId);

    return members.map((m) => this.toMemberResponse(m));
  }

  /** Publier un post dans une communaute (membres seulement) */
  async createPost(
    communityId: string,
    userId: string,
    dto: CreatePostDto,
  ): Promise<PostResponseDto> {
    await this.requireMembership(communityId, userId);

    const post = await this.communitiesRepository.createPost({
      communityId,
      authorId: userId,
      contenu: dto.contenu,
    });

    return this.toPostResponse(post);
  }

  /** Lister les posts d'une communaute */
  async findPosts(communityId: string, userId: string, pagination: PaginationDto) {
    await this.requireMembership(communityId, userId);

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.communitiesRepository.findPosts(communityId, skip, limit),
      this.communitiesRepository.countPosts(communityId),
    ]);

    return {
      data: posts.map((p) => this.toPostResponse(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      } satisfies PaginationMetaDto,
    };
  }

  /** Supprimer un post (auteur ou admin communaute) */
  async deletePost(postId: string, userId: string) {
    const post = await this.communitiesRepository.findPostById(postId);

    if (!post) {
      throw new NotFoundException("Post introuvable");
    }

    // Seul l'auteur ou le proprietaire de la communaute peut supprimer
    if (post.authorId !== userId) {
      const community = await this.communitiesRepository.findById(
        post.communityId,
      );
      if (community?.ownerId !== userId) {
        throw new ForbiddenException(
          "Seul l'auteur ou l'admin peut supprimer ce post",
        );
      }
    }

    await this.communitiesRepository.deletePost(postId);
    return { deleted: true };
  }

  /** Verifier que l'utilisateur est membre de la communaute */
  private async requireMembership(communityId: string, userId: string) {
    const membership = await this.communitiesRepository.findMembership(
      communityId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException(
        "Vous devez etre membre de la communaute pour effectuer cette action",
      );
    }

    return membership;
  }

  /** Verifier que l'utilisateur est proprietaire de la communaute */
  private async findOwnedCommunity(id: string, userId: string) {
    const community = await this.communitiesRepository.findById(id);

    if (!community) {
      throw new NotFoundException("Communaute introuvable");
    }

    if (community.ownerId !== userId) {
      throw new ForbiddenException(
        "Seul le proprietaire peut modifier cette communaute",
      );
    }

    return community;
  }

  private toCommunityResponse(record: CommunityRecord): CommunityResponseDto {
    return {
      id: record.id,
      nom: record.nom,
      description: record.description,
      visibility: record.visibility,
      createdAt: record.createdAt,
      owner: record.owner,
      membersCount: record._count.members,
      postsCount: record._count.posts,
    };
  }

  private toMemberResponse(record: MemberRecord): CommunityMemberResponseDto {
    return {
      id: record.id,
      userId: record.userId,
      nom: record.user.nom,
      prenom: record.user.prenom,
      role: record.role,
      joinedAt: record.joinedAt,
    };
  }

  private toPostResponse(record: PostRecord): PostResponseDto {
    return {
      id: record.id,
      contenu: record.contenu,
      status: record.status,
      createdAt: record.createdAt,
      author: record.author,
    };
  }
}
