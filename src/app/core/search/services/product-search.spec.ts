import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ProductSearchService } from './product-search.service';
import { DatabaseService } from '../../database/database';
import { defaultNormalizer, Normalizer, extractQuantityAndUnit, mapUnitToStandard } from '../utils/normalization';
import { levenshteinDistance, levenshteinSimilarity } from '../utils/levenshtein';
import { ScoringProcessor, ScoringContext, SearchableProduct } from '../models/search.model';

describe('Search Normalization & Levenshtein Utilities', () => {
  it('should normalize input string correctly', () => {
    // Lowercase & extra spaces
    expect(defaultNormalizer.normalize('  Supreme   Pipe  ')).toBe('supreme pipe');

    // Unicode Punctuation removal (while preserving Gujarati/Hindi characters)
    expect(defaultNormalizer.normalize('Pipe 1" - (Supreme!)')).toBe('pipe 1 supreme');
    expect(defaultNormalizer.normalize('પીવીસી!')).toBe('પીવીસી');

    // Unit synonym translations
    expect(defaultNormalizer.normalize('twenty')).toBe('20l');
    expect(defaultNormalizer.normalize('20 litre')).toBe('20l');
    expect(defaultNormalizer.normalize('20 ltr')).toBe('20l');
    expect(defaultNormalizer.normalize('20 l')).toBe('20l');
    expect(defaultNormalizer.normalize('5 liter')).toBe('5l');
    expect(defaultNormalizer.normalize('6 kilogram')).toBe('6kg');
    expect(defaultNormalizer.normalize('10 pieces')).toBe('10pcs');
  });

  it('should extract quantity and unit from search queries', () => {
    const res1 = extractQuantityAndUnit('Prince pipes 10 foot');
    expect(res1.cleanText).toBe('Prince pipes');
    expect(res1.quantity).toBe(10);
    expect(res1.unit).toBe('foot');
    expect(mapUnitToStandard(res1.unit)).toBe('Ft');

    const res2 = extractQuantityAndUnit('15.5 kg Ashirvad PVC');
    expect(res2.cleanText).toBe('Ashirvad PVC');
    expect(res2.quantity).toBe(15.5);
    expect(res2.unit).toBe('kg');
    expect(mapUnitToStandard(res2.unit)).toBe('Kg');

    const res3 = extractQuantityAndUnit('Tractor Emulsion 20 લીટર');
    expect(res3.cleanText).toBe('Tractor Emulsion');
    expect(res3.quantity).toBe(20);
    expect(res3.unit).toBe('લીટર');
    expect(mapUnitToStandard(res3.unit)).toBe('Ltr');

    const noMatch = extractQuantityAndUnit('Supreme PVC pipe 1"');
    expect(noMatch.cleanText).toBe('Supreme PVC pipe 1"');
    expect(noMatch.quantity).toBeNull();
    expect(noMatch.unit).toBeNull();
  });

  it('should tokenize query text into clean token arrays', () => {
    const tokens = defaultNormalizer.tokenize('supreme pvc 1" 6kg');
    expect(tokens).toEqual(['supreme', 'pvc', '1', '6kg']);
  });

  it('should calculate Levenshtein distance correctly', () => {
    expect(levenshteinDistance('trctor', 'tractor')).toBe(1);
    expect(levenshteinDistance('aisan', 'asian')).toBe(2);
    expect(levenshteinDistance('german', 'german')).toBe(0);
    expect(levenshteinDistance('', 'test')).toBe(4);
  });

  it('should calculate Levenshtein similarity correctly', () => {
    expect(levenshteinSimilarity('german', 'german')).toBe(1.0);
    expect(levenshteinSimilarity('trctor', 'tractor')).toBeCloseTo(0.857, 3); // 1 - 1/7
    expect(levenshteinSimilarity('', '')).toBe(1.0);
  });
});

