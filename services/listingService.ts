import { supabase } from '../lib/supabase';
import { Listing, Category, SellerType, ItemStatus } from '../types';

export interface CreateListingData {
  title: string;
  price: number;
  category: Category;
  images: string[];
  year: number;
  mileage?: number;
  color: string;
  condition: number;
  description: string;
  sellerType: SellerType;
  status: ItemStatus;
  location: string;
  sellerId: string;
}

export const listingService = {
  async create(data: CreateListingData): Promise<Listing> {
    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        title: data.title,
        price: data.price,
        category: data.category,
        images: data.images,
        year: data.year,
        mileage: data.mileage,
        color: data.color,
        condition: data.condition,
        description: data.description,
        seller_id: data.sellerId,
        seller_type: data.sellerType,
        status: data.status,
        location: data.location,
        is_boosted: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return mapListingFromDB(listing);
  },

  async getAll(filters?: {
    category?: Category;
    searchQuery?: string;
    sellerId?: string;
  }): Promise<Listing[]> {
    let query = supabase.from('listings').select('*').order('created_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.sellerId) {
      query = query.eq('seller_id', filters.sellerId);
    }

    // Recherche côté serveur avec ilike pour une meilleure performance
    if (filters?.searchQuery) {
      const search = filters.searchQuery.trim();
      query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(mapListingFromDB);
  },

  async getById(id: string): Promise<Listing | null> {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? mapListingFromDB(data) : null;
  },

  async update(id: string, updates: Partial<CreateListingData>): Promise<Listing> {
    const updateData: any = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.category) updateData.category = updates.category;
    if (updates.images) updateData.images = updates.images;
    if (updates.year) updateData.year = updates.year;
    if (updates.mileage !== undefined) updateData.mileage = updates.mileage;
    if (updates.color) updateData.color = updates.color;
    if (updates.condition !== undefined) updateData.condition = updates.condition;
    if (updates.description) updateData.description = updates.description;
    if (updates.sellerType) updateData.seller_type = updates.sellerType;
    if (updates.status) updateData.status = updates.status;
    if (updates.location) updateData.location = updates.location;

    const { data, error } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapListingFromDB(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (error) throw error;
  },

  async boost(id: string): Promise<Listing> {
    const { data, error } = await supabase
      .from('listings')
      .update({ is_boosted: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapListingFromDB(data);
  },
};

function mapListingFromDB(dbListing: any): Listing {
  return {
    id: dbListing.id,
    title: dbListing.title,
    price: dbListing.price,
    category: dbListing.category,
    images: dbListing.images || [],
    year: dbListing.year,
    mileage: dbListing.mileage,
    color: dbListing.color,
    condition: dbListing.condition,
    description: dbListing.description,
    sellerId: dbListing.seller_id,
    sellerType: dbListing.seller_type,
    status: dbListing.status,
    location: dbListing.location,
    isBoosted: dbListing.is_boosted || false,
    createdAt: new Date(dbListing.created_at).getTime(),
  };
}

