import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database';
import { Attribute } from '../models/attribute.model';
import { AttributeValue } from '../models/attribute-value.model';

/**
 * Repository handling database operations for the Attribute and AttributeValue tables.
 */
@Service()
export class AttributeRepository {
  private readonly db = inject(DatabaseService);

  /**
   * Inserts a new Attribute category definition.
   * @param attribute The Attribute schema definition.
   */
  public async insertAttribute(attribute: Attribute): Promise<number> {
    const sql = `INSERT INTO Attribute (Name, DataType, IsActive) VALUES (?, ?, ?);`;
    const res = await this.db.run(sql, [attribute.Name, attribute.DataType, attribute.IsActive]);
    return res.lastId ?? -1;
  }

  /**
   * Inserts a concrete value mapping option for an attribute.
   */
  public async insertAttributeValue(
    attributeId: number,
    displayValue: string,
    normalizedValue: string
  ): Promise<number> {
    const sql = `INSERT INTO AttributeValue (AttributeId, DisplayValue, NormalizedValue) VALUES (?, ?, ?);`;
    const res = await this.db.run(sql, [attributeId, displayValue, normalizedValue]);
    return res.lastId ?? -1;
  }

  /**
   * Retrieves all attributes.
   */
  public async getAll(): Promise<Attribute[]> {
    const sql = `SELECT * FROM Attribute ORDER BY Name ASC;`;
    return this.db.query<Attribute>(sql);
  }

  /**
   * Retrieves all values associated with a specific Attribute Id.
   */
  public async getAttributeValues(attributeId: number): Promise<AttributeValue[]> {
    const sql = `SELECT * FROM AttributeValue WHERE AttributeId = ? ORDER BY DisplayValue ASC;`;
    return this.db.query<AttributeValue>(sql, [attributeId]);
  }

  /**
   * Retrieves an attribute metadata record along with its options list.
   */
  public async getAttributeWithValues(id: number): Promise<{
    attribute: Attribute;
    values: AttributeValue[];
  } | null> {
    const sqlAttr = `SELECT * FROM Attribute WHERE Id = ? LIMIT 1;`;
    const attrs = await this.db.query<Attribute>(sqlAttr, [id]);
    if (attrs.length === 0) {
      return null;
    }
    const attribute = attrs[0];
    const values = await this.getAttributeValues(id);
    return { attribute, values };
  }
}
