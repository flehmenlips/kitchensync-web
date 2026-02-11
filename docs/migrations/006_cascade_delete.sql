-- ============================================================================
-- KitchenSync Commercial Platform - CASCADE DELETE for Business Accounts
-- ============================================================================
-- Run this to enable automatic cleanup when a business is deleted.
-- All related data (menu items, orders, customers, etc.) will be deleted.
-- ============================================================================

-- Menu items
ALTER TABLE menu_items
DROP CONSTRAINT menu_items_business_id_fkey,
ADD CONSTRAINT menu_items_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES business_accounts(id) ON DELETE CASCADE;

-- Menu categories
ALTER TABLE menu_categories
DROP CONSTRAINT menu_categories_business_id_fkey,
ADD CONSTRAINT menu_categories_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES business_accounts(id) ON DELETE CASCADE;

-- Orders
ALTER TABLE orders
DROP CONSTRAINT orders_business_id_fkey,
ADD CONSTRAINT orders_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES business_accounts(id) ON DELETE CASCADE;

-- Reservations
ALTER TABLE reservations
DROP CONSTRAINT reservations_business_id_fkey,
ADD CONSTRAINT reservations_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES business_accounts(id) ON DELETE CASCADE;

-- Restaurant tables
ALTER TABLE restaurant_tables
DROP CONSTRAINT restaurant_tables_business_id_fkey,
ADD CONSTRAINT restaurant_tables_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES business_accounts(id) ON DELETE CASCADE;

-- Reservation settings
ALTER TABLE reservation_settings
DROP CONSTRAINT reservation_settings_business_id_fkey,
ADD CONSTRAINT reservation_settings_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES business_accounts(id) ON DELETE CASCADE;

-- Customers
ALTER TABLE customers
DROP CONSTRAINT customers_business_id_fkey,
ADD CONSTRAINT customers_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES business_accounts(id) ON DELETE CASCADE;

-- Loyalty settings
ALTER TABLE loyalty_settings
DROP CONSTRAINT loyalty_settings_business_id_fkey,
ADD CONSTRAINT loyalty_settings_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES business_accounts(id) ON DELETE CASCADE;

-- Business team members
ALTER TABLE business_team_members
DROP CONSTRAINT business_team_members_business_id_fkey,
ADD CONSTRAINT business_team_members_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES business_accounts(id) ON DELETE CASCADE;

-- Business hours
ALTER TABLE business_hours
DROP CONSTRAINT business_hours_business_id_fkey,
ADD CONSTRAINT business_hours_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES business_accounts(id) ON DELETE CASCADE;

-- Business activity log
ALTER TABLE business_activity_log
DROP CONSTRAINT business_activity_log_business_id_fkey,
ADD CONSTRAINT business_activity_log_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES business_accounts(id) ON DELETE CASCADE;

-- User profiles - SET NULL instead of CASCADE (don't delete users when business deleted)
ALTER TABLE user_profiles
DROP CONSTRAINT user_profiles_primary_business_id_fkey,
ADD CONSTRAINT user_profiles_primary_business_id_fkey
  FOREIGN KEY (primary_business_id) REFERENCES business_accounts(id) ON DELETE SET NULL;

-- ============================================================================
-- Add soft delete support
-- ============================================================================
ALTER TABLE business_accounts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_business_accounts_deleted_at
ON business_accounts(deleted_at) WHERE deleted_at IS NULL;
