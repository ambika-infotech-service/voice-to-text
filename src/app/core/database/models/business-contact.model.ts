/**
 * Represents an independent professional business contact (e.g. plumber, contractor).
 */
export interface BusinessContact {
  /** Unique primary key identifier. */
  readonly id?: number;
  /** Full name of the contact person. */
  readonly name: string;
  /** Optional mobile number. */
  readonly mobile?: string | null;
  /** Optional alternative mobile number. */
  readonly alternate_mobile?: string | null;
  /** Optional email address. */
  readonly email?: string | null;
  /** Optional billing or primary address. */
  readonly address?: string | null;
  /** Optional city location. */
  readonly city?: string | null;
  /** Optional state designation. */
  readonly state?: string | null;
  /** Optional postal code. */
  readonly pincode?: string | null;
  /** Optional internal notes or remarks. */
  readonly notes?: string | null;
  /** Status toggle (1 = Active, 0 = Inactive). */
  readonly is_active: number;
  /** ISO string timestamp when the record was created. */
  readonly created_at: string;
  /** ISO string timestamp when the record was last updated. */
  readonly updated_at: string;

  /** Dynamic field populated during mappings query containing associated role IDs. */
  readonly role_ids?: number[];
  /** Dynamic field containing list of mapped role names. */
  readonly roles?: string[];
}
