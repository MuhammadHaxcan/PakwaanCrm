import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddLineShortcutDirective } from './add-line-shortcut.directive';

@Component({
  standalone: true,
  imports: [AddLineShortcutDirective],
  template: `<div appAddLineShortcut [appAddLineShortcutDisabled]="disabled" (appAddLineShortcut)="addLine()"></div>`
})
class ShortcutHostComponent {
  addLine = jasmine.createSpy('addLine');
  disabled = false;
}

describe('AddLineShortcutDirective', () => {
  let fixture: ComponentFixture<ShortcutHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ShortcutHostComponent] });
    fixture = TestBed.createComponent(ShortcutHostComponent);
    fixture.detectChanges();
  });

  it('emits and prevents the default action for Alt+N', () => {
    const event = new KeyboardEvent('keydown', { altKey: true, key: 'n', cancelable: true });

    document.dispatchEvent(event);

    expect(fixture.componentInstance.addLine).toHaveBeenCalledOnceWith();
    expect(event.defaultPrevented).toBeTrue();
  });

  it('ignores N without Alt', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));

    expect(fixture.componentInstance.addLine).not.toHaveBeenCalled();
  });

  it('removes the document listener when destroyed', () => {
    fixture.destroy();

    document.dispatchEvent(new KeyboardEvent('keydown', { altKey: true, key: 'n' }));

    expect(fixture.componentInstance.addLine).not.toHaveBeenCalled();
  });

  it('does not emit or prevent the shortcut while disabled', () => {
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', { altKey: true, key: 'n', cancelable: true });

    document.dispatchEvent(event);

    expect(fixture.componentInstance.addLine).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBeFalse();
  });
});
