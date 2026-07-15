import { Service, inject } from '@angular/core';
import { DatabaseService } from '../../database/database';
import { Product } from '../../database/models/product.model';
import {
  ScoringProcessor,
  ScoringContext,
  SearchableProduct,
  SearchResult
} from '../models/search.model';
import { defaultNormalizer } from '../utils/normalization';
import { levenshteinSimilarity } from '../utils/levenshtein';
import {
  ExactNameScoringProcessor,
  ExactAliasScoringProcessor,
  KeywordMatchScoringProcessor,
  BrandMatchScoringProcessor,
  CategoryMatchScoringProcessor,
  FuzzyMatchScoringProcessor,
  SubstringMatchScoringProcessor
} from '../utils/scoring';

/**
 * Intelligent search engine converting user voice/text queries into products.
 * Uses an in-memory cached representation of database products to execute complex
 * multi-stage searches in sub-millisecond times.
 */
@Service()
export class ProductSearchService {
  private readonly dbService = inject(DatabaseService);

  // In-memory cache of searchable products
  private searchableProducts: SearchableProduct[] = [];
  private isLoaded = false;

  // Extensible scoring processor registry
  public readonly scoringProcessors: ScoringProcessor[] = [
    new ExactNameScoringProcessor(),
    new ExactAliasScoringProcessor(),
    new KeywordMatchScoringProcessor(),
    new BrandMatchScoringProcessor(),
    new CategoryMatchScoringProcessor(),
    new FuzzyMatchScoringProcessor(),
    new SubstringMatchScoringProcessor()
  ];

