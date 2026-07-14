import { TestBed } from '@angular/core/testing';
import { CustomerRepository } from './customer.repository';
import { DatabaseService } from '../database';

describe('CustomerRepository', () => {
  let repository: CustomerRepository;
  let mockDbService: any;

  beforeEach(() => {
    mockDbService = {
      run: vi.fn().mockResolvedValue({ changes: 1, lastId: 10 }),
      query: vi.fn().mockResolvedValue([]),
      runTransaction: vi.fn().mockImplementation(async (actions: () => Promise<void>) => {
        await actions();
      })
    };

    TestBed.configureTestingModule({
      providers: [
        CustomerRepository,
        { provide: DatabaseService, useValue: mockDbService }
      ]
    });

    repository = TestBed.inject(CustomerRepository);
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  it('should insert a customer with normalized fields', async () => {
    const timestamp = '2026-07-14T12:00:00Z';
    const id = await repository.createCustomer({
      customer_name: 'Amit Patel',
      company_name: '   Patel Hardware  ',
      mobile: '   9876543210  ',
      email: '',
      created_at: timestamp,
      updated_at: timestamp
    });

    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO customers'),
      [
        'Patel Hardware',
        'Amit Patel',
        '9876543210',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        timestamp,
        timestamp
      ]
    );
    expect(id).toBe(10);
  });

  it('should update customer data', async () => {
    const timestamp = '2026-07-14T12:00:00Z';
    await repository.updateCustomer({
      id: 1,
      customer_name: 'Amit Patel',
      mobile: '', // Should be normalized to null
      created_at: timestamp,
      updated_at: timestamp
    });

    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE customers SET'),
      [
        null,
        'Amit Patel',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        timestamp,
        1
      ]
    );
  });

  it('should delete a customer', async () => {
    await repository.deleteCustomer(1);
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM customers WHERE id = ?'),
      [1]
    );
  });

  it('should search customers with query parameters matching all four criteria and prioritize exact matches', async () => {
    await repository.searchCustomers('TestQuery');
    expect(mockDbService.query).toHaveBeenCalledWith(
      expect.stringContaining('CASE'),
      [
        'TestQuery', 'TestQuery', 'TestQuery', 'TestQuery', // exact matches
        'TestQuery%', 'TestQuery%', 'TestQuery%', 'TestQuery%', // starts with
        '%TestQuery%', '%TestQuery%', '%TestQuery%', '%TestQuery%' // contains
      ]
    );
  });

  it('should run transaction on saveCustomerWithWorkers', async () => {
    const timestamp = '2026-07-14T12:00:00Z';
    mockDbService.run.mockResolvedValueOnce({ changes: 1, lastId: 10 }); // customer insert
    mockDbService.run.mockResolvedValueOnce({ changes: 1, lastId: 20 }); // worker insert

    const customerId = await repository.saveCustomerWithWorkers(
      { customer_name: 'Amit', created_at: timestamp, updated_at: timestamp },
      [{ customer_id: -1, worker_name: 'Worker 1', created_at: timestamp, updated_at: timestamp }]
    );

    expect(mockDbService.runTransaction).toHaveBeenCalled();
    expect(customerId).toBe(10);
    expect(mockDbService.run).toHaveBeenCalledTimes(2);
  });
});
