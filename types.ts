
export enum Category {
  CAR = 'Voiture',
  MOTO = 'Moto',
  ACCESSORY = 'Accessoire',
  MECHANIC = 'Mécanicien'
}

export type SellerType = 'individual' | 'pro';
export type ItemStatus = 'new' | 'used' | 'imported';
export type UserRole = 'buyer' | 'seller' | 'mechanic';

export interface Listing {
  id: string;
  title: string;
  price: number;
  category: Category;
  images: string[];
  year: number;
  mileage?: number;
  color: string;
  condition: number; // 1-10
  description: string;
  sellerId: string;
  sellerType: SellerType;
  status: ItemStatus;
  location: string;
  isBoosted: boolean;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  shopName?: string;
  phoneNumber?: string;
  address?: string;
  isVerified?: boolean;
  specialties?: string[];
  rating?: number;
  completedInspections?: number;
  hourlyRate?: number;
}

export interface Appointment {
  id: string;
  mechanicId: string;
  buyerId: string;
  sellerId?: string;
  listingId: string;
  date: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  type: 'inspection' | 'maintenance' | 'repair';
}

export interface Quote {
  id: string;
  mechanicId: string;
  clientId: string;
  title: string;
  items: { description: string; price: number }[];
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  total: number;
  createdAt: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  participants: string[];
  listingId?: string;
  messages: Message[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  timestamp: number;
}
