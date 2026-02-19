export type PostType = 'photo' | 'video' | 'recipe_share' | 'article' | 'announcement' | 'story';
export type PostVisibility = 'public' | 'followers' | 'private';

export interface PostMedia {
  url: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  thumbnail_url?: string;
  duration_seconds?: number;
}

export interface Post {
  id: string;
  user_id: string;
  business_id: string | null;
  post_type: PostType;
  caption: string | null;
  body: string | null;
  media: PostMedia[];
  recipe_id: string | null;
  shared_recipe_id: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[];
  visibility: PostVisibility;
  like_count: number;
  comment_count: number;
  save_count: number;
  view_count: number;
  share_count: number;
  is_pinned: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  // Joined via batch fetch
  author?: {
    user_id: string;
    display_name: string | null;
    kitchen_name: string | null;
    handle: string | null;
    avatar_url: string | null;
  };
  recipe?: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
  } | null;
  is_liked?: boolean;
  is_saved?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  like_count: number;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    user_id: string;
    display_name: string | null;
    handle: string | null;
    avatar_url: string | null;
  };
}

export interface CreatePostInput {
  post_type: PostType;
  caption?: string;
  body?: string;
  media?: PostMedia[];
  recipe_id?: string;
  shared_recipe_id?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  tags?: string[];
  visibility?: PostVisibility;
  business_id?: string;
}
