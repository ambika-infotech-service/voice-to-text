import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database';
import { Product } from '../models/product.model';

/**
 * Repository handling database operations for the Product & Variant tables.
 */
@Service()
export class ProductRepository {
  private readonly db = inject(DatabaseService);

  /**
   * Inserts a new product and default variant in a transaction block.
   */
  public async insert(product: Product, attributeValueIds: number[] = []): Promise<number> {
    let variantId = -1;
    await this.db.runTransaction(async () => {
      // 1. Insert product
      const pSql = `INSERT INTO Product (brandId, categoryId, subCategoryId, productCode, name, description, unit, priceCalculationType, isActive, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
      // For demo compatibility, use default brandId = 1 (Prince) and subCategoryId = 1
      const brandId = 1;
      const categoryId = product.CategoryId || 1;
      const subCategoryId = 1;
      const productCode = product.HSNCode || product.SKU || `PROD-${Date.now()}`;
      const name = product.DisplayName.split('(')[0].trim() || 'Demo Product';
      const description = 'Demo product insertion';
      const unit = product.Unit || 'PCS';
      const priceCalculationType = 'DIRECT_PRICE';
      const now = new Date().toISOString();

      const pRes = await this.db.run(pSql, [
        brandId,
        categoryId,
        subCategoryId,
        productCode,
        name,
        description,
        unit,
        priceCalculationType,
        1,
        now,
        now
      ]);
      const productId = pRes.lastId ?? -1;

      if (productId !== -1) {
        // 2. Insert variant
        const vSql = `INSERT INTO ProductVariant (productId, sku, sizeMm, sizeInch, purchasePrice, sellingPrice, stock, barcode, isActive, createdAt, updatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
        const vRes = await this.db.run(vSql, [
          productId,
          product.SKU,
          20, // default sizeMm
          '1/2"', // default sizeInch
          product.SellingPrice * 0.8, // default purchase price
          product.SellingPrice,
          100, // default stock
          product.Barcode || null,
          1,
          now,
          now
        ]);
        variantId = vRes.lastId ?? -1;
        
        // 3. Insert default pricing rule
        if (variantId !== -1) {
          const prSql = `INSERT INTO PricingRule (variantId, priceListId, pricingType, basePrice, isActive, createdAt, updatedAt)
                         VALUES (?, ?, ?, ?, ?, ?, ?);`;
          await this.db.run(prSql, [
            variantId,
            1, // priceListId
            'DIRECT_PRICE',
            product.SellingPrice,
            1,
            now,
            now
          ]);
        }
      }
    });
    return variantId;
  }

  /**
   * Updates an existing product variant selling price.
   */
  public async update(product: Product, attributeValueIds?: number[]): Promise<void> {
    if (product.Id === undefined) {
      throw new Error('Variant Id must be defined for updates.');
    }

    await this.db.runTransaction(async () => {
      const now = new Date().toISOString();
      const vSql = `UPDATE ProductVariant SET sku = ?, sellingPrice = ?, barcode = ?, updatedAt = ? WHERE id = ?;`;
      await this.db.run(vSql, [
        product.SKU,
        product.SellingPrice,
        product.Barcode ?? null,
        now,
        product.Id
      ]);
    });
  }

  /**
   * Deletes a variant. Cascade automatically handles foreign keys.
   */
  public async delete(id: number): Promise<void> {
    const sql = `DELETE FROM ProductVariant WHERE id = ?;`;
    await this.db.run(sql, [id]);
  }

  /**
   * Retrieves a single product variant by its unique database Id.
   */
  public async getById(id: number): Promise<Product | null> {
    const sql = `
      SELECT 
        v.id AS Id,
        v.sku AS SKU,
        p.categoryId AS CategoryId,
        b.name AS BrandName,
        c.name AS CategoryName,
        p.name AS ProductName,
        v.sizeMm,
        v.sizeInch,
        v.pressure,
        v.schedule,
        v.barcode AS Barcode,
        p.productCode AS HSNCode,
        18.0 AS GST,
        v.sellingPrice AS SellingPrice,
        p.unit AS Unit,
        v.isActive AS IsActive,
        v.createdAt AS CreatedAt
      FROM ProductVariant v
      JOIN Product p ON v.productId = p.id
      JOIN Brand b ON p.brandId = b.id
      JOIN Category c ON p.categoryId = c.id
      WHERE v.id = ? LIMIT 1;
    `;
    const rows = await this.db.query<any>(sql, [id]);
    if (rows.length === 0) return null;
    const r = rows[0];

    const specs: string[] = [];
    if (r.sizeMm) specs.push(`${r.sizeMm}mm`);
    if (r.sizeInch) specs.push(r.sizeInch);
    if (r.pressure) specs.push(r.pressure);
    if (r.schedule) specs.push(r.schedule);
    const specSuffix = specs.length > 0 ? ` (${specs.join(', ')})` : '';

    return {
      Id: r.Id,
      SKU: r.SKU,
      CategoryId: r.CategoryId,
      DisplayName: `${r.BrandName} ${r.ProductName}${specSuffix}`,
      Barcode: r.Barcode,
      HSNCode: r.HSNCode,
      GST: r.GST,
      SellingPrice: r.SellingPrice,
      Unit: r.Unit,
      IsActive: r.IsActive,
      CreatedAt: r.CreatedAt
    };
  }

