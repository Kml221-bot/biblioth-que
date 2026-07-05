// ============================================================
// BiblioTech Marketplace — Modèle Vinted
// Le vendeur saisit son prix net, BiblioTech ajoute les frais cote acheteur.
// ============================================================

export type BookCondition = 'comme-neuf' | 'tres-bon' | 'bon' | 'acceptable';
export type ListingStatus  = 'active' | 'vendu' | 'reserve';

export interface MarketplaceListing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;    // initiales
  sellerPhone: string;     // prive : notifications / verification seulement
  sellerAddress: string;   // prive : logistique interne seulement
  title: string;
  author: string;
  category: string;
  condition: BookCondition;
  price: number;           // prix affiche a l'acheteur, frais inclus
  sellerNetPrice?: number; // montant net souhaite par le vendeur
  description: string;
  images: string[];        // emojis ou URLs base64
  location: string;        // ex: "Dakar, Plateau"
  status: ListingStatus;
  createdAt: string;
  views: number;
  likes: string[];         // IDs utilisateurs
  messages: MarketplaceMessage[];
}

export interface MarketplaceMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface MarketplaceStats {
  totalListings: number;
  activeListings: number;
  totalSales: number;
  totalRevenue: number;
  platformCommission: number;
}

// ─── Clés localStorage ───────────────────────────────────────
const LISTINGS_KEY = 'marketplace_listings';
const COMMISSION_RATE = 0.2;

// ─── Données de démo pour la foire ──────────────────────────
const DEMO_LISTINGS: MarketplaceListing[] = [
  {
    id: 'ml-001',
    sellerId: 'u-demo-1',
    sellerName: 'Aminata D.',
    sellerAvatar: 'AD',
    sellerPhone: '77 123 45 67',
    sellerAddress: 'Rue Moussé Diop, Plateau, Dakar',
    title: 'Une si longue lettre',
    author: 'Mariama Bâ',
    category: 'Littérature Africaine',
    condition: 'tres-bon',
    price: 2500,
    description: 'Édition originale Les Nouvelles Éditions Africaines. Lu une seule fois, en très bon état. Quelques annotations au crayon facilement effaçables. Un classique incontournable de la littérature sénégalaise.',
    images: ['📮'],
    location: 'Dakar, Plateau',
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    views: 47,
    likes: ['u1', 'u2'],
    messages: [],
  },
  {
    id: 'ml-002',
    sellerId: 'u-demo-2',
    sellerName: 'Moussa S.',
    sellerAvatar: 'MS',
    sellerPhone: '78 234 56 78',
    sellerAddress: 'Avenue Blaise Diagne, Médina, Dakar',
    title: 'Naruto — Tomes 1 à 5',
    author: 'Masashi Kishimoto',
    category: 'Manga & BD',
    condition: 'bon',
    price: 8000,
    description: 'Lot de 5 premiers tomes de Naruto en français (édition Kana). Bonne condition générale, couvertures légèrement usées. Idéal pour débuter la saga !',
    images: ['🍥'],
    location: 'Dakar, Médina',
    status: 'active',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    views: 83,
    likes: ['u1', 'u3', 'u4'],
    messages: [],
  },
  {
    id: 'ml-003',
    sellerId: 'u-demo-3',
    sellerName: 'Fatou N.',
    sellerAvatar: 'FN',
    sellerPhone: '76 345 67 89',
    sellerAddress: 'Quartier Médina Fall, Thiès',
    title: 'L\'Aventure ambiguë',
    author: 'Cheikh Hamidou Kane',
    category: 'Littérature Africaine',
    condition: 'comme-neuf',
    price: 3000,
    description: 'Livre comme neuf, jamais annoté. Acheté pour le bac mais finalement pas utilisé. Édition Julliard. Livraison possible sur Dakar.',
    images: ['🌊'],
    location: 'Thiès',
    status: 'active',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    views: 29,
    likes: [],
    messages: [],
  },
  {
    id: 'ml-004',
    sellerId: 'u-demo-4',
    sellerName: 'Ibrahima K.',
    sellerAvatar: 'IK',
    sellerPhone: '70 456 78 90',
    sellerAddress: 'Route des Almadies, Dakar',
    title: 'Demon Slayer — Tome 1',
    author: 'Koyoharu Gotouge',
    category: 'Manga & BD',
    condition: 'comme-neuf',
    price: 1800,
    description: 'Tome 1 de Demon Slayer en parfait état. Offert en cadeau mais je possède déjà la série complète. À récupérer à Dakar ou envoi possible.',
    images: ['⚔️'],
    location: 'Dakar, Almadies',
    status: 'active',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    views: 61,
    likes: ['u2'],
    messages: [],
  },
  {
    id: 'ml-005',
    sellerId: 'u-demo-5',
    sellerName: 'Rokhaya B.',
    sellerAvatar: 'RB',
    sellerPhone: '77 567 89 01',
    sellerAddress: 'Quartier Nord, Saint-Louis',
    title: 'Les Bouts de bois de Dieu',
    author: 'Ousmane Sembène',
    category: 'Littérature Africaine',
    condition: 'acceptable',
    price: 1500,
    description: 'Roman historique d\'Ousmane Sembène. Quelques pages cornées et annotations de l\'ancien propriétaire. Prix très accessible pour un classique.',
    images: ['🚂'],
    location: 'Saint-Louis',
    status: 'vendu',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    views: 134,
    likes: ['u1', 'u2', 'u3'],
    messages: [],
  },
];

