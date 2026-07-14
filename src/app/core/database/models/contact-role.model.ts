/**
 * Represents a professional role/profession master in the system.
 */
export interface ContactRole {
  /** Unique primary key identifier. */
  readonly id?: number;
  /** Unique role name (e.g. Plumber, Carpenter). */
  readonly role_name: string;
  /** Display hierarchy ordering. */
  readonly display_order: number;
  /** Status toggle (1 = Active, 0 = Disabled). */
  readonly is_active: number;
  /** ISO string timestamp when the role was created. */
  readonly created_at: string;
  /** ISO string timestamp when the role was last updated. */
  readonly updated_at: string;
}
