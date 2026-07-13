import { Component, input, output, signal, computed, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Product } from '../../../../core/database/models/product.model';
import { CalculationService } from '../../services/calculation.service';

/**
 * Reusable table row component representing a single invoice line item.
 * Fits within standard <tbody> tables without breaking semantic HTML structure.
 */
@Component({
  selector: '[app-invoice-row]',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './invoice-row.html',
  styleUrl: './invoice-row.scss'
})
export class InvoiceRow {
  // Input FormGroup representing this specific invoice item
  public readonly itemGroup = input.required<FormGroup>();
  
  // Index of this row inside the parent FormArray
  public readonly index = input.required<number>();

  // Full list of available products in the store database for autocomplete lookup (with synonym keywords)
  public readonly availableProducts = input<any[]>([]);

  // True if voice recognition is currently listening for input on this specific row
  public readonly isCurrentlyListening = input<boolean>(false);

  // Emits when the user clicks the microphone toggle button
  public readonly triggerMic = output<void>();

  // Emits the index to be deleted
  public readonly deleteRow = output<number>();

  private readonly calcService = inject(CalculationService);

  // Search autocomplete UI state
  protected readonly searchQuery = signal('');
  protected readonly showDropdown = signal(false);

  // Reactively filters products list using fuzzy Levenshtein scores on names, SKUs and synonyms
  protected readonly filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];
    
    const scored = this.availableProducts().map(prod => {
      // 1. Calculate similarity against product Display Name
      let maxScore = this.calcService.getFuzzySimilarity(query, prod.DisplayName || '');

      // 2. Calculate similarity against product SKU
      const skuScore = this.calcService.getFuzzySimilarity(query, prod.SKU || '');
      if (skuScore > maxScore) maxScore = skuScore;

      // 3. Calculate similarity against synonym search aliases
      if (prod.keywords && Array.isArray(prod.keywords)) {
        for (const kw of prod.keywords) {
          const kwScore = this.calcService.getFuzzySimilarity(query, kw);
          if (kwScore > maxScore) maxScore = kwScore;
        }
      }

      return { prod, score: maxScore };
    });

    // Filter by threshold (keeps similarity > 0.45) and sorts by best match descending
    return scored
      .filter(item => item.score > 0.45)
      .sort((a, b) => b.score - a.score)
      .map(item => item.prod);
  });

  protected onDelete(): void {
    this.deleteRow.emit(this.index());
  }

  protected onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.showDropdown.set(true);
  }

  protected onFocus(): void {
    // If input already has text, show matching options when focused
    const val = this.itemGroup().get('itemName')?.value || '';
    this.searchQuery.set(val);
    this.showDropdown.set(true);
  }

  protected onBlur(): void {
    // Small timeout to allow mousedown events on the dropdown options to register
    setTimeout(() => {
      this.showDropdown.set(false);
    }, 200);
  }

  protected selectProduct(prod: Product): void {
    this.itemGroup().patchValue({
      itemName: prod.DisplayName,
      unit: prod.Unit,
      rate: prod.SellingPrice
    });
    this.showDropdown.set(false);
  }
}
