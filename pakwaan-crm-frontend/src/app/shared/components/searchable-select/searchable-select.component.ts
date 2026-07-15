import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  forwardRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface SelectOption {
  id: number | string;
  name: string;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ],
  template: `
    <mat-form-field
      appearance="outline"
      floatLabel="always"
      subscriptSizing="dynamic"
      class="ss-form-field"
      [class.ss-has-value]="value != null">
      <mat-label *ngIf="label">{{ label }}</mat-label>
      <input
        #inputEl
        matInput
        class="ss-input"
        [matAutocomplete]="autocomplete"
        [placeholder]="placeholder"
        [value]="searchText"
        (input)="onInput($event)"
        (focus)="open()"
        (blur)="onBlur()"
        [disabled]="isDisabled"
        autocomplete="off" />

      <mat-autocomplete
        #autocomplete="matAutocomplete"
        [displayWith]="displayOption"
        [autoActiveFirstOption]="true"
        (optionSelected)="selectOption($event.option.value)">
        <mat-option *ngFor="let option of filteredOptions" [value]="option">
          {{ option.name }}
        </mat-option>
        <mat-option *ngIf="filteredOptions.length === 0 && searchText" disabled>
          No match found
        </mat-option>
      </mat-autocomplete>
    </mat-form-field>
  `,
  styles: [`
    :host {
      display: block;
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
      color: #0f172a;
      font-weight: 600;
    }
  `]
})
export class SearchableSelectComponent implements ControlValueAccessor, OnChanges {
  @Input() label = '';
  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Select...';
  @Input() isDisabled = false;

  @ViewChild('inputEl') private inputEl?: ElementRef<HTMLInputElement>;
  @ViewChild(MatAutocompleteTrigger) private autocompleteTrigger?: MatAutocompleteTrigger;

  value: number | string | null = null;
  searchText = '';
  filteredOptions: SelectOption[] = [];

  readonly displayOption = (option: SelectOption | null): string => option?.name ?? '';

  private onChange: (value: number | string | null) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options']) {
      this.filterOptions();
      this.syncDisplayText();
    }
  }

  writeValue(value: number | string | null): void {
    this.value = value ?? null;
    this.syncDisplayText();
  }

  registerOnChange(fn: (value: number | string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled = disabled;
  }

  onInput(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
    this.value = null;
    this.onChange(null);
    this.filterOptions();
  }

  open(): void {
    this.filteredOptions = [...this.options];
  }

  onBlur(): void {
    this.syncDisplayText();
    this.onTouched();
  }

  selectOption(option: SelectOption): void {
    this.value = option.id;
    this.searchText = option.name;
    this.onChange(this.value);
    this.onTouched();
  }

  focus(): void {
    this.inputEl?.nativeElement.focus();
  }

  closeDropdown(): void {
    this.autocompleteTrigger?.closePanel();
  }

  private filterOptions(): void {
    const query = this.searchText.toLowerCase().trim();
    this.filteredOptions = query
      ? this.options.filter(option => option.name.toLowerCase().includes(query))
      : [...this.options];
  }

  private syncDisplayText(): void {
    if (this.value == null) {
      this.searchText = '';
      return;
    }

    this.searchText = this.options.find(option => String(option.id) === String(this.value))?.name ?? '';
  }
}
