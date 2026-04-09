INSERT INTO `adjustment_allocations` (`allocation_id`, `adj_item_id`, `batch_id`, `pieces_delta`, `created_at`) VALUES
(1, 2, 4, -20, '2025-11-30 17:16:49'),
(2, 18, 4, -42, '2025-11-30 20:01:08'),
(3, 19, 5, -62, '2025-11-30 20:01:08');

INSERT INTO `adjustment_items` (`item_id`, `note_id`, `product_id`, `pack_size`, `delta_boxes`, `delta_items`, `related_item_id`, `related_batch_id`, `expiry_date`) VALUES
(1, 1, 2, 20, -1, 0, NULL, NULL, NULL),
(2, 2, 1, 20, -1, 0, NULL, NULL, NULL),
(3, 3, 1, 20, 1, 0, NULL, NULL, NULL),
(4, 4, 1, 20, 1, 0, NULL, NULL, NULL),
(5, 5, 1, 30, 1, 0, NULL, NULL, NULL),
(7, 7, 1, 30, 0, 1, NULL, NULL, NULL),
(8, 8, 1, 20, 2, 2, NULL, NULL, NULL),
(9, 8, 1, 30, 2, 2, NULL, NULL, NULL),
(10, 9, 1, 20, 2, 2, NULL, NULL, NULL),
(11, 9, 1, 30, 2, 2, NULL, NULL, NULL),
(12, 10, 1, 20, 2, 2, NULL, NULL, NULL),
(13, 10, 1, 30, 2, 2, NULL, NULL, NULL),
(14, 11, 1, 20, 2, 2, NULL, NULL, NULL),
(15, 11, 1, 30, 2, 2, NULL, NULL, NULL),
(16, 12, 1, 20, 2, 2, NULL, NULL, NULL),
(17, 12, 1, 30, 2, 2, NULL, NULL, NULL),
(18, 13, 1, 20, -2, -2, NULL, NULL, NULL),
(19, 13, 1, 30, -2, -2, NULL, NULL, NULL);

INSERT INTO `adjustment_notes` (`note_id`, `note_no`, `note_date`, `reason_id`, `remark`, `source_type`, `source_id`, `created_by`, `created_at`, `status`, `approved_by`, `approved_at`) VALUES
(1, 'ADJ-00001', '2025-11-30', 4, 'Stock count correction - Tikiri Mari', 'DIRECT', NULL, 2, '2025-11-30 17:07:24', 'DRAFT', NULL, NULL),
(2, 'ADJ-00002', '2025-11-30', 4, 'Stock count correction - Tikiri Mari', 'DIRECT', NULL, 2, '2025-11-30 17:16:37', 'POSTED', NULL, NULL),
(3, 'ADJ-00003', '2025-11-30', 4, 'Stock count correction - Tikiri Mari', 'DIRECT', NULL, 2, '2025-11-30 17:18:10', 'POSTED', NULL, NULL),
(4, 'ADJ-00004', '2025-11-30', 4, 'Stock count correction - Tikiri Mari', 'DIRECT', NULL, 2, '2025-11-30 17:25:38', 'POSTED', NULL, NULL),
(5, 'ADJ-00005', '2025-11-30', 1, 'msxhaj', 'DIRECT', NULL, 2, '2025-11-30 17:49:42', 'POSTED', NULL, NULL),
(7, 'ADJ-00007', '2025-11-30', 4, NULL, 'DIRECT', NULL, 2, '2025-11-30 17:53:16', 'POSTED', NULL, NULL),
(8, 'ADJ-00008', '2025-11-30', 1, 'I Added incorrectly', 'GRN', 0, 2, '2025-11-30 19:19:07', 'DRAFT', NULL, NULL),
(9, 'ADJ-00009', '2025-11-30', 1, 'I Added incorrectly', 'GRN', 0, 2, '2025-11-30 19:19:38', 'DRAFT', NULL, NULL),
(10, 'ADJ-00010', '2025-11-30', 1, 'I Added incorrectly', 'GRN', 0, 2, '2025-11-30 19:20:26', 'DRAFT', NULL, NULL),
(11, 'ADJ-00011', '2025-11-30', 1, 'Added less quantity', 'GRN', 0, 2, '2025-11-30 19:40:43', 'DRAFT', NULL, NULL),
(12, 'ADJ-00012', '2025-12-01', 1, 'Added incorrectly', 'GRN', 0, 2, '2025-11-30 19:52:07', 'POSTED', NULL, NULL),
(13, 'ADJ-00013', '2025-12-01', 1, 'Added more', 'GRN', 0, 2, '2025-11-30 20:01:07', 'POSTED', NULL, NULL);

