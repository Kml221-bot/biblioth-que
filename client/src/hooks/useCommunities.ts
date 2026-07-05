// ============================================================
// BiblioTech — Hooks Communautés (Supabase)
// CRUD communautés, membres, notes partagées
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────

export interface CommunityRow {
  id: string;
  nom: string;
  description: string | null;
  type: 'groupe_etude' | 'club_lecture';
  createur_id: string;
  prive: boolean;
  code_invitation: string | null;
  membres_count: number;
  max_membres: number;
  book_id: string | null;
  created_at: string;
  // Jointures
  book_titre?: string;
  createur_name?: string;
  is_member?: boolean;
}

export interface MemberRow {
  id: string;
  community_id: string;
  user_id: string;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
  // Jointure
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
}

export interface SharedNoteRow {
  id: string;
  user_id: string;
  book_id: string;
  page: number;
  contenu: string;
  couleur: string;
  type: string;
  created_at: string;
  user_name?: string;
}

// ── Hook : Liste des communautés ─────────────────────────────

export function useCommunities(userId?: string) {
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommunities = useCallback(async (filters?: { type?: string; search?: string; myOnly?: boolean }) => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.type) query = query.eq('type', filters.type);
      if (filters?.search) query = query.ilike('nom', `%${filters.search}%`);

      // Communautés publiques ou dont l'utilisateur est membre
      if (!filters?.myOnly) {
        query = query.eq('prive', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      let result = (data || []) as CommunityRow[];

      // Si myOnly, chercher les communautés dont l'user est membre
      if (filters?.myOnly && userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: memberships } = await (supabase as any)
          .from('community_members')
          .select('community_id')
          .eq('user_id', userId);

        const memberIds = new Set((memberships || []).map((m: any) => m.community_id));

        // Charger toutes les communautés dont l'user est membre
        if (memberIds.size > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: myCommunities } = await (supabase as any)
            .from('communities')
            .select('*')
            .in('id', Array.from(memberIds));
          result = (myCommunities || []) as CommunityRow[];
        } else {
          result = [];
        }
      }

      // Marquer si l'user est membre
      if (userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: memberships } = await (supabase as any)
          .from('community_members')
          .select('community_id')
          .eq('user_id', userId);
        const memberIds = new Set((memberships || []).map((m: any) => m.community_id));
        result = result.map(c => ({ ...c, is_member: memberIds.has(c.id) }));
      }

      setCommunities(result);
    } catch (err) {
      console.error('Erreur chargement communautés:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchCommunities(); }, [fetchCommunities]);

  return { communities, loading, fetchCommunities };
}

// ── Hook : Détails d'une communauté ──────────────────────────

export function useCommunityDetail(communityId: string, userId?: string) {
  const [community, setCommunity] = useState<CommunityRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [sharedNotes, setSharedNotes] = useState<SharedNoteRow[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [myRole, setMyRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      // Communauté
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: comData } = await (supabase as any)
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single();

      if (comData) setCommunity(comData as CommunityRow);

      // Membres avec profils
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: memData } = await (supabase as any)
        .from('community_members')
        .select('*')
        .eq('community_id', communityId)
        .order('joined_at', { ascending: true });

      const membersList = (memData || []) as MemberRow[];

      // Charger les noms des membres
      if (membersList.length > 0) {
        const userIds = membersList.map(m => m.user_id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        const enriched = membersList.map(m => {
          const profile = profileMap.get(m.user_id) as any;
          return {
            ...m,
            user_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Inconnu',
            user_email: profile?.email || '',
          };
        });
        setMembers(enriched);
      } else {
        setMembers([]);
      }

      // Vérifier si l'utilisateur est membre
      if (userId) {
        const myMembership = membersList.find(m => m.user_id === userId);
        setIsMember(!!myMembership);
        setMyRole(myMembership?.role || '');
      }

      // Notes partagées avec cette communauté
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: notesData } = await (supabase as any)
        .from('book_notes')
        .select('*')
        .eq('shared_with_community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(50);

      setSharedNotes((notesData || []) as SharedNoteRow[]);

    } catch (err) {
      console.error('Erreur chargement détail communauté:', err);
    } finally {
      setLoading(false);
    }
  }, [communityId, userId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  return { community, members, sharedNotes, isMember, myRole, loading, refresh: fetchDetail };
}

// ── Actions ──────────────────────────────────────────────────

export async function createCommunity(data: {
  nom: string;
  description?: string;
  type: 'groupe_etude' | 'club_lecture';
  prive: boolean;
  createur_id: string;
  max_membres?: number;
}) {
  const code = data.prive ? Math.random().toString(36).substring(2, 8).toUpperCase() : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase as any)
    .from('communities')
    .insert({
      ...data,
      code_invitation: code,
      membres_count: 1,
      max_membres: data.max_membres || 30,
    })
    .select()
    .single();

  if (error) throw error;

  // Ajouter le créateur comme admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('community_members')
    .insert({
      community_id: result.id,
      user_id: data.createur_id,
      role: 'admin',
    });

  return result;
}

export async function joinCommunity(communityId: string, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('community_members')
    .insert({
      community_id: communityId,
      user_id: userId,
      role: 'member',
    });

  if (error) throw error;

  // Incrémenter le compteur
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc('increment_membres_count', { community_id: communityId }).catch(() => {
    // Fallback si la fonction RPC n'existe pas
  });
}

export async function leaveCommunity(communityId: string, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function joinByCode(code: string, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: community, error } = await (supabase as any)
    .from('communities')
    .select('id, membres_count, max_membres')
    .eq('code_invitation', code)
    .single();

  if (error || !community) throw new Error('Code d\'invitation invalide');
  if (community.membres_count >= community.max_membres) throw new Error('Cette communauté est pleine');

  await joinCommunity(community.id, userId);
  return community;
}
