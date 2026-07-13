import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { Capacitor } from '@capacitor/core';

// Initialize jeep-sqlite custom elements for Web SQL support
if (Capacitor.getPlatform() === 'web') {
  jeepSqlite(window);
  
  // Ensure the custom element is added to the DOM before Angular bootstraps
  const jeepEl = document.createElement('jeep-sqlite');
  document.body.appendChild(jeepEl);
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
