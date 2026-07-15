import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, EventEmitter, Input, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

@Directive({
  selector: '[appAddLineShortcut]',
  standalone: true
})
export class AddLineShortcutDirective {
  @Output() readonly appAddLineShortcut = new EventEmitter<void>();
  @Input() appAddLineShortcutDisabled = false;
  @Input() appAddLineShortcutGuard: (() => boolean) | null = null;

  constructor() {
    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);

    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(event => {
        if (this.appAddLineShortcutDisabled
          || this.appAddLineShortcutGuard?.() === false
          || !event.altKey
          || event.key.toLowerCase() !== 'n') return;
        event.preventDefault();
        this.appAddLineShortcut.emit();
      });
  }
}
