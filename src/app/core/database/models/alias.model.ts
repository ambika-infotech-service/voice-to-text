/**
 * Represents a search alias keyword linked to an attribute value (supporting multilingual synonyms).
 */
export interface Alias {
  /** Unique primary key identifier. */
  readonly Id?: number;
  /** Foreign key mapping to AttributeValue.Id. */
  readonly AttributeValueId: number;
  /** Synonym keyword string (e.g., '1"', 'સુપ્રીમ'). */
  readonly Keyword: string;
}