// ─── API localStorage ─────────────────────────────────────────
function loadListings(): MarketplaceListing[] {
  try {
    const stored = localStorage.getItem(LISTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  // Première visite : liste vide, l'utilisateur crée ses propres annonces
  return [];
}

function saveListings(listings: MarketplaceListing[]): void {
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
  window.dispatchEvent(new Event('marketplaceUpdated'));
}

export function getListings(): MarketplaceListing[] {
  return loadListings();
}

export function getActiveListings(): MarketplaceListing[] {
  return loadListings().filter(l => l.status === 'active');
}

export function getMyListings(sellerId: string): MarketplaceListing[] {
  return loadListings().filter(l => l.sellerId === sellerId);
}

export function addListing(listing: Omit<MarketplaceListing, 'id' | 'createdAt' | 'views' | 'likes' | 'messages'>): MarketplaceListing {
  const listings = loadListings();
  const newListing: MarketplaceListing = {
    ...listing,
    id: 'ml-' + Date.now(),
    createdAt: new Date().toISOString(),
    views: 0,
    likes: [],
    messages: [],
  };
  listings.unshift(newListing);
  saveListings(listings);
  return newListing;
}

export function toggleLike(listingId: string, userId: string): void {
  const listings = loadListings();
  const idx = listings.findIndex(l => l.id === listingId);
  if (idx === -1) return;
  const likes = listings[idx].likes;
  const likeIdx = likes.indexOf(userId);
  if (likeIdx === -1) likes.push(userId);
  else likes.splice(likeIdx, 1);
  saveListings(listings);
}

export function incrementViews(listingId: string): void {
  const listings = loadListings();
  const idx = listings.findIndex(l => l.id === listingId);
  if (idx !== -1) { listings[idx].views++; saveListings(listings); }
}

export function addMessage(listingId: string, msg: Omit<MarketplaceMessage, 'id' | 'createdAt'>): void {
  const listings = loadListings();
  const idx = listings.findIndex(l => l.id === listingId);
  if (idx === -1) return;
  listings[idx].messages.push({ ...msg, id: Date.now().toString(), createdAt: new Date().toISOString() });
  saveListings(listings);
}

export function markAsSold(listingId: string): void {
  const listings = loadListings();
  const idx = listings.findIndex(l => l.id === listingId);
  if (idx !== -1) { listings[idx].status = 'vendu'; saveListings(listings); }
}

// ─── Calcul des stats et commissions ─────────────────────────
export function getMarketplaceStats(): MarketplaceStats {
  const listings = loadListings();
  const sold = listings.filter(l => l.status === 'vendu');
  const totalRevenue = sold.reduce((sum, l) => sum + l.price, 0);
  return {
    totalListings: listings.length,
    activeListings: listings.filter(l => l.status === 'active').length,
    totalSales: sold.length,
    totalRevenue,
    platformCommission: sold.reduce((sum, l) => sum + getListingCommission(l), 0),
  };
}

export function computeBuyerPrice(sellerNetPrice: number): number {
  return Math.max(0, Math.round(Number(sellerNetPrice || 0) * (1 + COMMISSION_RATE)));
}

export function computeBuyerCommissionFromSellerNet(sellerNetPrice: number): number {
  return computeBuyerPrice(sellerNetPrice) - Math.max(0, Math.round(Number(sellerNetPrice || 0)));
}

export function computeSellerReceives(priceDisplayed: number): number {
  return Math.max(0, Math.round(Number(priceDisplayed || 0) / (1 + COMMISSION_RATE)));
}

export function getSellerReceives(listing: MarketplaceListing): number {
  return listing.sellerNetPrice ?? computeSellerReceives(listing.price);
}

export function getListingCommission(listing: MarketplaceListing): number {
  return Math.max(0, listing.price - getSellerReceives(listing));
}

// ─── Labels affichage ─────────────────────────────────────────
export const CONDITION_LABELS: Record<BookCondition, { label: string; color: string }> = {
  'comme-neuf':  { label: 'Comme neuf',  color: 'text-green-700  bg-green-100 dark:bg-green-900/40  dark:text-green-300' },
  'tres-bon':    { label: 'Très bon',    color: 'text-blue-700   bg-blue-100  dark:bg-blue-900/40   dark:text-blue-300'  },
  'bon':         { label: 'Bon état',    color: 'text-amber-700  bg-amber-100 dark:bg-amber-900/40  dark:text-amber-300' },
  'acceptable':  { label: 'Acceptable',  color: 'text-orange-700 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300' },
};

export const COMMISSION_RATE_PCT = COMMISSION_RATE * 100;
