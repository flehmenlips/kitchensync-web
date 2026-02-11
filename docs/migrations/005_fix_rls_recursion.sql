-- ============================================================================
-- KitchenSync Commercial Platform - Fix RLS Infinite Recursion
-- ============================================================================
-- Run this to fix the infinite recursion in business_team_members policies
-- The issue: team_view_own policy queries business_team_members to check access
-- to business_team_members, causing infinite recursion
-- ============================================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "team_view_own" ON business_team_members;
DROP POLICY IF EXISTS "team_business_read" ON business_accounts;
DROP POLICY IF EXISTS "team_hours_manage" ON business_hours;
DROP POLICY IF EXISTS "team_tables_manage" ON restaurant_tables;
DROP POLICY IF EXISTS "team_reservation_settings_manage" ON reservation_settings;
DROP POLICY IF EXISTS "team_reservations_manage" ON reservations;

-- Also drop menu/order policies that may have same issue
DROP POLICY IF EXISTS "team_menu_categories_manage" ON menu_categories;
DROP POLICY IF EXISTS "team_menu_items_manage" ON menu_items;
DROP POLICY IF EXISTS "team_modifier_groups_manage" ON menu_modifier_groups;
DROP POLICY IF EXISTS "team_modifiers_manage" ON menu_modifiers;
DROP POLICY IF EXISTS "team_orders_manage" ON orders;
DROP POLICY IF EXISTS "team_order_items_manage" ON order_items;

-- Drop customer/loyalty policies
DROP POLICY IF EXISTS "team_customers_manage" ON customers;
DROP POLICY IF EXISTS "team_activities_manage" ON customer_activities;
DROP POLICY IF EXISTS "team_loyalty_points_manage" ON loyalty_points;
DROP POLICY IF EXISTS "team_loyalty_transactions_manage" ON loyalty_transactions;
DROP POLICY IF EXISTS "team_loyalty_settings_manage" ON loyalty_settings;

-- ============================================================================
-- Create a security definer function to check team membership
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

-- ============================================================================
-- Recreate business_accounts policies using the helper function
-- ============================================================================

CREATE POLICY "team_business_read" ON business_accounts
  FOR SELECT
  USING (is_team_member(id));

-- ============================================================================
-- Recreate business_team_members policies
-- ============================================================================

-- Team members can view their own team (using function to avoid recursion)
CREATE POLICY "team_view_own" ON business_team_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR business_id IN (SELECT get_user_business_ids())
  );

-- ============================================================================
-- Recreate business_hours policies
-- ============================================================================

CREATE POLICY "team_hours_manage" ON business_hours
  FOR ALL
  USING (is_team_member_with_role(business_id, ARRAY['owner', 'manager']));

-- ============================================================================
-- Recreate restaurant_tables policies
-- ============================================================================

CREATE POLICY "team_tables_manage" ON restaurant_tables
  FOR ALL
  USING (is_team_member_with_role(business_id, ARRAY['owner', 'manager']));

-- ============================================================================
-- Recreate reservation_settings policies
-- ============================================================================

CREATE POLICY "team_reservation_settings_manage" ON reservation_settings
  FOR ALL
  USING (is_team_member_with_role(business_id, ARRAY['owner', 'manager']));

-- ============================================================================
-- Recreate reservations policies
-- ============================================================================

CREATE POLICY "team_reservations_manage" ON reservations
  FOR ALL
  USING (is_team_member(business_id));

-- ============================================================================
-- Recreate menu policies
-- ============================================================================

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
-- Recreate order policies
-- ============================================================================

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

-- ============================================================================
-- Recreate customer/loyalty policies
-- ============================================================================

CREATE POLICY "team_customers_manage" ON customers
  FOR ALL
  USING (is_team_member(business_id));

CREATE POLICY "team_activities_manage" ON customer_activities
  FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE is_team_member(business_id)
    )
  );

CREATE POLICY "team_loyalty_points_manage" ON loyalty_points
  FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE is_team_member(business_id)
    )
  );

CREATE POLICY "team_loyalty_transactions_manage" ON loyalty_transactions
  FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE is_team_member(business_id)
    )
  );

CREATE POLICY "team_loyalty_settings_manage" ON loyalty_settings
  FOR ALL
  USING (is_team_member(business_id));

-- ============================================================================
-- Grant execute on functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION is_team_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_team_member_with_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_business_ids() TO authenticated;
