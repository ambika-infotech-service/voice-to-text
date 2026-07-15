import { TestBed } from '@angular/core/testing';
import { DB_NAME, DB_VERSION } from './database.constants';

// Declare mocks using hoisted to ensure execution before module imports
const { MockSQLiteConnection, mockDbInstance, getActiveConnection } = vi.hoisted(() => {
  const db = {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockImplementation((stmt: string) => {
      if (stmt.includes('PRAGMA user_version;')) {
        return Promise.resolve({ values: [{ user_version: 0 }] });
      }
      return Promise.resolve({ values: [] });
    }),
    run: vi.fn().mockResolvedValue({ changes: { changes: 1, lastId: 42 } }),
    execute: vi.fn().mockResolvedValue(undefined),
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commitTransaction: vi.fn().mockResolvedValue(undefined),
    rollbackTransaction: vi.fn().mockResolvedValue(undefined),
  };

  let activeConnection: any = null;

  class SQLiteConnectionMock {
    constructor() {
      activeConnection = this;
    }
    isConnection = vi.fn().mockResolvedValue({ result: false });
    createConnection = vi.fn().mockResolvedValue(db);
    retrieveConnection = vi.fn().mockResolvedValue(db);
    closeConnection = vi.fn().mockResolvedValue(undefined);
  }

  return {
    MockSQLiteConnection: SQLiteConnectionMock,
    mockDbInstance: db,
    getActiveConnection: () => activeConnection
  };
});

vi.mock('@capacitor-community/sqlite', () => {
  return {
    CapacitorSQLite: {},
    SQLiteConnection: MockSQLiteConnection,
    SQLiteDBConnection: class {}
  };
});

// Import the service after mocking is defined
import { DatabaseService } from './database';

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Define dummy jeep-sqlite custom element in JSDOM so whenDefined does not hang in tests
    if (typeof customElements !== 'undefined' && customElements.get('jeep-sqlite') === undefined) {
      customElements.define('jeep-sqlite', class extends HTMLElement {});
    }

    // Explicitly reset mock spy history to prevent bleed-through between tests
    mockDbInstance.beginTransaction.mockClear();
    mockDbInstance.commitTransaction.mockClear();
    mockDbInstance.rollbackTransaction.mockClear();
    mockDbInstance.execute.mockClear();
    mockDbInstance.run.mockClear();
    mockDbInstance.query.mockClear();

    mockDbInstance.query.mockImplementation((stmt: string) => {
      if (stmt.includes('PRAGMA user_version;')) {
        return Promise.resolve({ values: [{ user_version: 0 }] });
      }
      return Promise.resolve({ values: [] });
    });

    TestBed.configureTestingModule({
      providers: [DatabaseService]
    });

    service = TestBed.inject(DatabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a new connection and open it on initialize if not existing', async () => {
    await service.initialize();

    const conn = getActiveConnection();
    expect(conn).toBeTruthy();
    expect(conn.isConnection).toHaveBeenCalledWith(DB_NAME, false);
    expect(conn.createConnection).toHaveBeenCalledWith(DB_NAME, false, 'no-encryption', DB_VERSION, false);
    expect(mockDbInstance.open).toHaveBeenCalled();
  });

  it('should retrieve existing connection and open it on initialize if connection exists', async () => {
    // Force isConnection to return true for retrieval test
    await service.initialize();
    const conn = getActiveConnection();
    conn.isConnection.mockResolvedValueOnce({ result: true });

    // Dry-run close connection and re-run initialize
    await service.close();
    await service.initialize();

    expect(conn.retrieveConnection).toHaveBeenCalledWith(DB_NAME, false);
    expect(mockDbInstance.open).toHaveBeenCalled();
  });

  it('should run migrations and seed when initializing a clean database (version = 0)', async () => {
    await service.initialize();

    expect(mockDbInstance.execute).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS Category'));
    expect(mockDbInstance.execute).toHaveBeenCalledWith(expect.stringContaining('PRAGMA user_version = 1;'));
    expect(mockDbInstance.run).toHaveBeenCalledWith(expect.stringContaining('INSERT OR IGNORE INTO Category'), [], false);
  });

  it('should run only outstanding migrations (and skip seeds) when database version is positive but outdated', async () => {
    mockDbInstance.query.mockImplementation((stmt: string) => {
      if (stmt.includes('PRAGMA user_version;')) {
        return Promise.resolve({ values: [{ user_version: 1 }] });
      }
      return Promise.resolve({ values: [] });
    });

    await service.initialize();

    const executeCalls = mockDbInstance.execute.mock.calls.filter((call: any[]) =>
      call[0].includes('CREATE TABLE') || call[0].includes('PRAGMA user_version')
    );
    expect(executeCalls.length).toBeGreaterThanOrEqual(3);

    const runCalls = mockDbInstance.run.mock.calls.filter((call: any[]) =>
      call[0].includes('INSERT OR IGNORE')
    );
    expect(runCalls.length).toBe(0);
  });

  it('should execute select queries correctly via query method', async () => {
    await service.initialize();
    mockDbInstance.query.mockResolvedValueOnce({ values: [{ Id: 1, Name: 'Plumbing' }] });

    const results = await service.query<any>('SELECT * FROM Category;');

    expect(mockDbInstance.query).toHaveBeenCalledWith('SELECT * FROM Category;', undefined);
    expect(results).toEqual([{ Id: 1, Name: 'Plumbing' }]);
  });

  it('should execute modifying queries correctly via run method', async () => {
    await service.initialize();

    const res = await service.run('INSERT INTO Category (Name) VALUES (?);', ['Electrical']);

    expect(mockDbInstance.run).toHaveBeenCalledWith('INSERT INTO Category (Name) VALUES (?);', ['Electrical'], true);
    expect(res).toEqual({ changes: 1, lastId: 42 });
  });

  it('should wrap operations in a transaction block', async () => {
    await service.initialize();

    // Clear transaction spy history from the seeding phase
    mockDbInstance.beginTransaction.mockClear();
    mockDbInstance.commitTransaction.mockClear();
    mockDbInstance.rollbackTransaction.mockClear();

    await service.runTransaction(async () => {
      await service.run('INSERT INTO Category...', []);
    });

    expect(mockDbInstance.beginTransaction).toHaveBeenCalled();
    expect(mockDbInstance.commitTransaction).toHaveBeenCalled();
    expect(mockDbInstance.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('should rollback transactions on error', async () => {
    await service.initialize();

    // Clear transaction spy history from the seeding phase
    mockDbInstance.beginTransaction.mockClear();
    mockDbInstance.commitTransaction.mockClear();
    mockDbInstance.rollbackTransaction.mockClear();

    await expect(
      service.runTransaction(async () => {
        throw new Error('Database Error');
      })
    ).rejects.toThrow('Database Error');

    expect(mockDbInstance.beginTransaction).toHaveBeenCalled();
    expect(mockDbInstance.commitTransaction).not.toHaveBeenCalled();
    expect(mockDbInstance.rollbackTransaction).toHaveBeenCalled();
  });
});
