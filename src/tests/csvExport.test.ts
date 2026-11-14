import { downloadProfileAsCSV, formatProfileFilename } from '../lib/csvExport';

describe('Unit Test: csvExport', () => {
  describe('formatProfileFilename', () => {
    it('formats filename with floatId and cycle correctly', () => {
      const filename = formatProfileFilename('5906432', 42);
      expect(filename).toMatch(/^float_5906432_cycle_42_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('falls back to default profile_data format when arguments are missing', () => {
      expect(formatProfileFilename(undefined, 42)).toMatch(/^profile_data_\d{4}-\d{2}-\d{2}\.csv$/);
      expect(formatProfileFilename('5906432', undefined)).toMatch(/^float_5906432_\d{4}-\d{2}-\d{2}\.csv$/);
      expect(formatProfileFilename()).toMatch(/^profile_data_\d{4}-\d{2}-\d{2}\.csv$/);
    });
  });

  describe('downloadProfileAsCSV', () => {
    it('throws error when measurements are empty or undefined', () => {
      expect(() => downloadProfileAsCSV([])).toThrow('No measurements to export');
      expect(() => downloadProfileAsCSV(null as any)).toThrow('No measurements to export');
    });

    it('creates blob and triggers anchor download with measurements', () => {
      const createElementSpy = jest.spyOn(document, 'createElement');
      const appendChildSpy = jest.spyOn(document.body, 'appendChild');
      const removeChildSpy = jest.spyOn(document.body, 'removeChild');

      // Mock URL.createObjectURL and revokeObjectURL
      window.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      window.URL.revokeObjectURL = jest.fn();

      const mockMeasurements = [
        { depth: 10, temperature: 24.5, salinity: 35.1 },
        { depth: 20, temperature: 23.8, salinity: 35.2 },
        { depth: 50, temperature: undefined, salinity: undefined }
      ];

      downloadProfileAsCSV(mockMeasurements, 'test_export.csv');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});
