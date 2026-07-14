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
          Id: 1,
          SKU: 'SUP-PVC-1',
          CategoryId: 1,
          DisplayName: 'Supreme PVC Pipe 1" 6kg ISI',
          Barcode: '123456789011',
          HSNCode: '3917',
          GST: 18.0,
          SellingPrice: 150.0,
          Unit: 'Mtr',
          IsActive: 1,
          CreatedAt: '2026-07-13T10:00:00Z',
          CategoryName: 'Plumbing',
          BrandName: 'Supreme',
          AliasesStr: 'pvc|પીવીસી|p v c|1 inch|1"|એક ઇંચ|6kg|6 kg|છ કિલો|supreme|સુપ્રીમ'
        },
        {
          Id: 2,
          SKU: 'ASH-PVC-1',
          CategoryId: 1,
          DisplayName: 'Ashirvad PVC Pipe 1" 6kg ISI',
          Barcode: '123456789012',
          HSNCode: '3917',
          GST: 18.0,
          SellingPrice: 160.0,
          Unit: 'Mtr',
          IsActive: 1,
          CreatedAt: '2026-07-13T10:00:00Z',
          CategoryName: 'Plumbing',
          BrandName: 'Ashirvad',
          AliasesStr: 'pvc|પીવીસી|p v c|1 inch|1"|એક ઇંચ|6kg|6 kg|છ કિલો|ashirvad|આશીર્વાદ|ashirwad'
        },
        {
          Id: 3,
          SKU: 'PAINTS-TRACTOR-20L',
          CategoryId: 2,
          DisplayName: 'Asian Paints Tractor Emulsion White 20L',
          Barcode: '123456789013',
          HSNCode: '3209',
          GST: 18.0,
          SellingPrice: 3500.0,
          Unit: 'Ltr',
          IsActive: 1,
          CreatedAt: '2026-07-13T10:00:00Z',
          CategoryName: 'Paints',
          BrandName: 'Asian Paints',
          AliasesStr: 'tractor white|asian tractor|tractor 20 litre|tractor 20L|tractor emulsion|white tractor'
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
    const result = await service.searchProducts('Ashirvad PVC Pipe 1" 6kg ISI');
    expect(result.confidence).toBe(100);
    expect(result.bestMatch).toBeTruthy();
    expect(result.bestMatch?.SKU).toBe('ASH-PVC-1');
  });

  it('should resolve and rank products by keyword matching, brand, category, etc. (Stage 5-8)', async () => {
    // Search "tractor white twenty litre"
    // normalized: "tractor white 20l"
    // matches: Asian Paints Tractor Emulsion White 20L
    const result = await service.searchProducts('tractor white twenty litre');
    expect(result.confidence).toBeGreaterThanOrEqual(90);
    expect(result.bestMatch?.SKU).toBe('PAINTS-TRACTOR-20L');
  });

  it('should match using fuzzy logic Levenshtein (Stage 7)', async () => {
    // "trctor" (distance 1 to tractor)
    const result = await service.searchProducts('trctor white');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
    expect(result.products[0]?.SKU).toBe('PAINTS-TRACTOR-20L');
  });

  it('should enforce confidence rules for return formatting (Stage 9)', async () => {
    // 1. High confidence (>90%) -> bestMatch only, products has only that match
    const highConfResult = await service.searchProducts('supreme pvc pipe 1" 6kg');
    expect(highConfResult.confidence).toBeGreaterThan(90);
    expect(highConfResult.bestMatch).toBeTruthy();
    expect(highConfResult.products.length).toBe(1);
    expect(highConfResult.multipleMatches).toBe(false);

    // 2. Medium confidence (60-90%) -> suggestions list (up to 5), bestMatch is null
    // Searching "pvc pipe" matches Supreme and Ashirvad
    const medConfResult = await service.searchProducts('pvc pipe');
    expect(medConfResult.confidence).toBeLessThanOrEqual(90);
    expect(medConfResult.confidence).toBeGreaterThanOrEqual(60);
    expect(medConfResult.bestMatch).toBeNull();
    expect(medConfResult.products.length).toBe(2);
    expect(medConfResult.multipleMatches).toBe(true);

    // 3. Low confidence (<60%) -> empty result
    const lowConfResult = await service.searchProducts('completely unrelated search term');
    expect(lowConfResult.confidence).toBeLessThan(60);
    expect(lowConfResult.bestMatch).toBeNull();
    expect(lowConfResult.products.length).toBe(0);
    expect(lowConfResult.multipleMatches).toBe(false);
  });

  it('should be future-ready by allowing registration of custom scoring engines (Stage 11)', async () => {
    // Register custom scorer prioritizing specific barcodes
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
