-- ============================================================================
-- KitchenSync Commercial Platform - Phase 2: Menu & Orders
-- ============================================================================
-- Run this AFTER 001_commercial_platform.sql
-- Adds menu management and order processing tables
-- ============================================================================

-- ============================================================================
-- MENU SYSTEM
-- ============================================================================

-- Menu categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  -- Time-based availability
  available_start_time TIME,
  available_end_time TIME,
  available_days JSONB, -- [0,1,2,3,4,5,6] for days of week

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_categories_business ON menu_categories(business_id);
CREATE INDEX idx_menu_categories_active ON menu_categories(business_id, is_active);
CREATE INDEX idx_menu_categories_order ON menu_categories(business_id, display_order);

-- Menu items
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  -- Dietary info
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_gluten_free BOOLEAN DEFAULT FALSE,
  contains_nuts BOOLEAN DEFAULT FALSE,
  contains_dairy BOOLEAN DEFAULT FALSE,
  spice_level INTEGER CHECK (spice_level BETWEEN 0 AND 5),
  calories INTEGER,

  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  unavailable_reason TEXT,

  -- Prep info
  prep_time_minutes INTEGER,

  -- Tags for filtering
  tags JSONB, -- ["popular", "chef-special", "seasonal"]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_items_business ON menu_items(business_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_active ON menu_items(business_id, is_active, is_available);

-- Menu modifier groups (e.g., "Choose your size", "Add toppings")
CREATE TABLE IF NOT EXISTS menu_modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,

  -- Selection rules
  is_required BOOLEAN DEFAULT FALSE,
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_modifier_groups_item ON menu_modifier_groups(menu_item_id);

-- Menu modifiers (e.g., "Small", "Medium", "Large")
CREATE TABLE IF NOT EXISTS menu_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modifier_group_id UUID NOT NULL REFERENCES menu_modifier_groups(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  price_adjustment DECIMAL(10, 2) DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_modifiers_group ON menu_modifiers(modifier_group_id);

-- ============================================================================
-- ORDER MANAGEMENT
-- ============================================================================

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id),

  -- Order number (human-readable)
  order_number TEXT NOT NULL,

  -- Order type
  order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'takeout', 'delivery')),

  -- Customer info
  customer_user_id UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,

  -- Dine-in specific
  table_id UUID REFERENCES restaurant_tables(id),
  reservation_id UUID REFERENCES reservations(id),

  -- Delivery specific
  delivery_address TEXT,
  delivery_notes TEXT,
  delivery_fee DECIMAL(10, 2),

  -- Timing
  scheduled_for TIMESTAMPTZ, -- null = ASAP
  estimated_ready TIMESTAMPTZ,

  -- Pricing
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  tip_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,

  -- Payment
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'paid', 'refunded', 'failed'
  )),
  payment_method TEXT,
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,

  -- Order status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'
  )),
  confirmed_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Source tracking
  source TEXT DEFAULT 'pos' CHECK (source IN ('pos', 'website', 'app', 'phone')),

  -- Notes
  special_instructions TEXT,
  internal_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, order_number)
);

CREATE INDEX idx_orders_business ON orders(business_id);
CREATE INDEX idx_orders_status ON orders(business_id, status);
CREATE INDEX idx_orders_date ON orders(business_id, created_at DESC);
CREATE INDEX idx_orders_customer ON orders(customer_user_id);
CREATE INDEX idx_orders_table ON orders(table_id);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Menu item reference (may be null if deleted)
  menu_item_id UUID REFERENCES menu_items(id),

  -- Snapshot at time of order
  item_name TEXT NOT NULL,
  item_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),

  -- Modifiers (JSON snapshot)
  modifiers JSONB, -- [{name, price_adjustment}]
  modifiers_total DECIMAL(10, 2) DEFAULT 0,

  -- Total for this line item
  total_price DECIMAL(10, 2) NOT NULL,

  -- Special requests
  special_requests TEXT,

  -- Kitchen status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'preparing', 'ready', 'served'
  )),
  prepared_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_menu ON order_items(menu_item_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Menu: Public read for active items
CREATE POLICY "public_menu_categories_read" ON menu_categories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "public_menu_items_read" ON menu_items
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "public_modifier_groups_read" ON menu_modifier_groups
  FOR SELECT USING (TRUE);

CREATE POLICY "public_modifiers_read" ON menu_modifiers
  FOR SELECT USING (is_available = TRUE);

-- Menu: Team can manage
CREATE POLICY "team_menu_categories_manage" ON menu_categories
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "team_menu_items_manage" ON menu_items
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "team_modifier_groups_manage" ON menu_modifier_groups
  FOR ALL USING (
    menu_item_id IN (
      SELECT id FROM menu_items WHERE business_id IN (
        SELECT business_id FROM business_team_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "team_modifiers_manage" ON menu_modifiers
  FOR ALL USING (
    modifier_group_id IN (
      SELECT mg.id FROM menu_modifier_groups mg
      JOIN menu_items mi ON mg.menu_item_id = mi.id
      WHERE mi.business_id IN (
        SELECT business_id FROM business_team_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- Orders: Customers can view/create their own
CREATE POLICY "customer_orders_read" ON orders
  FOR SELECT USING (customer_user_id = auth.uid());

CREATE POLICY "customer_orders_create" ON orders
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "customer_order_items_read" ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE customer_user_id = auth.uid())
  );

CREATE POLICY "customer_order_items_create" ON order_items
  FOR INSERT WITH CHECK (TRUE);

-- Orders: Team can manage all
CREATE POLICY "team_orders_manage" ON orders
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "team_order_items_manage" ON order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM orders WHERE business_id IN (
        SELECT business_id FROM business_team_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_menu_categories_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_menu_modifier_groups_updated_at
  BEFORE UPDATE ON menu_modifier_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_menu_modifiers_updated_at
  BEFORE UPDATE ON menu_modifiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT ALL ON menu_categories TO service_role;
GRANT ALL ON menu_items TO service_role;
GRANT ALL ON menu_modifier_groups TO service_role;
GRANT ALL ON menu_modifiers TO service_role;
GRANT ALL ON orders TO service_role;
GRANT ALL ON order_items TO service_role;

GRANT SELECT ON menu_categories TO anon;
GRANT SELECT ON menu_items TO anon;
GRANT SELECT ON menu_modifier_groups TO anon;
GRANT SELECT ON menu_modifiers TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON menu_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_modifier_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_modifiers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON order_items TO authenticated;
