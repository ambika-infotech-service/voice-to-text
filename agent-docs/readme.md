# Hardware Store ERP System Documentation

Welcome to the internal documentation repository for the **Hardware Store ERP System**. This project is built using Angular 22+, Capacitor, SQLite, and Web Speech API to provide a comprehensive invoice generator, customer/business contact management module, speech-to-text assistant, and database management tools.

These documents are designed to serve as a knowledge base for future developers and AI programming subagents to understand the repository structure, feature specifications, speech parsing logic, search pipelines, and database schemas.

---

## 📚 Documentation Catalog

### 1. 🏗️ [Architecture & Project Structure](file:///Users/smitpatel/Desktop/Personal%20Projects/voice-to-text/agent-docs/architecture.md)
*   **Tech Stack & Frameworks:** Angular 22+ specifications (Signals, Standalone components, native control flow, injection functions).
*   **Directory Structure:** Module breakdowns and architectural boundaries (`core`, `features`, `models`, `providers`, `types`).
*   **Database Lifecycle & Web Fallback:** Bootstrap process, `jeep-sqlite` integration, and IndexedDB persistence.
*   **Core UI Services:** Reactive overlays (`ToastService`, `ConfirmationDialogService`).

### 2. 📋 [Features & Modules Catalog](file:///Users/smitpatel/Desktop/Personal%20Projects/voice-to-text/agent-docs/features.md)
*   **A4 Invoice Generator (Billing):** Calculations, dual customer/business contact billing, responsive split screen, print stylesheets.
*   **Customer Management:** Client directories, notes, contact persons list, and billing autocomplete matching.
*   **Business Contacts:** Independent professional network (Plumbers, Electricians, Carpenters), roles, and category mapping.
*   **Voice Assistant Demo:** Speech capture workspace, multi-language toggles, and live transcript visualizers.
*   **Database CRUD Manager:** Dynamic SQLite schema inspector, query runner console, and database seeding interface.

### 3. 🎙️ [Voice Assistant & Search Pipelines](file:///Users/smitpatel/Desktop/Personal%20Projects/voice-to-text/agent-docs/voice-and-search-pipelines.md)
*   **Speech recognition pipeline:** Event wrappers (`BrowserSpeechProvider` and standard Web Speech API integrations).
*   **Language normalizer pipeline:** Custom rules mapping synonyms and formatting spacing.
*   **Quantity & Unit extractor:** Parsing verbal commands (supports English and Gujarati phonetic scripts).
*   **Fuzzy product search engine:** In-memory caching, indexing, and multi-stage scoring weights (exact matches, aliases, fuzzy Levenshtein).

### 4. 🗄️ [Database Schema & Migrations](file:///Users/smitpatel/Desktop/Personal%20Projects/voice-to-text/agent-docs/database-schema.md)
*   **Database Schema:** Comprehensive list of tables, properties, primary/foreign keys, and performance indexes.
*   **Migrations History:** Schema definitions from V1 to V3 (categories, attributes, customers, business contacts, and roles).
*   **Seed Data:** Preloaded category records, plumbing product catalogues, and multi-lingual phonetic aliases.

---

## 🚀 Getting Started

To launch the project locally for development:

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Start the Angular local development server:**
    ```bash
    npm run start
    ```
3.  **Open browser:** Navigate to `http://localhost:4200` to interact with the application.

> [!NOTE]
> If running on Web, the application relies on standard `jeep-sqlite` WebAssembly loaders to persist changes to the browser's IndexedDB engine automatically. Ensure your browser supports Web Speech API (e.g. Google Chrome, Microsoft Edge) to test the speech recognition features.
