-- ============================================================================
-- KitchenSync Commercial Platform - Seed Data for Supabase
-- ============================================================================
-- Run this AFTER all migration files (001, 002, 003)
-- Creates sample businesses, menus, and test data
-- ============================================================================

-- ============================================================================
-- SAMPLE BUSINESSES
-- ============================================================================

-- Note: Replace 'YOUR_USER_ID' with an actual auth.users UUID from your Supabase
-- You can find this by running: SELECT id FROM auth.users LIMIT 5;

-- First, let's create a function to get or create a demo user
DO $$
DECLARE
  demo_user_id UUID;
BEGIN
  -- Try to find an existing user, or use a placeholder
  SELECT id INTO demo_user_id FROM auth.users LIMIT 1;

  -- If no users exist yet, we'll need to handle this differently
  -- For now, we'll use a placeholder that you should replace
  IF demo_user_id IS NULL THEN
    RAISE NOTICE 'No users found. Please create a user first, then update the owner_user_id values below.';
    -- Use a placeholder UUID that will need to be updated
    demo_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- Insert Coq au Vin
  INSERT INTO business_accounts (
    id, owner_user_id, business_name, business_type, slug,
    email, phone, address_line1, city, state, postal_code,
    description, brand_color, is_verified, is_active
  ) VALUES (
    gen_random_uuid(),
    demo_user_id,
    'Coq au Vin',
    'restaurant',
    'coq-au-vin',
    'reservations@coqauvin.com',
    '+1-555-123-4567',
    '123 Gourmet Lane',
    'San Francisco',
    'CA',
    '94102',
    'An elegant French bistro offering classic dishes with a modern twist. Our signature Coq au Vin has been perfected over generations.',
    '#8B4513',
    TRUE,
    TRUE
  ) ON CONFLICT (slug) DO NOTHING;

  -- Insert The Golden Fork
  INSERT INTO business_accounts (
    id, owner_user_id, business_name, business_type, slug,
    email, phone, address_line1, city, state, postal_code,
    description, brand_color, is_verified, is_active
  ) VALUES (
    gen_random_uuid(),
    demo_user_id,
    'The Golden Fork',
    'restaurant',
    'golden-fork',
    'hello@goldenfork.com',
    '+1-555-234-5678',
    '456 Main Street',
    'San Francisco',
    'CA',
    '94103',
    'Farm-to-table American cuisine in a warm, welcoming atmosphere. Family recipes made with locally sourced ingredients.',
    '#DAA520',
    TRUE,
    TRUE
  ) ON CONFLICT (slug) DO NOTHING;

  -- Insert Sunrise Farm
  INSERT INTO business_accounts (
    id, owner_user_id, business_name, business_type, slug,
    email, phone, address_line1, city, state, postal_code,
    description, brand_color, is_verified, is_active
  ) VALUES (
    gen_random_uuid(),
    demo_user_id,
    'Sunrise Farm',
    'farm',
    'sunrise-farm',
    'orders@sunrisefarm.com',
    '+1-555-345-6789',
    '789 Country Road',
    'Napa',
    'CA',
    '94558',
    'Family-owned organic farm growing seasonal vegetables, fruits, and herbs. CSA subscriptions and farm stand open weekends.',
    '#228B22',
    TRUE,
    TRUE
  ) ON CONFLICT (slug) DO NOTHING;

  -- Insert Bean & Leaf Cafe
  INSERT INTO business_accounts (
    id, owner_user_id, business_name, business_type, slug,
    email, phone, address_line1, city, state, postal_code,
    description, brand_color, is_verified, is_active
  ) VALUES (
    gen_random_uuid(),
    demo_user_id,
    'Bean & Leaf Cafe',
    'cafe',
    'bean-leaf-cafe',
    'hello@beanleaf.com',
    '+1-555-456-7890',
    '321 Coffee Street',
    'Oakland',
    'CA',
    '94612',
    'Specialty coffee roasters and artisan bakery. Ethically sourced beans, house-made pastries, and a cozy atmosphere.',
    '#4A2C2A',
    TRUE,
    TRUE
  ) ON CONFLICT (slug) DO NOTHING;

END $$;

-- ============================================================================
-- BUSINESS HOURS
-- ============================================================================

-- Coq au Vin hours
INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed)
SELECT id, 0, '17:00', '22:00', FALSE FROM business_accounts WHERE slug = 'coq-au-vin'
ON CONFLICT (business_id, day_of_week) DO NOTHING;

INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed)
SELECT id, 1, NULL, NULL, TRUE FROM business_accounts WHERE slug = 'coq-au-vin'
ON CONFLICT (business_id, day_of_week) DO NOTHING;

INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed)
SELECT id, 2, '17:00', '22:00', FALSE FROM business_accounts WHERE slug = 'coq-au-vin'
ON CONFLICT (business_id, day_of_week) DO NOTHING;

INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed)
SELECT id, 3, '17:00', '22:00', FALSE FROM business_accounts WHERE slug = 'coq-au-vin'
ON CONFLICT (business_id, day_of_week) DO NOTHING;

INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed)
SELECT id, 4, '17:00', '23:00', FALSE FROM business_accounts WHERE slug = 'coq-au-vin'
ON CONFLICT (business_id, day_of_week) DO NOTHING;

INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed)
SELECT id, 5, '17:00', '23:00', FALSE FROM business_accounts WHERE slug = 'coq-au-vin'
ON CONFLICT (business_id, day_of_week) DO NOTHING;

INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed)
SELECT id, 6, '17:00', '23:00', FALSE FROM business_accounts WHERE slug = 'coq-au-vin'
ON CONFLICT (business_id, day_of_week) DO NOTHING;

-- Bean & Leaf hours
INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed)
SELECT id, unnest(ARRAY[0,1,2,3,4,5,6]),
       CASE WHEN unnest(ARRAY[0,1,2,3,4,5,6]) = 0 THEN '08:00'::TIME
            WHEN unnest(ARRAY[0,1,2,3,4,5,6]) = 6 THEN '07:00'::TIME
            ELSE '06:30'::TIME END,
       CASE WHEN unnest(ARRAY[0,1,2,3,4,5,6]) IN (0, 6) THEN '17:00'::TIME
            ELSE '18:00'::TIME END,
       FALSE
FROM business_accounts WHERE slug = 'bean-leaf-cafe'
ON CONFLICT (business_id, day_of_week) DO NOTHING;

-- ============================================================================
-- RESTAURANT TABLES (Coq au Vin)
-- ============================================================================

INSERT INTO restaurant_tables (business_id, table_number, capacity_min, capacity_max, section, is_active)
SELECT id, 'T1', 2, 2, 'main', TRUE FROM business_accounts WHERE slug = 'coq-au-vin'
UNION ALL
SELECT id, 'T2', 2, 2, 'main', TRUE FROM business_accounts WHERE slug = 'coq-au-vin'
UNION ALL
SELECT id, 'T3', 2, 4, 'main', TRUE FROM business_accounts WHERE slug = 'coq-au-vin'
UNION ALL
SELECT id, 'T4', 2, 4, 'main', TRUE FROM business_accounts WHERE slug = 'coq-au-vin'
UNION ALL
SELECT id, 'T5', 4, 6, 'main', TRUE FROM business_accounts WHERE slug = 'coq-au-vin'
UNION ALL
SELECT id, 'T6', 4, 6, 'main', TRUE FROM business_accounts WHERE slug = 'coq-au-vin'
UNION ALL
SELECT id, 'W1', 2, 2, 'window', TRUE FROM business_accounts WHERE slug = 'coq-au-vin'
UNION ALL
SELECT id, 'W2', 2, 4, 'window', TRUE FROM business_accounts WHERE slug = 'coq-au-vin'
UNION ALL
SELECT id, 'P1', 6, 10, 'private', TRUE FROM business_accounts WHERE slug = 'coq-au-vin'
UNION ALL
SELECT id, 'B1', 1, 2, 'bar', TRUE FROM business_accounts WHERE slug = 'coq-au-vin';

-- ============================================================================
-- RESERVATION SETTINGS
-- ============================================================================

INSERT INTO reservation_settings (
  business_id, min_party_size, max_party_size, booking_window_days,
  min_advance_hours, slot_duration_minutes, default_dining_duration,
  auto_confirm, send_reminders
)
SELECT id, 1, 10, 60, 4, 30, 120, TRUE, TRUE
FROM business_accounts WHERE slug = 'coq-au-vin'
ON CONFLICT (business_id) DO NOTHING;

INSERT INTO reservation_settings (
  business_id, min_party_size, max_party_size, booking_window_days,
  min_advance_hours, slot_duration_minutes, default_dining_duration,
  auto_confirm, send_reminders
)
SELECT id, 1, 8, 30, 2, 30, 90, TRUE, TRUE
FROM business_accounts WHERE slug = 'golden-fork'
ON CONFLICT (business_id) DO NOTHING;

