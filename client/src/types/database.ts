
// ── Enums ────────────────────────────────────────────────────

export type UserRole = 'user' | 'author' | 'admin' | 'super_admin';
export type SubscriptionPlan =
  | 'free'
  | 'student'
  | 'premium'
  | 'school'
  | 'school_s'
  | 'school_l'
  | 'pack_informatique'
  | 'pack_droit'
  | 'pack_medecine'
  | 'pack_economie';
export type BookType = 'gratuit' | 'payant' | 'premium';
export type BookFormat = 'pdf' | 'epub' | 'pdf_epub';
export type BookStatus = 'brouillon' | 'publie' | 'suspendu' | 'archive';
export type BorrowStatus = 'actif' | 'prolonge' | 'retard' | 'rendu';
export type TransactionType = 'achat' | 'location' | 'amende' | 'abonnement' | 'commission' | 'remboursement';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentProvider = 'wave' | 'orange_money' | 'naboopay' | 'free_plan';
export type PenaltyStatus = 'pending' | 'paid' | 'waived';
export type ListingStatus = 'active' | 'vendu' | 'suspendu';
export type ListingType = 'physique' | 'numerique';
export type CommunityType = 'groupe_etude' | 'club_lecture';
export type NoteType = 'note' | 'surlignage' | 'signet' | 'question';
export type AnnouncementType = 'info' | 'promo' | 'maintenance' | 'urgent';
export type AnnouncementTarget = 'tous' | 'etudiants' | 'premium' | 'auteurs';
export type AnnouncementStatus = 'brouillon' | 'envoye' | 'programme';
export type ReportReason = 'droits_auteur' | 'contenu_inapproprie' | 'spam' | 'arnaque' | 'autre';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type ContentType = 'book' | 'note' | 'community' | 'user' | 'marketplace';
export type BookCondition = 'comme-neuf' | 'tres-bon' | 'bon' | 'acceptable';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';
export type CommunityMemberRole = 'member' | 'moderator' | 'admin';

