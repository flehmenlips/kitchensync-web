// Database types for KitchenSync Admin Console

export type AdminRole = 'superadmin' | 'admin' | 'content_editor';

export type RecipeCategory = 'Weekly Pick' | 'Seasonal' | 'Quick & Easy' | 'Holiday Special';

export type TipType = 'tip' | 'tutorial' | 'announcement' | 'feature';

export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: AdminRole;
  created_at: string;
}

export interface SharedRecipe {
  id: string;
  title: string;
  description: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: RecipeDifficulty;
  ingredients: string[];
  instructions: string[];
  image_url: string | null;
  tags: string[];
  category: RecipeCategory;
  is_featured: boolean;
  is_active: boolean;
  release_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TipTutorial {
  id: string;
  title: string;
  content: string;
  type: TipType;
  video_url: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  kitchen_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_suspended: boolean | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  suspended_until: string | null;
}

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

// Content Report types for moderation
export type ReportReason = 'spam' | 'inappropriate' | 'copyright' | 'harassment' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';
export type ContentType = 'recipe' | 'comment' | 'user';

// Product types for Marketplace
export type ProductCategory = 'spice' | 'sauce' | 'tool' | 'book' | 'course' | 'kit';
export type ProductStatus = 'active' | 'inactive' | 'draft';

export interface Product {
  id: string;
  creator_id: string;
  creator_name: string | null;
  creator_avatar_url: string | null;
  title: string;
  description: string;
  short_description: string | null;
  category: ProductCategory;
  price_cents: number;
  compare_at_price_cents: number | null;
  inventory_count: number;
  images: string[];
  is_digital: boolean;
  digital_file_url: string | null;
  digital_file_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentReport {
  id: string;
  content_type: ContentType;
  content_id: string;
  content_preview: string | null;
  reporter_id: string;
  reporter_name: string | null;
  reported_user_id: string | null;
  reported_user_name: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  action_taken: string | null;
  created_at: string;
}

// Order types for Marketplace
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  product_id: string;
  product_title: string;
  product_image: string | null;
  quantity: number;
  price_cents: number;
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  creator_id: string;
  creator_name: string | null;
  items: OrderItem[];
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  status: OrderStatus;
  shipping_address: ShippingAddress | null;
  status_history: { status: OrderStatus; timestamp: string; note?: string }[];
  created_at: string;
  updated_at: string;
}

// Payout types for Marketplace
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface CreatorPayout {
  id: string;
  creator_id: string;
  creator_name: string | null;
  creator_email: string | null;
  amount_cents: number;
  period_start: string;
  period_end: string;
  status: PayoutStatus;
  stripe_transfer_id: string | null;
  processed_at: string | null;
  failed_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatorEarning {
  id: string;
  creator_id: string;
  creator_name: string | null;
  order_id: string;
  order_number: string;
  amount_cents: number;
  is_paid: boolean;
  payout_id: string | null;
  created_at: string;
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: AdminUser;
        Insert: Omit<AdminUser, 'id' | 'created_at'>;
        Update: Partial<Omit<AdminUser, 'id' | 'created_at'>>;
      };
      shared_recipes: {
        Row: SharedRecipe;
        Insert: Omit<SharedRecipe, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SharedRecipe, 'id' | 'created_at' | 'updated_at'>>;
      };
      tips_tutorials: {
        Row: TipTutorial;
        Insert: Omit<TipTutorial, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TipTutorial, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>;
      };
      recipes: {
        Row: Recipe;
        Insert: Omit<Recipe, 'id' | 'created_at'>;
        Update: Partial<Omit<Recipe, 'id' | 'created_at'>>;
      };
    };
  };
}
