import { Routes } from '@angular/router';
import { BillingPage } from './features/billing/pages/billing-page/billing-page';

export const routes: Routes = [
  { path: '', redirectTo: 'billing', pathMatch: 'full' },
  { path: 'billing', component: BillingPage },
  {
    path: 'speech',
    loadComponent: () => import('./core/speech/components/speech-demo/speech-demo').then(m => m.SpeechDemo)
  },
  {
    path: 'database',
    loadComponent: () => import('./core/database/components/database-demo/database-demo').then(m => m.DatabaseDemo)
  },
  {
    path: 'customers',
    loadComponent: () => import('./features/customers/pages/customer-list/customer-list.component').then(m => m.CustomerListComponent)
  },
  {
    path: 'customers/new',
    loadComponent: () => import('./features/customers/pages/customer-form/customer-form.component').then(m => m.CustomerFormComponent)
  },
  {
    path: 'customers/:id',
    loadComponent: () => import('./features/customers/pages/customer-details/customer-details.component').then(m => m.CustomerDetailsComponent)
  },
  {
    path: 'customers/:id/edit',
    loadComponent: () => import('./features/customers/pages/customer-form/customer-form.component').then(m => m.CustomerFormComponent)
  }
];
