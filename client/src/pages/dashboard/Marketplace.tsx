import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Plus, Heart, MessageCircle, Eye, MapPin,
  Search, X, Check, TrendingUp, Tag, Send,
  AlertCircle, Package, Banknote, ShieldCheck
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import {
  getListings, addListing, toggleLike, incrementViews, addMessage, markAsSold,
  getMarketplaceStats, computeBuyerPrice, computeBuyerCommissionFromSellerNet,
  getListingCommission, getSellerReceives,
  CONDITION_LABELS, COMMISSION_RATE_PCT,
  type MarketplaceListing, type BookCondition,
} from '@/services/marketplaceStore';

// ─── Composant carte annonce ─────────────────────────────────
const ListingCard: React.FC<{
  listing: MarketplaceListing;
  userId: string;
  onSelect: (l: MarketplaceListing) => void;
}> = ({ listing, userId, onSelect }) => {
  const [liked, setLiked] = useState(listing.likes.includes(userId));
  const [likesCount, setLikesCount] = useState(listing.likes.length);
  const cond = CONDITION_LABELS[listing.condition];
  const isSold = listing.status === 'vendu';

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(listing.id, userId);
    setLiked(v => !v);
    setLikesCount(v => liked ? v - 1 : v + 1);
  };

  return (
    <motion.div
      layout whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
      onClick={() => { incrementViews(listing.id); onSelect(listing); }}
      className={`bg-card border rounded-2xl overflow-hidden cursor-pointer transition-shadow hover:shadow-lg ${
        isSold ? 'opacity-60 border-border' : 'border-border hover:border-primary/30'
      }`}
    >
      {/* Image / Emoji cover */}
      <div className="relative h-36 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
        {listing.images[0] && listing.images[0].startsWith('data:') ? (
          <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <span className="text-5xl">{listing.images[0] || '📚'}</span>
        )}
        {isSold && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">VENDU</span>
          </div>
        )}
        <button onClick={handleLike}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            liked ? 'bg-red-500 text-white shadow-md' : 'bg-white/80 text-gray-600 hover:bg-red-50'
          }`}>
          <Heart className={`w-4 h-4 ${liked ? 'fill-white' : ''}`} />
        </button>
        <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${cond.color}`}>
          {cond.label}
        </span>
      </div>

      {/* Infos */}
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-1">{listing.title}</h3>
        <p className="text-xs text-muted-foreground">{listing.author}</p>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">{listing.price.toLocaleString()} FCFA</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {listing.location.split(',')[0]}
          </span>
        </div>

        {/* Footer stats */}
        <div className="flex items-center gap-3 pt-1 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{listing.views}</span>
          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{likesCount}</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{listing.messages.length}</span>
          <span className="ml-auto">{listing.sellerName}</span>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Modal détail annonce ────────────────────────────────────