-- ============================================================================
-- MENU CATEGORIES (Coq au Vin)
-- ============================================================================

INSERT INTO menu_categories (business_id, name, description, display_order, is_active)
SELECT id, 'Appetizers', 'Start your culinary journey', 1, TRUE
FROM business_accounts WHERE slug = 'coq-au-vin';

INSERT INTO menu_categories (business_id, name, description, display_order, is_active)
SELECT id, 'Soups & Salads', 'Fresh and seasonal', 2, TRUE
FROM business_accounts WHERE slug = 'coq-au-vin';

INSERT INTO menu_categories (business_id, name, description, display_order, is_active)
SELECT id, 'Main Courses', 'Classic French entrees', 3, TRUE
FROM business_accounts WHERE slug = 'coq-au-vin';

INSERT INTO menu_categories (business_id, name, description, display_order, is_active)
SELECT id, 'Desserts', 'Sweet endings', 4, TRUE
FROM business_accounts WHERE slug = 'coq-au-vin';

INSERT INTO menu_categories (business_id, name, description, display_order, is_active)
SELECT id, 'Beverages', 'Wine, cocktails, and more', 5, TRUE
FROM business_accounts WHERE slug = 'coq-au-vin';

-- ============================================================================
-- MENU ITEMS (Coq au Vin - Appetizers)
-- ============================================================================

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_gluten_free)
SELECT b.id, c.id, 'Escargots de Bourgogne', 'Classic Burgundy snails in garlic-herb butter', 18.00, 1, TRUE, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Appetizers'
WHERE b.slug = 'coq-au-vin';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_gluten_free)
SELECT b.id, c.id, 'Steak Tartare', 'Hand-cut beef with capers, shallots, and quail egg', 22.00, 2, TRUE, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Appetizers'
WHERE b.slug = 'coq-au-vin';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active)
SELECT b.id, c.id, 'Foie Gras Terrine', 'House-made terrine with brioche and fig compote', 28.00, 3, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Appetizers'
WHERE b.slug = 'coq-au-vin';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_vegetarian, is_gluten_free)
SELECT b.id, c.id, 'French Cheese Selection', 'Artisan cheeses with accompaniments', 24.00, 4, TRUE, TRUE, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Appetizers'
WHERE b.slug = 'coq-au-vin';

-- ============================================================================
-- MENU ITEMS (Coq au Vin - Main Courses)
-- ============================================================================

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_gluten_free, prep_time_minutes)
SELECT b.id, c.id, 'Coq au Vin', 'Our signature dish - chicken braised in Burgundy wine with mushrooms, pearl onions, and lardons', 38.00, 1, TRUE, TRUE, 25
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Main Courses'
WHERE b.slug = 'coq-au-vin';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_gluten_free, prep_time_minutes)
SELECT b.id, c.id, 'Duck Confit', 'Crispy leg confit with Sarladaise potatoes and cherry gastrique', 42.00, 2, TRUE, TRUE, 20
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Main Courses'
WHERE b.slug = 'coq-au-vin';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_gluten_free, prep_time_minutes)
SELECT b.id, c.id, 'Boeuf Bourguignon', 'Slow-braised beef in red wine with root vegetables', 44.00, 3, TRUE, TRUE, 25
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Main Courses'
WHERE b.slug = 'coq-au-vin';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_gluten_free, prep_time_minutes)
SELECT b.id, c.id, 'Sole Meunière', 'Pan-seared Dover sole with brown butter and capers', 48.00, 4, TRUE, TRUE, 15
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Main Courses'
WHERE b.slug = 'coq-au-vin';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_gluten_free, prep_time_minutes)
SELECT b.id, c.id, 'Rack of Lamb', 'Herb-crusted lamb with ratatouille and rosemary jus', 52.00, 5, TRUE, TRUE, 25
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Main Courses'
WHERE b.slug = 'coq-au-vin';

