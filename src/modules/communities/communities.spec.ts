import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { CommunityRole, CommunityVisibility, PostStatus } from "@prisma/client";
import { CommunitiesService } from "./communities.service";
import { CommunitiesRepository } from "./communities.repository";

describe("CommunitiesService", () => {
  let service: CommunitiesService;
  let repository: jest.Mocked<CommunitiesRepository>;

  const mockCommunity = {
    id: "comm-1",
    nom: "Club Lecture",
    description: "Lecture et partage",
    visibility: CommunityVisibility.PUBLIC,
    createdAt: new Date(),
    ownerId: "user-1",
    owner: { id: "user-1", nom: "Kane", prenom: "Mouha" },
    _count: { members: 5, posts: 12 },
  };

  const mockMember = {
    id: "member-1",
    userId: "user-2",
    role: CommunityRole.MEMBER,
    joinedAt: new Date(),
    user: { nom: "Diallo", prenom: "Fatou" },
  };

  beforeEach(() => {
    repository = {
      findPublic: jest.fn(),
      countPublic: jest.fn(),
      findByUser: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMembership: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
      findMembers: jest.fn(),
      createPost: jest.fn(),
      findPosts: jest.fn(),
      countPosts: jest.fn(),
      deletePost: jest.fn(),
      findPostById: jest.fn(),
    } as unknown as jest.Mocked<CommunitiesRepository>;

    service = new CommunitiesService(repository);
  });

  describe("create", () => {
    it("devrait creer une communaute", async () => {
      repository.create.mockResolvedValue(mockCommunity);

      const result = await service.create("user-1", {
        nom: "Club Lecture",
        description: "Lecture et partage",
      });

      expect(result.nom).toBe("Club Lecture");
      expect(result.membersCount).toBe(5);
    });
  });

  describe("join", () => {
    it("devrait permettre de rejoindre une communaute publique", async () => {
      repository.findById.mockResolvedValue(mockCommunity);
      repository.findMembership.mockResolvedValue(null);
      repository.addMember.mockResolvedValue(mockMember);

      const result = await service.join("comm-1", "user-2");

      expect(result.userId).toBe("user-2");
      expect(result.role).toBe(CommunityRole.MEMBER);
    });

    it("devrait refuser si communaute privee", async () => {
      repository.findById.mockResolvedValue({
        ...mockCommunity,
        visibility: CommunityVisibility.PRIVATE,
      });

      await expect(service.join("comm-1", "user-2")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("devrait refuser si deja membre", async () => {
      repository.findById.mockResolvedValue(mockCommunity);
      repository.findMembership.mockResolvedValue(mockMember);

      await expect(service.join("comm-1", "user-2")).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("leave", () => {
    it("devrait permettre a un membre de quitter", async () => {
      repository.findById.mockResolvedValue(mockCommunity);
      repository.findMembership.mockResolvedValue(mockMember);
      repository.removeMember.mockResolvedValue(undefined as any);

      const result = await service.leave("comm-1", "user-2");
      expect(result.left).toBe(true);
    });

    it("devrait interdire au proprietaire de quitter", async () => {
      repository.findById.mockResolvedValue(mockCommunity);

      await expect(service.leave("comm-1", "user-1")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("createPost", () => {
    it("devrait creer un post si membre", async () => {
      repository.findMembership.mockResolvedValue(mockMember);
      repository.createPost.mockResolvedValue({
        id: "post-1",
        contenu: "Super livre !",
        status: PostStatus.PUBLISHED,
        createdAt: new Date(),
        authorId: "user-2",
        author: { id: "user-2", nom: "Diallo", prenom: "Fatou" },
      });

      const result = await service.createPost("comm-1", "user-2", {
        contenu: "Super livre !",
      });

      expect(result.contenu).toBe("Super livre !");
    });

    it("devrait refuser si non membre", async () => {
      repository.findMembership.mockResolvedValue(null);

      await expect(
        service.createPost("comm-1", "user-99", { contenu: "test" }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("deletePost", () => {
    it("devrait permettre a l'auteur de supprimer son post", async () => {
      repository.findPostById.mockResolvedValue({
        id: "post-1",
        contenu: "test",
        status: PostStatus.PUBLISHED,
        createdAt: new Date(),
        authorId: "user-2",
        communityId: "comm-1",
        author: { id: "user-2", nom: "Diallo", prenom: "Fatou" },
      });
      repository.deletePost.mockResolvedValue(undefined as any);

      const result = await service.deletePost("post-1", "user-2");
      expect(result.deleted).toBe(true);
    });

    it("devrait refuser si ni auteur ni admin", async () => {
      repository.findPostById.mockResolvedValue({
        id: "post-1",
        contenu: "test",
        status: PostStatus.PUBLISHED,
        createdAt: new Date(),
        authorId: "user-2",
        communityId: "comm-1",
        author: { id: "user-2", nom: "Diallo", prenom: "Fatou" },
      });
      repository.findById.mockResolvedValue(mockCommunity); // owner is user-1

      await expect(service.deletePost("post-1", "user-99")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("findOne", () => {
    it("devrait lever NotFoundException si communaute introuvable", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne("unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