  /**
   * Loads all active products, their categories, brands, and variants from SQLite,
   * compiles their in-memory keyword indexes, and caches them.
   * Only queries SQLite when explicitly triggered (e.g. on data updates).
   */
  public async refreshCache(): Promise<void> {
    await this.dbService.initialize();

    const sql = `
      SELECT 
        v.id AS variantId,
        v.sku AS variantSku,
        v.productId,
        v.sizeMm,
        v.sizeInch,
        v.weightKg,
        v.pressure,
        v.schedule,
        v.pipeLength,
        v.capacity,
        v.color,
        v.extraSpecification,
        v.purchasePrice,
        v.sellingPrice,
        v.stock,
        v.barcode AS variantBarcode,
        p.name AS productName,
        p.productCode,
        p.unit,
        p.description,
        p.priceCalculationType,
        b.name AS brandName,
        c.id AS categoryId,
        c.name AS categoryName,
        sc.name AS subCategoryName,
        pr.pricingType,
        pr.basePrice,
        pr.discountPercent,
        pr.cashDiscountPercent,
        pr.gstPercent,
        pr.profitPercent,
        pr.extraCharges,
        pr.roundOff
      FROM ProductVariant v
      JOIN Product p ON v.productId = p.id
      JOIN Brand b ON p.brandId = b.id
      JOIN Category c ON p.categoryId = c.id
      LEFT JOIN SubCategory sc ON p.subCategoryId = sc.id
      LEFT JOIN PricingRule pr ON pr.variantId = v.id AND pr.isDefault = 1 AND pr.isActive = 1
      WHERE v.isActive = 1 AND p.isActive = 1;
    `;

    const rows = await this.dbService.query<any>(sql);

    this.searchableProducts = rows.map(row => {
      // Compile size display name suffix
      const specs: string[] = [];
      if (row.sizeMm) specs.push(`${row.sizeMm}mm`);
      if (row.sizeInch) specs.push(row.sizeInch);
      if (row.pressure) specs.push(row.pressure);
      if (row.schedule) specs.push(row.schedule);
      if (row.weightKg) specs.push(`${row.weightKg}kg`);
      if (row.capacity) specs.push(row.capacity);
      if (row.color) specs.push(row.color);
      if (row.extraSpecification) specs.push(row.extraSpecification);

      const specSuffix = specs.length > 0 ? ` (${specs.join(', ')})` : '';
      const displayName = `${row.brandName} ${row.productName}${specSuffix}`;

      // GST is standard row.gstPercent or default 18
      const gst = row.gstPercent !== undefined && row.gstPercent !== null ? row.gstPercent : 18.0;

      const rawProduct: Product = {
        Id: row.variantId,
        SKU: row.variantSku,
        CategoryId: row.categoryId,
        DisplayName: displayName,
        Barcode: row.variantBarcode || null,
        HSNCode: row.productCode,
        GST: gst,
        SellingPrice: row.sellingPrice || 0,
        Unit: row.unit,
        IsActive: 1,
        CreatedAt: new Date().toISOString(),
        BrandName: row.brandName,
        CategoryName: row.categoryName,
        SubCategoryName: row.subCategoryName || '',
        NormalizedSearchText: `${row.brandName} ${row.categoryName} ${row.subCategoryName || ''} ${row.productName} ${specs.join(' ')}`.toLowerCase()
      };

      const aliases: string[] = [];
      // Populate aliases for size inches
      if (row.sizeInch) {
        const cleanInch = row.sizeInch.toLowerCase().replace(/["']/g, '').trim();
        aliases.push(cleanInch);
        aliases.push(cleanInch + ' inch');
        
        if (cleanInch === '1/2' || cleanInch === '0.5') {
          aliases.push('half');
          aliases.push('half inch');
        } else if (cleanInch === '3/4' || cleanInch === '0.75') {
          aliases.push('three fourth');
          aliases.push('three quarter');
          aliases.push('quarter');
        } else if (cleanInch === '1 1/4' || cleanInch === '1-1/4' || cleanInch === '1.25') {
          aliases.push('one and quarter');
          aliases.push('quarter');
        } else if (cleanInch === '1 1/2' || cleanInch === '1-1/2' || cleanInch === '1.5') {
          aliases.push('one and half');
        } else if (cleanInch === '2 1/2' || cleanInch === '2-1/2' || cleanInch === '2.5') {
          aliases.push('two and half');
        }
      }

      // Add dynamic brand-specific aliases (Gujarati phonetic equivalents)
      if (row.brandName) {
        const bn = row.brandName.toLowerCase();
        if (bn === 'ashirvad') {
          aliases.push('આશીર્વાદ');
          aliases.push('ashirwad');
        } else if (bn === 'supreme') {
          aliases.push('સુપ્રીમ');
        } else if (bn === 'prince') {
          aliases.push('પ્રિન્સ');
        } else if (bn === 'gopi') {
          aliases.push('ગોપી');
        } else if (bn === 'deflex') {
          aliases.push('ડેફ્લેક્સ');
        }
      }

      // Add common Gujarati terms
      if (row.categoryName === 'PVC Pipe' || row.categoryName === 'UPVC Pipe' || row.categoryName === 'CPVC Pipe') {
        aliases.push('પાઇપ');
        aliases.push('પાણીની પાઇપ');
      }

      const searchKeywords = this.extractSearchKeywords(
        row.productName,
        row.variantSku,
        row.brandName,
        row.categoryName,
        row.unit,
        aliases,
        row.variantBarcode,
        row.sizeMm,
        row.sizeInch,
        row.weightKg,
        row.pressure,
        row.schedule,
        row.capacity
      );

      return {
        id: row.variantId,
        sku: row.variantSku,
        name: displayName,
        brand: row.brandName,
        category: row.categoryName,
        unit: row.unit,
        barcode: row.variantBarcode || null,
        price: row.sellingPrice || 0,
        aliases,
        searchKeywords,
        rawProduct
      };
    });

    this.isLoaded = true;
  }

  /**
   * Performs an in-memory search for product variants based on input text.
   */
  public async searchProducts(text: string): Promise<SearchResult> {
    if (!this.isLoaded) {
      await this.refreshCache();
    }

    const normalizedQuery = defaultNormalizer.normalize(text);
    if (!normalizedQuery) {
      return {
        products: [],
        bestMatch: null,
        confidence: 0,
        multipleMatches: false
      };
    }

    const queryTokens = defaultNormalizer.tokenize(text);

    // --- STAGE 3: Exact Alias Match ---
    const aliasMatches: SearchableProduct[] = [];
    for (const prod of this.searchableProducts) {
      for (const alias of prod.aliases) {
        if (alias === normalizedQuery) {
          aliasMatches.push(prod);
          break;
        }
      }
    }

    if (aliasMatches.length > 0) {
      const products = aliasMatches.map(p => p.rawProduct);
      return {
        products,
        bestMatch: products[0],
        confidence: 100,
        multipleMatches: products.length > 1
      };
    }

    // --- STAGE 4: Exact Product Name Match ---
    const nameMatches: SearchableProduct[] = [];
    for (const prod of this.searchableProducts) {
      const normName = defaultNormalizer.normalize(prod.name);
      if (normName === normalizedQuery) {
        nameMatches.push(prod);
      }
    }

    if (nameMatches.length > 0) {
      const products = nameMatches.map(p => p.rawProduct);
      return {
        products,
        bestMatch: products[0],
        confidence: 100,
        multipleMatches: products.length > 1
      };
    }

    // --- STAGES 5 - 8: Scoring & Ranking ---
    const context: ScoringContext = {
      query: text,
      normalizedQuery,
      queryTokens
    };

    interface ScoredItem {
      product: SearchableProduct;
      score: number;
      confidence: number;
    }

    const scoredItems: ScoredItem[] = [];

    for (const prod of this.searchableProducts) {
      let totalScore = 0;
      for (const processor of this.scoringProcessors) {
        const subScore = processor.score(prod, context);
        totalScore += subScore * processor.weight;
      }

      // Calculate confidence (percentage of matched tokens including fuzzy equivalents)
      let matchRatioSum = 0;
      for (const token of queryTokens) {
        if (prod.searchKeywords.includes(token)) {
          matchRatioSum += 1.0;
        } else {
          let maxSim = 0;
          for (const keyword of prod.searchKeywords) {
            // Avoid comparing numbers or single characters to keep fuzzy matching precise
            if (keyword.length <= 1 || /^\d+$/.test(keyword)) {
              continue;
            }
            const sim = levenshteinSimilarity(token, keyword);
            if (sim > maxSim) {
              maxSim = sim;
            }
          }
          if (maxSim >= 0.7) {
            matchRatioSum += maxSim * 0.8; // Scale fuzzy matches slightly down
          }
        }
      }

      let confidence = queryTokens.length > 0 ? (matchRatioSum / queryTokens.length) * 100 : 0;

      // Boosts for metadata alignment
      if (prod.brand && queryTokens.includes(prod.brand.toLowerCase().trim())) {
        confidence += 5;
      }
      if (prod.category && queryTokens.includes(prod.category.toLowerCase().trim())) {
        confidence += 5;
      }
      const normName = defaultNormalizer.normalize(prod.name);
      if (normName.includes(normalizedQuery)) {
        confidence += 10;
      }

      confidence = Math.min(100, Math.round(confidence));

      scoredItems.push({
        product: prod,
        score: totalScore,
        confidence
      });
    }

    // Sort descending by score, then by confidence
    scoredItems.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.confidence - a.confidence;
    });

    // --- STAGE 9: Return Results & Confidence Rules ---
    if (scoredItems.length === 0 || scoredItems[0].score === 0 || scoredItems[0].confidence < 60) {
      return {
        products: [],
        bestMatch: null,
        confidence: scoredItems.length > 0 ? scoredItems[0].confidence : 0,
        multipleMatches: false
      };
    }

    const topItem = scoredItems[0];
    let highestConfidence = topItem.confidence;

    // Check if there is a tie for the top score
    const hasTie = scoredItems.length > 1 && scoredItems[1].score === topItem.score;
    if (hasTie) {
      highestConfidence = Math.min(highestConfidence, 90);
    }

    if (highestConfidence > 90) {
      // High confidence -> return bestMatch only
      return {
        products: [topItem.product.rawProduct],
        bestMatch: topItem.product.rawProduct,
        confidence: highestConfidence,
        multipleMatches: false
      };
    } else {
      // Medium confidence (60-90) -> return top 5 suggestions
      const suggestions = scoredItems
        .filter(item => item.confidence >= 60 && item.score > 0)
        .slice(0, 5)
        .map(item => item.product.rawProduct);

      return {
        products: suggestions,
        bestMatch: null,
        confidence: highestConfidence,
        multipleMatches: suggestions.length > 1
      };
    }
  }

