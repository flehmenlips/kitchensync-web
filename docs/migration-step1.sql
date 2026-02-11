-- ============================================
-- STEP 1: Run this FIRST
-- Drop the problematic function (it doesn't have policy dependencies)
-- ============================================

DROP FUNCTION IF EXISTS get_admin_dashboard_stats();