// ── Row Types (ce qui est retourné par SELECT) ───────────────

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  plan: SubscriptionPlan;
  wallet_balance: number;
  whatsapp_number: string | null;
  filiere: string | null;
  niveau_academique: string | null;
  universite: string | null;
  referral_code: string | null;
  referred_by: string | null;
  avatar_url: string | null;
  is_active: boolean;
  preferred_categories: string[];
  emprunts_restants: number;
  wave_auto_debit_token: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  titre: string;
  auteur: string;
  categorie: string;
  sous_categorie: string | null;
  filiere: string | null;
  description: string | null;
  prix_achat: number;
  prix_location: number;
  prix_location_7j: number;
  prix_location_30j: number;
  type: BookType;
  type_acces: string | null;
  format: BookFormat;
  pdf_url: string | null;
  read_url: string | null;
  cover_url: string | null;
  watermark_enabled: boolean;
  pages_count: number;
  langue: string;
  isbn: string | null;
  editeur: string | null;
  annee_publication: number | null;
  status: BookStatus;
  featured: boolean;
  note_moyenne: number;
  nb_emprunts: number;
  nb_vues: number;
  author_profile_id: string | null;
  extract: string | null;
  added_by: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Borrow {
  id: string;
  user_id: string;
  book_id: string;
  debut: string;
  fin_prevue: string;
  fin_reelle: string | null;
  statut: BorrowStatus;
  penalite_fcfa: number;
  jours_retard: number;
  prolongation_auto_utilisee: boolean;
  duree_jours: number;
  prix_location_fcfa: number;
  renewal_count: number;
  renewal_paid_fcfa: number;
  metadata: Record<string, unknown>;
  rappel_j3_envoye: boolean;
  rappel_j1_envoye: boolean;
  penalty_stage: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  book_id: string | null;
  type: TransactionType;
  montant: number;
  commission_pct: number;
  vendeur_recoit: number;
  plateforme_recoit: number;
  statut: TransactionStatus;
  provider: PaymentProvider | null;
  reference_externe: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  debut: string;
  fin: string;
  auto_renew: boolean;
  montant_mensuel: number;
  statut: SubscriptionStatus;
  created_at: string;
  updated_at: string;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  current_page: number;
  total_pages: number;
  pourcentage_lu: number;
  temps_lecture_minutes: number;
  derniere_lecture: string;
  epubcfi: string | null;
  chapitres_lus: number;
  offline_disponible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReadingSession {
  id: string;
  user_id: string;
  book_id: string;
  debut: string;
  fin: string | null;
  pages_lues: number;
  duree_minutes: number;
  created_at: string;
}

export interface BookNote {
  id: string;
  user_id: string;
  book_id: string;
  page: number;
  contenu: string | null;
  couleur: string;
  type: NoteType;
  epubcfi: string | null;
  selected_text: string | null;
  chapter_label: string | null;
  is_public: boolean;
  shared_with_community_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Community {
  id: string;
  nom: string;
  description: string | null;
  type: CommunityType;
  createur_id: string;
  prive: boolean;
  code_invitation: string | null;
  membres_count: number;
  max_membres: number;
  book_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: CommunityMemberRole;
  joined_at: string;
}

export interface MarketplaceListing {
  id: string;
  seller_id: string;
  titre: string;
  auteur: string;
  description: string | null;
  prix_vendeur: number;
  prix_affiche: number;
  commission_pct: number;
  photo_url: string | null;
  statut: ListingStatus;
  localisation: string | null;
  type_livre: ListingType;
  categorie: string | null;
  condition: BookCondition | null;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface AuthorProfile {
  id: string;
  user_id: string;
  nom_plume: string;
  bio: string | null;
  wave_number: string | null;
  total_ventes: number;
  solde_disponible: number;
  verified: boolean;
  statut: string;
  identity_document_url: string | null;
  identity_document_path: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Penalty {
  id: string;
  borrow_id: string;
  user_id: string;
  montant: number;
  statut: PenaltyStatus;
  raison: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface Favorite {
  id: string;
  user_id: string;
  book_id: string;
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  cible_type: string | null;
  cible_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  device_info: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  admin_id: string;
  titre: string;
  contenu: string;
  type: AnnouncementType;
  cible_audience: AnnouncementTarget;
  canal: string;
  statut: AnnouncementStatus;
  envoye_a_count: number;
  programme_pour: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportedContent {
  id: string;
  reporter_id: string;
  content_type: ContentType;
  content_id: string;
  raison: ReportReason;
  description: string | null;
  statut: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface PlatformConfig {
  id: string;
  cle: string;
  valeur: string;
  description: string | null;
  modifie_par: string | null;
  modifie_le: string;
}

export interface UserStats {
  id: string;
  user_id: string;
  streak_jours: number;
  best_streak: number;
  xp: number;
  level: number;
  biblio_coins: number;
  weekly_goal_minutes: number;
  weekly_progress_min: number;
  freeze_used_this_week: boolean;
  last_read_at: string | null;
  livres_lus: number;
  pages_lues: number;
  minutes_lecture: number;
}

export interface UserReadingPreferences {
  id: string;
  user_id: string;
  theme: string;
  font_family: string;
  font_size: number;
  line_height: number;
  margin: string;
  justified: boolean;
  brightness: number;
  reading_mode: string;
  auto_night: boolean;
}

export interface Badge {
  id: string;
  code: string;
  nom: string;
  description: string;
  icon_url: string | null;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
}

// ── Insert Types (pour INSERT) ───────────────────────────────

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at' | 'preferred_categories'> & {
  preferred_categories?: string[];
  created_at?: string;
  updated_at?: string;
};

export type BookInsert = Omit<
  Book,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'filiere'
  | 'prix_location_7j'
  | 'prix_location_30j'
  | 'type_acces'
  | 'featured'
  | 'note_moyenne'
  | 'nb_emprunts'
  | 'nb_vues'
  | 'author_profile_id'
  | 'extract'
> & Partial<Pick<
  Book,
  | 'filiere'
  | 'prix_location_7j'
  | 'prix_location_30j'
  | 'type_acces'
  | 'featured'
  | 'note_moyenne'
  | 'nb_emprunts'
  | 'nb_vues'
  | 'author_profile_id'
  | 'extract'
>> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type BorrowInsert = Omit<Borrow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type TransactionInsert = Omit<Transaction, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ── Update Types (pour UPDATE) ───────────────────────────────

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>;
export type BookUpdate = Partial<Omit<Book, 'id' | 'created_at'>>;
export type BorrowUpdate = Partial<Omit<Borrow, 'id' | 'created_at'>>;

// ── Database Type (pour le client Supabase typé) ─────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      books: {
        Row: Book;
        Insert: BookInsert;
        Update: BookUpdate;
        Relationships: [];
      };
      borrows: {
        Row: Borrow;
        Insert: BorrowInsert;
        Update: BorrowUpdate;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: TransactionInsert;
        Update: Partial<Transaction>;
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Subscription>;
        Relationships: [];
      };
      reading_progress: {
        Row: ReadingProgress;
        Insert: Omit<ReadingProgress, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<ReadingProgress>;
        Relationships: [];
      };
      reading_sessions: {
        Row: ReadingSession;
        Insert: Omit<ReadingSession, 'id' | 'created_at'>;
        Update: Partial<ReadingSession>;
        Relationships: [];
      };
      book_notes: {
        Row: BookNote;
        Insert: Omit<BookNote, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<BookNote>;
        Relationships: [];
      };
      communities: {
        Row: Community;
        Insert: Omit<Community, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Community>;
        Relationships: [];
      };
      community_members: {
        Row: CommunityMember;
        Insert: Omit<CommunityMember, 'id' | 'joined_at'>;
        Update: Partial<CommunityMember>;
        Relationships: [];
      };
      marketplace_listings: {
        Row: MarketplaceListing;
        Insert: Omit<MarketplaceListing, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<MarketplaceListing>;
        Relationships: [];
      };
      author_profiles: {
        Row: AuthorProfile;
        Insert: Omit<AuthorProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<AuthorProfile>;
        Relationships: [];
      };
      penalties: {
        Row: Penalty;
        Insert: Omit<Penalty, 'id' | 'created_at'>;
        Update: Partial<Penalty>;
        Relationships: [];
      };
      favorites: {
        Row: Favorite;
        Insert: Omit<Favorite, 'id' | 'created_at'>;
        Update: never;
        Relationships: [];
      };
      admin_logs: {
        Row: AdminLog;
        Insert: Omit<AdminLog, 'id' | 'created_at'>;
        Update: never;
        Relationships: [];
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, 'id' | 'created_at'>;
        Update: never;
        Relationships: [];
      };
      announcements: {
        Row: Announcement;
        Insert: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Announcement>;
        Relationships: [];
      };
      reported_content: {
        Row: ReportedContent;
        Insert: Omit<ReportedContent, 'id' | 'created_at'>;
        Update: Partial<ReportedContent>;
        Relationships: [];
      };
      platform_config: {
        Row: PlatformConfig;
        Insert: Omit<PlatformConfig, 'id'>;
        Update: Partial<PlatformConfig>;
        Relationships: [];
      };
      user_stats: {
        Row: UserStats;
        Insert: Omit<UserStats, 'id'> & { id?: string };
        Update: Partial<Omit<UserStats, 'id' | 'user_id'>>;
        Relationships: [];
      };
      user_reading_preferences: {
        Row: UserReadingPreferences;
        Insert: Omit<UserReadingPreferences, 'id'> & { id?: string };
        Update: Partial<Omit<UserReadingPreferences, 'id' | 'user_id'>>;
        Relationships: [];
      };
      badges: {
        Row: Badge;
        Insert: Omit<Badge, 'id'> & { id?: string };
        Update: Partial<Omit<Badge, 'id'>>;
        Relationships: [];
      };
      user_badges: {
        Row: UserBadge;
        Insert: Omit<UserBadge, 'id' | 'unlocked_at'> & { id?: string; unlocked_at?: string };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