INSERT INTO `adjustment_reasons` (`reason_id`, `code`, `display_name`) VALUES
(1, 'GRN_QTY_ERROR', 'GRN quantity mistake'),
(2, 'ISSUE_QTY_ERROR', 'Issue note quantity mistake'),
(3, 'UNLOAD_QTY_ERROR', 'Unload note quantity mistake'),
(4, 'STOCK_COUNT_DIFF', 'Stock count difference'),
(5, 'OTHER', 'Other');

INSERT INTO `brands` (`brand_id`, `brand_name`) VALUES
(1, 'Munchee'),
(2, 'Kotmale');

INSERT INTO `expire_receive_items` (`id`, `note_id`, `product_id`, `supplier_id`, `pack_size`, `boxes`, `items`, `total_pcs`, `expiry_date`) VALUES
(1, 1, 1, 1, 1, 0, 10, 10, NULL),
(2, 2, 1, 1, 1, 0, 50, 50, NULL);

INSERT INTO `expire_receive_notes` (`id`, `note_no`, `note_date`, `lorry_id`, `created_by`, `remarks`, `status`, `created_at`) VALUES
(1, 'EXR-000001', '2025-11-30', 2, 2, NULL, 'POSTED', '2025-11-30 10:54:23'),
(2, 'EXR-000002', '2025-11-30', 1, 2, NULL, 'POSTED', '2025-11-30 11:03:06');

INSERT INTO `expire_return_items` (`id`, `note_id`, `product_id`, `supplier_id`, `pack_size`, `boxes`, `items`, `total_pcs`) VALUES
(1, 1, 1, 1, 1, 40, 0, 40);

INSERT INTO `expire_return_notes` (`id`, `note_no`, `note_date`, `supplier_id`, `lorry_id`, `created_by`, `remarks`, `status`, `created_at`) VALUES
(1, 'EXRT-000001', '2025-11-30', 1, 1, 2, NULL, 'POSTED', '2025-11-30 11:49:30');

INSERT INTO `expire_store_stock` (`id`, `product_id`, `supplier_id`, `pack_size`, `total_pcs`, `boxes`, `items`, `updated_at`) VALUES
(1, 1, 1, 1, 20, 20, 0, '2025-11-30 11:49:30');

INSERT INTO `grn` (`grn_id`, `grn_no`, `supplier_id`, `lorry_id`, `grn_date`) VALUES
(1, 'GRN-0001', 1, 1, '2025-11-23 04:28:43'),
(3, 'GRN-0002', 1, 1, '2025-11-23 04:52:17'),
(4, 'GRN-0003', 1, 1, '2025-11-23 09:39:12');

INSERT INTO `grn_items` (`entry_id`, `grn_id`, `product_id`, `quantity_received`, `date`, `pack_size`, `boxes_received`, `items_received`, `batch_id`) VALUES
(1, 1, 1, 210, '2025-11-23 04:28:43', 20, 10, 10, 1),
(2, 1, 1, 310, '2025-11-23 04:28:43', 30, 10, 10, 2),
(3, 3, 1, 120, '2025-11-23 04:52:17', 20, 5, 20, 3),
(4, 4, 1, 200, '2025-11-23 09:39:12', 20, 10, 0, 4),
(5, 4, 1, 300, '2025-11-23 09:39:12', 30, 10, 0, 5);

