export interface TrendingHashtag {
  id: string;
  tag: string;
  use_count: number;
  trending_score: number;
}

export interface NearbyPost {
  id: string;
  user_id: string;
  business_id: string | null;
  post_type: string;
  caption: string | null;
  media: any[];
  tags: string[];
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  distance_meters: number;
}
