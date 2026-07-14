/**
 * Represents a contact person associated with a customer.
 */
export interface CustomerContact {
  /** Unique primary key identifier. */
  readonly id?: number;
  /** Foreign key mapping to customers.id. */
  readonly customer_id: number;
  /** Name of the contact. */
  readonly contact_name: string;
  /** Optional mobile number. */
  readonly mobile?: string | null;
  /** Optional designation or role of the contact (e.g. Purchase Manager, Site Supervisor). */
  readonly designation?: string | null;
  /** Optional miscellaneous notes. */
  readonly notes?: string | null;
  /** ISO string timestamp when the contact was created. */
  readonly created_at: string;
  /** ISO string timestamp when the contact was last updated. */
  readonly updated_at: string;
}
