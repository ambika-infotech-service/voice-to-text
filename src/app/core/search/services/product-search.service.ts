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

  // Extensible scoring processor registry (Stage 11: Future Ready)
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
   * Loads all active products, their categories, brands, and aliases from SQLite,
   * compiles their in-memory keyword indexes, and caches them.
   * Only queries SQLite when explicitly triggered (e.g. on data updates).
   */
  public async refreshCache(): Promise<void> {
    await this.dbService.initialize();

    const sql = `
      SELECT 
        p.Id, 
        p.SKU, 
        p.DisplayName, 
        p.Barcode, 
        p.HSNCode, 
        p.GST, 
        p.SellingPrice, 
        p.Unit, 
        p.IsActive, 
        p.CreatedAt,
        p.CategoryId,
        c.Name as CategoryName,
        (
          SELECT av.DisplayValue 
          FROM ProductAttribute pa2
          JOIN AttributeValue av ON pa2.AttributeValueId = av.Id
          JOIN Attribute a ON av.AttributeId = a.Id
          WHERE pa2.ProductId = p.Id AND a.Name = 'Brand'
          LIMIT 1
        ) as BrandName,
        (
          SELECT GROUP_CONCAT(al.Keyword, '|')
          FROM ProductAttribute pa3
          JOIN Alias al ON pa3.AttributeValueId = al.AttributeValueId
          WHERE pa3.ProductId = p.Id
        ) as AliasesStr
      FROM Product p
      LEFT JOIN Category c ON p.CategoryId = c.Id
      WHERE p.IsActive = 1;
    `;

    const rows = await this.dbService.query<any>(sql);

    this.searchableProducts = rows.map(row => {
      const rawProduct: Product = {
        Id: row.Id,
        SKU: row.SKU,
        CategoryId: row.CategoryId,
        DisplayName: row.DisplayName,
        Barcode: row.Barcode,
        HSNCode: row.HSNCode,
        GST: row.GST,
        SellingPrice: row.SellingPrice,
        Unit: row.Unit,
        IsActive: row.IsActive,
        CreatedAt: row.CreatedAt
      };

      const name = row.DisplayName;
      const sku = row.SKU;
      const brand = row.BrandName ?? '';
      const category = row.CategoryName ?? '';
      const unit = row.Unit;
      const barcode = row.Barcode ?? null;
      const aliases = row.AliasesStr
        ? row.AliasesStr.split('|').map((a: string) => defaultNormalizer.normalize(a))
        : [];

      const searchKeywords = this.extractSearchKeywords(
        name,
        sku,
        brand,
        category,
        unit,
        aliases,
        barcode
      );

      return {
        id: row.Id,
        sku,
        name,
        brand,
        category,
        unit,
        barcode,
        price: row.SellingPrice,
        aliases,
        searchKeywords,
        rawProduct
      };
    });

    this.isLoaded = true;
  }

  /**
   * Performs an intelligent in-memory search for products based on input text.
   * @param text Speech or typed text search query.
   * @returns SearchResult encapsulating products, bestMatch, confidence, and matches flags.
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
    // If no keywords matched or the top result's confidence is low, return empty
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

    // Check if there is a tie for the top score (indicating multiple matching products)
    const hasTie = scoredItems.length > 1 && scoredItems[1].score === topItem.score;
    if (hasTie) {
      // If there is an equal tie, cap the confidence to force suggestions rather than returning a single bestMatch
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
   * Allows third-party modules to easily plug in strategies like AI-based, recent sales, etc.
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
   * and auto-extracting fractional dimensions/units (e.g. "20l" -> "20", "l").
   */
  private extractSearchKeywords(
    name: string,
    sku: string,
    brand: string,
    category: string,
    unit: string,
    aliases: string[],
    barcode: string | null
  ): string[] {
    const keywordsSet = new Set<string>();

    const tokenizeAndAdd = (text: string) => {
      const tokens = defaultNormalizer.tokenize(text);
      for (const t of tokens) {
        keywordsSet.add(t);
        // Extract combinations (e.g., "20l" -> "20" and "l", "6kg" -> "6" and "kg")
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

    for (const alias of aliases) {
      tokenizeAndAdd(alias);
    }

    return Array.from(keywordsSet);
  }
}
