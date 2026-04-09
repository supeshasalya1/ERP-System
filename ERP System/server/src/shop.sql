-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Dec 01, 2025 at 12:34 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `latestdatabase`
--

-- --------------------------------------------------------

--
-- Table structure for table `adjustment_allocations`
--

CREATE TABLE `adjustment_allocations` (
  `allocation_id` bigint(20) NOT NULL,
  `adj_item_id` int(11) NOT NULL,
  `batch_id` bigint(20) NOT NULL,
  `pieces_delta` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `adjustment_allocations`
--

INSERT INTO `adjustment_allocations` (`allocation_id`, `adj_item_id`, `batch_id`, `pieces_delta`, `created_at`) VALUES
(1, 2, 4, -20, '2025-11-30 17:16:49'),
(2, 18, 4, -42, '2025-11-30 20:01:08'),
(3, 19, 5, -62, '2025-11-30 20:01:08');

-- --------------------------------------------------------

--
-- Table structure for table `adjustment_items`
--

CREATE TABLE `adjustment_items` (
  `item_id` int(11) NOT NULL,
  `note_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `pack_size` int(11) NOT NULL,
  `delta_boxes` int(11) NOT NULL DEFAULT 0,
  `delta_items` int(11) NOT NULL DEFAULT 0,
  `related_item_id` int(11) DEFAULT NULL,
  `related_batch_id` bigint(20) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `adjustment_items`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `adjustment_notes`
--

CREATE TABLE `adjustment_notes` (
  `note_id` int(11) NOT NULL,
  `note_no` varchar(50) NOT NULL,
  `note_date` date NOT NULL,
  `reason_id` int(11) NOT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `source_type` enum('GRN','ISSUE','UNLOAD','DIRECT') NOT NULL,
  `source_id` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('DRAFT','PENDING','APPROVED','REJECTED','POSTED') NOT NULL DEFAULT 'DRAFT',
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `adjustment_notes`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `adjustment_reasons`
--

CREATE TABLE `adjustment_reasons` (
  `reason_id` int(11) NOT NULL,
  `code` varchar(30) NOT NULL,
  `display_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `adjustment_reasons`
--

INSERT INTO `adjustment_reasons` (`reason_id`, `code`, `display_name`) VALUES
(1, 'GRN_QTY_ERROR', 'GRN quantity mistake'),
(2, 'ISSUE_QTY_ERROR', 'Issue note quantity mistake'),
(3, 'UNLOAD_QTY_ERROR', 'Unload note quantity mistake'),
(4, 'STOCK_COUNT_DIFF', 'Stock count difference'),
(5, 'OTHER', 'Other');

-- --------------------------------------------------------

--
-- Table structure for table `brands`
--

CREATE TABLE `brands` (
  `brand_id` int(11) NOT NULL,
  `brand_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `brands`
--

INSERT INTO `brands` (`brand_id`, `brand_name`) VALUES
(1, 'Munchee'),
(2, 'Kotmale');

-- --------------------------------------------------------

--
-- Table structure for table `expire_receive_items`
--

CREATE TABLE `expire_receive_items` (
  `id` int(11) NOT NULL,
  `note_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `pack_size` int(11) NOT NULL,
  `boxes` int(11) NOT NULL DEFAULT 0,
  `items` int(11) NOT NULL DEFAULT 0,
  `total_pcs` int(11) NOT NULL,
  `expiry_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expire_receive_items`
--

INSERT INTO `expire_receive_items` (`id`, `note_id`, `product_id`, `supplier_id`, `pack_size`, `boxes`, `items`, `total_pcs`, `expiry_date`) VALUES
(1, 1, 1, 1, 1, 0, 10, 10, NULL),
(2, 2, 1, 1, 1, 0, 50, 50, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `expire_receive_notes`
--

CREATE TABLE `expire_receive_notes` (
  `id` int(11) NOT NULL,
  `note_no` varchar(50) NOT NULL,
  `note_date` date NOT NULL,
  `lorry_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `status` enum('DRAFT','POSTED') NOT NULL DEFAULT 'POSTED',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expire_receive_notes`
--

INSERT INTO `expire_receive_notes` (`id`, `note_no`, `note_date`, `lorry_id`, `created_by`, `remarks`, `status`, `created_at`) VALUES
(1, 'EXR-000001', '2025-11-30', 2, 2, NULL, 'POSTED', '2025-11-30 10:54:23'),
(2, 'EXR-000002', '2025-11-30', 1, 2, NULL, 'POSTED', '2025-11-30 11:03:06');

-- --------------------------------------------------------

--
-- Table structure for table `expire_return_items`
--

CREATE TABLE `expire_return_items` (
  `id` int(11) NOT NULL,
  `note_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `pack_size` int(11) NOT NULL,
  `boxes` int(11) NOT NULL DEFAULT 0,
  `items` int(11) NOT NULL DEFAULT 0,
  `total_pcs` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expire_return_items`
--

INSERT INTO `expire_return_items` (`id`, `note_id`, `product_id`, `supplier_id`, `pack_size`, `boxes`, `items`, `total_pcs`) VALUES
(1, 1, 1, 1, 1, 40, 0, 40);

-- --------------------------------------------------------

--
-- Table structure for table `expire_return_notes`
--

CREATE TABLE `expire_return_notes` (
  `id` int(11) NOT NULL,
  `note_no` varchar(50) NOT NULL,
  `note_date` date NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `lorry_id` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `status` enum('DRAFT','POSTED') NOT NULL DEFAULT 'POSTED',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expire_return_notes`
--

INSERT INTO `expire_return_notes` (`id`, `note_no`, `note_date`, `supplier_id`, `lorry_id`, `created_by`, `remarks`, `status`, `created_at`) VALUES
(1, 'EXRT-000001', '2025-11-30', 1, 1, 2, NULL, 'POSTED', '2025-11-30 11:49:30');

-- --------------------------------------------------------

--
-- Table structure for table `expire_store_stock`
--

CREATE TABLE `expire_store_stock` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `pack_size` int(11) NOT NULL,
  `total_pcs` int(11) NOT NULL DEFAULT 0,
  `boxes` int(11) NOT NULL DEFAULT 0,
  `items` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expire_store_stock`
--

INSERT INTO `expire_store_stock` (`id`, `product_id`, `supplier_id`, `pack_size`, `total_pcs`, `boxes`, `items`, `updated_at`) VALUES
(1, 1, 1, 1, 20, 20, 0, '2025-11-30 11:49:30');

-- --------------------------------------------------------

--
-- Table structure for table `grn`
--

CREATE TABLE `grn` (
  `grn_id` int(11) NOT NULL,
  `grn_no` varchar(50) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `lorry_id` int(11) NOT NULL,
  `grn_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `grn`
--

INSERT INTO `grn` (`grn_id`, `grn_no`, `supplier_id`, `lorry_id`, `grn_date`) VALUES
(1, 'GRN-0001', 1, 1, '2025-11-23 04:28:43'),
(3, 'GRN-0002', 1, 1, '2025-11-23 04:52:17'),
(4, 'GRN-0003', 1, 1, '2025-11-23 09:39:12');

-- --------------------------------------------------------

--
-- Table structure for table `grn_items`
--

CREATE TABLE `grn_items` (
  `entry_id` int(11) NOT NULL,
  `grn_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity_received` int(11) NOT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp(),
  `pack_size` int(11) DEFAULT NULL,
  `boxes_received` int(11) NOT NULL DEFAULT 0,
  `items_received` int(11) NOT NULL DEFAULT 0,
  `batch_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `grn_items`
--

INSERT INTO `grn_items` (`entry_id`, `grn_id`, `product_id`, `quantity_received`, `date`, `pack_size`, `boxes_received`, `items_received`, `batch_id`) VALUES
(1, 1, 1, 210, '2025-11-23 04:28:43', 20, 10, 10, 1),
(2, 1, 1, 310, '2025-11-23 04:28:43', 30, 10, 10, 2),
(3, 3, 1, 120, '2025-11-23 04:52:17', 20, 5, 20, 3),
(4, 4, 1, 200, '2025-11-23 09:39:12', 20, 10, 0, 4),
(5, 4, 1, 300, '2025-11-23 09:39:12', 30, 10, 0, 5);

-- --------------------------------------------------------

--
-- Table structure for table `grn_item_audit`
--

CREATE TABLE `grn_item_audit` (
  `audit_id` int(11) NOT NULL,
  `grn_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `old_qty` decimal(12,2) NOT NULL,
  `new_qty` decimal(12,2) NOT NULL,
  `edited_by` int(11) NOT NULL,
  `edited_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_batches`
--

CREATE TABLE `inventory_batches` (
  `batch_id` bigint(20) NOT NULL,
  `product_id` int(11) NOT NULL,
  `source_type` enum('GRN','ADJUST','UNLOAD') NOT NULL,
  `source_id` bigint(20) NOT NULL,
  `pack_size` int(11) NOT NULL,
  `received_pcs` int(11) NOT NULL DEFAULT 0,
  `remaining_pcs` int(11) NOT NULL DEFAULT 0,
  `received_boxes` int(11) NOT NULL DEFAULT 0,
  `received_items` int(11) NOT NULL DEFAULT 0,
  `expiry_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory_batches`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `issue_allocations`
--

CREATE TABLE `issue_allocations` (
  `allocation_id` bigint(20) NOT NULL,
  `issue_item_id` int(11) NOT NULL,
  `batch_id` bigint(20) NOT NULL,
  `pieces_sent` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `issue_allocations`
--

INSERT INTO `issue_allocations` (`allocation_id`, `issue_item_id`, `batch_id`, `pieces_sent`, `created_at`) VALUES
(1, 1, 1, 210, '2025-11-23 08:00:22'),
(2, 1, 3, 114, '2025-11-23 08:00:22'),
(3, 2, 2, 306, '2025-11-23 08:00:22'),
(4, 3, 3, 6, '2025-11-23 09:41:51'),
(5, 3, 4, 44, '2025-11-23 09:41:51'),
(6, 4, 2, 4, '2025-11-23 09:41:51'),
(7, 4, 5, 26, '2025-11-23 09:41:51');

-- --------------------------------------------------------

--
-- Table structure for table `issue_items`
--

CREATE TABLE `issue_items` (
  `entry_id` int(11) NOT NULL,
  `issue_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `quantity_sent` int(11) DEFAULT NULL,
  `boxes_sent` int(11) NOT NULL DEFAULT 0,
  `items_sent` int(11) NOT NULL DEFAULT 0,
  `pieces_sent` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `issue_items`
--

INSERT INTO `issue_items` (`entry_id`, `issue_id`, `product_id`, `quantity_sent`, `boxes_sent`, `items_sent`, `pieces_sent`) VALUES
(1, 1, 1, 324, 0, 0, 0),
(2, 1, 1, 306, 0, 0, 0),
(3, 2, 1, 50, 0, 0, 0),
(4, 2, 1, 30, 0, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `issue_lorries`
--

CREATE TABLE `issue_lorries` (
  `lorry_id` int(11) NOT NULL,
  `lorry_name` varchar(50) NOT NULL,
  `lorry_no` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `issue_lorries`
--

INSERT INTO `issue_lorries` (`lorry_id`, `lorry_name`, `lorry_no`) VALUES
(1, 'Issue_lorry_1', 'WA-SP-3030'),
(2, 'Issue_lorry_2', 'WA-SP-4040');

-- --------------------------------------------------------

--
-- Table structure for table `issue_note`
--

CREATE TABLE `issue_note` (
  `issue_id` int(11) NOT NULL,
  `issue_no` varchar(50) NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  `lorry_id` int(11) NOT NULL,
  `initiator_id` int(11) NOT NULL,
  `authenticator` varchar(50) NOT NULL,
  `is_edited` tinyint(1) NOT NULL DEFAULT 0,
  `edited_by` int(11) DEFAULT NULL,
  `edited_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `issue_note`
--

INSERT INTO `issue_note` (`issue_id`, `issue_no`, `date_created`, `lorry_id`, `initiator_id`, `authenticator`, `is_edited`, `edited_by`, `edited_at`) VALUES
(1, 'IN-0001', '2025-11-23 08:00:22', 1, 2, 'Mr. Sunanda', 0, NULL, NULL),
(2, 'IN-0002', '2025-11-23 09:41:51', 1, 2, 'Supesh Asalya', 0, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `issue_rep`
--

CREATE TABLE `issue_rep` (
  `issue_id` int(11) NOT NULL,
  `rep_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `issue_rep`
--

INSERT INTO `issue_rep` (`issue_id`, `rep_id`) VALUES
(1, 2),
(2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `lorries`
--

CREATE TABLE `lorries` (
  `lorry_id` int(11) NOT NULL,
  `lorry_name` varchar(100) NOT NULL,
  `lorry_no` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lorries`
--

INSERT INTO `lorries` (`lorry_id`, `lorry_name`, `lorry_no`) VALUES
(1, 'Lorry 1', 'WA-SP-3000');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` int(11) NOT NULL,
  `product_code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `brand_id` int(11) DEFAULT NULL,
  `quantity` int(11) DEFAULT 0,
  `supplier_id` int(11) NOT NULL,
  `default_pack_size` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `product_code`, `name`, `brand_id`, `quantity`, `supplier_id`, `default_pack_size`) VALUES
(1, 'PROD-0001', 'Tikiri Mari 12pcs', 1, 952, 1, 20),
(2, 'PC-0003', 'Kiri Packet 200ml', 2, 0, 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `representatives`
--

CREATE TABLE `representatives` (
  `rep_id` int(11) NOT NULL,
  `nic` varchar(20) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `call_name` varchar(20) NOT NULL,
  `mobile_no` varchar(10) NOT NULL,
  `address` varchar(250) NOT NULL,
  `dob` date NOT NULL,
  `date_added` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `representatives`
--

INSERT INTO `representatives` (`rep_id`, `nic`, `full_name`, `call_name`, `mobile_no`, `address`, `dob`, `date_added`) VALUES
(0, '200512312222', 'Ramira', 'Rami', '0911322991', '123, KIrajxlaj,akjhx', '1992-12-14', '2025-12-01 04:28:56'),
(1, '200402412496', 'Supesh Asalya', 'supesh', '0111112111', '123 Kandy Road Kadawatha', '2015-11-05', '2025-11-15 13:45:08'),
(2, '200402412410', 'Kaveen Chamodya', 'kaveena', '0111111111', '124 Kandy Road Kadawatha', '2015-11-06', '2025-11-15 13:45:52');

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `supplier_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`supplier_id`, `name`, `contact_person`, `phone`, `email`) VALUES
(1, 'ABC Suppliers', 'Supesh', '0774302000', '');

-- --------------------------------------------------------

--
-- Table structure for table `supplier_brands`
--

CREATE TABLE `supplier_brands` (
  `supplier_id` int(11) NOT NULL,
  `brand_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `supplier_brands`
--

INSERT INTO `supplier_brands` (`supplier_id`, `brand_id`) VALUES
(1, 1),
(1, 2);

-- --------------------------------------------------------

--
-- Table structure for table `supplier_lorries`
--

CREATE TABLE `supplier_lorries` (
  `supplier_id` int(11) NOT NULL,
  `lorry_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `supplier_lorries`
--

INSERT INTO `supplier_lorries` (`supplier_id`, `lorry_id`) VALUES
(1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `unload_items`
--

CREATE TABLE `unload_items` (
  `id` int(11) NOT NULL,
  `unload_id` int(11) NOT NULL,
  `issue_item_id` int(11) DEFAULT NULL,
  `product_id` int(11) NOT NULL,
  `pack_size` int(11) NOT NULL DEFAULT 1,
  `quantity_returned` int(11) NOT NULL,
  `boxes_returned` int(11) NOT NULL DEFAULT 0,
  `items_returned` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `unload_items`
--

INSERT INTO `unload_items` (`id`, `unload_id`, `issue_item_id`, `product_id`, `pack_size`, `quantity_returned`, `boxes_returned`, `items_returned`) VALUES
(2, 9, 0, 1, 20, 100, 5, 0),
(3, 9, 0, 1, 30, 120, 4, 0),
(4, 10, 0, 1, 20, 40, 2, 0);

-- --------------------------------------------------------

--
-- Table structure for table `unload_note`
--

CREATE TABLE `unload_note` (
  `id` int(11) NOT NULL,
  `unload_no` varchar(50) NOT NULL,
  `unload_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `issue_id` int(11) NOT NULL,
  `lorry_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `remarks` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `unload_note`
--

INSERT INTO `unload_note` (`id`, `unload_no`, `unload_date`, `issue_id`, `lorry_id`, `created_by`, `remarks`) VALUES
(9, 'UL 0001', '2025-11-26 14:48:48', 1, 1, 2, NULL),
(10, 'UL-0004', '2025-11-30 07:34:35', 2, 1, 2, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `nic` varchar(20) NOT NULL,
  `address` varchar(200) NOT NULL,
  `dob` date NOT NULL,
  `mobile_no` varchar(10) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin','super_admin') NOT NULL DEFAULT 'user',
  `date_added` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `full_name`, `nic`, `address`, `dob`, `mobile_no`, `username`, `password`, `role`, `date_added`) VALUES
(1, 'System Administrator', '000000000V', 'Head Office', '1990-01-01', '0700000000', 'admin', '$2b$10$0BtXfGiUmAxUDk/mKYB6HOqhzmzZxrweNtG91Xud67bEiolsL3yea', 'admin', '2025-11-14 15:09:20'),
(2, 'Supesh Asalya', '200401411011', '123 Main Street Kandy', '2004-11-24', '0119911991', 'johndoe', '$2b$10$mELTQ3Uk5b6.cPm7mPxoOuHIjZ0tlRqYqxGFeR2w2uvE7y12zH.F6', 'user', '2025-11-14 15:11:16'),
(3, 'Test User', '123456789V', 'Test address', '2000-01-01', '0771234567', 'testuser1', '$2b$10$Blju2Qg3Wa1Tij4VQVAoVOxC1jMvygccTVRs4ueH0KUAlQkVNbcCu', 'user', '2025-11-15 13:50:58');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `adjustment_allocations`
--
ALTER TABLE `adjustment_allocations`
  ADD PRIMARY KEY (`allocation_id`),
  ADD KEY `idx_adj_item` (`adj_item_id`),
  ADD KEY `idx_adj_batch` (`batch_id`);

--
-- Indexes for table `adjustment_items`
--
ALTER TABLE `adjustment_items`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `fk_adj_note` (`note_id`),
  ADD KEY `fk_adj_product` (`product_id`);

--
-- Indexes for table `adjustment_notes`
--
ALTER TABLE `adjustment_notes`
  ADD PRIMARY KEY (`note_id`),
  ADD UNIQUE KEY `note_no` (`note_no`),
  ADD KEY `fk_adj_reason` (`reason_id`),
  ADD KEY `fk_adj_created` (`created_by`),
  ADD KEY `fk_adj_approved` (`approved_by`);

--
-- Indexes for table `adjustment_reasons`
--
ALTER TABLE `adjustment_reasons`
  ADD PRIMARY KEY (`reason_id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `brands`
--
ALTER TABLE `brands`
  ADD PRIMARY KEY (`brand_id`);

--
-- Indexes for table `expire_receive_items`
--
ALTER TABLE `expire_receive_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_expire_receive_note` (`note_id`),
  ADD KEY `idx_expire_receive_product` (`product_id`),
  ADD KEY `idx_expire_receive_supplier` (`supplier_id`),
  ADD KEY `idx_expire_receive_prod_pack` (`product_id`,`pack_size`);

--
-- Indexes for table `expire_receive_notes`
--
ALTER TABLE `expire_receive_notes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_expire_receive_note_no` (`note_no`),
  ADD KEY `idx_expire_receive_lorry` (`lorry_id`),
  ADD KEY `idx_expire_receive_created_by` (`created_by`);

--
-- Indexes for table `expire_return_items`
--
ALTER TABLE `expire_return_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_expire_return_note` (`note_id`),
  ADD KEY `idx_expire_return_product` (`product_id`),
  ADD KEY `idx_expire_return_supplier` (`supplier_id`),
  ADD KEY `idx_expire_return_prod_pack` (`product_id`,`pack_size`);

--
-- Indexes for table `expire_return_notes`
--
ALTER TABLE `expire_return_notes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_expire_return_note_no` (`note_no`),
  ADD KEY `idx_expire_return_supplier` (`supplier_id`),
  ADD KEY `idx_expire_return_lorry` (`lorry_id`),
  ADD KEY `idx_expire_return_user` (`created_by`);

--
-- Indexes for table `expire_store_stock`
--
ALTER TABLE `expire_store_stock`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_expire_store_key` (`product_id`,`supplier_id`,`pack_size`),
  ADD KEY `idx_expire_store_product` (`product_id`),
  ADD KEY `idx_expire_store_supplier` (`supplier_id`);

--
-- Indexes for table `grn`
--
ALTER TABLE `grn`
  ADD PRIMARY KEY (`grn_id`),
  ADD UNIQUE KEY `grn_no` (`grn_no`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `lorry_id` (`lorry_id`);

--
-- Indexes for table `grn_items`
--
ALTER TABLE `grn_items`
  ADD PRIMARY KEY (`entry_id`),
  ADD KEY `grn_id` (`grn_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `fk_grn_items_batch` (`batch_id`);

--
-- Indexes for table `grn_item_audit`
--
ALTER TABLE `grn_item_audit`
  ADD PRIMARY KEY (`audit_id`);

--
-- Indexes for table `inventory_batches`
--
ALTER TABLE `inventory_batches`
  ADD PRIMARY KEY (`batch_id`),
  ADD KEY `idx_batches_product` (`product_id`),
  ADD KEY `idx_batches_remaining` (`product_id`,`remaining_pcs`);

--
-- Indexes for table `issue_allocations`
--
ALTER TABLE `issue_allocations`
  ADD PRIMARY KEY (`allocation_id`),
  ADD KEY `idx_alloc_issue` (`issue_item_id`),
  ADD KEY `idx_alloc_batch` (`batch_id`);

--
-- Indexes for table `issue_items`
--
ALTER TABLE `issue_items`
  ADD PRIMARY KEY (`entry_id`),
  ADD KEY `fk1` (`issue_id`),
  ADD KEY `fk2` (`product_id`);

--
-- Indexes for table `issue_lorries`
--
ALTER TABLE `issue_lorries`
  ADD PRIMARY KEY (`lorry_id`),
  ADD UNIQUE KEY `lorry_no` (`lorry_no`);

--
-- Indexes for table `issue_note`
--
ALTER TABLE `issue_note`
  ADD PRIMARY KEY (`issue_id`),
  ADD KEY `fk_issue_lorry` (`lorry_id`),
  ADD KEY `fk_initiator` (`initiator_id`),
  ADD KEY `edited_by` (`edited_by`);

--
-- Indexes for table `issue_rep`
--
ALTER TABLE `issue_rep`
  ADD PRIMARY KEY (`issue_id`,`rep_id`),
  ADD KEY `fk_2` (`rep_id`);

--
-- Indexes for table `lorries`
--
ALTER TABLE `lorries`
  ADD PRIMARY KEY (`lorry_id`),
  ADD UNIQUE KEY `lorry_no` (`lorry_no`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD UNIQUE KEY `uq_products_code` (`product_code`),
  ADD KEY `brand_id` (`brand_id`),
  ADD KEY `fk_supplier` (`supplier_id`);

--
-- Indexes for table `representatives`
--
ALTER TABLE `representatives`
  ADD PRIMARY KEY (`rep_id`),
  ADD UNIQUE KEY `nic` (`nic`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`supplier_id`);

--
-- Indexes for table `supplier_brands`
--
ALTER TABLE `supplier_brands`
  ADD PRIMARY KEY (`supplier_id`,`brand_id`),
  ADD KEY `brand_id` (`brand_id`);

--
-- Indexes for table `supplier_lorries`
--
ALTER TABLE `supplier_lorries`
  ADD PRIMARY KEY (`supplier_id`,`lorry_id`),
  ADD KEY `lorry_id` (`lorry_id`);

--
-- Indexes for table `unload_items`
--
ALTER TABLE `unload_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_unload_items_note` (`unload_id`),
  ADD KEY `fk_unload_items_product` (`product_id`),
  ADD KEY `idx_unload_items_unload` (`unload_id`),
  ADD KEY `idx_unload_items_product` (`product_id`);

--
-- Indexes for table `unload_note`
--
ALTER TABLE `unload_note`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unload_no` (`unload_no`),
  ADD KEY `fk_unload_issue` (`issue_id`),
  ADD KEY `fk_unload_lorry` (`lorry_id`),
  ADD KEY `fk_unload_user` (`created_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `nic` (`nic`),
  ADD UNIQUE KEY `mobile_no` (`mobile_no`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `adjustment_allocations`
--
ALTER TABLE `adjustment_allocations`
  MODIFY `allocation_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `adjustment_items`
--
ALTER TABLE `adjustment_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `adjustment_notes`
--
ALTER TABLE `adjustment_notes`
  MODIFY `note_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `adjustment_reasons`
--
ALTER TABLE `adjustment_reasons`
  MODIFY `reason_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `brands`
--
ALTER TABLE `brands`
  MODIFY `brand_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `expire_receive_items`
--
ALTER TABLE `expire_receive_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `expire_receive_notes`
--
ALTER TABLE `expire_receive_notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `expire_return_items`
--
ALTER TABLE `expire_return_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `expire_return_notes`
--
ALTER TABLE `expire_return_notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `expire_store_stock`
--
ALTER TABLE `expire_store_stock`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `grn`
--
ALTER TABLE `grn`
  MODIFY `grn_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `grn_items`
--
ALTER TABLE `grn_items`
  MODIFY `entry_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `grn_item_audit`
--
ALTER TABLE `grn_item_audit`
  MODIFY `audit_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_batches`
--
ALTER TABLE `inventory_batches`
  MODIFY `batch_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `issue_allocations`
--
ALTER TABLE `issue_allocations`
  MODIFY `allocation_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `issue_items`
--
ALTER TABLE `issue_items`
  MODIFY `entry_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `issue_lorries`
--
ALTER TABLE `issue_lorries`
  MODIFY `lorry_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `issue_note`
--
ALTER TABLE `issue_note`
  MODIFY `issue_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `lorries`
--
ALTER TABLE `lorries`
  MODIFY `lorry_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `unload_items`
--
ALTER TABLE `unload_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `unload_note`
--
ALTER TABLE `unload_note`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `adjustment_allocations`
--
ALTER TABLE `adjustment_allocations`
  ADD CONSTRAINT `fk_adj_alloc_batch` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches` (`batch_id`),
  ADD CONSTRAINT `fk_adj_alloc_item` FOREIGN KEY (`adj_item_id`) REFERENCES `adjustment_items` (`item_id`);

--
-- Constraints for table `adjustment_items`
--
ALTER TABLE `adjustment_items`
  ADD CONSTRAINT `fk_adj_note` FOREIGN KEY (`note_id`) REFERENCES `adjustment_notes` (`note_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_adj_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);

--
-- Constraints for table `adjustment_notes`
--
ALTER TABLE `adjustment_notes`
  ADD CONSTRAINT `fk_adj_approved` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_adj_created` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_adj_reason` FOREIGN KEY (`reason_id`) REFERENCES `adjustment_reasons` (`reason_id`);

--
-- Constraints for table `expire_receive_items`
--
ALTER TABLE `expire_receive_items`
  ADD CONSTRAINT `fk_expire_receive_note` FOREIGN KEY (`note_id`) REFERENCES `expire_receive_notes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_expire_receive_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_expire_receive_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON UPDATE CASCADE;

--
-- Constraints for table `expire_receive_notes`
--
ALTER TABLE `expire_receive_notes`
  ADD CONSTRAINT `fk_expire_receive_lorry` FOREIGN KEY (`lorry_id`) REFERENCES `issue_lorries` (`lorry_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_expire_receive_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `expire_return_items`
--
ALTER TABLE `expire_return_items`
  ADD CONSTRAINT `fk_exp_return_items_note` FOREIGN KEY (`note_id`) REFERENCES `expire_return_notes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_exp_return_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_exp_return_items_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON UPDATE CASCADE;

--
-- Constraints for table `expire_return_notes`
--
ALTER TABLE `expire_return_notes`
  ADD CONSTRAINT `fk_expire_return_lorry` FOREIGN KEY (`lorry_id`) REFERENCES `lorries` (`lorry_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_expire_return_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_expire_return_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `expire_store_stock`
--
ALTER TABLE `expire_store_stock`
  ADD CONSTRAINT `fk_expire_store_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_expire_store_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON UPDATE CASCADE;

--
-- Constraints for table `grn`
--
ALTER TABLE `grn`
  ADD CONSTRAINT `grn_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `grn_ibfk_2` FOREIGN KEY (`lorry_id`) REFERENCES `lorries` (`lorry_id`) ON UPDATE CASCADE;

--
-- Constraints for table `grn_items`
--
ALTER TABLE `grn_items`
  ADD CONSTRAINT `fk_grn_items_batch` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches` (`batch_id`),
  ADD CONSTRAINT `grn_items_ibfk_1` FOREIGN KEY (`grn_id`) REFERENCES `grn` (`grn_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `grn_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE;

--
-- Constraints for table `inventory_batches`
--
ALTER TABLE `inventory_batches`
  ADD CONSTRAINT `fk_batches_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);

--
-- Constraints for table `issue_allocations`
--
ALTER TABLE `issue_allocations`
  ADD CONSTRAINT `fk_alloc_batch` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches` (`batch_id`),
  ADD CONSTRAINT `fk_alloc_issue_item` FOREIGN KEY (`issue_item_id`) REFERENCES `issue_items` (`entry_id`);

--
-- Constraints for table `issue_items`
--
ALTER TABLE `issue_items`
  ADD CONSTRAINT `fk1` FOREIGN KEY (`issue_id`) REFERENCES `issue_note` (`issue_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE;

--
-- Constraints for table `issue_note`
--
ALTER TABLE `issue_note`
  ADD CONSTRAINT `fk_initiator` FOREIGN KEY (`initiator_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_issue_lorry` FOREIGN KEY (`lorry_id`) REFERENCES `issue_lorries` (`lorry_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `issue_note_ibfk_1` FOREIGN KEY (`edited_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `issue_rep`
--
ALTER TABLE `issue_rep`
  ADD CONSTRAINT `fk_1` FOREIGN KEY (`issue_id`) REFERENCES `issue_note` (`issue_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_2` FOREIGN KEY (`rep_id`) REFERENCES `representatives` (`rep_id`) ON UPDATE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`brand_id`) ON DELETE SET NULL;

--
-- Constraints for table `supplier_brands`
--
ALTER TABLE `supplier_brands`
  ADD CONSTRAINT `supplier_brands_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `supplier_brands_ibfk_2` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`brand_id`);

--
-- Constraints for table `supplier_lorries`
--
ALTER TABLE `supplier_lorries`
  ADD CONSTRAINT `supplier_lorries_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `supplier_lorries_ibfk_2` FOREIGN KEY (`lorry_id`) REFERENCES `lorries` (`lorry_id`) ON DELETE CASCADE;

--
-- Constraints for table `unload_items`
--
ALTER TABLE `unload_items`
  ADD CONSTRAINT `fk_unload_items_note` FOREIGN KEY (`unload_id`) REFERENCES `unload_note` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_unload_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE;

--
-- Constraints for table `unload_note`
--
ALTER TABLE `unload_note`
  ADD CONSTRAINT `fk_unload_issue` FOREIGN KEY (`issue_id`) REFERENCES `issue_note` (`issue_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_unload_lorry` FOREIGN KEY (`lorry_id`) REFERENCES `issue_lorries` (`lorry_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_unload_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
