import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SearchableSelectComponent } from './searchable-select.component';

describe('SearchableSelectComponent', () => {
  let fixture: ComponentFixture<SearchableSelectComponent>;
  let component: SearchableSelectComponent;

  const inputEvent = (value: string): Event =>
    ({ target: { value } } as unknown as Event);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchableSelectComponent, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchableSelectComponent);
    component = fixture.componentInstance;
    component.options = [
      { id: 1, name: 'NASIR' },
      { id: 2, name: 'Hassan' }
    ];
    fixture.detectChanges();
  });

  it('uses Angular Material autocomplete for the dropdown', () => {
    expect(fixture.debugElement.query(By.directive(MatAutocompleteTrigger))).not.toBeNull();
  });

  it('filters options from the typed input', () => {
    component.onInput(inputEvent('has'));

    expect(component.filteredOptions).toEqual([{ id: 2, name: 'Hassan' }]);
  });

  it('propagates the selected option ID and displays its name', () => {
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);

    component.selectOption({ id: 2, name: 'Hassan' });

    expect(onChange).toHaveBeenCalledOnceWith(2);
    expect(component.searchText).toBe('Hassan');
  });

  it('clears the selected ID when the user edits the input', () => {
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);
    component.selectOption({ id: 1, name: 'NASIR' });
    onChange.calls.reset();

    component.onInput(inputEvent('Hassan'));

    expect(component.value).toBeNull();
    expect(onChange).toHaveBeenCalledOnceWith(null);
  });

  it('clears unmatched text on blur', () => {
    component.onInput(inputEvent('Not an option'));

    component.onBlur();

    expect(component.searchText).toBe('');
  });
});
