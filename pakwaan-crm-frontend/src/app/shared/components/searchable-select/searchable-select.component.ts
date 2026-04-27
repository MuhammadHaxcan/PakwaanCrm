import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  forwardRef,
  ChangeDetectorRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface SelectOption { id: number | string; name: string; }

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchableSelectComponent), multi: true }],
  template: `
    <div class="ss-field" #fieldEl>
      <mat-form-field appearance="outline" floatLabel="always" subscriptSizing="dynamic" class="ss-form-field">
        <mat-label *ngIf="label">{{ label }}</mat-label>
        <input
          #inputEl
          matInput
          class="ss-input"
          [placeholder]="placeholder"
          [(ngModel)]="searchText"
          (input)="onInput()"
          (focus)="open()"
          (keydown)="onKeyDown($event)"
          (blur)="onBlur()"
          [disabled]="isDisabled"
          autocomplete="off"
        />
        <!-- Shown when a value is selected — acts as both clear and dropdown trigger -->
        <button *ngIf="value != null" mat-icon-button matSuffix type="button"
          class="ss-icon-btn" (mousedown)="clearValue($event)" tabindex="-1" [attr.title]="'Clear selection'">
          <mat-icon>close</mat-icon>
        </button>
        <!-- Shown when no value selected — opens the dropdown -->
        <mat-icon *ngIf="value == null" matSuffix class="ss-icon-btn"
          (mousedown)="toggleDropdown($event)" title="Open dropdown">
          expand_more
        </mat-icon>
      </mat-form-field>

      <div class="ss-dropdown" *ngIf="isOpen && filteredOptions.length > 0" #dropdownEl [ngStyle]="dropdownStyle">
        <div
          *ngFor="let opt of filteredOptions; let i = index"
          class="ss-option"
          [class.ss-highlighted]="i === highlightedIndex"
          [class.ss-selected]="isSelected(opt)"
          (mousedown)="selectOption(opt)"
          (mouseover)="highlightedIndex = i">
          <span class="ss-option-text">{{ opt.name }}</span>
          <mat-icon *ngIf="isSelected(opt)" class="ss-option-check">check</mat-icon>
        </div>
      </div>

      <div class="ss-dropdown ss-empty" *ngIf="isOpen && filteredOptions.length === 0 && searchText" [ngStyle]="dropdownStyle">
        <mat-icon>search_off</mat-icon>
        <span>No match found</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ss-field {
      position: relative;
      width: 100%;
    }

    .ss-form-field {
      width: 100%;
    }

    :host ::ng-deep .ss-form-field .mat-mdc-form-field-subscript-wrapper,
    :host ::ng-deep .ss-form-field .mat-mdc-form-field-bottom-align::before {
      display: none;
    }

    :host ::ng-deep .ss-form-field .mat-mdc-text-field-wrapper {
      background: #fff;
    }

    :host ::ng-deep .ss-form-field .mat-mdc-form-field-infix {
      min-height: var(--ss-control-height, 46px);
    }

    :host ::ng-deep .ss-form-field .mat-mdc-form-field-suffix {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      height: 24px;
      display: flex;
      align-items: center;
    }

    .ss-input {
      cursor: text;
    }

    /* Shared style for the icon button and arrow icon in suffix area */
    .ss-icon-btn {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 24px !important;
      height: 24px !important;
      color: #94a3b8 !important;
      cursor: pointer !important;
      padding: 0 !important;
      flex-shrink: 0 !important;
    }

    .ss-icon-btn:hover {
      color: #dc2626 !important;
    }

    .ss-icon-btn mat-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
    }

    /* Dropdown panel */
    .ss-dropdown {
      position: fixed;
      z-index: 9999;
      overflow-y: auto;
      max-height: 300px;
      background: #fff;
      border: 1px solid #e8ecf1;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, .08), 0 1px 4px rgba(15, 23, 42, .05);
      padding: 5px 0;
      min-width: 200px;
    }

    .ss-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      cursor: pointer;
      color: #374151;
      font-size: 13.5px;
      font-family: 'Inter', sans-serif;
      transition: background-color .12s;
      position: relative;
    }

    .ss-option::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 14px;
      right: 14px;
      height: 1px;
      background: #f1f5f9;
    }

    .ss-option:last-child::after {
      display: none;
    }

    .ss-option:hover,
    .ss-option.ss-highlighted {
      background: #f8fafc;
    }

    .ss-option.ss-selected {
      color: #3949ab;
      font-weight: 600;
      background: #f0f4ff;
    }

    .ss-option.ss-selected:hover,
    .ss-option.ss-selected.ss-highlighted {
      background: #e8eeff;
    }

    .ss-option-text {
      flex: 1;
    }

    .ss-option-check {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #3949ab;
      flex-shrink: 0;
      margin-left: 10px;
    }

    /* Empty state */
    .ss-empty {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 16px;
      color: #9ca3af;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
    }

    .ss-empty mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      opacity: .5;
    }
  `]
})
export class SearchableSelectComponent implements ControlValueAccessor, OnChanges {
  @Input() label = '';
  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Select...';
  @Input() isDisabled = false;

