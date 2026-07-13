import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService } from '../../database';
import { CategoryRepository } from '../../repositories/category';
import { ProductRepository } from '../../repositories/product';
import { AttributeRepository } from '../../repositories/attribute';
import { AliasRepository } from '../../repositories/alias';
import { Category } from '../../models/category.model';
import { Product } from '../../models/product.model';
import { Attribute } from '../../models/attribute.model';
import { AttributeValue } from '../../models/attribute-value.model';

/**
 * Component providing a comprehensive tabbed CRUD dashboard to inspect
 * and manage Category, Product, Attribute, AttributeValue, and Alias records.
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
  private readonly attributeRepo = inject(AttributeRepository);
  private readonly aliasRepo = inject(AliasRepository);
  private readonly fb = inject(FormBuilder);

  // Active navigation tab
  protected readonly activeCrudTab = signal<'products' | 'categories' | 'attributes' | 'aliases'>('products');

  // Database lists state
  protected readonly categories = signal<Category[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly attributes = signal<Attribute[]>([]);
  protected readonly attributeValues = signal<AttributeValue[]>([]);
  protected readonly aliases = signal<any[]>([]); // Joined list of aliases

  // Selected entities details
  protected readonly selectedProductId = signal<number | null>(null);
  protected readonly selectedProductDetails = signal<{
    product: Product;
    attributes: Array<{ attributeName: string; displayValue: string }>;
  } | null>(null);

  protected readonly selectedAttributeId = signal<number | null>(null);

  // Form Groups
  protected categoryForm!: FormGroup;
  protected productForm!: FormGroup;
  protected attributeForm!: FormGroup;
  protected attributeValueForm!: FormGroup;
  protected aliasForm!: FormGroup;

  // Track selection of attributes mapping in product creation
  protected readonly selectedMappingValues = signal<number[]>([]);
  // Cached list of all attribute values for product mapping dropdowns
  protected readonly allAvailableAttributeValues = signal<any[]>([]);

  public ngOnInit(): void {
    this.initializeForms();
    this.loadAllData();
  }

  private initializeForms(): void {
    this.categoryForm = this.fb.group({
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

    this.attributeForm = this.fb.group({
      name: ['', Validators.required],
      dataType: ['TEXT', Validators.required]
    });

    this.attributeValueForm = this.fb.group({
      displayValue: ['', Validators.required]
    });

    this.aliasForm = this.fb.group({
      attributeValueId: ['', Validators.required],
      keyword: ['', Validators.required]
    });
  }

  protected async loadAllData(): Promise<void> {
    try {
      const cats = await this.categoryRepo.getAll();
      this.categories.set(cats);

      const prods = await this.productRepo.getAll();
      this.products.set(prods);

      const attrs = await this.attributeRepo.getAll();
      this.attributes.set(attrs);

      // Join alias with values and attributes to list synonym configurations
      const aliasesList = await this.dbService.query<any>(`
        SELECT al.Id, al.Keyword, av.DisplayValue as valueName, a.Name as attributeName
        FROM Alias al
        JOIN AttributeValue av ON al.AttributeValueId = av.Id
        JOIN Attribute a ON av.AttributeId = a.Id
        ORDER BY a.Name, av.DisplayValue;
      `);
      this.aliases.set(aliasesList);

      // Populate flat list of all attribute value combinations for product creation selection
      const allVals = await this.dbService.query<any>(`
        SELECT av.Id, av.DisplayValue, a.Name as attributeName
        FROM AttributeValue av
        JOIN Attribute a ON av.AttributeId = a.Id
        ORDER BY a.Name, av.DisplayValue;
      `);
      this.allAvailableAttributeValues.set(allVals);

      // Load values if attribute is selected
      const selectedAttr = this.selectedAttributeId();
      if (selectedAttr !== null) {
        const vals = await this.attributeRepo.getAttributeValues(selectedAttr);
        this.attributeValues.set(vals);
      }

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
  protected switchTab(tab: 'products' | 'categories' | 'attributes' | 'aliases'): void {
    this.activeCrudTab.set(tab);
    this.loadAllData();
  }

  // --- CATEGORY CRUD ---
  protected async addCategory(): Promise<void> {
    if (this.categoryForm.invalid) return;

    try {
      const formValue = this.categoryForm.value;
      await this.categoryRepo.insert({
        Name: formValue.name,
        IsActive: 1,
        CreatedAt: new Date().toISOString()
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

      await this.productRepo.insert(product, this.selectedMappingValues());
      this.productForm.reset({ gst: 18.0, unit: 'Pcs' });
      this.selectedMappingValues.set([]);
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

  protected toggleAttributeValueMapping(valId: number): void {
    const current = this.selectedMappingValues();
    if (current.includes(valId)) {
      this.selectedMappingValues.set(current.filter(id => id !== valId));
    } else {
      this.selectedMappingValues.set([...current, valId]);
    }
  }

  // --- ATTRIBUTE CRUD ---
  protected async addAttribute(): Promise<void> {
    if (this.attributeForm.invalid) return;

    try {
      const val = this.attributeForm.value;
      await this.attributeRepo.insertAttribute({
        Name: val.name,
        DataType: val.dataType,
        IsActive: 1
      });
      this.attributeForm.reset({ dataType: 'TEXT' });
      await this.loadAllData();
    } catch (err) {
      console.error(err);
      alert('Attribute insertion failed (likely name duplicated).');
    }
  }

  protected async selectAttribute(id: number): Promise<void> {
    this.selectedAttributeId.set(id);
    await this.loadAllData();
  }

  protected async addAttributeValue(): Promise<void> {
    const attrId = this.selectedAttributeId();
    if (attrId === null || this.attributeValueForm.invalid) return;

    try {
      const val = this.attributeValueForm.value;
      const normVal = val.displayValue.toLowerCase().trim();
      await this.attributeRepo.insertAttributeValue(attrId, val.displayValue, normVal);
      this.attributeValueForm.reset();
      await this.loadAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to insert value (value might already exist).');
    }
  }

  // --- ALIAS CRUD ---
  protected async addAlias(): Promise<void> {
    if (this.aliasForm.invalid) return;

    try {
      const val = this.aliasForm.value;
      await this.aliasRepo.insert({
        AttributeValueId: Number(val.attributeValueId),
        Keyword: val.keyword
      });
      this.aliasForm.reset();
      await this.loadAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to insert alias synonym.');
    }
  }

  protected async deleteAlias(id: number): Promise<void> {
    try {
      await this.dbService.run('DELETE FROM Alias WHERE Id = ?;', [id]);
      await this.loadAllData();
    } catch (err) {
      console.error(err);
    }
  }
}
