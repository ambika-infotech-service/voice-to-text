import { TestBed } from '@angular/core/testing';
import { InvoiceService } from './invoice.service';
import { CalculationService } from './calculation.service';
import { InvoiceItem } from '../models/invoice.model';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let calcService: CalculationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InvoiceService, CalculationService]
    });
    service = TestBed.inject(InvoiceService);
    calcService = TestBed.inject(CalculationService);
  });

  it('should initialize with default empty invoice details', () => {
    const inv = service.invoice();
    expect(inv.invoiceNo).toContain('INV-');
    expect(inv.items.length).toBe(0);
    expect(inv.customerName).toBe('');
    expect(inv.discount).toBe(0);
  });

  it('should update customer metadata and recalculate totals', () => {
    service.updateInvoiceFields({
      customerName: 'Jane Smith',
      customerMobile: '9876543210',
      discount: 20
    });

    const inv = service.invoice();
    expect(inv.customerName).toBe('Jane Smith');
    expect(inv.customerMobile).toBe('9876543210');
    expect(inv.discount).toBe(20);
  });

  it('should update items, calculate row amounts, and trigger totals computations', () => {
    const rawItems: InvoiceItem[] = [
      { itemName: 'Supreme Pipe 2"', quantity: 5, unit: 'Pcs', rate: 100, amount: 0 }
    ];

    service.updateInvoiceItems(rawItems);

    const inv = service.invoice();
    expect(inv.items.length).toBe(1);
    expect(inv.items[0].amount).toBe(500); // 5 * 100
    expect(inv.subtotal).toBe(500);
    expect(inv.taxableAmount).toBe(423.73); // 500 / 1.18
    expect(inv.gst).toBe(76.27); // 500 - 423.73
    expect(inv.grandTotal).toBe(500);
  });

  it('should reset state back to defaults on resetInvoice()', () => {
    service.updateInvoiceFields({ customerName: 'Temp Customer' });
    expect(service.invoice().customerName).toBe('Temp Customer');

    service.resetInvoice();
    expect(service.invoice().customerName).toBe('');
  });
});