describe('ProductSearchService', () => {
  let service: ProductSearchService;
  let mockDbService: any;

  beforeEach(() => {
    mockDbService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([
        {
          variantId: 1,
          variantSku: 'SUP-PVC-1',
          productId: 1,
          sizeMm: null,
          sizeInch: '1"',
          weightKg: 6,
          pressure: null,
          schedule: null,
          pipeLength: 6,
          capacity: null,
          color: null,
          extraSpecification: 'ISI',
          purchasePrice: 120.0,
          sellingPrice: 150.0,
          stock: 100,
          variantBarcode: '123456789011',
          productName: 'PVC Pipe',
          productCode: '3917',
          unit: 'Mtr',
          description: 'Supreme PVC Pipe 1" 6kg ISI',
          priceCalculationType: 'FORMULA',
          brandName: 'Supreme',
          categoryId: 1,
          categoryName: 'Plumbing',
          subCategoryName: 'Rigid PVC Pipe',
          pricingType: 'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST',
          basePrice: 210,
          discountPercent: 45,
          cashDiscountPercent: 5,
          gstPercent: 18,
          profitPercent: 0,
          extraCharges: 0,
          roundOff: 0
        },
        {
          variantId: 2,
          variantSku: 'ASH-PVC-1',
          productId: 2,
          sizeMm: null,
          sizeInch: '1"',
          weightKg: 6,
          pressure: null,
          schedule: null,
          pipeLength: 6,
          capacity: null,
          color: null,
          extraSpecification: 'ISI',
          purchasePrice: 130.0,
          sellingPrice: 160.0,
          stock: 100,
          variantBarcode: '123456789012',
          productName: 'PVC Pipe',
          productCode: '3917',
          unit: 'Mtr',
          description: 'Ashirvad PVC Pipe 1" 6kg ISI',
          priceCalculationType: 'FORMULA',
          brandName: 'Ashirvad',
          categoryId: 1,
          categoryName: 'Plumbing',
          subCategoryName: 'Rigid PVC Pipe',
          pricingType: 'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST',
          basePrice: 220,
          discountPercent: 45,
          cashDiscountPercent: 5,
          gstPercent: 18,
          profitPercent: 0,
          extraCharges: 0,
          roundOff: 0
        },
        {
          variantId: 3,
          variantSku: 'PAINTS-TRACTOR-20L',
          productId: 3,
          sizeMm: null,
          sizeInch: null,
          weightKg: null,
          pressure: null,
          schedule: null,
          pipeLength: null,
          capacity: '20L',
          color: 'White',
          extraSpecification: null,
          purchasePrice: 3000.0,
          sellingPrice: 3500.0,
          stock: 50,
          variantBarcode: '123456789013',
          productName: 'Tractor Emulsion White 20L',
          productCode: '3209',
          unit: 'Ltr',
          description: 'Asian Paints Tractor Emulsion White 20L',
          priceCalculationType: 'DIRECT_PRICE',
          brandName: 'Asian Paints',
          categoryId: 2,
          categoryName: 'Paints',
          subCategoryName: 'Emulsion',
          pricingType: 'DIRECT_PRICE',
          basePrice: 3500,
          discountPercent: 0,
          cashDiscountPercent: 0,
          gstPercent: 18,
          profitPercent: 0,
          extraCharges: 0,
          roundOff: 0
        }
      ])
    };

    TestBed.configureTestingModule({
      providers: [
        ProductSearchService,
        { provide: DatabaseService, useValue: mockDbService }
      ]
    });

    service = TestBed.inject(ProductSearchService);
  });

  afterEach(() => {
    service.clearCache();
  });

  it('should lazy-load products into memory cache on first search', async () => {
    expect(mockDbService.query).not.toHaveBeenCalled();
    const result = await service.searchProducts('supreme');
    expect(mockDbService.query).toHaveBeenCalledTimes(1);
    expect(result.products.length).toBe(1);
  });

  it('should support Exact Alias matching shortcut (Stage 3)', async () => {
    const result = await service.searchProducts('આશીર્વાદ');
    expect(result.confidence).toBe(100);
    expect(result.bestMatch).toBeTruthy();
    expect(result.bestMatch?.SKU).toBe('ASH-PVC-1');
  });

  it('should support Exact Product Name matching shortcut (Stage 4)', async () => {
    const result = await service.searchProducts('Ashirvad PVC Pipe (1", 6kg, ISI)');
    expect(result.confidence).toBe(100);
    expect(result.bestMatch).toBeTruthy();
    expect(result.bestMatch?.SKU).toBe('ASH-PVC-1');
  });

  it('should resolve and rank products by keyword matching, brand, category, etc. (Stage 5-8)', async () => {
    const result = await service.searchProducts('tractor white twenty litre');
    expect(result.confidence).toBeGreaterThanOrEqual(90);
    expect(result.bestMatch?.SKU).toBe('PAINTS-TRACTOR-20L');
  });

  it('should match using fuzzy logic Levenshtein (Stage 7)', async () => {
    const result = await service.searchProducts('trctor white');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
    expect(result.products[0]?.SKU).toBe('PAINTS-TRACTOR-20L');
  });

  it('should enforce confidence rules for return formatting (Stage 9)', async () => {
    const highConfResult = await service.searchProducts('supreme pvc pipe 1" 6kg');
    expect(highConfResult.confidence).toBeGreaterThan(90);
    expect(highConfResult.bestMatch).toBeTruthy();
    expect(highConfResult.products.length).toBe(1);
    expect(highConfResult.multipleMatches).toBe(false);

    const medConfResult = await service.searchProducts('pvc pipe');
    expect(medConfResult.confidence).toBeLessThanOrEqual(90);
    expect(medConfResult.confidence).toBeGreaterThanOrEqual(60);
    expect(medConfResult.bestMatch).toBeNull();
    expect(medConfResult.products.length).toBe(2);
    expect(medConfResult.multipleMatches).toBe(true);

    const lowConfResult = await service.searchProducts('completely unrelated search term');
    expect(lowConfResult.confidence).toBeLessThan(60);
    expect(lowConfResult.bestMatch).toBeNull();
    expect(lowConfResult.products.length).toBe(0);
    expect(lowConfResult.multipleMatches).toBe(false);
  });

  it('should be future-ready by allowing registration of custom scoring engines (Stage 11)', async () => {
    class BarcodePriorityScorer implements ScoringProcessor {
      public readonly name = 'BarcodePriority';
      public readonly weight = 1.0;
      public score(product: SearchableProduct, context: ScoringContext): number {
        return context.query === product.barcode ? 5000 : 0;
      }
    }

    service.registerProcessor(new BarcodePriorityScorer());

    const result = await service.searchProducts('123456789012');
    expect(result.bestMatch).toBeTruthy();
    expect(result.bestMatch?.SKU).toBe('ASH-PVC-1');
  });
});