const ListingModal: React.FC<{
  listing: MarketplaceListing;
  userId: string;
  userName: string;
  onClose: () => void;
}> = ({ listing, userId, userName, onClose }) => {
  const [msgText, setMsgText] = useState('');
  const [messages, setMessages] = useState(listing.messages);
  const [liked, setLiked] = useState(listing.likes.includes(userId));
  const cond = CONDITION_LABELS[listing.condition];
  const commission = getListingCommission(listing);
  const sellerReceives = getSellerReceives(listing);
  const isOwner = listing.sellerId === userId;

  const sendMsg = () => {
    if (!msgText.trim()) return;
    addMessage(listing.id, { senderId: userId, senderName: userName, content: msgText.trim() });
    setMessages(prev => [...prev, {
      id: Date.now().toString(), senderId: userId, senderName: userName,
      content: msgText.trim(), createdAt: new Date().toISOString(),
    }]);
    setMsgText('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
              {listing.sellerAvatar}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{listing.sellerName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {listing.location}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Cover + infos principales */}
          <div className="flex gap-5">
            <div className="w-24 h-32 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
              {listing.images[0] && listing.images[0].startsWith('data:') ? (
                <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-4xl">
                  {listing.images[0] || '📚'}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-xl font-bold text-foreground">{listing.title}</h2>
              <p className="text-muted-foreground">{listing.author}</p>
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cond.color}`}>{cond.label}</span>
              <p className="text-2xl font-bold text-primary">{listing.price.toLocaleString()} FCFA</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold text-foreground mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
          </div>

          {/* Contact protege */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Contact protege
            </h3>
            <p className="text-sm text-muted-foreground">
              Le numero du vendeur reste prive. Utilise la messagerie BiblioTech pour discuter, puis le paiement securise pour finaliser l'achat.
            </p>
          </div>

          {/* Détail prix + commission */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Banknote className="w-4 h-4 text-green-600" /> Détail financier
            </h3>
            {isOwner ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tu recois</span>
                  <span className="font-semibold text-green-600">{sellerReceives.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>Frais BiblioTech ajoutes ({COMMISSION_RATE_PCT}%)</span>
                  <span>+ {commission.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-border">
                  <span>Prix vu par l'acheteur</span>
                  <span>{listing.price.toLocaleString()} FCFA</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between font-bold">
                  <span>Prix a payer</span>
                  <span>{listing.price.toLocaleString()} FCFA</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Frais de service inclus pour securiser la transaction et proteger les echanges.
                </p>
              </div>
            )}
          </div>

          {/* Messagerie */}
          {!isOwner && listing.status === 'active' && (
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Contacter le vendeur
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                {messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucun message — sois le premier à contacter !</p>
                ) : messages.map(m => (
                  <div key={m.id} className={`flex gap-2 ${m.senderId === userId ? 'justify-end' : ''}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                      m.senderId === userId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}>
                      <p className="text-xs opacity-70 mb-0.5">{m.senderName}</p>
                      <p>{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={msgText} onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMsg()}
                  placeholder="Écrire un message..."
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <button onClick={sendMsg} className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {/* Messages rapides */}
              <div className="flex gap-2 flex-wrap mt-2">
                {["Est-ce disponible ?", "Livraison possible ?", "Peut-on négocier ?"].map(t => (
                  <button key={t} onClick={() => setMsgText(t)}
                    className="text-xs px-2 py-1 border border-border rounded-full hover:bg-muted transition-colors text-muted-foreground">
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bouton marquer vendu (propriétaire) */}
          {isOwner && listing.status === 'active' && (
            <button onClick={() => { markAsSold(listing.id); onClose(); }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors">
              <Check className="w-5 h-5" /> Marquer comme vendu
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Formulaire vente ────────────────────────────────────────
const SellForm: React.FC<{ userId: string; userName: string; onClose: () => void; onSuccess: () => void }> = ({
  userId, userName, onClose, onSuccess
}) => {
  const [form, setForm] = useState({
    title: '', author: '', category: 'Littérature Africaine',
    condition: 'bon' as BookCondition,
    price: '', description: '', location: '', image: '📚',
    phone: '', address: '',
  });
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');


  const sellerGets = form.price ? Number(form.price) : 0;
  const commission = form.price ? computeBuyerCommissionFromSellerNet(sellerGets) : 0;
  const buyerPrice = form.price ? computeBuyerPrice(sellerGets) : 0;

  const validate = () => {
    if (!form.title.trim()) return 'Le titre est requis';
    if (!form.author.trim()) return "L'auteur est requis";
    if (!form.price || Number(form.price) < 500) return 'Prix minimum : 500 FCFA';
    if (!form.image) return 'Une photo du livre est requise';
    if (!form.description.trim() || form.description.length < 20) return 'Description trop courte (min 20 caractères)';
    if (!form.location.trim()) return 'La localisation est requise';
    if (!form.phone.trim()) return 'Le numéro de téléphone est requis';
    return '';
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) { setError(err); return; }
    addListing({
      sellerId: userId, sellerName: userName,
      sellerAvatar: userName.split(' ').map(n => n[0]).join('').toUpperCase(),
      sellerPhone: form.phone, sellerAddress: form.address,
      title: form.title, author: form.author, category: form.category,
      condition: form.condition, price: buyerPrice, sellerNetPrice: sellerGets,
      description: form.description, images: [form.image],
      location: form.location, status: 'active',
    });
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-primary/5">
          <div>
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" /> Mettre en vente
            </h2>
            <p className="text-xs text-muted-foreground">Étape {step}/2</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h3 className="font-semibold text-foreground">Informations du livre</h3>

              {/* Upload photo du livre */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  📸 Photo du livre *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    id="book-photo"
                    className="sr-only"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) { setError('Image trop lourde (max 5MB)'); return; }
                      const reader = new FileReader();
                      reader.onload = () => setForm(p => ({...p, image: reader.result as string}));
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label htmlFor="book-photo"
                    className={`flex flex-col items-center justify-center gap-2 w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-primary/60 hover:bg-primary/5 ${
                      form.image && form.image.startsWith('data:') ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-border bg-muted/30'
                    }`}>
                    {form.image && form.image.startsWith('data:') ? (
                      <img src={form.image} alt="Preview" className="h-full w-full object-contain rounded-xl p-1" />
                    ) : (
                      <>
                        <span className="text-3xl">📸</span>
                        <p className="text-sm font-semibold text-foreground">Prendre une photo ou choisir</p>
                        <p className="text-xs text-muted-foreground">Appuie pour ouvrir l'appareil photo</p>
                      </>
                    )}
                  </label>
                  {form.image && form.image.startsWith('data:') && (
                    <button onClick={() => setForm(p => ({...p, image: ''}))}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {[
                { key: 'title', label: 'Titre du livre *', placeholder: 'Ex: Une si longue lettre' },
                { key: 'author', label: 'Auteur *', placeholder: 'Ex: Mariama Bâ' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Catégorie</label>
                  <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    {['Littérature Africaine','Manga & BD','Classiques','Science-Fiction','Dystopie','Autre'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">État</label>
                  <select value={form.condition} onChange={e => setForm(p => ({...p, condition: e.target.value as BookCondition}))}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button onClick={() => { setError(''); setStep(2); }}
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors">
                Suivant →
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h3 className="font-semibold text-foreground">Prix & description</h3>

              {/* Prix + simulation commission */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Montant que tu veux recevoir (FCFA) *</label>
                <input type="number" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))}
                  placeholder="Ex: 3000"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                {form.price && Number(form.price) >= 500 && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between font-bold text-green-600">
                      <span>Tu reçois</span>
                      <span>{sellerGets.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>Frais BiblioTech ajoutés ({COMMISSION_RATE_PCT}%)</span>
                      <span>+ {commission.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-border">
                      <span>L'acheteur verra</span>
                      <span>{buyerPrice.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Localisation *</label>
                <input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))}
                  placeholder="Ex: Dakar, Plateau"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>

              {/* Coordonnées du vendeur */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Coordonnees privees vendeur
                </p>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Numéro de téléphone *</label>
                  <input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))}
                    placeholder="Ex: 77 123 45 67"
                    type="tel"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Adresse physique</label>
                  <input value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))}
                    placeholder="Ex: Rue 10, Médina, Dakar"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Description * <span className="text-muted-foreground font-normal">({form.description.length}/200)</span>
                </label>
                <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value.slice(0,200)}))}
                  placeholder="État du livre, historique, livraison possible..."
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition-colors">
                  ← Retour
                </button>
                <button onClick={handleSubmit}
                  className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> Publier
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Page principale Marketplace ─────────────────────────────
export default function Marketplace() {
  const { user } = useAuth();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [selected, setSelected] = useState<MarketplaceListing | null>(null);
  const [showSell, setShowSell] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('Tous');
  const [filterCond, setFilterCond] = useState('Tous');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'mine'>('active');
  const [showSuccess, setShowSuccess] = useState(false);

  const userId   = user?.id ?? 'anonymous';
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Invité';

  const reload = () => setListings(getListings());

  useEffect(() => {
    reload();
    window.addEventListener('marketplaceUpdated', reload);
    return () => window.removeEventListener('marketplaceUpdated', reload);
  }, []);

  const stats = useMemo(() => getMarketplaceStats(), [listings]);
  const categories = ['Tous', ...Array.from(new Set(listings.map(l => l.category)))];

  const filtered = listings.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.title.toLowerCase().includes(q) || l.author.toLowerCase().includes(q) || l.location.toLowerCase().includes(q);
    const matchCat  = filterCat  === 'Tous' || l.category   === filterCat;
    const matchCond = filterCond === 'Tous' || l.condition   === filterCond;
    const matchStat = filterStatus === 'all'  ? true
                    : filterStatus === 'mine' ? l.sellerId === userId
                    : l.status === 'active';
    return matchSearch && matchCat && matchCond && matchStat;
  });

  return (
    <DashboardLayout>
      <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-primary" /> Marketplace
            </h1>
            <p className="text-sm text-muted-foreground">Achète et vends des livres physiques entre membres</p>
          </div>
          <button onClick={() => setShowSell(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md">
            <Plus className="w-5 h-5" /> Vendre un livre
          </button>
        </div>

        {/* Notification succès */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 px-4 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl">
              <Check className="w-5 h-5" />
              <span className="font-medium">Ton livre est maintenant en vente ! Visible par tous les membres.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Package, label: 'Annonces actives', value: stats.activeListings, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { icon: Tag, label: 'Total ventes', value: stats.totalSales, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
            { icon: Banknote, label: 'Volume échangé', value: `${(stats.totalRevenue/1000).toFixed(0)}K FCFA`, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { icon: TrendingUp, label: 'Commission BiblioTech', value: `${stats.platformCommission.toLocaleString()} FCFA`, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className={`${s.bg} rounded-xl p-4`}>
                <Icon className={`w-5 h-5 ${s.color} mb-2`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* Barre de recherche + filtres */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un livre, auteur, ville..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            {/* Filtre statut */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
              {([['active','Disponibles'],['mine','Mes annonces'],['all','Tout voir']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setFilterStatus(v)}
                  className={`px-3 py-2 transition-colors ${filterStatus === v ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Catégorie */}
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* État */}
            <select value={filterCond} onChange={e => setFilterCond(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none">
              <option value="Tous">Tous états</option>
              {Object.entries(CONDITION_LABELS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>

            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} annonce(s)</span>
          </div>
        </div>

        {/* Grille annonces */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucune annonce trouvée</p>
            <p className="text-sm mt-1">Essaie d'autres filtres ou sois le premier à vendre !</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(l => (
              <ListingCard key={l.id} listing={l} userId={userId} onSelect={setSelected} />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {selected && (
          <ListingModal listing={selected} userId={userId} userName={userName}
            onClose={() => { setSelected(null); reload(); }} />
        )}
        {showSell && (
          <SellForm userId={userId} userName={userName}
            onClose={() => setShowSell(false)}
            onSuccess={() => { setShowSuccess(true); reload(); setTimeout(() => setShowSuccess(false), 4000); }} />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