INSERT INTO `inventory_batches` (`batch_id`, `product_id`, `source_type`, `source_id`, `pack_size`, `received_pcs`, `remaining_pcs`, `received_boxes`, `received_items`, `expiry_date`, `created_at`) VALUES
(1, 1, 'GRN', 1, 20, 210, 0, 10, 10, NULL, '2025-11-23 04:28:43'),
(2, 1, 'GRN', 2, 30, 310, 0, 10, 10, NULL, '2025-11-23 04:28:43'),
(3, 1, 'GRN', 3, 20, 120, 0, 5, 20, NULL, '2025-11-23 04:52:17'),
(4, 1, 'GRN', 4, 20, 200, 94, 10, 0, NULL, '2025-11-23 09:39:12'),
(5, 1, 'GRN', 5, 30, 300, 212, 10, 0, NULL, '2025-11-23 09:39:12'),
(7, 1, 'UNLOAD', 9, 20, 100, 100, 5, 0, NULL, '2025-11-26 14:48:48'),
(8, 1, 'UNLOAD', 9, 30, 120, 120, 4, 0, NULL, '2025-11-26 14:48:48'),
(9, 1, 'UNLOAD', 10, 20, 40, 40, 2, 0, NULL, '2025-11-30 07:34:35'),
(10, 1, 'ADJUST', 3, 20, 20, 20, 1, 0, NULL, '2025-11-30 17:18:19'),
(11, 1, 'ADJUST', 4, 20, 20, 20, 1, 0, NULL, '2025-11-30 17:25:54'),
(12, 1, 'ADJUST', 5, 30, 30, 30, 1, 0, NULL, '2025-11-30 17:49:42'),
(13, 1, 'ADJUST', 6, 30, 1, 1, 0, 0, NULL, '2025-11-30 17:50:44'),
(15, 1, 'ADJUST', 16, 20, 42, 42, 2, 2, NULL, '2025-11-30 19:52:07'),
(16, 1, 'ADJUST', 17, 30, 62, 62, 2, 2, NULL, '2025-11-30 19:52:07');

INSERT INTO `issue_allocations` (`allocation_id`, `issue_item_id`, `batch_id`, `pieces_sent`, `created_at`) VALUES
(1, 1, 1, 210, '2025-11-23 08:00:22'),
(2, 1, 3, 114, '2025-11-23 08:00:22'),
(3, 2, 2, 306, '2025-11-23 08:00:22'),
(4, 3, 3, 6, '2025-11-23 09:41:51'),
(5, 3, 4, 44, '2025-11-23 09:41:51'),
(6, 4, 2, 4, '2025-11-23 09:41:51'),
(7, 4, 5, 26, '2025-11-23 09:41:51');

INSERT INTO `issue_items` (`entry_id`, `issue_id`, `product_id`, `quantity_sent`, `boxes_sent`, `items_sent`, `pieces_sent`) VALUES
(1, 1, 1, 324, 0, 0, 0),
(2, 1, 1, 306, 0, 0, 0),
(3, 2, 1, 50, 0, 0, 0),
(4, 2, 1, 30, 0, 0, 0);

INSERT INTO `issue_lorries` (`lorry_id`, `lorry_name`, `lorry_no`) VALUES
(1, 'Issue_lorry_1', 'WA-SP-3030'),
(2, 'Issue_lorry_2', 'WA-SP-4040');

INSERT INTO `issue_note` (`issue_id`, `issue_no`, `date_created`, `lorry_id`, `initiator_id`, `authenticator`, `is_edited`, `edited_by`, `edited_at`) VALUES
(1, 'IN-0001', '2025-11-23 08:00:22', 1, 2, 'Mr. Sunanda', 0, NULL, NULL),
(2, 'IN-0002', '2025-11-23 09:41:51', 1, 2, 'Supesh Asalya', 0, NULL, NULL);

INSERT INTO `issue_rep` (`issue_id`, `rep_id`) VALUES
(1, 2),
(2, 2);

INSERT INTO `lorries` (`lorry_id`, `lorry_name`, `lorry_no`) VALUES
(1, 'Lorry 1', 'WA-SP-3000');

INSERT INTO `products` (`product_id`, `product_code`, `name`, `brand_id`, `quantity`, `supplier_id`, `default_pack_size`) VALUES
(1, 'PROD-0001', 'Tikiri Mari 12pcs', 1, 952, 1, 20),
(2, 'PC-0003', 'Kiri Packet 200ml', 2, 0, 1, NULL);

