import {
  Component,
  Input,
  forwardRef,
  HostListener,
  ViewChild,
  ElementRef,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface SelectOption { id: number | string; name: string; }

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchableSelectComponent), multi: true }],
  template: `
    <div class="ss-wrapper" [class.ss-disabled]="isDisabled" [class.ss-open]="isOpen">
      <input
        #inputEl
        class="ss-input"
        [placeholder]="placeholder"
        [(ngModel)]="searchText"
        (input)="onInput()"
        (focus)="open()"
        (keydown)="onKeyDown($event)"
        [disabled]="isDisabled"
        autocomplete="off"
      />
      <span class="ss-clear" *ngIf="value != null" (mousedown)="clearValue($event)">&times;</span>
      <span class="ss-arrow" (mousedown)="toggleDropdown($event)">&#9662;</span>

      <div class="ss-dropdown" *ngIf="isOpen && filteredOptions.length > 0" #dropdownEl>
        <div
          *ngFor="let opt of filteredOptions; let i = index"
          class="ss-option"
          [class.ss-highlighted]="i === highlightedIndex"
          [class.ss-selected]="isSelected(opt)"
          (mousedown)="selectOption(opt)"
          (mouseover)="highlightedIndex = i"
        >
          {{ opt.name }}
        </div>
      </div>

      <div class="ss-dropdown ss-empty" *ngIf="isOpen && filteredOptions.length === 0 && searchText">
        No results found
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ss-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      min-height: var(--ss-control-height, 44px);
      padding: 0 38px 0 12px;
      border: 1.5px solid var(--control-border, #cbd5e1);
      border-radius: var(--ss-radius, 12px);
      background: #fff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, .04);
      transition: border-color .15s, box-shadow .15s, background-color .15s;
    }

    .ss-wrapper:hover {
      border-color: var(--control-border-strong, #94a3b8);
    }

    .ss-wrapper:focus-within,
    .ss-wrapper.ss-open {
      border-color: var(--c-primary, #3949ab);
      box-shadow: 0 0 0 4px rgba(57, 73, 171, .12);
    }

    .ss-disabled {
      background: #f8fafc;
      opacity: .8;
      pointer-events: none;
    }

    .ss-input {
      flex: 1;
      min-width: 60px;
      border: none;
      outline: none;
      background: transparent;
      color: var(--c-text, #1e293b);
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      padding: 10px 0;
    }

    .ss-input::placeholder {
      color: var(--c-text-3, #94a3b8);
    }

    .ss-arrow,
    .ss-clear {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
      cursor: pointer;
      user-select: none;
      line-height: 1;
    }

    .ss-arrow {
      right: 12px;
      font-size: 11px;
    }

    .ss-clear {
      right: 28px;
      font-size: 15px;
    }

    .ss-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      z-index: 2000;
      overflow-y: auto;
      max-height: 240px;
      background: #fff;
      border: 1px solid var(--control-border, #cbd5e1);
      border-radius: 12px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, .14);
    }

    .ss-option {
      padding: 10px 12px;
      cursor: pointer;
      color: var(--c-text, #1e293b);
      font-size: 13.5px;
      transition: background-color .12s, color .12s;
    }

    .ss-option.ss-highlighted {
      background: #eef2ff;
    }

    .ss-option.ss-selected {
      color: var(--c-primary, #3949ab);
      font-weight: 600;
    }

    .ss-empty {
      padding: 12px;
      color: #64748b;
      font-size: 13px;
    }
  `]
})
export class SearchableSelectComponent implements ControlValueAccessor, OnChanges {
  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Select...';
  @Input() isDisabled = false;
  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;
  @ViewChild('dropdownEl') dropdownEl!: ElementRef<HTMLDivElement>;

  value: number | string | null = null;
  searchText = '';
  isOpen = false;
  highlightedIndex = -1;
  filteredOptions: SelectOption[] = [];

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
  }

  open() {
    this.filterOptions();
    this.isOpen = true;
  }

  toggleDropdown(event: MouseEvent) {
    event.preventDefault();
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.filterOptions();
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
  }

  clearValue(event: MouseEvent) {
    event.preventDefault();
    this.value = null;
    this.searchText = '';
    this.filterOptions();
    this.onChange(null);
    this.onTouched();
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
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
        this.scrollToHighlighted();
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
      case 'Tab':
        this.isOpen = false;
        break;
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
  }

  @HostListener('document:mousedown', ['$event'])
  onDocClick(event: MouseEvent) {
    const element = event.target as HTMLElement;
    if (!element.closest('app-searchable-select')) this.isOpen = false;
  }
}
