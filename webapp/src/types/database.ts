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

// =============================================
// Customer / Social Types (used by customer web app & iOS)
// =============================================

export type ListType =
  | 'prep'
  | 'shopping'
  | 'todo'
  | 'recipe_ideas'
  | 'wishlist'
  | 'event_planning'
  | 'equipment_needs'
  | 'delegated_tasks'
  | 'custom';

export type ListItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type ListItemPriority = 'high' | 'medium' | 'low';

export interface CustomerRecipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  difficulty: RecipeDifficulty | null;
  image_url: string | null;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  id: string;
  recipe_id: string;
  content: string;
  sort_order: number;
  created_at: string;
}

export interface Instruction {
  id: string;
  recipe_id: string;
  content: string;
  step_number: number;
  created_at: string;
}

export interface RecipePhoto {
  id: string;
  recipe_id: string;
  url: string;
  sort_order: number;
  created_at: string;
}

export interface RecipeTag {
  recipe_id: string;
  tag_id: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface UserList {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  list_type: ListType;
  tags: string[];
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListItem {
  id: string;
  list_id: string;
  content: string;
  status: ListItemStatus;
  priority: ListItemPriority | null;
  section: string | null;
  estimated_time: string | null;
  quantity: string | null;
  unit: string | null;
  assigned_to: string | null;
  notes: string | null;
  percent_complete: number | null;
  recipe_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserMenu {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  occasion: string | null;
  guest_count: number | null;
  date: string | null;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserMenuItem {
  id: string;
  menu_id: string;
  course_name: string;
  item_name: string;
  item_description: string | null;
  recipe_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface InboxItem {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
}

// Social types
export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface FollowRequest {
  id: string;
  requester_id: string;
  target_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface UserSharedRecipe {
  id: string;
  user_id: string;
  recipe_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_urls: string[];
  ingredients: string[];
  instructions: string[];
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  difficulty: RecipeDifficulty | null;
  tags: string[];
  is_public: boolean;
  like_count: number;
  comment_count: number;
  repost_count: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeComment {
  id: string;
  recipe_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  like_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  type: 'follow' | 'like' | 'comment' | 'mention' | 'repost' | 'new_recipe' | 'follow_request';
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface BusinessAccount {
  id: string;
  owner_user_id: string;
  business_name: string;
  business_type: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  brand_color: string | null;
  description: string | null;
  is_verified: boolean;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  id: string;
  business_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  notes: string | null;
}

// Extended user profile with all fields for customer app
export interface CustomerUserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  kitchen_name: string | null;
  avatar_url: string | null;
  measurement_system: string | null;
  prefer_weight_over_volume: boolean;
  temperature_unit: string | null;
  show_nutritional_info: boolean;
  default_servings: number | null;
  enable_cooking_timers: boolean;
  enable_shopping_reminders: boolean;
  account_type: string | null;
  created_at: string;
  updated_at: string;
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
