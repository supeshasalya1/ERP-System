

CREATE TABLE adjustment_reasons (
  reason_id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL
);

CREATE TABLE users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  nic TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  dob TEXT NOT NULL,
  mobile_no TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  session_token TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  date_added TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE brands (
  brand_id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_name TEXT NOT NULL
);

CREATE TABLE suppliers (
  supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT
);

CREATE TABLE lorries (
  lorry_id INTEGER PRIMARY KEY AUTOINCREMENT,
  lorry_name TEXT NOT NULL,
  lorry_no TEXT NOT NULL UNIQUE
);

CREATE TABLE issue_lorries (
  lorry_id INTEGER PRIMARY KEY AUTOINCREMENT,
  lorry_name TEXT NOT NULL,
  lorry_no TEXT NOT NULL UNIQUE
);

CREATE TABLE representatives (
  rep_id INTEGER PRIMARY KEY AUTOINCREMENT,
  nic TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  call_name TEXT NOT NULL,
  mobile_no TEXT NOT NULL,
  address TEXT NOT NULL,
  dob TEXT NOT NULL,
  date_added TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  product_id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  brand_id INTEGER,
  quantity INTEGER DEFAULT 0,
  supplier_id INTEGER NOT NULL,
  default_pack_size INTEGER,
  FOREIGN KEY (brand_id) REFERENCES brands (brand_id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id) ON UPDATE CASCADE
);

CREATE TABLE supplier_brands (
  supplier_id INTEGER NOT NULL,
  brand_id INTEGER NOT NULL,
  PRIMARY KEY (supplier_id, brand_id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id) ON DELETE CASCADE,
  FOREIGN KEY (brand_id) REFERENCES brands (brand_id)
);

CREATE TABLE supplier_lorries (
  supplier_id INTEGER NOT NULL,
  lorry_id INTEGER NOT NULL,
  PRIMARY KEY (supplier_id, lorry_id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id) ON DELETE CASCADE,
  FOREIGN KEY (lorry_id) REFERENCES lorries (lorry_id) ON DELETE CASCADE
);

CREATE TABLE grn (
  grn_id INTEGER PRIMARY KEY AUTOINCREMENT,
  grn_no TEXT NOT NULL UNIQUE,
  supplier_id INTEGER NOT NULL,
  lorry_id INTEGER NOT NULL,
  grn_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id) ON UPDATE CASCADE,
  FOREIGN KEY (lorry_id) REFERENCES lorries (lorry_id) ON UPDATE CASCADE
);

CREATE TABLE inventory_batches (
  batch_id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  pack_size INTEGER NOT NULL,
  received_pcs INTEGER NOT NULL DEFAULT 0,
  remaining_pcs INTEGER NOT NULL DEFAULT 0,
  received_boxes INTEGER NOT NULL DEFAULT 0,
  received_items INTEGER NOT NULL DEFAULT 0,
  expiry_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products (product_id)
);

