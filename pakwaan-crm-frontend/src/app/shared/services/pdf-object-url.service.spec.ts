import { TestBed } from '@angular/core/testing';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PdfObjectUrlService } from './pdf-object-url.service';

describe('PdfObjectUrlService', () => {
  let service: PdfObjectUrlService;
  let open: jasmine.Spy;

  beforeEach(() => {
    open = spyOn(window, 'open');
    TestBed.configureTestingModule({
      providers: [
        PdfObjectUrlService,
        {
          provide: DomSanitizer,
          useValue: { bypassSecurityTrustResourceUrl: (url: string) => `safe:${url}` as unknown as SafeResourceUrl }
        }
      ]
    });
    service = TestBed.inject(PdfObjectUrlService);
  });

  it('revokes the previous URL when replacing the PDF', () => {
    spyOn(URL, 'createObjectURL').and.returnValues('blob:first', 'blob:second');
    const revoke = spyOn(URL, 'revokeObjectURL');

    service.replace(new Blob(['first']));
    const safeUrl = service.replace(new Blob(['second']));

    expect(revoke).toHaveBeenCalledOnceWith('blob:first');
    expect(safeUrl as unknown as string).toBe('safe:blob:second');
  });

  it('opens the current URL and revokes it on clear', () => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:pdf');
    const revoke = spyOn(URL, 'revokeObjectURL');
    service.replace(new Blob(['pdf']));

    service.open();
    service.clear();

    expect(open).toHaveBeenCalledOnceWith('blob:pdf', '_blank', 'noopener');
    expect(revoke).toHaveBeenCalledOnceWith('blob:pdf');
    expect(service.hasUrl).toBeFalse();
  });
});
