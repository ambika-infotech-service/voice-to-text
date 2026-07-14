import { Service, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { DB_NAME, DB_VERSION } from './database.constants';
import { MigrationV1 } from './migrations/migration-v1';
import { MigrationV2 } from './migrations/migration-v2';
import { MigrationV3 } from './migrations/migration-v3';
import { SeedV1 } from './seed/seed-v1';

/**
 * Service managing the SQLite database initialization, connection pooling,
 * schema migrations, transaction wrappers, and query executions.
 * Features automated web persistence (via IndexDB mapping) for browser platforms.
 */
@Service()
export class DatabaseService {
  private sqlite!: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;
  private isTransactionActive = false; // Tracks transaction context state

  private readonly migrations = [MigrationV1, MigrationV2, MigrationV3];
  private readonly seeds = [SeedV1];

  constructor() {
    this.initializeSQLiteEngine();
  }

  private initializeSQLiteEngine(): void {
    try {
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
    } catch (err: unknown) {
      console.warn('SQLite connection engine initialization failed. Fallback mock required in tests.', err);
    }
  }

  /**
   * Initializes the database connection, runs outstanding migrations,
   * and runs initial seeds if the database was newly created.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Configure WebAssembly IndexedDB storage context if running on Web
      if (Capacitor.getPlatform() === 'web') {
        await customElements.whenDefined('jeep-sqlite');
        const jeepSqliteEl = document.querySelector('jeep-sqlite');
        if (jeepSqliteEl) {
          await this.sqlite.initWebStore();
        } else {
          console.warn('jeep-sqlite element not found in DOM. WebAssembly persistence may not function.');
        }
      }

      const isConnection = (await this.sqlite.isConnection(DB_NAME, false)).result;
      if (isConnection) {
        this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
      } else {
        this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
      }

      await this.db.open();

      // Check current version and run migrations/seeds
      await this.runMigrationsAndSeeds();

      this.isInitialized = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to initialize SQLite database: ${msg}`);
    }
  }

  /**
   * Closes the active database connection.
   */
  public async close(): Promise<void> {
    if (!this.db) {
      return;
    }
    try {
      await this.db.close();
      await this.sqlite.closeConnection(DB_NAME, false);
      this.db = null;
      this.isInitialized = false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to close SQLite connection: ${msg}`);
    }
  }

  /**
   * Retrieves the current user schema version from SQLite metadata.
   */
  public async getCurrentVersion(): Promise<number> {
    const db = this.getDbConnection();
    const result = await db.query('PRAGMA user_version;');
    if (result.values && result.values.length > 0) {
      const row = result.values[0];
      return row.user_version ?? row['user_version'] ?? 0;
    }
    return 0;
  }

  /**
   * Runs a select query returning an array of rows typed as T.
   * @param statement The SQL select statement.
   * @param values Parameterized array values.
   */
  public async query<T>(statement: string, values?: unknown[]): Promise<T[]> {
    const db = this.getDbConnection();
    const result = await db.query(statement, values);
    return (result.values as T[]) ?? [];
  }

  /**
   * Runs a modifying write query (INSERT, UPDATE, DELETE).
   * @param statement The SQL modifying statement.
   * @param values Parameterized array values.
   */
  public async run(statement: string, values?: unknown[]): Promise<{ changes?: number; lastId?: number }> {
    const db = this.getDbConnection();
    // Disable transaction wrapping if an outer transaction block is already active
    const useTransaction = !this.isTransactionActive;
    const result = await db.run(statement, values, useTransaction);
    await this.persistIfWeb();
    return {
      changes: result.changes?.changes ?? 0,
      lastId: result.changes?.lastId ?? -1
    };
  }

  /**
   * Runs raw SQL statements batches (DDL scripts).
   * @param statements Batch statements string.
   */
  public async execute(statements: string): Promise<void> {
    const db = this.getDbConnection();
    await db.execute(statements);
    await this.persistIfWeb();
  }

  /**
   * Executes database operations inside a single SQLite transaction block.
   * Rollbacks operations automatically if errors are thrown.
   * @param actions Async actions block.
   */
  public async runTransaction(actions: () => Promise<void>): Promise<void> {
    const db = this.getDbConnection();
    await db.beginTransaction();
    this.isTransactionActive = true;
    try {
      await actions();
      await db.commitTransaction();
      this.isTransactionActive = false;
      await this.persistIfWeb();
    } catch (err) {
      this.isTransactionActive = false;
      try {
        await db.rollbackTransaction();
      } catch (rollbackErr: unknown) {
        console.warn('SQLite transaction rollback failed (already aborted or closed):', rollbackErr);
      }
      throw err;
    }
  }

  private getDbConnection(): SQLiteDBConnection {
    if (!this.db) {
      throw new Error('Database connection is closed. Call initialize() first.');
    }
    return this.db;
  }

  private async persistIfWeb(): Promise<void> {
    // Avoid early flushing if a transaction block is still running
    if (this.isTransactionActive) {
      return;
    }
    try {
      if (Capacitor.getPlatform() === 'web') {
        await this.sqlite.saveToStore(DB_NAME);
      }
    } catch (err: unknown) {
      console.warn('Failed to save SQLite state to IndexedDB web store', err);
    }
  }

  private async runMigrationsAndSeeds(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const isNewDb = currentVersion === 0;

    // Execute migrations sequentially
    for (const migration of this.migrations) {
      if (migration.version > currentVersion) {
        for (const stmt of migration.statements) {
          await this.db!.execute(stmt);
        }
        await this.db!.execute(`PRAGMA user_version = ${migration.version};`);
      }
    }

    // If new database, run seed scripts
    if (isNewDb) {
      for (const seed of this.seeds) {
        if (seed.version <= DB_VERSION) {
          await this.runTransaction(async () => {
            for (const stmt of seed.statements) {
              await this.db!.run(stmt, [], false); // Disable nested transaction wrapping
            }
          });
        }
      }
    }
  }
}
