CREATE TABLE customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE orders (id TEXT PRIMARY KEY, customer TEXT NOT NULL, items TEXT NOT NULL, address TEXT NOT NULL, appointment TEXT NOT NULL, staff TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT '未割当', note TEXT NOT NULL DEFAULT '');