-- ============================================================================
-- MENU ITEMS (Coq au Vin - Desserts)
-- ============================================================================

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_vegetarian)
SELECT b.id, c.id, 'Chocolate Soufflé', 'Warm chocolate soufflé with crème anglaise (20 min)', 16.00, 1, TRUE, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Desserts'
WHERE b.slug = 'coq-au-vin';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_vegetarian, is_gluten_free)
SELECT b.id, c.id, 'Crème Brûlée', 'Classic vanilla custard with caramelized sugar', 12.00, 2, TRUE, TRUE, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Desserts'
WHERE b.slug = 'coq-au-vin';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_vegetarian)
SELECT b.id, c.id, 'Tarte Tatin', 'Caramelized apple tart with vanilla ice cream', 14.00, 3, TRUE, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Desserts'
WHERE b.slug = 'coq-au-vin';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_vegetarian, is_gluten_free)
SELECT b.id, c.id, 'Mousse au Chocolat', 'Rich dark chocolate mousse with whipped cream', 12.00, 4, TRUE, TRUE, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Desserts'
WHERE b.slug = 'coq-au-vin';

-- ============================================================================
-- MENU CATEGORIES & ITEMS (Bean & Leaf Cafe)
-- ============================================================================

INSERT INTO menu_categories (business_id, name, description, display_order, is_active)
SELECT id, 'Coffee', 'Specialty espresso drinks', 1, TRUE
FROM business_accounts WHERE slug = 'bean-leaf-cafe';

INSERT INTO menu_categories (business_id, name, description, display_order, is_active)
SELECT id, 'Pastries', 'Fresh baked daily', 2, TRUE
FROM business_accounts WHERE slug = 'bean-leaf-cafe';

-- Coffee items
INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_vegan, is_gluten_free)
SELECT b.id, c.id, 'Espresso', 'Double shot', 3.50, 1, TRUE, TRUE, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Coffee'
WHERE b.slug = 'bean-leaf-cafe';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_gluten_free)
SELECT b.id, c.id, 'Latte', 'Espresso with steamed milk', 5.00, 2, TRUE, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Coffee'
WHERE b.slug = 'bean-leaf-cafe';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_gluten_free)
SELECT b.id, c.id, 'Cappuccino', 'Equal parts espresso, steamed milk, foam', 4.75, 3, TRUE, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Coffee'
WHERE b.slug = 'bean-leaf-cafe';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_vegan, is_gluten_free)
SELECT b.id, c.id, 'Cold Brew', '16-hour steeped, smooth and bold', 4.50, 4, TRUE, TRUE, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Coffee'
WHERE b.slug = 'bean-leaf-cafe';

-- Pastry items
INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_vegetarian)
SELECT b.id, c.id, 'Butter Croissant', 'Flaky, buttery, perfect', 4.00, 1, TRUE, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Pastries'
WHERE b.slug = 'bean-leaf-cafe';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_vegetarian)
SELECT b.id, c.id, 'Blueberry Muffin', 'Made with fresh blueberries', 3.75, 2, TRUE, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Pastries'
WHERE b.slug = 'bean-leaf-cafe';

INSERT INTO menu_items (business_id, category_id, name, description, price, display_order, is_active, is_vegetarian)
SELECT b.id, c.id, 'Chocolate Chip Cookie', 'Warm and gooey', 3.00, 3, TRUE, TRUE
FROM business_accounts b
JOIN menu_categories c ON c.business_id = b.id AND c.name = 'Pastries'
WHERE b.slug = 'bean-leaf-cafe';

-- ============================================================================
-- LOYALTY SETTINGS
-- ============================================================================

INSERT INTO loyalty_settings (
  business_id, is_enabled, program_name, points_per_dollar,
  points_per_reward, reward_value, tier_thresholds
)
SELECT id, TRUE, 'Coq au Vin Rewards', 10, 1000, 25.00,
       '{"silver": 2500, "gold": 5000, "platinum": 10000}'::JSONB
FROM business_accounts WHERE slug = 'coq-au-vin'
ON CONFLICT (business_id) DO NOTHING;

INSERT INTO loyalty_settings (
  business_id, is_enabled, program_name, points_per_dollar,
  points_per_reward, reward_value, tier_thresholds
)
SELECT id, TRUE, 'Bean Points', 5, 100, 5.00,
       '{"silver": 500, "gold": 1000, "platinum": 2500}'::JSONB
FROM business_accounts WHERE slug = 'bean-leaf-cafe'
ON CONFLICT (business_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Run these to verify seeding worked:
-- SELECT business_name, slug, business_type FROM business_accounts;
-- SELECT b.business_name, COUNT(c.id) as categories, COUNT(i.id) as items
-- FROM business_accounts b
-- LEFT JOIN menu_categories c ON c.business_id = b.id
-- LEFT JOIN menu_items i ON i.category_id = c.id
-- GROUP BY b.business_name;
