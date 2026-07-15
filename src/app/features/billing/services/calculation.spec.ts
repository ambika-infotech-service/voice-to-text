import { TestBed } from '@angular/core/testing';
import { CalculationService } from './calculation.service';
import { PricingService } from './pricing.service';
import { InvoiceItem } from '../models/invoice.model';

describe('CalculationService', () => {
  let service: CalculationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CalculationService, PricingService]
    });
    service = TestBed.inject(CalculationService);
  });

  it('should calculate item amount (Qty * Rate) correctly rounded to 2 decimal places', () => {
    expect(service.calculateItemAmount(3, 150.5)).toBe(451.5);
    expect(service.calculateItemAmount(1.5, 33.33)).toBe(50);
    expect(service.calculateItemAmount(-1, 50)).toBe(0);
  });

  it('should calculate invoice totals correctly with GST and Round Off', () => {
    const items: InvoiceItem[] = [
      { itemName: 'Pipe A', quantity: 2, unit: 'Mtr', rate: 100, amount: 200 },
      { itemName: 'Paints B', quantity: 1, unit: 'Ltr', rate: 350.5, amount: 350.5 }
    ];

    // Subtotal = 200 + 350.5 = 550.50 (inclusive of GST)
    // Discount = 50.50 -> totalInclusive = 500.00
    // Taxable Amount = 500 / 1.18 = 423.73
    // GST = 500 - 423.73 = 76.27
    // Raw Grand Total = 500.00
    // Grand Total = 500
    // Round Off = 0

    const totals = service.calculateInvoiceTotals(items, 50.50);

    expect(totals.subtotal).toBe(550.5);
    expect(totals.taxableAmount).toBe(423.73);
    expect(totals.gst).toBe(76.27);
    expect(totals.roundOff).toBe(0);
    expect(totals.grandTotal).toBe(500);
  });

  it('should handle fractional rounding adjustment offsets correctly', () => {
    const items: InvoiceItem[] = [
      { itemName: 'Screws', quantity: 1, unit: 'Pcs', rate: 45.45, amount: 45.45 }
    ];

    // Subtotal = 45.45
    // Discount = 0 -> totalInclusive = 45.45
    // Taxable Amount = 45.45 / 1.18 = 38.52
    // GST = 45.45 - 38.52 = 6.93
    // Raw Grand Total = 45.45
    // Grand Total = 45
    // Round Off = 45 - 45.45 = -0.45

    const totals = service.calculateInvoiceTotals(items, 0);

    expect(totals.subtotal).toBe(45.45);
    expect(totals.taxableAmount).toBe(38.52);
    expect(totals.gst).toBe(6.93);
    expect(totals.roundOff).toBe(-0.45);
    expect(totals.grandTotal).toBe(45);
  });

  it('should convert numbers to Indian Wording rupees format correctly', () => {
    expect(service.convertNumberToWords(0)).toBe('Zero Rupees Only');
    expect(service.convertNumberToWords(550)).toBe('Five Hundred Fifty Rupees Only');
    expect(service.convertNumberToWords(100500)).toBe('One Lakh Five Hundred Rupees Only');
    expect(service.convertNumberToWords(15230)).toBe('Fifteen Thousand Two Hundred Thirty Rupees Only');
  });

  it('should compute fuzzy similarity scores accurately using Levenshtein distance', () => {
    // Exact match
    expect(service.getFuzzySimilarity('pipe', 'pipe')).toBe(1.0);
    // Substring contains match
    expect(service.getFuzzySimilarity('pipe', 'PVC Pipe')).toBeGreaterThan(0.7);
    // Typo match (contains substring optimization)
    expect(service.getFuzzySimilarity('pip', 'pipe')).toBeCloseTo(0.925, 3);
    // Completely different
    expect(service.getFuzzySimilarity('abc', 'xyz')).toBe(0.0);
  });
});
