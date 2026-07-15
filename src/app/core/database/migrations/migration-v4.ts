import { Migration } from '../types/database.types';

/**
 * Helper to calculate purchase and selling prices for seeding.
 */
function calculatePrices(
  pricingType: string,
  basePrice: number,
  discount: number,
  cashDiscount: number,
  gst: number,
  profit: number,
  extra: number,
  roundOff: number
): { purchasePrice: number; sellingPrice: number } {
  if (pricingType === 'DIRECT_PRICE') {
    return { purchasePrice: basePrice, sellingPrice: basePrice };
  }

  // 1. Base minus discount
  let net = basePrice * (1 - (discount || 0) / 100);

  // 2. Less cash discount
  if (pricingType !== 'BASE_MINUS_DISCOUNT') {
    net = net * (1 - (cashDiscount || 0) / 100);
  }

  // 3. Add GST
  let purchase = net;
  if (
    pricingType === 'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST' ||
    pricingType === 'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT'
  ) {
    purchase = net * (1 + (gst || 0) / 100);
  }

  // Add extra charges
  purchase += (extra || 0);
  purchase = Math.round(purchase * 100) / 100;

  // 4. Calculate selling price
  let selling = purchase;
  if (pricingType === 'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT') {
    selling = purchase * (1 + (profit || 0) / 100);
  }

  selling += (roundOff || 0);
  selling = Math.round(selling * 100) / 100;

  return { purchasePrice: purchase, sellingPrice: selling };
}

/**
 * Migration v4 implementing the dynamic pricing & master catalog tables.
 */
export const MigrationV4: Migration = {
  version: 4,
  statements: []
};

// Start building statements
const stmts: string[] = [];

// 1. Drop old tables
stmts.push(`DROP TABLE IF EXISTS ProductAttribute;`);
stmts.push(`DROP TABLE IF EXISTS AttributeValue;`);
stmts.push(`DROP TABLE IF EXISTS Attribute;`);
stmts.push(`DROP TABLE IF EXISTS Alias;`);
stmts.push(`DROP TABLE IF EXISTS Product;`);
stmts.push(`DROP TABLE IF EXISTS Category;`);
stmts.push(`DROP TABLE IF EXISTS SubCategory;`);
stmts.push(`DROP TABLE IF EXISTS Brand;`);
stmts.push(`DROP TABLE IF EXISTS ProductVariant;`);
stmts.push(`DROP TABLE IF EXISTS PriceList;`);
stmts.push(`DROP TABLE IF EXISTS PricingRule;`);

// 2. Create tables
stmts.push(`
  CREATE TABLE Category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    displayOrder INTEGER DEFAULT 0,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

stmts.push(`
  CREATE TABLE SubCategory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoryId INTEGER NOT NULL,
    name TEXT NOT NULL,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY(categoryId) REFERENCES Category(id) ON DELETE CASCADE
  );
