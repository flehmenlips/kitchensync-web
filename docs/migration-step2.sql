-- ============================================
-- STEP 2 (FIXED): Run this SECOND
-- First drop any existing content_views table, then create fresh
-- ============================================

-- Drop existing content_views table if it exists (with all policies)
DROP TABLE IF EXISTS content_views CASCADE;

-- Add suspension fields to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_profiles_suspended
ON user_profiles(is_suspended) WHERE is_suspended = true;

-- Create admin_activity_log table
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

-- Create content_views table (fresh)
CREATE TABLE content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT,
  duration_seconds INTEGER
);

CREATE INDEX idx_content_views_content
ON content_views(content_type, content_id);

CREATE INDEX idx_content_views_user
ON content_views(user_id);

CREATE INDEX idx_content_views_date
ON content_views(viewed_at DESC);

-- Add view/save counts to shared_recipes
ALTER TABLE shared_recipes
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;