  /**
   * Retrieves a single variant by SKU.
   */
  public async getBySKU(sku: string): Promise<Product | null> {
    const sql = `
      SELECT 
        v.id AS Id,
        v.sku AS SKU,
        p.categoryId AS CategoryId,
        b.name AS BrandName,
        c.name AS CategoryName,
        p.name AS ProductName,
        v.sizeMm,
        v.sizeInch,
        v.pressure,
        v.schedule,
        v.barcode AS Barcode,
        p.productCode AS HSNCode,
        18.0 AS GST,
        v.sellingPrice AS SellingPrice,
        p.unit AS Unit,
        v.isActive AS IsActive,
        v.createdAt AS CreatedAt
      FROM ProductVariant v
      JOIN Product p ON v.productId = p.id
      JOIN Brand b ON p.brandId = b.id
      JOIN Category c ON p.categoryId = c.id
      WHERE v.sku = ? LIMIT 1;
    `;
    const rows = await this.db.query<any>(sql, [sku]);
    if (rows.length === 0) return null;
    const r = rows[0];

    const specs: string[] = [];
    if (r.sizeMm) specs.push(`${r.sizeMm}mm`);
    if (r.sizeInch) specs.push(r.sizeInch);
    if (r.pressure) specs.push(r.pressure);
    if (r.schedule) specs.push(r.schedule);
    const specSuffix = specs.length > 0 ? ` (${specs.join(', ')})` : '';

    return {
      Id: r.Id,
      SKU: r.SKU,
      CategoryId: r.CategoryId,
      DisplayName: `${r.BrandName} ${r.ProductName}${specSuffix}`,
      Barcode: r.Barcode,
      HSNCode: r.HSNCode,
      GST: r.GST,
      SellingPrice: r.SellingPrice,
      Unit: r.Unit,
      IsActive: r.IsActive,
      CreatedAt: r.CreatedAt
    };
  }

  /**
   * Retrieves all variants ordered alphabetically.
   */
  public async getAll(): Promise<Product[]> {
    const sql = `
      SELECT 
        v.id AS Id,
        v.sku AS SKU,
        p.categoryId AS CategoryId,
        p.brandId AS BrandId,
        p.subCategoryId AS SubCategoryId,
        b.name AS BrandName,
        c.name AS CategoryName,
        p.name AS ProductName,
        v.sizeMm,
        v.sizeInch,
        v.pressure,
        v.schedule,
        v.barcode AS Barcode,
        p.productCode AS HSNCode,
        18.0 AS GST,
        v.sellingPrice AS SellingPrice,
        p.unit AS Unit,
        v.isActive AS IsActive,
        v.createdAt AS CreatedAt
      FROM ProductVariant v
      JOIN Product p ON v.productId = p.id
      JOIN Brand b ON p.brandId = b.id
      JOIN Category c ON p.categoryId = c.id
      WHERE v.isActive = 1 AND p.isActive = 1
      ORDER BY p.name ASC;
    `;
    const rows = await this.db.query<any>(sql);
    return rows.map(r => {
      const specs: string[] = [];
      if (r.sizeMm) specs.push(`${r.sizeMm}mm`);
      if (r.sizeInch) specs.push(r.sizeInch);
      if (r.pressure) specs.push(r.pressure);
      if (r.schedule) specs.push(r.schedule);
      const specSuffix = specs.length > 0 ? ` (${specs.join(', ')})` : '';

      return {
        Id: r.Id,
        SKU: r.SKU,
        CategoryId: r.CategoryId,
        BrandId: r.BrandId,
        SubCategoryId: r.SubCategoryId,
        DisplayName: `${r.BrandName} ${r.ProductName}${specSuffix}`,
        Barcode: r.Barcode,
        HSNCode: r.HSNCode,
        GST: r.GST,
        SellingPrice: r.SellingPrice,
        Unit: r.Unit,
        IsActive: r.IsActive,
        CreatedAt: r.CreatedAt
      };
    });
  }

  /**
   * Retrieves all product variants, including all searchable tokens/keywords.
   */
  public async getAllWithKeywords(): Promise<Array<Product & { keywords: string[] }>> {
    const list = await this.getAll();
    return list.map(item => {
      const keywords = `${item.DisplayName} ${item.SKU} ${item.Barcode || ''} ${item.HSNCode || ''}`
        .toLowerCase()
        .split(/[\s,()]+/)
        .filter(k => k.length > 0);
      return {
        ...item,
        keywords
      };
    });
  }

  /**
   * Compatibility function mimicking the attribute detail lookup.
   */
  public async getProductWithAttributes(id: number): Promise<{
    product: Product;
    attributes: Array<{ attributeName: string; displayValue: string }>;
  } | null> {
    const product = await this.getById(id);
    if (!product) return null;

    // Fetch the raw variant row to extract specifications
    const sql = `SELECT * FROM ProductVariant WHERE id = ? LIMIT 1;`;
    const rows = await this.db.query<any>(sql, [id]);
    if (rows.length === 0) return null;
    const v = rows[0];

    const attributes: Array<{ attributeName: string; displayValue: string }> = [];
    if (v.sizeMm) attributes.push({ attributeName: 'Size (mm)', displayValue: `${v.sizeMm}mm` });
    if (v.sizeInch) attributes.push({ attributeName: 'Size (inch)', displayValue: v.sizeInch });
    if (v.weightKg) attributes.push({ attributeName: 'Weight', displayValue: `${v.weightKg} Kg` });
    if (v.pressure) attributes.push({ attributeName: 'Pressure', displayValue: v.pressure });
    if (v.schedule) attributes.push({ attributeName: 'Schedule', displayValue: v.schedule });
    if (v.capacity) attributes.push({ attributeName: 'Capacity', displayValue: v.capacity });
    if (v.color) attributes.push({ attributeName: 'Color', displayValue: v.color });

    return { product, attributes };
  }
}
