import { TestBed } from '@angular/core/testing';
import { PricingService, PricingType } from './pricing.service';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PricingService]
    });
    service = TestBed.inject(PricingService);
  });

  it('should calculate direct selling price (DIRECT_PRICE)', () => {
    const purchase = service.calculatePurchasePrice(430, 0, 0, 18, 0, 0, 0, PricingType.DIRECT_PRICE);
    const selling = service.calculateSellingPrice(430, 0, 0, 18, 0, 0, 0, PricingType.DIRECT_PRICE);
    expect(purchase).toBe(430);
    expect(selling).toBe(430);
  });

  it('should calculate MRP - Discount - Cash Discount + GST + Profit', () => {
    // Example from prompt:
    // MRP = 210, Discount = 45%, CD = 5%, GST = 18%, Profit = 20%
    const purchase = service.calculatePurchasePrice(
      210, 45, 5, 18, 20, 0, 0,
      PricingType.BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT
    );
    const selling = service.calculateSellingPrice(
      210, 45, 5, 18, 20, 0, 0,
      PricingType.BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT
    );
    const gst = service.calculateGST(
      210, 45, 5, 18, 20, 0, 0,
      PricingType.BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT
    );
    const profit = service.calculateProfit(
      210, 45, 5, 18, 20, 0, 0,
      PricingType.BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT
    );

    // Math.round(109.725 * 1.18 * 100) / 100 = 129.48
    expect(purchase).toBe(129.48);
    // Math.round(129.4755 * 1.2 * 100) / 100 = 155.37
    expect(selling).toBe(155.37);
    // Math.round(109.725 * 0.18 * 100) / 100 = 19.75
    expect(gst).toBe(19.75);
    // Math.round(129.4755 * 0.2 * 100) / 100 = 25.90
    expect(profit).toBe(25.90);
  });

  it('should calculate final line item amount', () => {
    expect(service.calculateFinalAmount(150, 3)).toBe(450);
    expect(service.calculateFinalAmount(12.55, 1.5)).toBe(18.83);
    expect(service.calculateFinalAmount(-10, 5)).toBe(0);
  });
});