CREATE TABLE grn_items (
  entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
  grn_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity_received INTEGER NOT NULL,
  date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pack_size INTEGER,
  boxes_received INTEGER NOT NULL DEFAULT 0,
  items_received INTEGER NOT NULL DEFAULT 0,
  batch_id INTEGER,
  FOREIGN KEY (grn_id) REFERENCES grn (grn_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products (product_id) ON UPDATE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES inventory_batches (batch_id)
);

CREATE TABLE grn_item_audit (
  audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  grn_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  old_qty REAL NOT NULL,
  new_qty REAL NOT NULL,
  edited_by INTEGER NOT NULL,
  edited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE adjustment_notes (
  note_id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_no TEXT NOT NULL UNIQUE,
  note_date TEXT NOT NULL,
  reason_id INTEGER NOT NULL,
  remark TEXT,
  source_type TEXT NOT NULL,
  source_id INTEGER,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  approved_by INTEGER,
  approved_at TEXT,
  FOREIGN KEY (reason_id) REFERENCES adjustment_reasons (reason_id),
  FOREIGN KEY (created_by) REFERENCES users (user_id),
  FOREIGN KEY (approved_by) REFERENCES users (user_id)
);

CREATE TABLE adjustment_items (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  pack_size INTEGER NOT NULL,
  delta_boxes INTEGER NOT NULL DEFAULT 0,
  delta_items INTEGER NOT NULL DEFAULT 0,
  related_item_id INTEGER,
  related_batch_id INTEGER,
  expiry_date TEXT,
  FOREIGN KEY (note_id) REFERENCES adjustment_notes (note_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products (product_id)
);

CREATE TABLE adjustment_allocations (
  allocation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  adj_item_id INTEGER NOT NULL,
  batch_id INTEGER NOT NULL,
  pieces_delta INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (adj_item_id) REFERENCES adjustment_items (item_id),
  FOREIGN KEY (batch_id) REFERENCES inventory_batches (batch_id)
);

CREATE TABLE issue_note (
  issue_id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_no TEXT NOT NULL,
  date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lorry_id INTEGER NOT NULL,
  initiator_id INTEGER NOT NULL,
  authenticator TEXT NOT NULL,
  is_edited INTEGER NOT NULL DEFAULT 0,
  edited_by INTEGER,
  edited_at TEXT,
  FOREIGN KEY (lorry_id) REFERENCES issue_lorries (lorry_id) ON UPDATE CASCADE,
  FOREIGN KEY (initiator_id) REFERENCES users (user_id) ON UPDATE CASCADE,
  FOREIGN KEY (edited_by) REFERENCES users (user_id)
);

CREATE TABLE issue_items (
  entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER,
  product_id INTEGER,
  quantity_sent INTEGER,
  boxes_sent INTEGER NOT NULL DEFAULT 0,
  items_sent INTEGER NOT NULL DEFAULT 0,
  pieces_sent INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (issue_id) REFERENCES issue_note (issue_id) ON UPDATE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products (product_id) ON UPDATE CASCADE
);

CREATE TABLE issue_allocations (
  allocation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_item_id INTEGER NOT NULL,
  batch_id INTEGER NOT NULL,
  pieces_sent INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issue_item_id) REFERENCES issue_items (entry_id),
  FOREIGN KEY (batch_id) REFERENCES inventory_batches (batch_id)
);

CREATE TABLE issue_rep (
  issue_id INTEGER NOT NULL,
  rep_id INTEGER NOT NULL,
  PRIMARY KEY (issue_id, rep_id),
  FOREIGN KEY (issue_id) REFERENCES issue_note (issue_id) ON UPDATE CASCADE,
  FOREIGN KEY (rep_id) REFERENCES representatives (rep_id) ON UPDATE CASCADE
);

CREATE TABLE unload_note (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unload_no TEXT NOT NULL UNIQUE,
  unload_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  issue_id INTEGER,
  lorry_id INTEGER NOT NULL,
  created_by INTEGER NOT NULL,
  remarks TEXT,
  FOREIGN KEY (issue_id) REFERENCES issue_note (issue_id) ON UPDATE CASCADE,
  FOREIGN KEY (lorry_id) REFERENCES issue_lorries (lorry_id) ON UPDATE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users (user_id) ON UPDATE CASCADE
);

CREATE TABLE unload_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unload_id INTEGER NOT NULL,
  issue_item_id INTEGER,
  product_id INTEGER NOT NULL,
  pack_size INTEGER NOT NULL DEFAULT 1,
  quantity_returned INTEGER NOT NULL,
  boxes_returned INTEGER NOT NULL DEFAULT 0,
  items_returned INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (unload_id) REFERENCES unload_note (id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products (product_id) ON UPDATE CASCADE
);

CREATE TABLE expire_receive_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_no TEXT NOT NULL UNIQUE,
  note_date TEXT NOT NULL,
  lorry_id INTEGER NOT NULL,
  created_by INTEGER NOT NULL,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'POSTED',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lorry_id) REFERENCES issue_lorries (lorry_id) ON UPDATE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users (user_id) ON UPDATE CASCADE
);

CREATE TABLE expire_receive_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL,
  pack_size INTEGER NOT NULL,
  boxes INTEGER NOT NULL DEFAULT 0,
  items INTEGER NOT NULL DEFAULT 0,
  total_pcs INTEGER NOT NULL,
  expiry_date TEXT,
  FOREIGN KEY (note_id) REFERENCES expire_receive_notes (id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products (product_id) ON UPDATE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id) ON UPDATE CASCADE
);

CREATE TABLE expire_return_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_no TEXT NOT NULL UNIQUE,
  note_date TEXT NOT NULL,
  supplier_id INTEGER NOT NULL,
  lorry_id INTEGER,
  created_by INTEGER NOT NULL,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'POSTED',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id) ON UPDATE CASCADE,
  FOREIGN KEY (lorry_id) REFERENCES lorries (lorry_id) ON UPDATE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users (user_id) ON UPDATE CASCADE
);

CREATE TABLE expire_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL,
  pack_size INTEGER NOT NULL,
  boxes INTEGER NOT NULL DEFAULT 0,
  items INTEGER NOT NULL DEFAULT 0,
  total_pcs INTEGER NOT NULL,
  FOREIGN KEY (note_id) REFERENCES expire_return_notes (id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products (product_id) ON UPDATE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id) ON UPDATE CASCADE
);

CREATE TABLE expire_store_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL,
  pack_size INTEGER NOT NULL,
  total_pcs INTEGER NOT NULL DEFAULT 0,
  boxes INTEGER NOT NULL DEFAULT 0,
  items INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, supplier_id, pack_size),
  FOREIGN KEY (product_id) REFERENCES products (product_id) ON UPDATE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id) ON UPDATE CASCADE
);
