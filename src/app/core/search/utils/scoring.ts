import { ScoringProcessor, ScoringContext, SearchableProduct } from '../models/search.model';
import { levenshteinSimilarity } from './levenshtein';

/**
 * Processor scoring an exact match of the normalized query string against the product's display name.
 */
export class ExactNameScoringProcessor implements ScoringProcessor {
  public readonly name = 'ExactName';
  public readonly weight = 1.0;

  public score(product: SearchableProduct, context: ScoringContext): number {
    const normName = product.name.toLowerCase().trim();
    return normName === context.normalizedQuery ? 1000 : 0;
  }
}

/**
 * Processor scoring an exact match of the normalized query string against any of the product's aliases.
 */
export class ExactAliasScoringProcessor implements ScoringProcessor {
  public readonly name = 'ExactAlias';
  public readonly weight = 1.0;

  public score(product: SearchableProduct, context: ScoringContext): number {
    for (const alias of product.aliases) {
      if (alias.toLowerCase().trim() === context.normalizedQuery) {
        return 900;
      }
    }
    return 0;
  }
}

/**
 * Processor scoring products based on how many individual query tokens match the product's keyword index.
 */
export class KeywordMatchScoringProcessor implements ScoringProcessor {
  public readonly name = 'KeywordMatch';
  public readonly weight = 10.0;

  public score(product: SearchableProduct, context: ScoringContext): number {
    let matchCount = 0;
    for (const token of context.queryTokens) {
      if (product.searchKeywords.includes(token)) {
        matchCount++;
      }
    }
    return matchCount;
  }
}

/**
 * Processor scoring a match between query tokens and the product's brand.
 */
export class BrandMatchScoringProcessor implements ScoringProcessor {
  public readonly name = 'BrandMatch';
  public readonly weight = 15.0;

  public score(product: SearchableProduct, context: ScoringContext): number {
    if (!product.brand) return 0;
    const normBrand = product.brand.toLowerCase().trim();
    let matches = 0;
    for (const token of context.queryTokens) {
      if (normBrand === token || normBrand.includes(token)) {
        matches++;
      }
    }
    return matches;
  }
}

/**
 * Processor scoring a match between query tokens and the product's category.
 */
export class CategoryMatchScoringProcessor implements ScoringProcessor {
  public readonly name = 'CategoryMatch';
  public readonly weight = 10.0;

  public score(product: SearchableProduct, context: ScoringContext): number {
    if (!product.category) return 0;
    const normCat = product.category.toLowerCase().trim();
    let matches = 0;
    for (const token of context.queryTokens) {
      if (normCat === token || normCat.includes(token)) {
        matches++;
      }
    }
    return matches;
  }
}

/**
 * Processor calculating fuzzy similarity using Levenshtein distance for words with minor typos.
 */
export class FuzzyMatchScoringProcessor implements ScoringProcessor {
  public readonly name = 'FuzzyMatch';
  public readonly weight = 8.0;

  public score(product: SearchableProduct, context: ScoringContext): number {
    let fuzzyScore = 0;
    for (const token of context.queryTokens) {
      // If there is an exact keyword match, let KeywordMatch handle it
      if (product.searchKeywords.includes(token)) {
        continue;
      }
      
      let maxSim = 0;
      for (const keyword of product.searchKeywords) {
        // Skip comparing single-character keywords or numbers to prevent noisy fuzzy hits
        if (keyword.length <= 1 || /^\d+$/.test(keyword)) {
          continue;
        }
        const sim = levenshteinSimilarity(token, keyword);
        if (sim > maxSim) {
          maxSim = sim;
        }
      }
      // Apply fuzzy match if similarity matches or exceeds the threshold
      if (maxSim >= 0.7) {
        fuzzyScore += maxSim;
      }
    }
    return fuzzyScore;
  }
}

/**
 * Processor scoring whether the normalized query string is a substring of the product's display name.
 */
export class SubstringMatchScoringProcessor implements ScoringProcessor {
  public readonly name = 'SubstringMatch';
  public readonly weight = 5.0;

  public score(product: SearchableProduct, context: ScoringContext): number {
    const normName = product.name.toLowerCase().trim();
    return normName.includes(context.normalizedQuery) ? 1 : 0;
  }
}
