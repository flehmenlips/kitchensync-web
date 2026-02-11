 # KitchenSync Supabase Database Schema

> **Shared Reference Document**
> This schema is used by both the iOS mobile app and the admin web console.
> Last updated: 2026-02-04

---

## Quick Links

- [User Management](#user-management)
- [Recipes](#recipes)
- [Menus](#menus)
- [Lists & Tasks](#lists--tasks)
- [Admin Content](#admin-content)
- [Analytics](#analytics)
- [Storage Buckets](#storage-buckets)
- [Admin Setup](#admin-setup)

---

## User Management

### `user_profiles`

Stores user profile information and settings. Auto-created on signup via trigger.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | - | References `auth.users(id)`, UNIQUE |
| `kitchen_name` | TEXT | `'My Kitchen'` | User's kitchen name |
| `display_name` | TEXT | NULL | User's display name |
| `avatar_url` | TEXT | NULL | Avatar image URL |
| `is_admin` | BOOLEAN | `false` | **Admin flag for superadmin access** |
| `measurement_system` | TEXT | `'imperial'` | `'metric'` or `'imperial'` |
| `prefer_weight_over_volume` | BOOLEAN | `false` | Weight preference |
| `temperature_unit` | TEXT | `'fahrenheit'` | `'celsius'` or `'fahrenheit'` |
| `show_nutritional_info` | BOOLEAN | `true` | Show nutrition data |
| `default_servings` | INTEGER | `4` | Default recipe servings (1-24) |
| `enable_cooking_timers` | BOOLEAN | `true` | Timer notifications |
| `enable_shopping_reminders` | BOOLEAN | `true` | Shopping reminders |
| `last_content_viewed_at` | TIMESTAMPTZ | NULL | Last viewed new content |
| `last_shared_recipes_viewed_at` | TIMESTAMPTZ | NULL | Last viewed shared recipes |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |
| `updated_at` | TIMESTAMPTZ | `NOW()` | Updated timestamp (auto-updated) |

**RLS Policies:**
- Users can SELECT/INSERT/UPDATE their own profile (`auth.uid() = user_id`)
- Admins can SELECT all profiles (for support/admin console)
- Admin check: `is_admin = true` for admin-only operations

### RLS Policies for `user_profiles`

```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins can view ALL user profiles (read-only for support purposes)
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid() AND up.is_admin = true
        )
    );
```

### RLS Policies for `recipes` (Admin Read Access)

```sql
-- Users can manage their own recipes (existing policy)
CREATE POLICY "Users can manage own recipes" ON recipes
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins can view ALL recipes (read-only for support/stats)
CREATE POLICY "Admins can view all recipes" ON recipes
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_admin = true
        )
    );
```

---

## Recipes

### `recipes`

User's personal recipe collection.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `uuid_generate_v4()` | Primary key |
| `user_id` | UUID | - | Owner user ID |
| `title` | VARCHAR(255) | - | Recipe title (required) |
| `description` | TEXT | NULL | Recipe description |
| `prep_time` | VARCHAR(50) | NULL | e.g., "15 mins" |
| `cook_time` | VARCHAR(50) | NULL | e.g., "30 mins" |
| `servings` | INTEGER | `4` | Number of servings |
| `difficulty` | VARCHAR(20) | `'Medium'` | `'Easy'`, `'Medium'`, `'Hard'` |
| `image_url` | TEXT | NULL | Primary image URL |
| `is_ai_generated` | BOOLEAN | `false` | Was this AI-generated? |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |
| `updated_at` | TIMESTAMPTZ | `NOW()` | Updated timestamp |

### `ingredients`

Recipe ingredients (one-to-many with recipes).

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `uuid_generate_v4()` | Primary key |
| `recipe_id` | UUID | - | FK to `recipes.id` (CASCADE) |
| `content` | TEXT | - | Ingredient text (required) |
| `sort_order` | INTEGER | `0` | Display order |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |

### `instructions`

Recipe steps (one-to-many with recipes).

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `uuid_generate_v4()` | Primary key |
| `recipe_id` | UUID | - | FK to `recipes.id` (CASCADE) |
| `content` | TEXT | - | Instruction text (required) |
| `step_number` | INTEGER | - | Step order (required) |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |

### `recipe_photos`

Multiple photos per recipe.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `uuid_generate_v4()` | Primary key |
| `recipe_id` | UUID | - | FK to `recipes.id` (CASCADE) |
| `url` | TEXT | - | Photo URL |
| `sort_order` | INTEGER | `0` | Display order |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |

### `tags`

Tag definitions (shared across recipes and assets).

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `uuid_generate_v4()` | Primary key |
| `name` | VARCHAR(100) | - | Tag name (UNIQUE, required) |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |

### `recipe_tags`

Junction table for recipe-tag relationships.

| Column | Type | Description |
|--------|------|-------------|
| `recipe_id` | UUID | FK to `recipes.id` (CASCADE) |
| `tag_id` | UUID | FK to `tags.id` (CASCADE) |
| **PK** | | `(recipe_id, tag_id)` |

---

## Menus

### `menus`

User-created menus for events and meal planning.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `uuid_generate_v4()` | Primary key |
| `user_id` | UUID | - | Owner user ID |
| `title` | VARCHAR(255) | - | Menu title (required) |
| `description` | TEXT | NULL | Menu description |
| `occasion` | VARCHAR(100) | NULL | e.g., "Birthday Party" |
| `guest_count` | INTEGER | NULL | Number of guests |
| `date` | DATE | NULL | Event date |
| `is_ai_generated` | BOOLEAN | `false` | Was this AI-generated? |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |
| `updated_at` | TIMESTAMPTZ | `NOW()` | Updated timestamp |

### `menu_items`

Items within a menu, organized by course.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `uuid_generate_v4()` | Primary key |
| `menu_id` | UUID | - | FK to `menus.id` (CASCADE) |
| `course_name` | VARCHAR(100) | - | e.g., "Appetizer", "Main Course" |
| `item_name` | VARCHAR(255) | - | Dish name (required) |
| `item_description` | TEXT | NULL | Dish description |
| `recipe_id` | UUID | NULL | FK to `recipes.id` (optional link) |
| `sort_order` | INTEGER | `0` | Display order |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |

---

## Lists & Tasks

### `lists`

User's task lists (prep lists, shopping lists, etc.).

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `uuid_generate_v4()` | Primary key |
| `user_id` | UUID | - | Owner user ID |
| `title` | VARCHAR(255) | - | List title (required) |
| `description` | TEXT | NULL | List description |
| `list_type` | VARCHAR(50) | `'to-do'` | Type of list (see below) |
| `tags` | TEXT[] | `'{}'` | Array of tags |
| `is_completed` | BOOLEAN | `false` | Is list completed? |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |
| `updated_at` | TIMESTAMPTZ | `NOW()` | Updated timestamp |

**List Types:** `prep`, `shopping`, `to-do`, `recipe-ideas`, `wishlist`, `event-planning`, `equipment-needs`, `delegated`, `custom`

### `list_items`

Tasks within a list.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `uuid_generate_v4()` | Primary key |
| `list_id` | UUID | - | FK to `lists.id` (CASCADE) |
| `content` | TEXT | - | Task text (required) |
| `status` | VARCHAR(50) | `'pending'` | Task status (see below) |
| `priority` | VARCHAR(20) | `'medium'` | `'high'`, `'medium'`, `'low'` |
| `section` | VARCHAR(100) | NULL | Section name |
| `estimated_time` | VARCHAR(50) | NULL | e.g., "30 mins" |
| `quantity` | DECIMAL | NULL | For shopping lists |
| `unit` | VARCHAR(50) | NULL | e.g., "lbs", "cups" |
| `assigned_to` | VARCHAR(255) | NULL | Delegated to whom |
| `notes` | TEXT | NULL | Additional notes |
| `percent_complete` | INTEGER | `0` | 0-100 for partial progress |
| `recipe_id` | UUID | NULL | FK to `recipes.id` (optional link) |
| `sort_order` | INTEGER | `0` | Display order |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |
| `updated_at` | TIMESTAMPTZ | `NOW()` | Updated timestamp |

**Task Statuses:** `pending`, `in-progress`, `partially-complete`, `completed`, `blocked`, `delegated`, `cancelled`

### `inbox_items`

Quick-captured items waiting to be organized.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `uuid_generate_v4()` | Primary key |
| `user_id` | UUID | - | Owner user ID |
| `text` | TEXT | - | Captured text (required) |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |

---

## Admin Content

### `shared_recipes`

Admin-curated recipes shared with all users.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `uuid_generate_v4()` | Primary key |
| `title` | VARCHAR(255) | - | Recipe title (required) |
| `description` | TEXT | NULL | Recipe description |
| `prep_time` | VARCHAR(50) | NULL | e.g., "15 mins" |
| `cook_time` | VARCHAR(50) | NULL | e.g., "30 mins" |
| `servings` | INTEGER | `4` | Number of servings |
| `difficulty` | VARCHAR(20) | `'Medium'` | `'Easy'`, `'Medium'`, `'Hard'` |
| `ingredients` | TEXT[] | `'{}'` | Array of ingredients |
| `instructions` | TEXT[] | `'{}'` | Array of steps |
| `image_url` | TEXT | NULL | Primary image URL |
| `image_urls` | TEXT[] | `'{}'` | Additional image URLs |
| `tags` | TEXT[] | `'{}'` | Array of tags |
| `category` | VARCHAR(100) | NULL | e.g., "Weekly Pick", "Seasonal" |
| `is_featured` | BOOLEAN | `false` | Show prominently? |
| `is_active` | BOOLEAN | `true` | Visible to users? |
| `release_date` | TIMESTAMPTZ | `NOW()` | When to publish |
| `created_by` | UUID | - | FK to `auth.users(id)` (admin) |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |
| `updated_at` | TIMESTAMPTZ | `NOW()` | Updated timestamp |

**Categories:** `Weekly Pick`, `Seasonal`, `Quick & Easy`, `Holiday Special`, `Comfort Food`, `Healthy`, `Budget-Friendly`

### `user_saved_shared_recipes`

Tracks which users saved which shared recipes.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `uuid_generate_v4()` | Primary key |
| `user_id` | UUID | - | FK to `auth.users(id)` (CASCADE) |
| `shared_recipe_id` | UUID | - | FK to `shared_recipes(id)` (CASCADE) |
| `saved_at` | TIMESTAMPTZ | `NOW()` | When saved |
| **UNIQUE** | | `(user_id, shared_recipe_id)` |

### `new_content`

Admin-managed tips, tutorials, features, and announcements.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `uuid_generate_v4()` | Primary key |
| `title` | VARCHAR(255) | - | Content title (required) |
| `description` | TEXT | - | Content body (required) |
| `video_url` | TEXT | NULL | Video URL (Supabase Storage) |
| `thumbnail_url` | TEXT | NULL | Thumbnail image URL |
| `content_type` | VARCHAR(50) | - | `'tutorial'`, `'tip'`, `'feature'`, `'announcement'` |
| `is_active` | BOOLEAN | `true` | Visible to users? |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |

---

## Analytics

### `content_views`

Tracks user engagement with content items.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | - | FK to `auth.users(id)` (CASCADE) |
| `content_id` | UUID | - | FK to `new_content(id)` (CASCADE) |
| `viewed_at` | TIMESTAMPTZ | `NOW()` | When viewed (required) |
| `source` | TEXT | - | `'auto_popup'`, `'tips_screen'`, `'bell_icon'` |
| `duration_seconds` | INTEGER | NULL | How long viewed |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |

### `user_content_views`

Alternative tracking table (may be deprecated).

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | - | FK to `auth.users(id)` |
| `content_id` | UUID | - | Content item ID |
| `created_at` | TIMESTAMPTZ | `NOW()` | When viewed |

### `user_onboarding`

Tracks user onboarding completion.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | - | FK to `auth.users(id)` (CASCADE) |
| `completed_at` | TIMESTAMPTZ | NULL | When onboarding completed |
| `skipped` | BOOLEAN | `false` | Did user skip? |
| `created_at` | TIMESTAMPTZ | `NOW()` | Created timestamp |

---

## Storage Buckets

| Bucket | Purpose | Public |
|--------|---------|--------|
| `avatars` | User profile avatars | Yes |
| `recipe-photos` | User recipe photos | Yes |
| `recipe-assets` | Shared recipe images | Yes |
| `videos` | Tutorial/tip videos | Yes |

---

## Admin Setup

### Add Admin Column (if not exists)

Run this SQL to add the admin flag to `user_profiles`:

```sql
-- Add is_admin column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin) WHERE is_admin = true;
```

### Set Your User as Superadmin

Replace `YOUR_USER_ID_HERE` with your actual Supabase user ID:

```sql
-- Make a user a superadmin
UPDATE user_profiles
SET is_admin = true
WHERE user_id = 'YOUR_USER_ID_HERE';

-- Verify it worked
SELECT user_id, display_name, kitchen_name, is_admin
FROM user_profiles
WHERE is_admin = true;
```

**To find your user ID:**
1. Go to Supabase Dashboard > Authentication > Users
2. Find your email and copy the UUID from the "User UID" column

### RLS Policies for `admin_users` Table

**IMPORTANT:** The admin portal needs to read from `admin_users` to check if logged-in users have admin access. Without this policy, RLS will block access and users will be denied.

```sql
-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to check their own admin status
-- This is required for the admin portal login to work
CREATE POLICY "Users can check their own admin status" ON admin_users
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR email = auth.jwt() ->> 'email'
        OR id = auth.uid()
    );

-- Only superadmins can manage other admins
CREATE POLICY "Superadmins can manage admin_users" ON admin_users
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE (au.user_id = auth.uid() OR au.id = auth.uid())
            AND au.role = 'superadmin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE (au.user_id = auth.uid() OR au.id = auth.uid())
            AND au.role = 'superadmin'
        )
    );
```

---

### Admin RLS Policies for `shared_recipes`

```sql
-- Allow admins to manage shared recipes
CREATE POLICY "Admins can insert shared recipes" ON shared_recipes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can update shared recipes" ON shared_recipes
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can delete shared recipes" ON shared_recipes
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.is_admin = true
        )
    );

-- Admins can view ALL shared recipes (including inactive/future)
CREATE POLICY "Admins can view all shared recipes" ON shared_recipes
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.is_admin = true
        )
        OR (is_active = true AND release_date <= NOW())
    );
```

### Admin RLS Policies for `new_content`

```sql
-- Enable RLS if not already
ALTER TABLE new_content ENABLE ROW LEVEL SECURITY;

-- Anyone can view active content
CREATE POLICY "Anyone can view active content" ON new_content
    FOR SELECT
    USING (is_active = true);

-- Admins can manage all content
CREATE POLICY "Admins can insert content" ON new_content
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can update content" ON new_content
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can delete content" ON new_content
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.is_admin = true
        )
    );
```

### Helper Function to Check Admin Status

```sql
-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## TypeScript Types

For both mobile app and admin console, use these shared types:

```typescript
// User Profile
interface UserProfile {
  id: string;
  user_id: string;
  kitchen_name: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  measurement_system: 'metric' | 'imperial';
  prefer_weight_over_volume: boolean;
  temperature_unit: 'celsius' | 'fahrenheit';
  show_nutritional_info: boolean;
  default_servings: number;
  enable_cooking_timers: boolean;
  enable_shopping_reminders: boolean;
  last_content_viewed_at: string | null;
  last_shared_recipes_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Shared Recipe (admin-managed)
interface SharedRecipe {
  id: string;
  title: string;
  description: string | null;
  prep_time: string | null;
  cook_time: string | null;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: string[];
  instructions: string[];
  image_url: string | null;
  image_urls: string[];
  tags: string[];
  category: string | null;
  is_featured: boolean;
  is_active: boolean;
  release_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// New Content (admin-managed)
interface NewContent {
  id: string;
  title: string;
  description: string;
  video_url: string | null;
  thumbnail_url: string | null;
  content_type: 'tutorial' | 'tip' | 'feature' | 'announcement';
  is_active: boolean;
  created_at: string;
}
```

---

## Admin Dashboard RPC Functions

These functions use `SECURITY DEFINER` to bypass RLS and return aggregate stats for the admin dashboard. They check admin status internally before returning data.

### `get_admin_dashboard_stats()`

Returns platform-wide counts for the admin dashboard. Only callable by admins.

```sql
-- Create the admin dashboard stats function
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Only allow admins to call this function
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Return aggregate counts (no sensitive data)
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM user_profiles),
    'total_recipes', (SELECT count(*) FROM recipes),
    'shared_recipes', (SELECT count(*) FROM shared_recipes WHERE is_active = true),
    'active_tips', (SELECT count(*) FROM new_content WHERE content_type IN ('tip', 'tutorial') AND is_active = true),
    'total_menus', (SELECT count(*) FROM menus),
    'total_lists', (SELECT count(*) FROM lists)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (function checks admin status internally)
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
```

**Usage from frontend:**
```typescript
const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
// Returns: { total_users: 150, total_recipes: 500, shared_recipes: 25, active_tips: 10, ... }
```

---

## Quick Reference

### Environment Variables

**Mobile App (Expo):**
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Admin Console (Web):**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... (server-side only)
```

### Useful Supabase Dashboard Links

- **SQL Editor:** Run schema migrations
- **Authentication > Users:** Find user IDs, manage users
- **Table Editor:** View/edit data directly
- **Storage:** Manage file buckets
- **Edge Functions:** Deploy serverless functions

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-04 | Initial schema documentation |
