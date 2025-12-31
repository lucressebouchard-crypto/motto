import { supabase } from '../lib/supabase';

export const favoriteService = {
  /**
   * Ajoute une annonce aux favoris de l'utilisateur
   */
  async add(userId: string, listingId: string): Promise<void> {
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        listing_id: listingId,
      });

    if (error) {
      // Si déjà dans les favoris (contrainte unique), on ignore l'erreur
      if (error.code !== '23505') {
        throw error;
      }
    }
  },

  /**
   * Retire une annonce des favoris de l'utilisateur
   */
  async remove(userId: string, listingId: string): Promise<void> {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId);

    if (error) throw error;
  },

  /**
   * Récupère tous les favoris d'un utilisateur
   */
  async getByUser(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId);

    if (error) throw error;

    return (data || []).map((f: any) => f.listing_id);
  },

  /**
   * Vérifie si une annonce est dans les favoris de l'utilisateur
   */
  async isFavorite(userId: string, listingId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .maybeSingle();

    if (error) throw error;

    return data !== null;
  },
};

