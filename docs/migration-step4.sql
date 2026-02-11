-- ============================================
-- STEP 4: Run this FOURTH
-- Create the new dashboard stats function
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
