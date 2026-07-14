# Database Schema, Migrations & Seeds

This document catalogs the SQLite database tables, structural columns, indexes, foreign key constraints, migration history (V1 to V3), and the default seed records.

---

## 🗄️ Database Tables Schema

The application database is structured as follows:

```mermaid
erDiagram
  Category ||--o{ Product : "contains"
  Product ||--o{ ProductAttribute : "described by"
  Attribute ||--o{ AttributeValue : "has options"
  AttributeValue ||--o{ ProductAttribute : "links"
  AttributeValue ||--o{ Alias : "aliased by"

  customers ||--o{ customer_contacts : "employs"
  business_contacts ||--o{ business_contact_role_map : "assigned"
  contact_roles ||--o{ business_contact_role_map : "defines"

  Category {
    int Id PK
    string Name
    int IsActive
    string CreatedAt
  }
  Product {
    int Id PK
    string SKU
    int CategoryId FK
    string DisplayName
    string Barcode
    string HSNCode
    real GST
    real SellingPrice
    string Unit
    int IsActive
    string CreatedAt
  }
  Attribute {
    int Id PK
    string Name
    string DataType
    int IsActive
  }
  AttributeValue {
    int Id PK
    int AttributeId FK
    string DisplayValue
    string NormalizedValue
  }
  ProductAttribute {
    int ProductId PK-FK
    int AttributeValueId PK-FK
  }
  Alias {
    int Id PK
    int AttributeValueId FK
    string Keyword
  }
  customers {
    int id PK
    string company_name
    string customer_name
    string mobile
    string email
    string gst_number
    string address
    string city
    string state
    string pincode
    string notes
    string created_at
    string updated_at
  }
  customer_contacts {
    int id PK
    int customer_id FK
    string contact_name
    string mobile
    string designation
    string notes
    string created_at
    string updated_at
  }
  business_contacts {
    int id PK
    string name
    string mobile
    string alternate_mobile
    string email
    string address
    string city
    string state
    string pincode
    string notes
    int is_active
    string created_at
    string updated_at
  }
  contact_roles {
    int id PK
    string role_name
    int display_order
    int is_active
    string created_at
    string updated_at
  }
  business_contact_role_map {
    int id PK
    int contact_id FK
    int role_id FK
    string created_at
  }
```

---

## 🚀 Performance Indexes

The schema contains targeted index fields to optimize search queries and joins:

*   `idx_product_sku` on `Product(SKU)` - Speed up inventory SKU lookups.
*   `idx_product_category` on `Product(CategoryId)` - Optimize category classification queries.
*   `idx_alias_keyword` on `Alias(Keyword)` - Optimizes fast-path matches in search engines.
*   `idx_attribute_value_attr` on `AttributeValue(AttributeId)` - Speeds up product specifications joins.
*   `idx_customers_name` on `customers(customer_name)` - Autocomplete index.
*   `idx_customers_company` on `customers(company_name)` - Autocomplete index.
*   `idx_customers_mobile` on `customers(mobile)` - Faster profile lookup.
*   `idx_customer_contacts_customer` on `customer_contacts(customer_id)` - Optimize sub-worker list queries.

---

## 📈 Migrations History

SQLite databases are migrated sequentially using raw SQL statements inside the connection manager service:

### Migration V1: Base Schema
*   **Target Version:** `1`
*   **Definition File:** [`migration-v1.ts`](file:///Users/smitpatel/Desktop/Personal%20Projects/voice-to-text/src/app/core/database/migrations/migration-v1.ts)
*   **Changes:** Created initial ERP product matrices including `Category`, `Product`, `Attribute`, `AttributeValue`, `ProductAttribute`, and search `Alias` tables. Added base indexes.

### Migration V2: Customer Directory
*   **Target Version:** `2`
*   **Definition File:** [`migration-v2.ts`](file:///Users/smitpatel/Desktop/Personal%20Projects/voice-to-text/src/app/core/database/migrations/migration-v2.ts)
*   **Changes:** Created the `customers` and `customer_workers` tables. Established a `CHECK` constraint validating that either a company name or customer name is populated. Added autocomplete indexes.

### Migration V3: Business Contacts & Roles
*   **Target Version:** `3`
*   **Definition File:** [`migration-v3.ts`](file:///Users/smitpatel/Desktop/Personal%20Projects/voice-to-text/src/app/core/database/migrations/migration-v3.ts)
*   **Changes:**
    1.  Renamed `customer_workers` to `customer_contacts` and renamed column `worker_name` to `contact_name` for consistency.
    2.  Created the `contact_roles` table.
    3.  Created the `business_contacts` table.
    4.  Created the junction mapping table `business_contact_role_map` supporting ON DELETE CASCADE.
    5.  Seeded 12 standard contractor/service provider roles.

---

## 🌱 Seed Records catalog

The following data is automatically seeded upon fresh database creation:

### 1. Categories
*   Category `Id: 1` $\to$ **Plumbing**

### 2. Attributes & Options
*   Attributes: `Brand`, `Material`, `Size`, `Pressure`, `Quality`
*   Attribute Values:
    *   Brands: `Supreme`, `Ashirvad`
    *   Material: `PVC`, `CPVC`
    *   Size options: `½"`, `¾"`, `1"`, `1¼"`, `1½"`, `2"`
    *   Pressure tolerances: `4kg`, `6kg`, `8kg`, `10kg`
    *   Quality standard: `ISI`, `Non ISI`

### 3. Products
1.  **Supreme PVC Pipe 1" 6kg ISI** (SKU: `SUP-PVC-1`, Price: `150.0`, Unit: `Mtr`)
2.  **Ashirvad PVC Pipe 1" 6kg ISI** (SKU: `ASH-PVC-1`, Price: `160.0`, Unit: `Mtr`)
3.  **Supreme CPVC Pipe 1" 10kg ISI** (SKU: `SUP-CPVC-1`, Price: `220.0`, Unit: `Mtr`)

### 4. Search Keyword Aliases (Multilingual English & Gujarati)
The lookup aliases map text tokens directly back to attribute keys:
*   *PVC* $\to$ `pvc`, `પીવીસી`, `p v c`
*   *CPVC* $\to$ `cpvc`, `સીપીવીસી`, `c p v c`
*   *1"* $\to$ `1 inch`, `1"`, `એક ઇંચ`
*   *6kg* $\to$ `6kg`, `6 kg`, `છ કિલો`
*   *Supreme* $\to$ `supreme`, `સુપ્રીમ`
*   *Ashirvad* $\to$ `ashirvad`, `આશીર્વાદ`, `ashirwad`

### 5. V3 Service Roles
The database pre-populates these professional classifications:
1.  `Plumber`
2.  `Electrician`
3.  `Carpenter`
4.  `Mason`
5.  `Painter`
6.  `Fabricator`
7.  `Welder`
8.  `Contractor`
9.  `Interior Designer`
10. `Architect`
11. `Technician`
12. `Mechanic`