  @ViewChild('fieldEl') fieldEl!: ElementRef<HTMLDivElement>;
  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;
  @ViewChild('dropdownEl') dropdownEl!: ElementRef<HTMLDivElement>;

  private cdr = inject(ChangeDetectorRef);

  value: number | string | null = null;
  searchText = '';
  isOpen = false;
  highlightedIndex = -1;
  filteredOptions: SelectOption[] = [];
  dropdownStyle: Record<string, string> = {};

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes['options']) {
      this.filterOptions();
      this.syncDisplayText();
    }
  }

  writeValue(val: any): void {
    this.value = val ?? null;
    this.syncDisplayText();
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.isDisabled = disabled; }

  onInput() {
    this.filterOptions();
    this.isOpen = true;
    this.highlightedIndex = -1;
    this.updateDropdownPosition();
  }

  open() {
    this.filterOptions();
    this.isOpen = true;
    this.highlightedIndex = -1;
    this.updateDropdownPosition();
  }

  onBlur() {
    setTimeout(() => {
      this.isOpen = false;
      this.highlightedIndex = -1;
      this.onTouched();
    }, 180);
  }

  toggleDropdown(event: MouseEvent) {
    event.preventDefault();
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.filterOptions();
      this.updateDropdownPosition();
      this.inputEl?.nativeElement.focus();
    }
  }

  filterOptions() {
    const query = this.searchText.toLowerCase().trim();
    this.filteredOptions = query
      ? this.options.filter(option => option.name.toLowerCase().includes(query))
      : [...this.options];
  }

  selectOption(option: SelectOption) {
    this.value = option.id;
    this.searchText = option.name;
    this.isOpen = false;
    this.highlightedIndex = -1;
    this.onChange(this.value);
    this.onTouched();
    this.cdr.detectChanges();
  }

  clearValue(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.value = null;
    this.searchText = '';
    this.filterOptions();
    this.onChange(null);
    this.onTouched();
    this.updateDropdownPosition();
  }

  isSelected(option: SelectOption): boolean {
    return Number(option.id) === Number(this.value);
  }

  onKeyDown(event: KeyboardEvent) {
    if (!this.isOpen && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      this.open();
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filteredOptions.length - 1);
        this.scrollToHighlighted();
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (this.highlightedIndex > 0) {
          this.highlightedIndex--;
          this.scrollToHighlighted();
        }
        break;
      case 'Enter':
        if (this.highlightedIndex >= 0 && this.filteredOptions[this.highlightedIndex]) {
          this.selectOption(this.filteredOptions[this.highlightedIndex]);
        } else if (this.filteredOptions.length === 1) {
          this.selectOption(this.filteredOptions[0]);
        }
        event.preventDefault();
        break;
      case 'Escape':
        this.isOpen = false;
        this.highlightedIndex = -1;
        this.onTouched();
        break;
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll', ['$event'])
  onViewportChange() {
    if (this.isOpen) this.updateDropdownPosition();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('app-searchable-select')) {
      this.isOpen = false;
    }
  }

  private scrollToHighlighted() {
    if (!this.dropdownEl) return;
    const items = this.dropdownEl.nativeElement.querySelectorAll('.ss-option');
    items[this.highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }

  private syncDisplayText() {
    if (this.value == null) {
      this.searchText = '';
      return;
    }
    const found = this.options.find(option => Number(option.id) === Number(this.value));
    if (found) this.searchText = found.name;
    else this.searchText = '';
  }

  focus() {
    this.inputEl?.nativeElement.focus();
  }

  closeDropdown() {
    this.isOpen = false;
    this.highlightedIndex = -1;
  }

  private updateDropdownPosition() {
    const input = this.inputEl?.nativeElement;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    this.dropdownStyle = {
      top: `${rect.bottom + scrollY + 5}px`,
      left: `${rect.left + scrollX}px`,
      width: `${rect.width}px`
    };
  }
}
