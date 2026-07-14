import { Component, input, output, signal, inject, OnInit, effect } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Product } from '../../../../core/database/models/product.model';
import { CalculationService } from '../../services/calculation.service';
import { ProductSearchService } from '../../../../core/search/services/product-search.service';

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
export class InvoiceRow implements OnInit {
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
  private readonly searchService = inject(ProductSearchService);

  // Search autocomplete UI state
  protected readonly searchQuery = signal('');
  protected readonly showDropdown = signal(false);
  protected readonly filteredProducts = signal<Product[]>([]);

  constructor() {
    effect(async () => {
      const query = this.searchQuery();
      if (!query.trim()) {
        this.filteredProducts.set([]);
        return;
      }
      try {
        const result = await this.searchService.searchProducts(query);
        this.filteredProducts.set(result.products);
      } catch (err) {
        console.error('Search failed:', err);
      }
    });
  }

  public ngOnInit(): void {
    const nameControl = this.itemGroup().get('itemName');
    if (nameControl) {
      nameControl.valueChanges.subscribe(val => {
        const query = (val || '').trim();
        this.searchQuery.set(query);

        if (query) {
          const isExactProduct = this.availableProducts().some(p => p.DisplayName === query);
          if (!isExactProduct) {
            this.showDropdown.set(true);
          } else {
            this.showDropdown.set(false);
          }
        } else {
          this.showDropdown.set(false);
        }
      });
    }
  }

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
