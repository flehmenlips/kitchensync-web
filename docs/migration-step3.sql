-- ============================================
-- STEP 3: Run this THIRD
-- Add RLS policies
-- ============================================

-- RLS for admin_activity_log
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

-- RLS for content_views
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

-- Admin update policy for user_profiles
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
