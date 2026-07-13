/**
 * Represents a sellable product in the database.
 */
export interface Product {
  /** Unique primary key identifier. */
  readonly Id?: number;
  /** Stock Keeping Unit (unique code). */
  readonly SKU: string;
  /** Foreign key mapping to Category.Id. */
  readonly CategoryId: number;
  /** Text display name of the product. */
  readonly DisplayName: string;
  /** Optional barcode value. */
  readonly Barcode?: string | null;
  /** Optional HSN Code for GST billing. */
  readonly HSNCode?: string | null;
  /** Goods and Services Tax percentage (e.g. 18.0). */
  readonly GST: number;
  /** Selling price value. */
  readonly SellingPrice: number;
  /** Measuring unit designation (e.g. 'Pcs', 'Mtr'). */
  readonly Unit: string;
  /** Active status (1 = Active, 0 = Inactive). */
  readonly IsActive: number;
  /** ISO string timestamp when the product was created. */
  readonly CreatedAt: string;
}
