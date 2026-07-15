import { downloadCsv, serializeCsv } from './csv';

describe('CSV utilities', () => {
  it('escapes commas, quotes, and line breaks', () => {
    expect(serializeCsv([
      ['Name', 'Description'],
      ['Doe, Jane', 'Said "hello"'],
      ['Multiline', 'first\nsecond']
    ])).toBe(
      'Name,Description\r\n' +
      '"Doe, Jane","Said ""hello"""\r\n' +
      'Multiline,"first\nsecond"'
    );
  });

  it('serializes null and undefined as empty cells', () => {
    expect(serializeCsv([[null, undefined, 0, false]])).toBe(',,0,false');
  });

  it('revokes the object URL after triggering the download', () => {
    const createObjectUrl = spyOn(URL, 'createObjectURL').and.returnValue('blob:csv-test');
    const revokeObjectUrl = spyOn(URL, 'revokeObjectURL');
    const click = jasmine.createSpy('click');
    const anchor = document.createElement('a');
    anchor.click = click;
    spyOn(document, 'createElement').and.returnValue(anchor);

    downloadCsv('report.csv', [['value']]);

    expect(createObjectUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledOnceWith('blob:csv-test');
  });
});
