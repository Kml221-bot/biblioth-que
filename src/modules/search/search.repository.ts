import { Inject, Injectable } from "@nestjs/common";
import { BookStatus, Prisma, TypeAcces } from "@prisma/client";
import { bookListSelect } from "../books/books.repository";
import { PrismaService } from "../../prisma/prisma.service";
import { SearchOrder, SearchQueryDto } from "./dto";

type SearchIdRow = {
  id: string;
  score: number;
};

type CountRow = {
  total: number;
};

type SuggestionRow = {
  suggestion: string;
};

const TYPE_ACCESS_DB_VALUES: Record<TypeAcces, string> = {
  [TypeAcces.FREE]: "free",
  [TypeAcces.BORROW_ONLY]: "borrow_only",
  [TypeAcces.BUY_ONLY]: "buy_only",
  [TypeAcces.BORROW_OR_BUY]: "borrow_or_buy",
  [TypeAcces.PREMIUM]: "premium",
};

@Injectable()
export class SearchRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async searchBookIds(filters: SearchQueryDto, skip: number, take: number) {
    const where = this.buildWhere(filters);
    const score = this.buildScore(filters.q);
    const orderBy = this.buildOrderBy(filters.order);

    return this.prisma.$queryRaw<SearchIdRow[]>`
      SELECT id::text, ${score}::float AS score
      FROM public.books
      ${where}
      ORDER BY ${orderBy}
      OFFSET ${skip}
      LIMIT ${take}
    `;
  }

  async countSearchResults(filters: SearchQueryDto) {
    const where = this.buildWhere(filters);
    const [row] = await this.prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS total
      FROM public.books
      ${where}
    `;

    return row?.total ?? 0;
  }

  async findBooksByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return this.prisma.book.findMany({
      where: {
        id: { in: ids },
        status: BookStatus.PUBLISHED,
      },
      select: bookListSelect,
    });
  }

  async findTrigramSuggestions(query: string) {
    const like = `%${query}%`;

    return this.prisma.$queryRaw<SuggestionRow[]>`
      SELECT DISTINCT suggestion
      FROM (
        SELECT titre AS suggestion,
               GREATEST(similarity(lower(titre), lower(${query})), 0) AS score
        FROM public.books
        WHERE status = 'publie'::public.book_status
        UNION ALL
        SELECT auteur AS suggestion,
               GREATEST(similarity(lower(auteur), lower(${query})), 0) AS score
        FROM public.books
        WHERE status = 'publie'::public.book_status
      ) suggestions
      WHERE score > 0.12 OR lower(suggestion) LIKE lower(${like})
      ORDER BY suggestion ASC
      LIMIT 5
    `;
  }

  async findSimpleSuggestions(query: string) {
    const books = await this.prisma.book.findMany({
      where: {
        status: BookStatus.PUBLISHED,
        OR: [
          { titre: { contains: query, mode: "insensitive" } },
          { auteur: { contains: query, mode: "insensitive" } },
          { categorie: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        titre: true,
        auteur: true,
      },
      orderBy: [{ nbEmprunts: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    return books;
  }

  private buildWhere(filters: SearchQueryDto) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`status = 'publie'::public.book_status`,
    ];
    const query = filters.q?.trim();

    if (query) {
      const like = `%${query}%`;

      conditions.push(Prisma.sql`(
        to_tsvector(
          'french',
          coalesce(titre, '') || ' ' ||
          coalesce(auteur, '') || ' ' ||
          coalesce(description, '') || ' ' ||
          coalesce(categorie, '')
        ) @@ plainto_tsquery('french', ${query})
        OR titre ILIKE ${like}
        OR auteur ILIKE ${like}
        OR categorie ILIKE ${like}
      )`);
    }

    if (filters.categorie) {
      conditions.push(Prisma.sql`categorie ILIKE ${`%${filters.categorie}%`}`);
    }

    if (filters.typeAcces) {
      conditions.push(
        Prisma.sql`type_acces = ${TYPE_ACCESS_DB_VALUES[filters.typeAcces]}::public.type_acces`
      );
    }

    if (filters.filiere) {
      conditions.push(Prisma.sql`filiere ILIKE ${`%${filters.filiere}%`}`);
    }

    if (typeof filters.prix_max === "number") {
      conditions.push(Prisma.sql`(
        prix_achat <= ${filters.prix_max}
        OR prix_location_30j <= ${filters.prix_max}
        OR prix_location_7j <= ${filters.prix_max}
      )`);
    }

    return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
  }

  private buildScore(query?: string) {
    if (!query?.trim()) {
      return Prisma.sql`(
        (nb_emprunts::float * 0.05) +
        (nb_vues::float * 0.005) +
        (note_moyenne::float * 0.2)
      )`;
    }

    return Prisma.sql`(
      ts_rank_cd(
        to_tsvector(
          'french',
          coalesce(titre, '') || ' ' ||
          coalesce(auteur, '') || ' ' ||
          coalesce(description, '') || ' ' ||
          coalesce(categorie, '')
        ),
        plainto_tsquery('french', ${query})
      )
      + CASE WHEN lower(titre) = lower(${query}) THEN 2 ELSE 0 END
      + CASE WHEN lower(titre) LIKE lower(${`${query}%`}) THEN 1 ELSE 0 END
      + (nb_emprunts::float * 0.01)
      + (note_moyenne::float * 0.05)
    )`;
  }

  private buildOrderBy(order?: SearchOrder) {
    if (order === SearchOrder.POPULARITY) {
      return Prisma.sql`nb_emprunts DESC, nb_vues DESC, score DESC`;
    }

    if (order === SearchOrder.RATING) {
      return Prisma.sql`note_moyenne DESC, reviews_count DESC, score DESC`;
    }

    if (order === SearchOrder.DATE) {
      return Prisma.sql`created_at DESC, score DESC`;
    }

    return Prisma.sql`score DESC, nb_emprunts DESC, note_moyenne DESC`;
  }
}