-- Extra sample products for quick UI/API testing
-- Uses INSERT OR IGNORE so re-running the seed won't duplicate rows.
INSERT OR IGNORE INTO `products` (`product_code`, `name`, `brand_id`, `quantity`, `supplier_id`, `default_pack_size`) VALUES
('PROD-0002', 'Tikiri Mari 20pcs', 1, 0, 1, 20),
('PROD-0003', 'Tikiri Mari 30pcs', 1, 0, 1, 30),
('PROD-0004', 'Choco Puff 20pcs', 1, 0, 1, 20),
('PROD-0005', 'Nice Biscuits 20pcs', 1, 0, 1, 20),
('PROD-0006', 'Cream Cracker 30pcs', 1, 0, 1, 30),
('PROD-0007', 'Kiri Packet 200ml (Box)', 2, 0, 1, 24),
('PROD-0008', 'Kiri Packet 1L (Box)', 2, 0, 1, 12),
('PROD-0009', 'Flavored Milk 200ml (Box)', 2, 0, 1, 24),
('PROD-0010', 'Butter 100g (Pack)', 2, 0, 1, 48);

INSERT INTO `representatives` (`rep_id`, `nic`, `full_name`, `call_name`, `mobile_no`, `address`, `dob`, `date_added`) VALUES
(0, '200512312222', 'Ramira', 'Rami', '0911322991', '123, KIrajxlaj,akjhx', '1992-12-14', '2025-12-01 04:28:56'),
(1, '200402412496', 'Supesh Asalya', 'supesh', '0111112111', '123 Kandy Road Kadawatha', '2015-11-05', '2025-11-15 13:45:08'),
(2, '200402412410', 'Kaveen Chamodya', 'kaveena', '0111111111', '124 Kandy Road Kadawatha', '2015-11-06', '2025-11-15 13:45:52');

INSERT INTO `suppliers` (`supplier_id`, `name`, `contact_person`, `phone`, `email`) VALUES
(1, 'ABC Suppliers', 'Supesh', '0774302000', '');

INSERT INTO `supplier_brands` (`supplier_id`, `brand_id`) VALUES
(1, 1),
(1, 2);

INSERT INTO `supplier_lorries` (`supplier_id`, `lorry_id`) VALUES
(1, 1);

INSERT INTO `unload_items` (`id`, `unload_id`, `issue_item_id`, `product_id`, `pack_size`, `quantity_returned`, `boxes_returned`, `items_returned`) VALUES
(2, 9, 0, 1, 20, 100, 5, 0),
(3, 9, 0, 1, 30, 120, 4, 0),
(4, 10, 0, 1, 20, 40, 2, 0);

INSERT INTO `unload_note` (`id`, `unload_no`, `unload_date`, `issue_id`, `lorry_id`, `created_by`, `remarks`) VALUES
(9, 'UL 0001', '2025-11-26 14:48:48', 1, 1, 2, NULL),
(10, 'UL-0004', '2025-11-30 07:34:35', 2, 1, 2, NULL);

INSERT INTO `users` (`user_id`, `full_name`, `nic`, `address`, `dob`, `mobile_no`, `username`, `password`, `role`, `date_added`) VALUES
(1, 'System Administrator', '000000000V', 'Head Office', '1990-01-01', '0700000000', 'admin', '$2b$10$0BtXfGiUmAxUDk/mKYB6HOqhzmzZxrweNtG91Xud67bEiolsL3yea', 'admin', '2025-11-14 15:09:20'),
(2, 'Supesh Asalya', '200401411011', '123 Main Street Kandy', '2004-11-24', '0119911991', 'johndoe', '$2b$10$mELTQ3Uk5b6.cPm7mPxoOuHIjZ0tlRqYqxGFeR2w2uvE7y12zH.F6', 'user', '2025-11-14 15:11:16'),
(3, 'Test User', '123456789V', 'Test address', '2000-01-01', '0771234567', 'testuser1', '$2b$10$Blju2Qg3Wa1Tij4VQVAoVOxC1jMvygccTVRs4ueH0KUAlQkVNbcCu', 'user', '2025-11-15 13:50:58');

