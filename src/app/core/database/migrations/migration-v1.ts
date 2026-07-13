import { Migration } from '../types/database.types';

/**
 * Migration v1 defining the initial schema for categories, products,
 * attributes, options, mappings, and aliases.
 */
export const MigrationV1: Migration = {
  version: 1,
  statements: [
    `CREATE TABLE IF NOT EXISTS Category (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      IsActive INTEGER NOT NULL DEFAULT 1,
      CreatedAt TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS Product (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      SKU TEXT NOT NULL UNIQUE,
      CategoryId INTEGER NOT NULL,
      DisplayName TEXT NOT NULL,
      Barcode TEXT,
      HSNCode TEXT,
      GST REAL NOT NULL DEFAULT 0.0,
      SellingPrice REAL NOT NULL DEFAULT 0.0,
      Unit TEXT NOT NULL,
      IsActive INTEGER NOT NULL DEFAULT 1,
      CreatedAt TEXT NOT NULL,
      FOREIGN KEY(CategoryId) REFERENCES Category(Id)
    );`,
    `CREATE TABLE IF NOT EXISTS Attribute (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL UNIQUE,
      DataType TEXT NOT NULL,
      IsActive INTEGER NOT NULL DEFAULT 1
    );`,
    `CREATE TABLE IF NOT EXISTS AttributeValue (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      AttributeId INTEGER NOT NULL,
      DisplayValue TEXT NOT NULL,
      NormalizedValue TEXT NOT NULL,
      FOREIGN KEY(AttributeId) REFERENCES Attribute(Id),
      UNIQUE(AttributeId, NormalizedValue)
    );`,
    `CREATE TABLE IF NOT EXISTS ProductAttribute (
      ProductId INTEGER NOT NULL,
      AttributeValueId INTEGER NOT NULL,
      PRIMARY KEY(ProductId, AttributeValueId),
      FOREIGN KEY(ProductId) REFERENCES Product(Id) ON DELETE CASCADE,
      FOREIGN KEY(AttributeValueId) REFERENCES AttributeValue(Id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS Alias (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      AttributeValueId INTEGER NOT NULL,
      Keyword TEXT NOT NULL,
      FOREIGN KEY(AttributeValueId) REFERENCES AttributeValue(Id) ON DELETE CASCADE,
      UNIQUE(AttributeValueId, Keyword)
    );`,
    // Indexes to optimize performance on common joins and searches
    `CREATE INDEX IF NOT EXISTS idx_product_sku ON Product(SKU);`,
    `CREATE INDEX IF NOT EXISTS idx_product_category ON Product(CategoryId);`,
    `CREATE INDEX IF NOT EXISTS idx_alias_keyword ON Alias(Keyword);`,
    `CREATE INDEX IF NOT EXISTS idx_attribute_value_attr ON AttributeValue(AttributeId);`
  ]
};
