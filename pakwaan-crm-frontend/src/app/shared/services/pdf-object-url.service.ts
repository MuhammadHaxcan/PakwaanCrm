import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Injectable()
export class PdfObjectUrlService {
  private readonly document = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);
  private objectUrl: string | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clear());
  }

  get hasUrl(): boolean {
    return this.objectUrl !== null;
  }

  replace(blob: Blob): SafeResourceUrl {
    this.clear();
    this.objectUrl = URL.createObjectURL(blob);
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
  }

  open(): void {
    if (this.objectUrl) {
      this.document.defaultView?.open(this.objectUrl, '_blank', 'noopener');
    }
  }

  clear(): void {
    if (!this.objectUrl) return;
    URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