-- ---------------------------------------------------------------------------
-- ABC supplier (supplier_id=1) demo data: 91 products + GRNs + batches (stock)
-- Deterministic IDs in a safe range to avoid collisions with existing seeds.
-- ---------------------------------------------------------------------------

-- Create 91 products (product_id 1001..1091) with starting stock already set
-- to match the inventory_batches that are inserted below.
WITH RECURSIVE seq(n) AS (
	SELECT 1
	UNION ALL
	SELECT n + 1 FROM seq WHERE n < 91
)
INSERT INTO `products`
	(`product_id`, `product_code`, `name`, `brand_id`, `quantity`, `supplier_id`, `default_pack_size`)
SELECT
	1000 + n AS product_id,
	'ABC-PROD-' || printf('%04d', n) AS product_code,
	'ABC Test Product ' || printf('%03d', n) AS name,
	CASE WHEN (n % 2) = 0 THEN 2 ELSE 1 END AS brand_id,
	5 * (CASE WHEN (n % 3) = 0 THEN 30 ELSE 20 END) AS quantity,
	1 AS supplier_id,
	(CASE WHEN (n % 3) = 0 THEN 30 ELSE 20 END) AS default_pack_size
FROM seq;

-- GRN headers (grn_id 101..103) for the ABC demo products
INSERT INTO `grn` (`grn_id`, `grn_no`, `supplier_id`, `lorry_id`, `grn_date`) VALUES
(101, 'GRN-ABC-TEST-0001', 1, 1, '2026-03-13 09:00:00'),
(102, 'GRN-ABC-TEST-0002', 1, 1, '2026-03-13 10:00:00'),
(103, 'GRN-ABC-TEST-0003', 1, 1, '2026-03-13 11:00:00');

-- GRN items (entry_id 1001..1091) and link each to its batch_id (2001..2091)
WITH RECURSIVE seq(n) AS (
	SELECT 1
	UNION ALL
	SELECT n + 1 FROM seq WHERE n < 91
)
INSERT INTO `grn_items`
	(`entry_id`, `grn_id`, `product_id`, `quantity_received`, `date`, `pack_size`, `boxes_received`, `items_received`, `batch_id`)
SELECT
	1000 + n AS entry_id,
	CASE
		WHEN n <= 31 THEN 101
		WHEN n <= 61 THEN 102
		ELSE 103
	END AS grn_id,
	1000 + n AS product_id,
	5 * (CASE WHEN (n % 3) = 0 THEN 30 ELSE 20 END) AS quantity_received,
	CASE
		WHEN n <= 31 THEN '2026-03-13 09:00:00'
		WHEN n <= 61 THEN '2026-03-13 10:00:00'
		ELSE '2026-03-13 11:00:00'
	END AS date,
	(CASE WHEN (n % 3) = 0 THEN 30 ELSE 20 END) AS pack_size,
	5 AS boxes_received,
	0 AS items_received,
	2000 + n AS batch_id
FROM seq;

-- Inventory batches (batch_id 2001..2091) matching the GRN items above
WITH RECURSIVE seq(n) AS (
	SELECT 1
	UNION ALL
	SELECT n + 1 FROM seq WHERE n < 91
)
INSERT INTO `inventory_batches`
	(`batch_id`, `product_id`, `source_type`, `source_id`, `pack_size`, `received_pcs`, `remaining_pcs`, `received_boxes`, `received_items`, `expiry_date`, `created_at`)
SELECT
	2000 + n AS batch_id,
	1000 + n AS product_id,
	'GRN' AS source_type,
	1000 + n AS source_id,
	(CASE WHEN (n % 3) = 0 THEN 30 ELSE 20 END) AS pack_size,
	5 * (CASE WHEN (n % 3) = 0 THEN 30 ELSE 20 END) AS received_pcs,
	5 * (CASE WHEN (n % 3) = 0 THEN 30 ELSE 20 END) AS remaining_pcs,
	5 AS received_boxes,
	0 AS received_items,
	NULL AS expiry_date,
	CASE
		WHEN n <= 31 THEN '2026-03-13 09:00:00'
		WHEN n <= 61 THEN '2026-03-13 10:00:00'
		ELSE '2026-03-13 11:00:00'
	END AS created_at
FROM seq;