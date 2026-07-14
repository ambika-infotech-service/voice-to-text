/**
 * Represents a worker/contact person associated with a customer.
 */
export interface CustomerWorker {
  /** Unique primary key identifier. */
  readonly id?: number;
  /** Foreign key mapping to customers.id. */
  readonly customer_id: number;
  /** Name of the worker. */
  readonly worker_name: string;
  /** Optional mobile number. */
  readonly mobile?: string | null;
  /** Optional designation or role of the worker (e.g. Purchase Manager, Site Supervisor). */
  readonly designation?: string | null;
  /** Optional miscellaneous notes. */
  readonly notes?: string | null;
  /** ISO string timestamp when the worker was created. */
  readonly created_at: string;
  /** ISO string timestamp when the worker was last updated. */
  readonly updated_at: string;
}
