/**
 * Represents a database migration containing statements to execute.
 */
export interface Migration {
  /** The target database version of this migration. */
  readonly version: number;
  /** DDL statements to run. */
  readonly statements: string[];
}

/**
 * Represents database seed data to run on initial setup.
 */
export interface Seed {
  /** The matching migration/schema version for this seed. */
  readonly version: number;
  /** DML inserts to execute. */
  readonly statements: string[];
}
