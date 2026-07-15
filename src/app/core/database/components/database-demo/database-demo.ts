import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService } from '../../database';
import { CategoryRepository } from '../../repositories/category';
import { ProductRepository } from '../../repositories/product';
import { Category } from '../../models/category.model';
import { Product } from '../../models/product.model';

/**
 * Component providing a comprehensive tabbed CRUD dashboard to inspect
 * and manage Category, SubCategory, Brand, Product, and Variant records.
 */
@Component({
  selector: 'app-database-demo',
  imports: [ReactiveFormsModule],
  templateUrl: './database-demo.html',
  styleUrl: './database-demo.scss',
})
export class DatabaseDemo implements OnInit {
  private readonly dbService = inject(DatabaseService);
  private readonly categoryRepo = inject(CategoryRepository);
  private readonly productRepo = inject(ProductRepository);
  private readonly fb = inject(FormBuilder);

  // Active navigation tab
  protected readonly activeCrudTab = signal<'products' | 'categories' | 'subcategories' | 'brands'>('products');

  // Database lists state
  protected readonly categories = signal<Category[]>([]);
  protected readonly subCategories = signal<any[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly brands = signal<any[]>([]);

  // Product search and filter state
  protected readonly productSearchQuery = signal<string>('');
  protected readonly selectedCategoryFilter = signal<string>('');
  protected readonly selectedBrandFilter = signal<string>('');
  protected readonly selectedSubCategoryFilter = signal<string>('');

  protected readonly filteredProducts = computed(() => {
    const query = this.productSearchQuery().toLowerCase().trim();
    const catFilter = this.selectedCategoryFilter();
    const brandFilter = this.selectedBrandFilter();
    const subCatFilter = this.selectedSubCategoryFilter();
    let list = this.products();

    if (catFilter) {
      list = list.filter(p => p.CategoryId === Number(catFilter));
    }
    if (brandFilter) {
      list = list.filter(p => p.BrandId === Number(brandFilter));
    }
    if (subCatFilter) {
      list = list.filter(p => p.SubCategoryId === Number(subCatFilter));
    }

    if (!query) return list;
    return list.filter(p =>
      p.SKU.toLowerCase().includes(query) ||
      p.DisplayName.toLowerCase().includes(query)
    );
  });

  // Selected entities details
  protected readonly selectedProductId = signal<number | null>(null);
  protected readonly selectedProductDetails = signal<{
    product: Product;
    attributes: Array<{ attributeName: string; displayValue: string }>;
  } | null>(null);

  // Edit mode state
  protected readonly isEditingProduct = signal(false);
  protected readonly isEditingCategory = signal(false);

  // Form Groups
  protected categoryForm!: FormGroup;
  protected editCategoryForm!: FormGroup;
  protected subCategoryForm!: FormGroup;
  protected brandForm!: FormGroup;
  protected productForm!: FormGroup;
  protected editProductForm!: FormGroup;

  public ngOnInit(): void {
    this.initializeForms();
    this.loadAllData();
  }

  private initializeForms(): void {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.editCategoryForm = this.fb.group({
      id: [null, Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.subCategoryForm = this.fb.group({
      categoryId: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.brandForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.productForm = this.fb.group({
      sku: ['', [Validators.required, Validators.minLength(3)]],
      categoryId: ['', Validators.required],
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      barcode: [''],
      hsnCode: [''],
      gst: [18.0, [Validators.required, Validators.min(0)]],
      sellingPrice: [0, [Validators.required, Validators.min(0)]],
      unit: ['Pcs', Validators.required]
    });

    this.editProductForm = this.fb.group({
      id: [null, Validators.required],
      sku: ['', [Validators.required, Validators.minLength(3)]],
      categoryId: ['', Validators.required],
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      barcode: [''],
      hsnCode: [''],
      gst: [18.0, [Validators.required, Validators.min(0)]],
      sellingPrice: [0, [Validators.required, Validators.min(0)]],
      unit: ['', Validators.required]
    });
  }

  protected async loadAllData(): Promise<void> {
    try {
      const cats = await this.categoryRepo.getAll();
      this.categories.set(cats);

      const prods = await this.productRepo.getAll();
      this.products.set(prods);

      const subcatsList = await this.dbService.query<any>(`
        SELECT sc.id, sc.name, sc.categoryId, c.name as categoryName, sc.createdAt
        FROM SubCategory sc
        JOIN Category c ON sc.categoryId = c.id
        ORDER BY sc.name;
      `);
      this.subCategories.set(subcatsList);

      const brandsList = await this.dbService.query<any>(`
        SELECT * FROM Brand ORDER BY name;
      `);
      this.brands.set(brandsList);

      // Load product details
      const selectedProd = this.selectedProductId();
      if (selectedProd !== null) {
        const details = await this.productRepo.getProductWithAttributes(selectedProd);
        this.selectedProductDetails.set(details);
      } else {
        this.selectedProductDetails.set(null);
      }
    } catch (err) {
      console.error('Error querying database data', err);
    }
  }

  // --- TAB TOGGLE ---
  protected switchTab(tab: 'products' | 'categories' | 'subcategories' | 'brands'): void {
    this.activeCrudTab.set(tab);
    this.loadAllData();
  }

  // --- CATEGORY CRUD ---
  protected async addCategory(): Promise<void> {
    if (this.categoryForm.invalid) return;

    try {
      const formValue = this.categoryForm.value;
      await this.categoryRepo.insert({
        name: formValue.name,
        isActive: 1,
        createdAt: new Date().toISOString()
      });
      this.categoryForm.reset();
      await this.loadAllData();
    } catch (err: unknown) {
      console.error('Add Category failed', err);
      alert('Error inserting category: Check console logs.');
    }
  }

  protected async deleteCategory(id: number): Promise<void> {
    try {
      await this.categoryRepo.delete(id);
      await this.loadAllData();
    } catch (err) {
      console.error(err);
      alert('Cannot delete category. Check foreign key constraints.');
    }
  }

  protected startEditCategory(cat: Category): void {
    if (cat.id === undefined) return;
    this.editCategoryForm.setValue({
      id: cat.id,
      name: cat.name
    });
    this.isEditingCategory.set(true);
  }

  protected cancelEditCategory(): void {
    this.isEditingCategory.set(false);
    this.editCategoryForm.reset();
  }

  protected async updateCategory(): Promise<void> {
    if (this.editCategoryForm.invalid) return;

    try {
      const val = this.editCategoryForm.value;
      const category: Category = {
        id: Number(val.id),
        name: val.name,
        isActive: 1,
        createdAt: new Date().toISOString()
      };
      await this.categoryRepo.update(category);
      this.cancelEditCategory();
      await this.loadAllData();
    } catch (err) {
      console.error('Failed to update category name', err);
      alert('Failed to update category name. Check for duplicate names.');
    }
  }

  // --- SUBCATEGORY CRUD ---
  protected async addSubCategory(): Promise<void> {
    if (this.subCategoryForm.invalid) return;

    try {
      const val = this.subCategoryForm.value;
      const now = new Date().toISOString();
      await this.dbService.run(
        `INSERT INTO SubCategory (categoryId, name, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?);`,
        [Number(val.categoryId), val.name, 1, now, now]
      );
      this.subCategoryForm.reset({ categoryId: '' });
      await this.loadAllData();
    } catch (err) {
      console.error('Add SubCategory failed', err);
      alert('Error inserting subcategory.');
    }
  }

  protected async deleteSubCategory(id: number): Promise<void> {
    try {
      await this.dbService.run('DELETE FROM SubCategory WHERE id = ?;', [id]);
      await this.loadAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete subcategory.');
    }
  }

  // --- BRAND CRUD ---
  protected async addBrand(): Promise<void> {
    if (this.brandForm.invalid) return;

    try {
      const val = this.brandForm.value;
      const now = new Date().toISOString();
      await this.dbService.run(
        `INSERT INTO Brand (name, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?);`,
        [val.name, 1, now, now]
      );
      this.brandForm.reset();
      await this.loadAllData();
    } catch (err) {
      console.error('Add Brand failed', err);
      alert('Error inserting brand (duplicate name is likely).');
    }
  }

  protected async deleteBrand(id: number): Promise<void> {
    try {
      await this.dbService.run('DELETE FROM Brand WHERE id = ?;', [id]);
      await this.loadAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete brand.');
    }
  }

  // --- PRODUCT CRUD ---
  protected async addProduct(): Promise<void> {
    if (this.productForm.invalid) return;

    try {
      const formValue = this.productForm.value;
      const product: Product = {
        SKU: formValue.sku,
        CategoryId: Number(formValue.categoryId),
        DisplayName: formValue.displayName,
        Barcode: formValue.barcode || null,
        HSNCode: formValue.hsnCode || null,
        GST: Number(formValue.gst),
        SellingPrice: Number(formValue.sellingPrice),
        Unit: formValue.unit,
        IsActive: 1,
        CreatedAt: new Date().toISOString()
      };

      await this.productRepo.insert(product);
      this.productForm.reset({ gst: 18.0, unit: 'Pcs', categoryId: '' });
      await this.loadAllData();
    } catch (err) {
      console.error(err);
      alert('Insert Product failed. SKU is likely duplicated.');
    }
  }

  protected async deleteProduct(id: number): Promise<void> {
    try {
      await this.productRepo.delete(id);
      if (this.selectedProductId() === id) {
        this.selectedProductId.set(null);
      }
      await this.loadAllData();
    } catch (err) {
      console.error(err);
    }
  }

  protected async selectProduct(id: number): Promise<void> {
    this.selectedProductId.set(id);
    await this.loadAllData();
  }

  protected async startEditProduct(prod: Product): Promise<void> {
    if (prod.Id === undefined) return;

    this.editProductForm.setValue({
      id: prod.Id,
      sku: prod.SKU,
      categoryId: prod.CategoryId,
      displayName: prod.DisplayName,
      barcode: prod.Barcode || '',
      hsnCode: prod.HSNCode || '',
      gst: prod.GST,
      sellingPrice: prod.SellingPrice,
      unit: prod.Unit
    });
    this.isEditingProduct.set(true);
  }

  protected cancelEditProduct(): void {
    this.isEditingProduct.set(false);
    this.editProductForm.reset();
  }

  protected async updateProduct(): Promise<void> {
    if (this.editProductForm.invalid) return;

    try {
      const val = this.editProductForm.value;
      const product: Product = {
        Id: Number(val.id),
        SKU: val.sku,
        CategoryId: Number(val.categoryId),
        DisplayName: val.displayName,
        Barcode: val.barcode || null,
        HSNCode: val.hsnCode || null,
        GST: Number(val.gst),
        SellingPrice: Number(val.sellingPrice),
        Unit: val.unit,
        IsActive: 1,
        CreatedAt: new Date().toISOString()
      };

      await this.productRepo.update(product);
      this.cancelEditProduct();
      await this.loadAllData();
    } catch (err) {
      console.error('Failed to update product details', err);
      alert('Failed to update product details. SKU is likely duplicated.');
    }
  }

  protected updateProductSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.productSearchQuery.set(value);
  }
}
