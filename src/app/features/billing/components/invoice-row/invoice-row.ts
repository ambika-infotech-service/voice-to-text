import { Component, input, output, signal, computed } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Product } from '../../../../core/database/models/product.model';

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

  // Full list of available products in the store database for autocomplete lookup
  public readonly availableProducts = input<Product[]>([]);

  // Emits the index to be deleted
  public readonly deleteRow = output<number>();

  // Search autocomplete UI state
  protected readonly searchQuery = signal('');
  protected readonly showDropdown = signal(false);

  // Reactively filters products list based on the search query input matching displayName or SKU
  protected readonly filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];
    
    return this.availableProducts().filter(prod =>
      prod.DisplayName.toLowerCase().includes(query) ||
      prod.SKU.toLowerCase().includes(query)
    );
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
