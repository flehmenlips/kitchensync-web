-- ============================================================================
-- KitchenSync Commercial Platform - Fix RLS Infinite Recursion (v2)
-- ============================================================================
-- Run this to fix the infinite recursion in business_team_members policies
-- This version only fixes the core tables and skips customer tables if they
-- don't exist
-- ============================================================================

-- ============================================================================
-- Create security definer functions to check team membership
-- This bypasses RLS and prevents recursion
-- ============================================================================

CREATE OR REPLACE FUNCTION is_team_member(check_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_team_members
    WHERE business_id = check_business_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION is_team_member_with_role(check_business_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_team_members
    WHERE business_id = check_business_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = ANY(allowed_roles)
  )
$$;

CREATE OR REPLACE FUNCTION get_user_business_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT business_id FROM business_team_members
  WHERE user_id = auth.uid() AND status = 'active'
$$;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION is_team_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_team_member_with_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_business_ids() TO authenticated;

-- ============================================================================
-- Fix business_accounts policies
-- ============================================================================

DROP POLICY IF EXISTS "team_business_read" ON business_accounts;

CREATE POLICY "team_business_read" ON business_accounts
  FOR SELECT
  USING (is_team_member(id));

-- ============================================================================
-- Fix business_team_members policies (the main culprit)
-- ============================================================================

DROP POLICY IF EXISTS "team_view_own" ON business_team_members;

-- Team members can view their own team (using function to avoid recursion)
CREATE POLICY "team_view_own" ON business_team_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR business_id IN (SELECT get_user_business_ids())
  );

-- ============================================================================
-- Fix business_hours policies
-- ============================================================================

DROP POLICY IF EXISTS "team_hours_manage" ON business_hours;

CREATE POLICY "team_hours_manage" ON business_hours
  FOR ALL
  USING (is_team_member_with_role(business_id, ARRAY['owner', 'manager']));

-- ============================================================================
-- Fix restaurant_tables policies
-- ============================================================================

DROP POLICY IF EXISTS "team_tables_manage" ON restaurant_tables;

CREATE POLICY "team_tables_manage" ON restaurant_tables
  FOR ALL
  USING (is_team_member_with_role(business_id, ARRAY['owner', 'manager']));

-- ============================================================================
-- Fix reservation_settings policies
-- ============================================================================

DROP POLICY IF EXISTS "team_reservation_settings_manage" ON reservation_settings;

CREATE POLICY "team_reservation_settings_manage" ON reservation_settings
  FOR ALL
  USING (is_team_member_with_role(business_id, ARRAY['owner', 'manager']));

-- ============================================================================
-- Fix reservations policies
-- ============================================================================

DROP POLICY IF EXISTS "team_reservations_manage" ON reservations;

CREATE POLICY "team_reservations_manage" ON reservations
  FOR ALL
  USING (is_team_member(business_id));

-- ============================================================================
-- Fix menu policies
-- ============================================================================

DROP POLICY IF EXISTS "team_menu_categories_manage" ON menu_categories;
DROP POLICY IF EXISTS "team_menu_items_manage" ON menu_items;
DROP POLICY IF EXISTS "team_modifier_groups_manage" ON menu_modifier_groups;
DROP POLICY IF EXISTS "team_modifiers_manage" ON menu_modifiers;

CREATE POLICY "team_menu_categories_manage" ON menu_categories
  FOR ALL
  USING (is_team_member(business_id));

CREATE POLICY "team_menu_items_manage" ON menu_items
  FOR ALL
  USING (is_team_member(business_id));

CREATE POLICY "team_modifier_groups_manage" ON menu_modifier_groups
  FOR ALL
  USING (
    menu_item_id IN (
      SELECT id FROM menu_items WHERE is_team_member(business_id)
    )
  );

CREATE POLICY "team_modifiers_manage" ON menu_modifiers
  FOR ALL
  USING (
    modifier_group_id IN (
      SELECT mg.id FROM menu_modifier_groups mg
      JOIN menu_items mi ON mg.menu_item_id = mi.id
      WHERE is_team_member(mi.business_id)
    )
  );

-- ============================================================================
-- Fix order policies
-- ============================================================================

DROP POLICY IF EXISTS "team_orders_manage" ON orders;
DROP POLICY IF EXISTS "team_order_items_manage" ON order_items;

CREATE POLICY "team_orders_manage" ON orders
  FOR ALL
  USING (is_team_member(business_id));

CREATE POLICY "team_order_items_manage" ON order_items
  FOR ALL
  USING (
    order_id IN (
      SELECT id FROM orders WHERE is_team_member(business_id)
    )
  );
