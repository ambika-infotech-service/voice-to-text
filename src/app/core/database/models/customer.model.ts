/**
 * Represents a customer in the database.
 */
export interface Customer {
  /** Unique primary key identifier. */
  readonly id?: number;
  /** Optional company name. */
  readonly company_name?: string | null;
  /** Customer's name. */
  readonly customer_name: string;
  /** Optional mobile number (must be unique if provided). */
  readonly mobile?: string | null;
  /** Optional email address. */
  readonly email?: string | null;
  /** Optional Goods and Services Tax identification number. */
  readonly gst_number?: string | null;
  /** Optional physical billing/delivery address. */
  readonly address?: string | null;
  /** Optional city location. */
  readonly city?: string | null;
  /** Optional state designation. */
  readonly state?: string | null;
  /** Optional postal code. */
  readonly pincode?: string | null;
  /** Optional miscellaneous notes. */
  readonly notes?: string | null;
  /** ISO string timestamp when the customer was created. */
  readonly created_at: string;
  /** ISO string timestamp when the customer was last updated. */
  readonly updated_at: string;

  /** Virtual field populated during query indicating contact count. */
  readonly contact_count?: number;
}