`);

stmts.push(`
  CREATE TABLE Brand (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

stmts.push(`
  CREATE TABLE Product (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brandId INTEGER NOT NULL,
    categoryId INTEGER NOT NULL,
    subCategoryId INTEGER,
    productCode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL,
    priceCalculationType TEXT DEFAULT 'DIRECT_PRICE',
    searchKeywords TEXT,
    normalizedSearchText TEXT,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY(brandId) REFERENCES Brand(id) ON DELETE CASCADE,
    FOREIGN KEY(categoryId) REFERENCES Category(id) ON DELETE CASCADE,
    FOREIGN KEY(subCategoryId) REFERENCES SubCategory(id) ON DELETE SET NULL
  );
`);

stmts.push(`
  CREATE TABLE ProductVariant (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    sizeMm REAL,
    sizeInch TEXT,
    weightKg REAL,
    pressure TEXT,
    schedule TEXT,
    pipeLength REAL,
    capacity TEXT,
    color TEXT,
    extraSpecification TEXT,
    purchasePrice REAL DEFAULT 0.0,
    sellingPrice REAL DEFAULT 0.0,
    stock INTEGER DEFAULT 0,
    minStock INTEGER DEFAULT 0,
    barcode TEXT,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY(productId) REFERENCES Product(id) ON DELETE CASCADE
  );
`);

stmts.push(`
  CREATE TABLE PriceList (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    supplierName TEXT,
    effectiveDate TEXT NOT NULL,
    expiryDate TEXT,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

stmts.push(`
  CREATE TABLE PricingRule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variantId INTEGER NOT NULL,
    priceListId INTEGER,
    pricingType TEXT NOT NULL,
    basePrice REAL DEFAULT 0.0,
    discountPercent REAL DEFAULT 0.0,
    cashDiscountPercent REAL DEFAULT 0.0,
    gstPercent REAL DEFAULT 18.0,
    profitPercent REAL DEFAULT 0.0,
    extraCharges REAL DEFAULT 0.0,
    roundOff REAL DEFAULT 0.0,
    effectiveDate TEXT,
    expiryDate TEXT,
    isDefault INTEGER DEFAULT 1,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY(variantId) REFERENCES ProductVariant(id) ON DELETE CASCADE,
    FOREIGN KEY(priceListId) REFERENCES PriceList(id) ON DELETE SET NULL
  );
`);

// 3. Create indexes
stmts.push(`CREATE INDEX idx_product_category ON Product(categoryId);`);
stmts.push(`CREATE INDEX idx_product_brand ON Product(brandId);`);
stmts.push(`CREATE INDEX idx_variant_product ON ProductVariant(productId);`);
stmts.push(`CREATE INDEX idx_variant_sku ON ProductVariant(sku);`);
stmts.push(`CREATE INDEX idx_pricing_rule_variant ON PricingRule(variantId);`);

// 4. Seed categories
const categories = [
  { id: 1, name: 'PVC Pipe', displayOrder: 1 },
  { id: 2, name: 'UPVC Pipe', displayOrder: 2 },
  { id: 3, name: 'CPVC Pipe', displayOrder: 3 },
  { id: 4, name: 'SWR Pipe', displayOrder: 4 },
  { id: 5, name: 'PVC Fittings', displayOrder: 5 },
  { id: 6, name: 'GI Fittings', displayOrder: 6 },
  { id: 7, name: 'Valve', displayOrder: 7 },
  { id: 8, name: 'Tank', displayOrder: 8 },
  { id: 9, name: 'Adhesive', displayOrder: 9 },
  { id: 10, name: 'Hardware', displayOrder: 10 }
];

for (const c of categories) {
  stmts.push(`
    INSERT INTO Category (id, name, displayOrder, isActive, createdAt, updatedAt)
    VALUES (${c.id}, '${c.name}', ${c.displayOrder}, 1, '2026-07-15T00:00:00Z', '2026-07-15T00:00:00Z');
  `);
}

// Seed subcategories
const subCategories = [
  { id: 1, categoryId: 1, name: 'Rigid PVC Pipe' },
  { id: 2, categoryId: 1, name: 'PVC Agri Pipe' },
  { id: 3, categoryId: 2, name: 'UPVC White Pipe' },
  { id: 4, categoryId: 2, name: 'EasyFit UPVC Pipe' },
  { id: 5, categoryId: 3, name: 'CPVC Pipe' },
  { id: 6, categoryId: 4, name: 'SWR Pipe' },
  { id: 7, categoryId: 5, name: 'Coupler' },
  { id: 8, categoryId: 5, name: 'Elbow' },
  { id: 9, categoryId: 5, name: 'Tee' },
  { id: 10, categoryId: 5, name: 'Reducer' },
  { id: 11, categoryId: 5, name: 'Union' },
  { id: 12, categoryId: 5, name: 'End Cap' },
  { id: 13, categoryId: 6, name: 'Nipples' },
  { id: 14, categoryId: 7, name: 'Ball Valve' },
  { id: 15, categoryId: 7, name: 'Gate Valve' },
  { id: 16, categoryId: 8, name: 'Water Tank' },
  { id: 17, categoryId: 9, name: 'PVC Solution' },
  { id: 18, categoryId: 10, name: 'Pipe Clamp' }
];

for (const sc of subCategories) {
  stmts.push(`
    INSERT INTO SubCategory (id, categoryId, name, isActive, createdAt, updatedAt)
    VALUES (${sc.id}, ${sc.categoryId}, '${sc.name}', 1, '2026-07-15T00:00:00Z', '2026-07-15T00:00:00Z');
  `);
}

// Seed brands
const brands = [
  { id: 1, name: 'Prince' },
  { id: 2, name: 'Astral' },
  { id: 3, name: 'Deflex' },
  { id: 4, name: 'Gopi' }
];

for (const b of brands) {
  stmts.push(`
    INSERT INTO Brand (id, name, isActive, createdAt, updatedAt)
    VALUES (${b.id}, '${b.name}', 1, '2026-07-15T00:00:00Z', '2026-07-15T00:00:00Z');
  `);
}

// Seed price lists
stmts.push(`
  INSERT INTO PriceList (id, name, supplierName, effectiveDate, expiryDate, isActive, createdAt, updatedAt)
  VALUES (1, 'Ghanshyam Enterprise Price List', 'Ghanshyam Enterprise', '2026-04-20', NULL, 1, '2026-07-15T00:00:00Z', '2026-07-15T00:00:00Z');
`);

// Dynamic counter for variables to keep seed queries clean
let productIdCounter = 1;
let variantIdCounter = 1;
let ruleIdCounter = 1;

interface VariantSeed {
  sku: string;
  sizeMm?: number;
  sizeInch?: string;
  weightKg?: number;
  pressure?: string;
  schedule?: string;
  pipeLength?: number;
  capacity?: string;
  color?: string;
  extraSpecification?: string;
  basePrice: number;
  stock?: number;
  minStock?: number;
  barcode?: string;
}

function addProductWithVariants(
  brandId: number,
  categoryId: number,
  subCategoryId: number,
  productCode: string,
  productName: string,
  description: string,
  unit: string,
  priceCalculationType: string,
  pricingType: string,
  discountPercent: number,
  cashDiscountPercent: number,
  gstPercent: number,
  profitPercent: number,
  extraCharges: number,
  roundOff: number,
  variants: VariantSeed[]
) {
  const pId = productIdCounter++;

  // Assemble keywords
  const brandName = brands.find(b => b.id === brandId)?.name || '';
  const categoryName = categories.find(c => c.id === categoryId)?.name || '';
  const subCategoryName = subCategories.find(s => s.id === subCategoryId)?.name || '';
  
  const baseKeywords = `${brandName} ${categoryName} ${subCategoryName} ${productName} ${productCode}`.toLowerCase();
  
  stmts.push(`
    INSERT INTO Product (id, brandId, categoryId, subCategoryId, productCode, name, description, unit, priceCalculationType, searchKeywords, normalizedSearchText, isActive, createdAt, updatedAt)
    VALUES (${pId}, ${brandId}, ${categoryId}, ${subCategoryId}, '${productCode}', '${productName}', '${description}', '${unit}', '${priceCalculationType}', NULL, NULL, 1, '2026-07-15T00:00:00Z', '2026-07-15T00:00:00Z');
  `);

  for (const v of variants) {
    const vId = variantIdCounter++;
    const rId = ruleIdCounter++;

    // Dynamic price calculation during seed generation
    const computed = calculatePrices(
      pricingType,
      v.basePrice,
      discountPercent,
      cashDiscountPercent,
      gstPercent,
      profitPercent,
      extraCharges,
      roundOff
    );

    stmts.push(`
      INSERT INTO ProductVariant (id, productId, sku, sizeMm, sizeInch, weightKg, pressure, schedule, pipeLength, capacity, color, extraSpecification, purchasePrice, sellingPrice, stock, minStock, barcode, isActive, createdAt, updatedAt)
      VALUES (
        ${vId},
        ${pId},
        '${v.sku}',
        ${v.sizeMm !== undefined ? v.sizeMm : 'NULL'},
        ${v.sizeInch ? `'${v.sizeInch}'` : 'NULL'},
        ${v.weightKg !== undefined ? v.weightKg : 'NULL'},
        ${v.pressure ? `'${v.pressure}'` : 'NULL'},
        ${v.schedule ? `'${v.schedule}'` : 'NULL'},
        ${v.pipeLength !== undefined ? v.pipeLength : 'NULL'},
        ${v.capacity ? `'${v.capacity}'` : 'NULL'},
        ${v.color ? `'${v.color}'` : 'NULL'},
        ${v.extraSpecification ? `'${v.extraSpecification}'` : 'NULL'},
        ${computed.purchasePrice},
        ${computed.sellingPrice},
        ${v.stock || 100},
        ${v.minStock || 10},
        ${v.barcode ? `'${v.barcode}'` : 'NULL'},
        1,
        '2026-07-15T00:00:00Z',
        '2026-07-15T00:00:00Z'
      );
    `);

    stmts.push(`
      INSERT INTO PricingRule (id, variantId, priceListId, pricingType, basePrice, discountPercent, cashDiscountPercent, gstPercent, profitPercent, extraCharges, roundOff, effectiveDate, expiryDate, isDefault, isActive, createdAt, updatedAt)
      VALUES (
        ${rId},
        ${vId},
        1,
        '${pricingType}',
        ${v.basePrice},
        ${discountPercent},
        ${cashDiscountPercent},
        ${gstPercent},
        ${profitPercent},
        ${extraCharges},
        ${roundOff},
        '2026-04-20',
        NULL,
        1,
        1,
        '2026-07-15T00:00:00Z',
        '2026-07-15T00:00:00Z'
      );
    `);
  }
}

// SEED DATA POPULATION loops

// 1. Prince Rigid PVC Pipe (6 Kg) - Category 1 (PVC Pipe), SubCategory 1 (Rigid PVC Pipe)
// Calculation Rule: BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST (MRP - 45% - 5% + GST 18%)
const rigidPvc6kg: VariantSeed[] = [
  { sku: 'PR-PVC-6K-63', sizeMm: 63, sizeInch: '2"', pressure: '6 Kg', pipeLength: 6, basePrice: 51.67, barcode: '89010011' },
  { sku: 'PR-PVC-6K-75', sizeMm: 75, sizeInch: '2.5"', pressure: '6 Kg', pipeLength: 6, basePrice: 70.83, barcode: '89010012' },
  { sku: 'PR-PVC-6K-90', sizeMm: 90, sizeInch: '3"', pressure: '6 Kg', pipeLength: 6, basePrice: 95.83, barcode: '89010013' },
  { sku: 'PR-PVC-6K-110', sizeMm: 110, sizeInch: '4"', pressure: '6 Kg', pipeLength: 6, basePrice: 126.67, barcode: '89010014' },
  { sku: 'PR-PVC-6K-140', sizeMm: 140, sizeInch: '5"', pressure: '6 Kg', pipeLength: 6, basePrice: 233.33, barcode: '89010015' },
  { sku: 'PR-PVC-6K-160', sizeMm: 160, sizeInch: '6"', pressure: '6 Kg', pipeLength: 6, basePrice: 250.00, barcode: '89010016' },
  { sku: 'PR-PVC-6K-200', sizeMm: 200, sizeInch: '8"', pressure: '6 Kg', pipeLength: 6, basePrice: 500.00, barcode: '89010017' }
];
addProductWithVariants(
  1, 1, 1, 'PRINCE-PVC-RIGID-6KG', 'Prince Rigid PVC Pipe 6Kg',
  'Prince Aquafit Rigid PVC Pipe 6 Kg/cm2 rate per meter', 'MTR', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST', 45, 5, 18, 0, 0, 0,
  rigidPvc6kg
);

// 2. Prince Rigid PVC Pipe (10 Kg)
const rigidPvc10kg: VariantSeed[] = [
  { sku: 'PR-PVC-10K-40', sizeMm: 40, sizeInch: '1.25"', pressure: '10 Kg', pipeLength: 6, basePrice: 38.33, barcode: '89010021' },
  { sku: 'PR-PVC-10K-50', sizeMm: 50, sizeInch: '1.5"', pressure: '10 Kg', pipeLength: 6, basePrice: 57.50, barcode: '89010022' },
  { sku: 'PR-PVC-10K-63', sizeMm: 63, sizeInch: '2"', pressure: '10 Kg', pipeLength: 6, basePrice: 73.33, barcode: '89010023' },
  { sku: 'PR-PVC-10K-75', sizeMm: 75, sizeInch: '2.5"', pressure: '10 Kg', pipeLength: 6, basePrice: 105.50, barcode: '89010024' },
  { sku: 'PR-PVC-10K-90', sizeMm: 90, sizeInch: '3"', pressure: '10 Kg', pipeLength: 6, basePrice: 143.75, barcode: '89010025' },
  { sku: 'PR-PVC-10K-110', sizeMm: 110, sizeInch: '4"', pressure: '10 Kg', pipeLength: 6, basePrice: 191.67, barcode: '89010026' },
  { sku: 'PR-PVC-10K-140', sizeMm: 140, sizeInch: '5"', pressure: '10 Kg', pipeLength: 6, basePrice: 320.00, barcode: '89010027' },
  { sku: 'PR-PVC-10K-160', sizeMm: 160, sizeInch: '6"', pressure: '10 Kg', pipeLength: 6, basePrice: 380.00, barcode: '89010028' },
  { sku: 'PR-PVC-10K-200', sizeMm: 200, sizeInch: '8"', pressure: '10 Kg', pipeLength: 6, basePrice: 600.00, barcode: '89010029' }
];
addProductWithVariants(
  1, 1, 1, 'PRINCE-PVC-RIGID-10KG', 'Prince Rigid PVC Pipe 10Kg',
  'Prince Aquafit Rigid PVC Pipe 10 Kg/cm2 rate per meter', 'MTR', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST', 45, 5, 18, 0, 0, 0,
  rigidPvc10kg
);

// 3. Prince PVC Agri Pipe (4 Kg) - Category 1 (PVC Pipe), SubCategory 2 (PVC Agri Pipe)
// Calculation Rule: Less 41% - 5% + GST 18% (Wait, rater pipe is Less 41% - CD 5% + GST 18%)
const agriPvc4kg: VariantSeed[] = [
  { sku: 'PR-AGRI-4K-63', sizeMm: 63, sizeInch: '2"', pressure: '4 Kg', pipeLength: 6, basePrice: 115.00, barcode: '89010031' },
  { sku: 'PR-AGRI-4K-75', sizeMm: 75, sizeInch: '2.5"', pressure: '4 Kg', pipeLength: 6, basePrice: 162.00, barcode: '89010032' },
  { sku: 'PR-AGRI-4K-90', sizeMm: 90, sizeInch: '3"', pressure: '4 Kg', pipeLength: 6, basePrice: 220.00, barcode: '89010033' },
  { sku: 'PR-AGRI-4K-110', sizeMm: 110, sizeInch: '4"', pressure: '4 Kg', pipeLength: 6, basePrice: 325.00, barcode: '89010034' },
  { sku: 'PR-AGRI-4K-140', sizeMm: 140, sizeInch: '5"', pressure: '4 Kg', pipeLength: 6, basePrice: 547.00, barcode: '89010035' },
  { sku: 'PR-AGRI-4K-160', sizeMm: 160, sizeInch: '6"', pressure: '4 Kg', pipeLength: 6, basePrice: 706.00, barcode: '89010036' },
  { sku: 'PR-AGRI-4K-180', sizeMm: 180, sizeInch: '7"', pressure: '4 Kg', pipeLength: 6, basePrice: 919.00, barcode: '89010037' },
  { sku: 'PR-AGRI-4K-200', sizeMm: 200, sizeInch: '8"', pressure: '4 Kg', pipeLength: 6, basePrice: 1125.00, barcode: '89010038' },
  { sku: 'PR-AGRI-4K-225', sizeMm: 225, sizeInch: '9"', pressure: '4 Kg', pipeLength: 6, basePrice: 1438.00, barcode: '89010039' },
  { sku: 'PR-AGRI-4K-250', sizeMm: 250, sizeInch: '10"', pressure: '4 Kg', pipeLength: 6, basePrice: 1757.00, barcode: '89010040' },
  { sku: 'PR-AGRI-4K-280', sizeMm: 280, sizeInch: '11"', pressure: '4 Kg', pipeLength: 6, basePrice: 2272.00, barcode: '89010041' },
  { sku: 'PR-AGRI-4K-315', sizeMm: 315, sizeInch: '12"', pressure: '4 Kg', pipeLength: 6, basePrice: 2856.00, barcode: '89010042' },
  { sku: 'PR-AGRI-4K-355', sizeMm: 355, sizeInch: '14"', pressure: '4 Kg', pipeLength: 6, basePrice: 3811.00, barcode: '89010043' },
  { sku: 'PR-AGRI-4K-400', sizeMm: 400, sizeInch: '16"', pressure: '4 Kg', pipeLength: 6, basePrice: 4877.00, barcode: '89010044' }
];
addProductWithVariants(
  1, 1, 2, 'PRINCE-PVC-AGRI-4KG', 'Prince PVC Agri Pipe 4Kg',
  'Prince Aquafit PVC Agri ISI Pipe 4 Kg/cm2 rate per meter', 'MTR', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST', 41, 5, 18, 0, 0, 0,
  agriPvc4kg
);

// 4. Prince PVC Agri Pipe (2.5 Kg)
const agriPvc2_5kg: VariantSeed[] = [
  { sku: 'PR-AGRI-2K-90', sizeMm: 90, sizeInch: '3"', pressure: '2.5 Kg', pipeLength: 6, basePrice: 149.00, barcode: '89010051' },
  { sku: 'PR-AGRI-2K-110', sizeMm: 110, sizeInch: '4"', pressure: '2.5 Kg', pipeLength: 6, basePrice: 217.00, barcode: '89010052' },
  { sku: 'PR-AGRI-2K-140', sizeMm: 140, sizeInch: '5"', pressure: '2.5 Kg', pipeLength: 6, basePrice: 351.00, barcode: '89010053' },
  { sku: 'PR-AGRI-2K-160', sizeMm: 160, sizeInch: '6"', pressure: '2.5 Kg', pipeLength: 6, basePrice: 448.00, barcode: '89010054' },
  { sku: 'PR-AGRI-2K-180', sizeMm: 180, sizeInch: '7"', pressure: '2.5 Kg', pipeLength: 6, basePrice: 583.00, barcode: '89010055' },
  { sku: 'PR-AGRI-2K-200', sizeMm: 200, sizeInch: '8"', pressure: '2.5 Kg', pipeLength: 6, basePrice: 708.00, barcode: '89010056' },
  { sku: 'PR-AGRI-2K-225', sizeMm: 225, sizeInch: '9"', pressure: '2.5 Kg', pipeLength: 6, basePrice: 920.00, barcode: '89010057' },
  { sku: 'PR-AGRI-2K-250', sizeMm: 250, sizeInch: '10"', pressure: '2.5 Kg', pipeLength: 6, basePrice: 1108.00, barcode: '89010058' },
  { sku: 'PR-AGRI-2K-315', sizeMm: 315, sizeInch: '12"', pressure: '2.5 Kg', pipeLength: 6, basePrice: 1842.00, barcode: '89010059' },
  { sku: 'PR-AGRI-2K-355', sizeMm: 355, sizeInch: '14"', pressure: '2.5 Kg', pipeLength: 6, basePrice: 2300.00, barcode: '89010060' },
  { sku: 'PR-AGRI-2K-400', sizeMm: 400, sizeInch: '16"', pressure: '2.5 Kg', pipeLength: 6, basePrice: 3199.00, barcode: '89010061' }
];
addProductWithVariants(
  1, 1, 2, 'PRINCE-PVC-AGRI-2.5KG', 'Prince PVC Agri Pipe 2.5Kg',
  'Prince Aquafit PVC Agri ISI Pipe 2.5 Kg/cm2 rate per meter', 'MTR', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST', 41, 5, 18, 0, 0, 0,
  agriPvc2_5kg
);

// 5. Prince PVC Agri Pipe (High Pressure)
const agriPvcHP: VariantSeed[] = [
  { sku: 'PR-AGRI-HP-20', sizeMm: 20, sizeInch: '0.5"', pressure: 'High Pressure', pipeLength: 6, basePrice: 66.00, barcode: '89010071' },
  { sku: 'PR-AGRI-HP-25', sizeMm: 25, sizeInch: '0.75"', pressure: 'High Pressure', pipeLength: 6, basePrice: 90.00, barcode: '89010072' },
  { sku: 'PR-AGRI-HP-32', sizeMm: 32, sizeInch: '1"', pressure: 'High Pressure', pipeLength: 6, basePrice: 118.00, barcode: '89010073' },
  { sku: 'PR-AGRI-HP-40', sizeMm: 40, sizeInch: '1.25"', pressure: 'High Pressure', pipeLength: 6, basePrice: 160.00, barcode: '89010074' },
  { sku: 'PR-AGRI-HP-50', sizeMm: 50, sizeInch: '1.5"', pressure: 'High Pressure', pipeLength: 6, basePrice: 203.00, barcode: '89010075' }
];
addProductWithVariants(
  1, 1, 2, 'PRINCE-PVC-AGRI-HP', 'Prince PVC Agri Pipe High Pressure',
  'Prince Aquafit PVC Agri ISI Pipe High Pressure rate per meter', 'MTR', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST', 41, 5, 18, 0, 0, 0,
  agriPvcHP
);

// 6. Prince Heavy Fittings: Couplers (Category 5 - PVC Fittings, SubCategory 7 - Coupler)
// Rule: Less 47% - CD 5% + GST 18% + Profit 20%
const couplerFittings: VariantSeed[] = [
  { sku: 'PR-FIT-COUP-20', sizeMm: 20, sizeInch: '1/2"', extraSpecification: 'Heavy', basePrice: 7.00 },
  { sku: 'PR-FIT-COUP-25', sizeMm: 25, sizeInch: '3/4"', extraSpecification: 'Heavy', basePrice: 8.00 },
  { sku: 'PR-FIT-COUP-32', sizeMm: 32, sizeInch: '1"', extraSpecification: 'Heavy', basePrice: 11.00 },
  { sku: 'PR-FIT-COUP-40', sizeMm: 40, sizeInch: '1-1/4"', extraSpecification: 'Heavy', basePrice: 18.00 },
  { sku: 'PR-FIT-COUP-50', sizeMm: 50, sizeInch: '1-1/2"', extraSpecification: 'Heavy', basePrice: 27.00 },
  { sku: 'PR-FIT-COUP-63', sizeMm: 63, sizeInch: '2"', extraSpecification: 'Heavy', basePrice: 38.00 },
  { sku: 'PR-FIT-COUP-75', sizeMm: 75, sizeInch: '2-1/2"', extraSpecification: 'Heavy', basePrice: 55.00 },
  { sku: 'PR-FIT-COUP-90', sizeMm: 90, sizeInch: '3"', extraSpecification: 'Heavy', basePrice: 80.00 },
  { sku: 'PR-FIT-COUP-110', sizeMm: 110, sizeInch: '4"', extraSpecification: 'Heavy', basePrice: 138.00 }
];
addProductWithVariants(
  1, 5, 7, 'PRINCE-COUPLER-HEAVY', 'Prince Heavy Coupler',
  'Prince Heavy Coupler injection molded fittings', 'PCS', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT', 47, 5, 18, 20, 0, 0,
  couplerFittings
);

// 7. Prince Heavy Fittings: Elbows (SubCategory 8 - Elbow)
const elbowFittings: VariantSeed[] = [
  { sku: 'PR-FIT-ELB-20', sizeMm: 20, sizeInch: '1/2"', extraSpecification: 'Heavy', basePrice: 8.00 },
  { sku: 'PR-FIT-ELB-25', sizeMm: 25, sizeInch: '3/4"', extraSpecification: 'Heavy', basePrice: 12.00 },
  { sku: 'PR-FIT-ELB-32', sizeMm: 32, sizeInch: '1"', extraSpecification: 'Heavy', basePrice: 17.00 },
  { sku: 'PR-FIT-ELB-40', sizeMm: 40, sizeInch: '1-1/4"', extraSpecification: 'Heavy', basePrice: 30.00 },
  { sku: 'PR-FIT-ELB-50', sizeMm: 50, sizeInch: '1-1/2"', extraSpecification: 'Heavy', basePrice: 42.00 },
  { sku: 'PR-FIT-ELB-63', sizeMm: 63, sizeInch: '2"', extraSpecification: 'Heavy', basePrice: 66.00 },
  { sku: 'PR-FIT-ELB-75', sizeMm: 75, sizeInch: '2-1/2"', extraSpecification: 'Heavy', basePrice: 91.00 },
  { sku: 'PR-FIT-ELB-90', sizeMm: 90, sizeInch: '3"', extraSpecification: 'Heavy', basePrice: 160.00 },
  { sku: 'PR-FIT-ELB-110', sizeMm: 110, sizeInch: '4"', extraSpecification: 'Heavy', basePrice: 235.00 }
];
addProductWithVariants(
  1, 5, 8, 'PRINCE-ELBOW-HEAVY', 'Prince Heavy Elbow',
  'Prince Heavy Elbow 90 Degree injection molded fittings', 'PCS', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT', 47, 5, 18, 20, 0, 0,
  elbowFittings
);

// 8. Prince Heavy Fittings: Tees (SubCategory 9 - Tee)
const teeFittings: VariantSeed[] = [
  { sku: 'PR-FIT-TEE-20', sizeMm: 20, sizeInch: '1/2"', extraSpecification: 'Heavy', basePrice: 12.00 },
  { sku: 'PR-FIT-TEE-25', sizeMm: 25, sizeInch: '3/4"', extraSpecification: 'Heavy', basePrice: 16.00 },
  { sku: 'PR-FIT-TEE-32', sizeMm: 32, sizeInch: '1"', extraSpecification: 'Heavy', basePrice: 23.00 },
  { sku: 'PR-FIT-TEE-40', sizeMm: 40, sizeInch: '1-1/4"', extraSpecification: 'Heavy', basePrice: 38.00 },
  { sku: 'PR-FIT-TEE-50', sizeMm: 50, sizeInch: '1-1/2"', extraSpecification: 'Heavy', basePrice: 57.00 },
  { sku: 'PR-FIT-TEE-63', sizeMm: 63, sizeInch: '2"', extraSpecification: 'Heavy', basePrice: 81.00 },
  { sku: 'PR-FIT-TEE-75', sizeMm: 75, sizeInch: '2-1/2"', extraSpecification: 'Heavy', basePrice: 125.00 },
  { sku: 'PR-FIT-TEE-90', sizeMm: 90, sizeInch: '3"', extraSpecification: 'Heavy', basePrice: 194.00 },
  { sku: 'PR-FIT-TEE-110', sizeMm: 110, sizeInch: '4"', extraSpecification: 'Heavy', basePrice: 314.00 }
];
addProductWithVariants(
  1, 5, 9, 'PRINCE-TEE-HEAVY', 'Prince Heavy Tee',
  'Prince Heavy Equal Tee injection molded fittings', 'PCS', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT', 47, 5, 18, 20, 0, 0,
  teeFittings
);

// 9. Prince Heavy Fittings: End Caps (SubCategory 12 - End Cap)
const endCapFittings: VariantSeed[] = [
  { sku: 'PR-FIT-EC-20', sizeMm: 20, sizeInch: '1/2"', extraSpecification: 'Heavy', basePrice: 5.00 },
  { sku: 'PR-FIT-EC-25', sizeMm: 25, sizeInch: '3/4"', extraSpecification: 'Heavy', basePrice: 7.00 },
  { sku: 'PR-FIT-EC-32', sizeMm: 32, sizeInch: '1"', extraSpecification: 'Heavy', basePrice: 9.00 },
  { sku: 'PR-FIT-EC-40', sizeMm: 40, sizeInch: '1-1/4"', extraSpecification: 'Heavy', basePrice: 14.00 },
  { sku: 'PR-FIT-EC-50', sizeMm: 50, sizeInch: '1-1/2"', extraSpecification: 'Heavy', basePrice: 21.00 },
  { sku: 'PR-FIT-EC-63', sizeMm: 63, sizeInch: '2"', extraSpecification: 'Heavy', basePrice: 30.00 },
  { sku: 'PR-FIT-EC-75', sizeMm: 75, sizeInch: '2-1/2"', extraSpecification: 'Heavy', basePrice: 40.00 },
  { sku: 'PR-FIT-EC-90', sizeMm: 90, sizeInch: '3"', extraSpecification: 'Heavy', basePrice: 68.00 },
  { sku: 'PR-FIT-EC-110', sizeMm: 110, sizeInch: '4"', extraSpecification: 'Heavy', basePrice: 102.00 }
];
addProductWithVariants(
  1, 5, 12, 'PRINCE-ENDCAP-HEAVY', 'Prince Heavy End Cap',
  'Prince Heavy End Cap injection molded fittings', 'PCS', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT', 47, 5, 18, 20, 0, 0,
  endCapFittings
);

// 10. Prince PVC Solution - Category 9 (Adhesive), SubCategory 17 (PVC Solution)
// Rule: Less 42% + GST 18% + Profit 10%
const pvcAdhesives: VariantSeed[] = [
  { sku: 'PR-ADH-SOL-100', capacity: '100 ml', basePrice: 96.00 },
  { sku: 'PR-ADH-SOL-250', capacity: '250 ml', basePrice: 188.00 },
  { sku: 'PR-ADH-SOL-500', capacity: '500 ml', basePrice: 338.00 },
  { sku: 'PR-ADH-SOL-1000', capacity: '1 Ltr', basePrice: 594.00 }
];
addProductWithVariants(
  1, 9, 17, 'PRINCE-PVC-SOLUTION', 'Prince PVC Solution',
  'Prince PVC Adhesive Solution for joint weld', 'PCS', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT', 42, 0, 18, 10, 0, 0,
  pvcAdhesives
);

// 11. Astral UPVC Solvent Weld Pipe SCH40 - Category 2 (UPVC Pipe), SubCategory 3 (UPVC White Pipe)
// Rule: Less 37% + GST 18% + Profit 15%
const astralSch40: VariantSeed[] = [
  { sku: 'AS-UPVC-40-15', sizeMm: 15, sizeInch: '1/2"', schedule: 'SCH40', pipeLength: 6, basePrice: 64.00 },
  { sku: 'AS-UPVC-40-20', sizeMm: 20, sizeInch: '3/4"', schedule: 'SCH40', pipeLength: 6, basePrice: 85.00 },
  { sku: 'AS-UPVC-40-25', sizeMm: 25, sizeInch: '1"', schedule: 'SCH40', pipeLength: 6, basePrice: 124.00 },
  { sku: 'AS-UPVC-40-32', sizeMm: 32, sizeInch: '1-1/4"', schedule: 'SCH40', pipeLength: 6, basePrice: 168.00 },
  { sku: 'AS-UPVC-40-40', sizeMm: 40, sizeInch: '1-1/2"', schedule: 'SCH40', pipeLength: 6, basePrice: 200.00 },
  { sku: 'AS-UPVC-40-50', sizeMm: 50, sizeInch: '2"', schedule: 'SCH40', pipeLength: 6, basePrice: 268.00 }
];
addProductWithVariants(
  2, 2, 3, 'ASTRAL-UPVC-SCH40', 'Astral UPVC Pipe SCH40',
  'Astral Easyfit Lead Free UPVC Solvent Weld Pipe SCH40 rate per meter', 'MTR', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT', 37, 0, 18, 15, 0, 0,
  astralSch40
);

// 12. Astral UPVC Solvent Weld Pipe SCH80
const astralSch80: VariantSeed[] = [
  { sku: 'AS-UPVC-80-15', sizeMm: 15, sizeInch: '1/2"', schedule: 'SCH80', pipeLength: 6, basePrice: 80.00 },
  { sku: 'AS-UPVC-80-20', sizeMm: 20, sizeInch: '3/4"', schedule: 'SCH80', pipeLength: 6, basePrice: 108.00 },
  { sku: 'AS-UPVC-80-25', sizeMm: 25, sizeInch: '1"', schedule: 'SCH80', pipeLength: 6, basePrice: 159.00 },
  { sku: 'AS-UPVC-80-32', sizeMm: 32, sizeInch: '1-1/4"', schedule: 'SCH80', pipeLength: 6, basePrice: 218.00 },
  { sku: 'AS-UPVC-80-40', sizeMm: 40, sizeInch: '1-1/2"', schedule: 'SCH80', pipeLength: 6, basePrice: 264.00 },
  { sku: 'AS-UPVC-80-50', sizeMm: 50, sizeInch: '2"', schedule: 'SCH80', pipeLength: 6, basePrice: 367.00 }
];
addProductWithVariants(
  2, 2, 3, 'ASTRAL-UPVC-SCH80', 'Astral UPVC Pipe SCH80',
  'Astral Easyfit Lead Free UPVC Solvent Weld Pipe SCH80 rate per meter', 'MTR', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT', 37, 0, 18, 15, 0, 0,
  astralSch80
);

// 13. Astral CPVC Pipe - Category 3 (CPVC Pipe), SubCategory 5 (CPVC Pipe)
// Rule: Less 37% + GST 18% + Profit 15%
const astralCpvc: VariantSeed[] = [
  { sku: 'AS-CPVC-15', sizeMm: 15, sizeInch: '1/2"', pipeLength: 3, basePrice: 88.00 },
  { sku: 'AS-CPVC-20', sizeMm: 20, sizeInch: '3/4"', pipeLength: 3, basePrice: 120.00 },
  { sku: 'AS-CPVC-25', sizeMm: 25, sizeInch: '1"', pipeLength: 3, basePrice: 175.00 },
  { sku: 'AS-CPVC-32', sizeMm: 32, sizeInch: '1-1/4"', pipeLength: 3, basePrice: 245.00 },
  { sku: 'AS-CPVC-40', sizeMm: 40, sizeInch: '1-1/2"', pipeLength: 3, basePrice: 320.00 },
  { sku: 'AS-CPVC-50', sizeMm: 50, sizeInch: '2"', pipeLength: 3, basePrice: 480.00 }
];
addProductWithVariants(
  2, 3, 5, 'ASTRAL-CPVC-PIPE', 'Astral CPVC Pipe',
  'Astral SDR-11 CPVC Pipe hot & cold water flow rate per meter', 'MTR', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT', 37, 0, 18, 15, 0, 0,
  astralCpvc
);

// 14. Deflex ISI 4 Kg Pipe - Category 1 (PVC Pipe), SubCategory 1 (Rigid PVC Pipe)
// Rule: Less 45% + GST 18% + Profit 12%
const deflex4kg: VariantSeed[] = [
  { sku: 'DF-PVC-4K-40', sizeMm: 40, sizeInch: '1-1/4"', pressure: '4 Kg', pipeLength: 6, basePrice: 45.00 },
  { sku: 'DF-PVC-4K-50', sizeMm: 50, sizeInch: '1-1/2"', pressure: '4 Kg', pipeLength: 6, basePrice: 67.00 },
  { sku: 'DF-PVC-4K-63', sizeMm: 63, sizeInch: '2"', pressure: '4 Kg', pipeLength: 6, basePrice: 84.00 },
  { sku: 'DF-PVC-4K-75', sizeMm: 75, sizeInch: '2-1/2"', pressure: '4 Kg', pipeLength: 6, basePrice: 117.00 },
  { sku: 'DF-PVC-4K-90', sizeMm: 90, sizeInch: '3"', pressure: '4 Kg', pipeLength: 6, basePrice: 159.00 },
  { sku: 'DF-PVC-4K-110', sizeMm: 110, sizeInch: '4"', pressure: '4 Kg', pipeLength: 6, basePrice: 217.00 }
];
addProductWithVariants(
  3, 1, 1, 'DEFLEX-PVC-4KG', 'Deflex PVC Pipe 4Kg',
  'Deflex Rigid PVC ISI Pipe 4 Kg/cm2 rate per meter', 'MTR', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT', 45, 0, 18, 12, 0, 0,
  deflex4kg
);

// 15. Gopi Ball Valves - Category 7 (Valve), SubCategory 14 (Ball Valve)
// Rule: DIRECT_PRICE
const gopiBallValves: VariantSeed[] = [
  { sku: 'GP-VALV-BV-15', sizeMm: 15, sizeInch: '1/2"', basePrice: 120.00 },
  { sku: 'GP-VALV-BV-20', sizeMm: 20, sizeInch: '3/4"', basePrice: 180.00 },
  { sku: 'GP-VALV-BV-25', sizeMm: 25, sizeInch: '1"', basePrice: 240.00 },
  { sku: 'GP-VALV-BV-32', sizeMm: 32, sizeInch: '1-1/4"', basePrice: 350.00 },
  { sku: 'GP-VALV-BV-40', sizeMm: 40, sizeInch: '1-1/2"', basePrice: 480.00 },
  { sku: 'GP-VALV-BV-50', sizeMm: 50, sizeInch: '2"', basePrice: 650.00 }
];
addProductWithVariants(
  4, 7, 14, 'GOPI-BALL-VALVE', 'Gopi PVC Ball Valve',
  'Gopi PVC handle ball valve high flow control', 'PCS', 'DIRECT_PRICE',
  'DIRECT_PRICE', 0, 0, 0, 0, 0, 0,
  gopiBallValves
);

// 16. Gopi Gate Valves - SubCategory 15 (Gate Valve)
const gopiGateValves: VariantSeed[] = [
  { sku: 'GP-VALV-GV-15', sizeMm: 15, sizeInch: '1/2"', basePrice: 350.00 },
  { sku: 'GP-VALV-GV-20', sizeMm: 20, sizeInch: '3/4"', basePrice: 450.00 },
  { sku: 'GP-VALV-GV-25', sizeMm: 25, sizeInch: '1"', basePrice: 600.00 },
  { sku: 'GP-VALV-GV-32', sizeMm: 32, sizeInch: '1-1/4"', basePrice: 850.00 },
  { sku: 'GP-VALV-GV-40', sizeMm: 40, sizeInch: '1-1/2"', basePrice: 1150.00 },
  { sku: 'GP-VALV-GV-50', sizeMm: 50, sizeInch: '2"', basePrice: 1650.00 }
];
addProductWithVariants(
  4, 7, 15, 'GOPI-GATE-VALVE', 'Gopi Brass Gate Valve',
  'Gopi Brass heavy body gate valve flow control wheel', 'PCS', 'DIRECT_PRICE',
  'DIRECT_PRICE', 0, 0, 0, 0, 0, 0,
  gopiGateValves
);

// 17. Gopi Garden Pipe - Category 1 (PVC Pipe), SubCategory 2 (PVC Agri Pipe)
// Rule: DIRECT_PRICE
const gopiGardenPipes: VariantSeed[] = [
  { sku: 'GP-GP-15-15', sizeMm: 15, sizeInch: '1/2"', pipeLength: 15, extraSpecification: '15 Mtr', basePrice: 350.00 },
  { sku: 'GP-GP-20-15', sizeMm: 20, sizeInch: '3/4"', pipeLength: 15, extraSpecification: '15 Mtr', basePrice: 500.00 },
  { sku: 'GP-GP-25-15', sizeMm: 25, sizeInch: '1"', pipeLength: 15, extraSpecification: '15 Mtr', basePrice: 750.00 }
];
addProductWithVariants(
  4, 1, 2, 'GOPI-GARDEN-PIPE', 'Gopi Garden Pipe',
  'Gopi flexible PVC garden green hose pipe', 'PCS', 'DIRECT_PRICE',
  'DIRECT_PRICE', 0, 0, 0, 0, 0, 0,
  gopiGardenPipes
);

// 18. Astral Water Tanks - Category 8 (Tank), SubCategory 16 (Water Tank)
// Rule: DIRECT_PRICE
const astralTanks: VariantSeed[] = [
  { sku: 'AS-TK-500', capacity: '500 Ltr', basePrice: 3500.00 },
  { sku: 'AS-TK-1000', capacity: '1000 Ltr', basePrice: 6500.00 },
  { sku: 'AS-TK-1500', capacity: '1500 Ltr', basePrice: 9500.00 },
  { sku: 'AS-TK-2000', capacity: '2000 Ltr', basePrice: 12500.00 }
];
addProductWithVariants(
  2, 8, 16, 'ASTRAL-WATER-TANK', 'Astral Water Tank',
  'Astral 3 layer food grade storage water tank', 'PCS', 'DIRECT_PRICE',
  'DIRECT_PRICE', 0, 0, 0, 0, 0, 0,
  astralTanks
);

// 19. Gopi GI Nipples - Category 6 (GI Fittings), SubCategory 13 (Nipples)
// Rule: Less 45% + GST 18% + Profit 25%
const giNipples: VariantSeed[] = [
  { sku: 'GP-GI-NIP-15', sizeMm: 15, sizeInch: '1/2"', basePrice: 20.00 },
  { sku: 'GP-GI-NIP-20', sizeMm: 20, sizeInch: '3/4"', basePrice: 28.00 },
  { sku: 'GP-GI-NIP-25', sizeMm: 25, sizeInch: '1"', basePrice: 40.00 },
  { sku: 'GP-GI-NIP-32', sizeMm: 32, sizeInch: '1-1/4"', basePrice: 55.00 },
  { sku: 'GP-GI-NIP-40', sizeMm: 40, sizeInch: '1-1/2"', basePrice: 70.00 },
  { sku: 'GP-GI-NIP-50', sizeMm: 50, sizeInch: '2"', basePrice: 95.00 }
];
addProductWithVariants(
  4, 6, 13, 'GOPI-GI-NIPPLE', 'Gopi GI Nipple',
  'Gopi galvanized iron threaded nipple connector', 'PCS', 'FORMULA',
  'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT', 45, 0, 18, 25, 0, 0,
  giNipples
);

// Push all dynamically built seed statements to the migration statements list!
MigrationV4.statements.push(...stmts);
