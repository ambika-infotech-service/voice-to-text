import { CalculationService } from './calculation.service';
import { InvoiceItem } from '../models/invoice.model';

describe('CalculationService', () => {
  let service: CalculationService;

  beforeEach(() => {
    service = new CalculationService();
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

    // Subtotal = 200 + 350.5 = 550.50
    // Discount = 50.50 -> Taxable = 500.00
    // GST = 18% of 500 = 90.00
    // Raw Grand Total = 590.00
    // Grand Total = 590
    // Round Off = 0

    const totals = service.calculateInvoiceTotals(items, 50.50);

    expect(totals.subtotal).toBe(550.5);
    expect(totals.gst).toBe(90);
    expect(totals.roundOff).toBe(0);
    expect(totals.grandTotal).toBe(590);
  });

  it('should handle fractional rounding adjustment offsets correctly', () => {
    const items: InvoiceItem[] = [
      { itemName: 'Screws', quantity: 1, unit: 'Pcs', rate: 45.45, amount: 45.45 }
    ];

    // Subtotal = 45.45
    // Discount = 0 -> Taxable = 45.45
    // GST = 18% of 45.45 = 8.18
    // Raw Grand Total = 53.63
    // Grand Total = 54
    // Round Off = 54 - 53.63 = 0.37

    const totals = service.calculateInvoiceTotals(items, 0);

    expect(totals.subtotal).toBe(45.45);
    expect(totals.gst).toBe(8.18);
    expect(totals.roundOff).toBe(0.37);
    expect(totals.grandTotal).toBe(54);
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
