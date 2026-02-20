export interface Story {
  id: string;
  user_id: string;
  business_id: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  caption: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  duration_seconds: number | null;
  view_count: number;
  expires_at: string;
  is_highlight: boolean;
  highlight_title: string | null;
  created_at: string;
}

export interface StoryWithAuthor extends Story {
  author?: {
    user_id: string;
    display_name: string | null;
    kitchen_name: string | null;
    handle: string | null;
    avatar_url: string | null;
  };
  is_viewed: boolean;
  business_name?: string | null;
}

export interface StoryGroup {
  user_id: string;
  business_id: string | null;
  author: {
    user_id: string;
    display_name: string | null;
    kitchen_name: string | null;
    handle: string | null;
    avatar_url: string | null;
  };
  business_name: string | null;
  stories: StoryWithAuthor[];
  has_unviewed: boolean;
  latest_at: string;
}
