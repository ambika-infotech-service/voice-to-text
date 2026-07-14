import { NormalizationRule } from '../models/search.model';

/**
 * Converts text input to lowercase.
 */
export class LowercaseRule implements NormalizationRule {
  public readonly name = 'Lowercase';

  public apply(text: string): string {
    return text.toLowerCase();
  }
}

/**
 * Replaces punctuation marks and symbols with spaces to prevent word gluing
 * while preserving multi-lingual alphanumeric characters (e.g. Gujarati, Hindi).
 */
export class PunctuationRule implements NormalizationRule {
  public readonly name = 'Punctuation';

  public apply(text: string): string {
    // Uses Unicode property escapes: \p{P} matches punctuation, \p{S} matches symbols.
    // Preserves numbers, English letters, and letters from other alphabets.
    return text.replace(/[\p{P}\p{S}]/gu, ' ');
  }
}

/**
 * Normalizes units of measurements, numerical quantities, and words commonly found in queries.
 */
export class UnitSynonymsRule implements NormalizationRule {
  public readonly name = 'UnitSynonyms';

  public apply(text: string): string {
    let result = text;

    // 1. Normalize number word "twenty" to match the painting standard "20l"
    result = result.replace(/\b(twenty)\b/g, '20l');

    // 2. Normalize quantity and unit combos (e.g. "20 litre", "20 ltr", "20 l" -> "20l")
    result = result.replace(/\b(\d+)\s*(litre|liter|ltr|l)\b/g, '$1l');
    result = result.replace(/\b(\d+)\s*(kilogram|kgs|kg)\b/g, '$1kg');
    result = result.replace(/\b(\d+)\s*(pieces|piece|pcs)\b/g, '$1pcs');

    // 3. Normalize units standalone (e.g. "litre" -> "l", "kilogram" -> "kg")
    result = result.replace(/\b(litre|liter|ltr)\b/g, 'l');
    result = result.replace(/\b(kilogram|kgs)\b/g, 'kg');
    result = result.replace(/\b(pieces|piece)\b/g, 'pcs');

    return result;
  }
}

/**
 * Collapses duplicate spaces and trims whitespace from the ends.
 */
export class WhitespaceRule implements NormalizationRule {
  public readonly name = 'Whitespace';

  public apply(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }
}

/**
 * Pipeline manager to apply a series of normalization rules sequentially.
 */
export class Normalizer {
  private readonly rules: NormalizationRule[];

  constructor(customRules?: NormalizationRule[]) {
    this.rules = customRules ?? [
      new LowercaseRule(),
      new PunctuationRule(),
      new UnitSynonymsRule(),
      new WhitespaceRule()
    ];
  }

  /**
   * Transforms the input text by executing each rule in the pipeline.
   * @param text The raw input string.
   * @returns The normalized string.
   */
  public normalize(text: string): string {
    if (!text) return '';
    let current = text;
    for (const rule of this.rules) {
      current = rule.apply(current);
    }
    return current;
  }

  /**
   * Normalizes the text and splits it into space-delimited tokens.
   * @param text The raw input string.
   * @returns An array of token strings.
   */
  public tokenize(text: string): string[] {
    const normalized = this.normalize(text);
    return normalized ? normalized.split(' ').filter(token => token.length > 0) : [];
  }
}

/**
 * Singleton instance of the default normalizer for ease of use across the application.
 */
export const defaultNormalizer = new Normalizer();
