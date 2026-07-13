import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database';
import { Alias } from '../models/alias.model';

/**
 * Repository handling database operations for the Alias table.
 * Supports case-insensitive lookup matching search synonyms.
 */
@Service()
export class AliasRepository {
  private readonly db = inject(DatabaseService);

  /**
   * Inserts a new search keyword alias.
   * @returns Generated database Id.
   */
  public async insert(alias: Alias): Promise<number> {
    const sql = `INSERT INTO Alias (AttributeValueId, Keyword) VALUES (?, ?);`;
    const res = await this.db.run(sql, [alias.AttributeValueId, alias.Keyword]);
    return res.lastId ?? -1;
  }

  /**
   * Finds matching Alias records for a search keyword (case-insensitive).
   */
  public async findByKeyword(keyword: string): Promise<Alias[]> {
    const sql = `SELECT * FROM Alias WHERE LOWER(Keyword) = LOWER(?);`;
    return this.db.query<Alias>(sql, [keyword]);
  }

  /**
   * Resolves a keyword search synonym to its fully qualified attribute category details.
   * Joins Alias, AttributeValue, and Attribute tables.
   */
  public async getMappedAttributeValue(keyword: string): Promise<{
    attributeValueId: number;
    keyword: string;
    displayValue: string;
    attributeName: string;
  } | null> {
    const sql = `
      SELECT al.AttributeValueId as attributeValueId, al.Keyword as keyword,
             av.DisplayValue as displayValue, a.Name as attributeName
      FROM Alias al
      JOIN AttributeValue av ON al.AttributeValueId = av.Id
      JOIN Attribute a ON av.AttributeId = a.Id
      WHERE LOWER(al.Keyword) = LOWER(?)
      LIMIT 1;
    `;
    const rows = await this.db.query<{
      attributeValueId: number;
      keyword: string;
      displayValue: string;
      attributeName: string;
    }>(sql, [keyword]);
    return rows.length > 0 ? rows[0] : null;
  }
}
