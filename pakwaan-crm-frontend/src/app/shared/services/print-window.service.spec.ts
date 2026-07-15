import { TestBed } from '@angular/core/testing';
import { PrintWindowService } from './print-window.service';

describe('PrintWindowService', () => {
  it('pre-opens, routes, and closes print tabs', () => {
    const elements: Array<{ textContent: string; style: Record<string, string> }> = [];
    const makeTab = () => ({
      closed: false,
      close: jasmine.createSpy('close'),
      location: { href: '' },
      document: {
        title: '',
        createElement: () => {
          const element = { textContent: '', style: {} };
          elements.push(element);
          return element;
        },
        body: { replaceChildren: jasmine.createSpy('replaceChildren') }
      }
    });
    const tabs = [makeTab(), makeTab()];
    const open = spyOn(window, 'open').and.returnValues(...tabs as unknown as Window[]);
    TestBed.configureTestingModule({
      providers: [PrintWindowService]
    });
    const service = TestBed.inject(PrintWindowService);

    const opened = service.preOpen(2);
    service.route(opened, ['SV-1']);

    expect(open).toHaveBeenCalledTimes(2);
    expect(tabs[0].location.href).toContain('SV-1');
    expect(tabs[1].close).toHaveBeenCalled();
    expect(elements[0].textContent).toBe('Preparing print preview...');

    service.close(opened);
    expect(tabs[0].close).toHaveBeenCalled();
  });
});
