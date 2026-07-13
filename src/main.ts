import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';

// Initialize jeep-sqlite custom elements for Web SQL support
jeepSqlite(window);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
