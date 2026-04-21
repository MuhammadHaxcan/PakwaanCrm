import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `<div class="spinner-overlay"><mat-spinner diameter="48"></mat-spinner></div>`,
  styles: [`.spinner-overlay{display:flex;justify-content:center;align-items:center;padding:40px;}`]
})
export class LoadingSpinnerComponent {}
