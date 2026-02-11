-- KitchenSync Admin Console - Database Migrations
-- Run this ENTIRE script in Supabase SQL Editor

-- ============================================
-- STEP 1: Add suspension fields to user_profiles
-- ============================================

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_profiles_suspended
ON user_profiles(is_suspended) WHERE is_suspended = true;


-- ============================================
-- STEP 2: Create admin_activity_log table
-- ============================================

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin
ON admin_activity_log(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created
ON admin_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action
ON admin_activity_log(action);


-- ============================================
-- STEP 3: Create content_views table
-- ============================================

CREATE TABLE IF NOT EXISTS content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT,
  duration_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_content_views_content
ON content_views(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_content_views_user
ON content_views(user_id);

CREATE INDEX IF NOT EXISTS idx_content_views_date
ON content_views(viewed_at DESC);


-- ============================================
-- STEP 4: Add view/save counts to shared_recipes
-- ============================================

ALTER TABLE shared_recipes
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;


-- ============================================
-- STEP 5: RLS Policies for admin_activity_log
-- ============================================

ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view activity logs" ON admin_activity_log;
DROP POLICY IF EXISTS "Admins can insert activity logs" ON admin_activity_log;

CREATE POLICY "Admins can view activity logs" ON admin_activity_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert activity logs" ON admin_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );


-- ============================================
-- STEP 6: RLS Policies for content_views
-- ============================================

ALTER TABLE content_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own views" ON content_views;
DROP POLICY IF EXISTS "Admins can view all content views" ON content_views;

CREATE POLICY "Users can insert own views" ON content_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all content views" ON content_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );


-- ============================================
-- STEP 7: User profiles admin update policy
-- ============================================

DROP POLICY IF EXISTS "Admins can update user suspension" ON user_profiles;

CREATE POLICY "Admins can update user suspension" ON user_profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.is_admin = true
    )
  );


-- ============================================
-- STEP 8: Dashboard stats function (CREATE OR REPLACE)
-- This does NOT drop is_admin() - just replaces the stats function
-- ============================================

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
  user_count INTEGER;
  recipe_count INTEGER;
  shared_count INTEGER;
  tips_count INTEGER;
  suspended_count INTEGER;
  active_count INTEGER;
BEGIN
  -- Only allow admins
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get counts separately
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  SELECT COUNT(*) INTO recipe_count FROM recipes;
  SELECT COUNT(*) INTO shared_count FROM shared_recipes WHERE is_active = true;
  SELECT COUNT(*) INTO tips_count FROM new_content WHERE is_active = true;
  SELECT COUNT(*) INTO suspended_count FROM user_profiles WHERE is_suspended = true;
  SELECT COUNT(*) INTO active_count FROM user_profiles WHERE is_suspended IS NOT true;

  result := json_build_object(
    'total_users', user_count,
    'total_recipes', recipe_count,
    'shared_recipes', shared_count,
    'active_tips', tips_count,
    'total_menus', 0,
    'total_lists', 0,
    'suspended_users', suspended_count,
    'active_users', active_count
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- DONE!
-- ============================================