  /**
   * Registers a new custom scoring processor into the pipeline.
   */
  public registerProcessor(processor: ScoringProcessor): void {
    this.scoringProcessors.push(processor);
  }

  /**
   * Clears the current cache state. Useful during unit testing.
   */
  public clearCache(): void {
    this.searchableProducts = [];
    this.isLoaded = false;
  }

  /**
   * Compiles search keywords for a product, tokenizing its properties
   * and auto-extracting fractional dimensions/units.
   */
  private extractSearchKeywords(
    name: string,
    sku: string,
    brand: string,
    category: string,
    unit: string,
    aliases: string[],
    barcode: string | null,
    sizeMm?: number,
    sizeInch?: string,
    weightKg?: number,
    pressure?: string,
    schedule?: string,
    capacity?: string
  ): string[] {
    const keywordsSet = new Set<string>();

    const tokenizeAndAdd = (text: string) => {
      const tokens = defaultNormalizer.tokenize(text);
      for (const t of tokens) {
        keywordsSet.add(t);
        const match = t.match(/^(\d+)([a-zA-Z]+)$/);
        if (match) {
          keywordsSet.add(match[1]);
          keywordsSet.add(match[2]);
        }
      }
    };

    tokenizeAndAdd(name);
    tokenizeAndAdd(sku);
    tokenizeAndAdd(brand);
    tokenizeAndAdd(category);
    tokenizeAndAdd(unit);
    if (barcode) {
      keywordsSet.add(barcode.trim());
    }

    if (sizeMm) {
      keywordsSet.add(String(sizeMm));
      keywordsSet.add(`${sizeMm}mm`);
      keywordsSet.add(`${sizeMm} mm`);
    }

    if (sizeInch) {
      const cleanInch = sizeInch.toLowerCase().replace(/["']/g, '').trim();
      keywordsSet.add(cleanInch);
      keywordsSet.add(`${cleanInch} inch`);
      keywordsSet.add(`${cleanInch}"`);
    }

    if (weightKg) {
      keywordsSet.add(String(weightKg));
      keywordsSet.add(`${weightKg}kg`);
      keywordsSet.add(`${weightKg} kg`);
    }

    if (pressure) {
      tokenizeAndAdd(pressure);
    }

    if (schedule) {
      tokenizeAndAdd(schedule);
    }

    if (capacity) {
      tokenizeAndAdd(capacity);
    }

    for (const alias of aliases) {
      tokenizeAndAdd(alias);
    }

    return Array.from(keywordsSet);
  }
}
