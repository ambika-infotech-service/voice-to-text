import { Seed } from '../types/database.types';

/**
 * Initial seed data matching database v1.
 * Sets up basic plumbing categories, attribute systems, products, and Gujarati/English search aliases.
 */
export const SeedV1: Seed = {
  version: 1,
  statements: [
    // 1. Insert Category
    `INSERT OR IGNORE INTO Category (Id, Name, IsActive, CreatedAt)
     VALUES (1, 'Plumbing', 1, '2026-07-13T10:00:00Z');`,

    // 2. Insert Attributes
    `INSERT OR IGNORE INTO Attribute (Id, Name, DataType, IsActive) VALUES (1, 'Brand', 'TEXT', 1);`,
    `INSERT OR IGNORE INTO Attribute (Id, Name, DataType, IsActive) VALUES (2, 'Material', 'TEXT', 1);`,
    `INSERT OR IGNORE INTO Attribute (Id, Name, DataType, IsActive) VALUES (3, 'Size', 'TEXT', 1);`,
    `INSERT OR IGNORE INTO Attribute (Id, Name, DataType, IsActive) VALUES (4, 'Pressure', 'TEXT', 1);`,
    `INSERT OR IGNORE INTO Attribute (Id, Name, DataType, IsActive) VALUES (5, 'Quality', 'TEXT', 1);`,

    // 3. Insert Attribute Values
    // Brands (Attr 1)
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (1, 1, 'Supreme', 'supreme');`,
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (2, 1, 'Ashirvad', 'ashirvad');`,
    // Materials (Attr 2)
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (3, 2, 'PVC', 'pvc');`,
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (4, 2, 'CPVC', 'cpvc');`,
    // Sizes (Attr 3)
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (5, 3, '½"', '1/2 inch');`,
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (6, 3, '¾"', '3/4 inch');`,
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (7, 3, '1"', '1 inch');`,
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (8, 3, '1¼"', '1 1/4 inch');`,
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (9, 3, '1½"', '1 1/2 inch');`,
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (10, 3, '2"', '2 inch');`,
    // Pressures (Attr 4)
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (11, 4, '4kg', '4kg');`,
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (12, 4, '6kg', '6kg');`,
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (13, 4, '8kg', '8kg');`,
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (14, 4, '10kg', '10kg');`,
    // Quality (Attr 5)
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (15, 5, 'ISI', 'isi');`,
    `INSERT OR IGNORE INTO AttributeValue (Id, AttributeId, DisplayValue, NormalizedValue) VALUES (16, 5, 'Non ISI', 'non isi');`,

    // 4. Insert Products
    `INSERT OR IGNORE INTO Product (Id, SKU, CategoryId, DisplayName, Barcode, HSNCode, GST, SellingPrice, Unit, IsActive, CreatedAt)
     VALUES (1, 'SUP-PVC-1', 1, 'Supreme PVC Pipe 1" 6kg ISI', '123456789011', '3917', 18.0, 150.0, 'Mtr', 1, '2026-07-13T10:00:00Z');`,
    `INSERT OR IGNORE INTO Product (Id, SKU, CategoryId, DisplayName, Barcode, HSNCode, GST, SellingPrice, Unit, IsActive, CreatedAt)
     VALUES (2, 'ASH-PVC-1', 1, 'Ashirvad PVC Pipe 1" 6kg ISI', '123456789012', '3917', 18.0, 160.0, 'Mtr', 1, '2026-07-13T10:00:00Z');`,
    `INSERT OR IGNORE INTO Product (Id, SKU, CategoryId, DisplayName, Barcode, HSNCode, GST, SellingPrice, Unit, IsActive, CreatedAt)
     VALUES (3, 'SUP-CPVC-1', 1, 'Supreme CPVC Pipe 1" 10kg ISI', '123456789013', '3917', 18.0, 220.0, 'Mtr', 1, '2026-07-13T10:00:00Z');`,

    // 5. Link Product Attributes
    // Product 1 (Supreme, PVC, 1", 6kg, ISI)
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (1, 1);`,
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (1, 3);`,
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (1, 7);`,
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (1, 12);`,
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (1, 15);`,
    // Product 2 (Ashirvad, PVC, 1", 6kg, ISI)
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (2, 2);`,
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (2, 3);`,
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (2, 7);`,
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (2, 12);`,
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (2, 15);`,
    // Product 3 (Supreme, CPVC, 1", 10kg, ISI)
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (3, 1);`,
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (3, 4);`,
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (3, 7);`,
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (3, 14);`,
    `INSERT OR IGNORE INTO ProductAttribute (ProductId, AttributeValueId) VALUES (3, 15);`,

    // 6. Insert Aliases for Search
    // PVC (ValId=3) -> 'pvc', 'પીવીસી', 'p v c'
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (3, 'pvc');`,
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (3, 'પીવીસી');`,
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (3, 'p v c');`,
    // CPVC (ValId=4) -> 'cpvc', 'સીપીવીસી', 'c p v c'
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (4, 'cpvc');`,
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (4, 'સીપીવીસી');`,
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (4, 'c p v c');`,
    // 1" (ValId=7) -> '1 inch', '1"', 'એક ઇંચ'
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (7, '1 inch');`,
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (7, '1"');`,
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (7, 'એક ઇંચ');`,
    // 6kg (ValId=12) -> '6kg', '6 kg', 'છ કિલો'
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (12, '6kg');`,
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (12, '6 kg');`,
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (12, 'છ કિલો');`,
    // Supreme (ValId=1) -> 'supreme', 'સુપ્રીમ'
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (1, 'supreme');`,
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (1, 'સુપ્રીમ');`,
    // Ashirvad (ValId=2) -> 'ashirvad', 'આશીર્વાદ', 'ashirwad'
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (2, 'ashirvad');`,
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (2, 'આશીર્વાદ');`,
    `INSERT OR IGNORE INTO Alias (AttributeValueId, Keyword) VALUES (2, 'ashirwad');`
  ]
};
