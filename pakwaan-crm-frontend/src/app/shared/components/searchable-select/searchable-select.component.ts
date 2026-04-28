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
      <mat-form-field appearance="outline" floatLabel="always" subscriptSizing="dynamic" class="ss-form-field" [class.ss-has-value]="value != null">
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
      border-radius: 10px;
      transition: border-color .16s ease, box-shadow .16s ease, background-color .16s ease;
    }

    :host ::ng-deep .ss-form-field .mat-mdc-form-field-infix {
      min-height: var(--ss-control-height, 46px);
    }

    :host ::ng-deep .ss-form-field.ss-has-value .mat-mdc-text-field-wrapper {
      background: #f8fafc;
      box-shadow: inset 0 0 0 1px #dbe4ee;
    }

    :host ::ng-deep .ss-form-field.ss-has-value .ss-input {
      font-weight: 600;
      color: #0f172a;
    }

    .ss-input {
      cursor: text;
    }

    /* Dropdown panel */
    .ss-dropdown {
      position: fixed;
      z-index: 9999;
      overflow-y: auto;
      max-height: 280px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .08);
      padding: 4px 0;
      min-width: 200px;
    }

    .ss-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      cursor: pointer;
      color: #334155;
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
      background: #f8fafc;
    }

    .ss-option:last-child::after {
      display: none;
    }

    .ss-option:hover,
    .ss-option.ss-highlighted {
      background: #f8fafc;
    }

    .ss-option.ss-selected {
      color: #0f172a;
      font-weight: 600;
      background: #eef2f7;
    }

    .ss-option.ss-selected:hover,
    .ss-option.ss-selected.ss-highlighted {
      background: #e2e8f0;
    }

    .ss-option-text {
      flex: 1;
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
    this.filteredOptions = [...this.options];
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
    const anchor = this.fieldEl?.nativeElement ?? this.inputEl?.nativeElement;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    this.dropdownStyle = {
      top: `${rect.bottom + scrollY + 5}px`,
      left: `${rect.left + scrollX}px`,
      width: `${rect.width}px`
    };
  }
}
