-- パーティションテーブルにゲスト注文用INSERTポリシーを追加
-- 親テーブル(orders, order_items)にはゲスト用ポリシーがあるが、
-- パーティションテーブルには無かったため追加

-- =====================================================
-- orders パーティションにゲストINSERTポリシーを追加
-- =====================================================

CREATE POLICY "Guest users can create orders" ON orders_2024_q4
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2025_01
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2025_02
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2025_03
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2025_04
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2025_05
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2025_06
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2025_07
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2025_08
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2025_09
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2025_10
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2025_11
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2025_12
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2026_q1
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2026_q2
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2026_q3
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2026_q4
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2027
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_2028
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

CREATE POLICY "Guest users can create orders" ON orders_default
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND (user_id IS NULL) AND (is_guest_order = true)
  );

-- =====================================================
-- order_items パーティションにゲストINSERTポリシーを追加
-- =====================================================

CREATE POLICY "Guest users can create order items" ON order_items_2024_q4
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2024_q4.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2025_01
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2025_01.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2025_02
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2025_02.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2025_03
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2025_03.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2025_04
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2025_04.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2025_05
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2025_05.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2025_06
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2025_06.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2025_07
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2025_07.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2025_08
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2025_08.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2025_09
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2025_09.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2025_10
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2025_10.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2025_11
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2025_11.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2025_12
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2025_12.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2026_q1
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2026_q1.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2026_q2
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2026_q2.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2026_q3
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2026_q3.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2026_q4
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2026_q4.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2027
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2027.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_2028
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_2028.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );

CREATE POLICY "Guest users can create order items" ON order_items_default
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL) AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items_default.order_id
        AND orders.user_id IS NULL
        AND orders.is_guest_order = true
    )
  );
