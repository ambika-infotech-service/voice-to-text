import { Product } from '../../database/models/product.model';

/**
 * Represents the structured format of products stored in memory for optimal searching.
 */
export interface SearchableProduct {
  /** Map to SQLite Product.Id. */
  readonly id: number;
  /** Stock Keeping Unit code. */
  readonly sku: string;
  /** Clean product display name. */
  readonly name: string;
  /** Resolved brand name from product attributes. */
  readonly brand: string;
  /** Resolved category name. */
  readonly category: string;
  /** Unit of measurement (e.g. Mtr, Pcs). */
  readonly unit: string;
  /** Optional barcode value. */
  readonly barcode: string | null;
  /** Selling price of the product. */
  readonly price: number;
  /** Array of resolved alias keywords for the product's attributes. */
  readonly aliases: string[];
  /** Array of normalized keywords generated for indexing and matching. */
  readonly searchKeywords: string[];
  /** The original SQLite database product object. */
  readonly rawProduct: Product;
}

/**
 * Standard search engine result payload.
 */
export interface SearchResult {
  /** List of matched products. */
  products: Product[];
  /** The singular best matching product, if confidence is high. */
  bestMatch: Product | null;
  /** Search confidence score ranging from 0 to 100. */
  confidence: number;
  /** Indication of multiple distinct matching options. */
  multipleMatches: boolean;
}

/**
 * Extensible rule interface to transform search queries during the normalization phase.
 */
export interface NormalizationRule {
  readonly name: string;
  apply(text: string): string;
}

/**
 * Context payload passed to scoring processors containing query metadata.
 */
export interface ScoringContext {
  /** The original unprocessed input text. */
  readonly query: string;
  /** The normalized query text. */
  readonly normalizedQuery: string;
  /** The split tokens of the normalized query text. */
  readonly queryTokens: string[];
}

/**
 * Extensible interface representing a ranking scoring strategy.
 */
export interface ScoringProcessor {
  readonly name: string;
  readonly weight: number;
  /**
   * Calculates a match score for a product given a query context.
   * @param product The product being scored.
   * @param context The query context details.
   * @returns A numeric score >= 0.
   */
  score(product: SearchableProduct, context: ScoringContext): number;
}
