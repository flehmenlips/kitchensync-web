-- ============================================================================
-- KitchenSync Commercial Platform - Fix Customer/Loyalty RLS Policies
-- ============================================================================
-- Run this AFTER 005_fix_rls_recursion_v2.sql
-- Only run if you have the customers and loyalty tables
-- ============================================================================

-- Fix customer policies
DROP POLICY IF EXISTS "team_customers_manage" ON customers;

CREATE POLICY "team_customers_manage" ON customers
  FOR ALL
  USING (is_team_member(business_id));

-- Fix customer_activities policies
DROP POLICY IF EXISTS "team_activities_manage" ON customer_activities;

CREATE POLICY "team_activities_manage" ON customer_activities
  FOR ALL
  USING (is_team_member(business_id));

-- Fix loyalty_points policies
DROP POLICY IF EXISTS "team_loyalty_points_manage" ON loyalty_points;

CREATE POLICY "team_loyalty_points_manage" ON loyalty_points
  FOR ALL
  USING (is_team_member(business_id));

-- Fix loyalty_transactions policies
DROP POLICY IF EXISTS "team_loyalty_transactions_manage" ON loyalty_transactions;

CREATE POLICY "team_loyalty_transactions_manage" ON loyalty_transactions
  FOR ALL
  USING (is_team_member(business_id));

-- Fix loyalty_settings policies
DROP POLICY IF EXISTS "team_loyalty_settings_manage" ON loyalty_settings;

CREATE POLICY "team_loyalty_settings_manage" ON loyalty_settings
  FOR ALL
  USING (is_team_member(business_id));
