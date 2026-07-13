import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database';
import { Product } from '../models/product.model';

/**
 * Repository handling database operations for the Product table.
 * Integrates transactions for composite key mappings with product attribute values.
 */
@Service()
export class ProductRepository {
  private readonly db = inject(DatabaseService);

  /**
   * Inserts a new product and maps its attribute value IDs in a transaction block.
   * @param product The product details to insert.
   * @param attributeValueIds Optional array of AttributeValue.Id associations.
   * @returns The generated database Product Id.
   */
  public async insert(product: Product, attributeValueIds: number[] = []): Promise<number> {
    let productId = -1;
    await this.db.runTransaction(async () => {
      const sql = `INSERT INTO Product (SKU, CategoryId, DisplayName, Barcode, HSNCode, GST, SellingPrice, Unit, IsActive, CreatedAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
      const res = await this.db.run(sql, [
        product.SKU,
        product.CategoryId,
        product.DisplayName,
        product.Barcode ?? null,
        product.HSNCode ?? null,
        product.GST,
        product.SellingPrice,
        product.Unit,
        product.IsActive,
        product.CreatedAt
      ]);
      productId = res.lastId ?? -1;

      if (productId !== -1 && attributeValueIds.length > 0) {
        for (const valId of attributeValueIds) {
          await this.db.run(
            `INSERT INTO ProductAttribute (ProductId, AttributeValueId) VALUES (?, ?);`,
            [productId, valId]
          );
        }
      }
    });
    return productId;
  }

  /**
   * Updates an existing product and its mapped attribute values in a transaction.
   * @param product The updated Product model containing primary key.
   * @param attributeValueIds Optional array of AttributeValueIds to replace existing mappings.
   */
  public async update(product: Product, attributeValueIds?: number[]): Promise<void> {
    if (product.Id === undefined) {
      throw new Error('Product Id must be defined for updates.');
    }

    await this.db.runTransaction(async () => {
      const sql = `UPDATE Product SET SKU = ?, CategoryId = ?, DisplayName = ?, Barcode = ?,
                   HSNCode = ?, GST = ?, SellingPrice = ?, Unit = ?, IsActive = ?
                   WHERE Id = ?;`;
      await this.db.run(sql, [
        product.SKU,
        product.CategoryId,
        product.DisplayName,
        product.Barcode ?? null,
        product.HSNCode ?? null,
        product.GST,
        product.SellingPrice,
        product.Unit,
        product.IsActive,
        product.Id
      ]);

      if (attributeValueIds !== undefined) {
        // Remove existing associations
        await this.db.run(`DELETE FROM ProductAttribute WHERE ProductId = ?;`, [product.Id]);
        // Insert new ones
        for (const valId of attributeValueIds) {
          await this.db.run(
            `INSERT INTO ProductAttribute (ProductId, AttributeValueId) VALUES (?, ?);`,
            [product.Id, valId]
          );
        }
      }
    });
  }

  /**
   * Deletes a product by Id. Cascade mappings automatically delete associated ProductAttributes.
   * @param id Product primary key.
   */
  public async delete(id: number): Promise<void> {
    const sql = `DELETE FROM Product WHERE Id = ?;`;
    await this.db.run(sql, [id]);
  }

  /**
   * Retrieves a single product by its database Id.
   */
  public async getById(id: number): Promise<Product | null> {
    const sql = `SELECT * FROM Product WHERE Id = ? LIMIT 1;`;
    const rows = await this.db.query<Product>(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Retrieves a single product by SKU.
   */
  public async getBySKU(sku: string): Promise<Product | null> {
    const sql = `SELECT * FROM Product WHERE SKU = ? LIMIT 1;`;
    const rows = await this.db.query<Product>(sql, [sku]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Retrieves all products ordered alphabetically.
   */
  public async getAll(): Promise<Product[]> {
    const sql = `SELECT * FROM Product ORDER BY DisplayName ASC;`;
    return this.db.query<Product>(sql);
  }

  /**
   * Retrieves a product details along with its fully resolved attribute configuration details.
   * Joins ProductAttribute, AttributeValue, and Attribute tables.
   */
  public async getProductWithAttributes(id: number): Promise<{
    product: Product;
    attributes: Array<{ attributeName: string; displayValue: string }>;
  } | null> {
    const product = await this.getById(id);
    if (!product) {
      return null;
    }

    const sql = `
      SELECT a.Name as attributeName, av.DisplayValue as displayValue
      FROM ProductAttribute pa
      JOIN AttributeValue av ON pa.AttributeValueId = av.Id
      JOIN Attribute a ON av.AttributeId = a.Id
      WHERE pa.ProductId = ?;
    `;
    const attributes = await this.db.query<{ attributeName: string; displayValue: string }>(sql, [id]);
    return { product, attributes };
  }
}
