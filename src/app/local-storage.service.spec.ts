import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let store: Record<string, string>;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    service = new LocalStorageService();
    store = {};
    originalLocalStorage = window.localStorage;
    const mockLocalStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    } as Storage;
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
      writable: true,
    });
  });

  it('should get and set string values', () => {
    service.setItem('foo', 'bar');
    expect(service.getItem('foo')).toBe('bar');
  });

  it('should get and set objects', () => {
    service.setItem('obj', { a: 1 });
    expect(service.getItem<{ a: number }>('obj')).toEqual({ a: 1 });
  });

  it('should remove items', () => {
    service.setItem('foo', 'bar');
    service.removeItem('foo');
    expect(service.getItem('foo')).toBeNull();
  });

  it('should get and set booleans', () => {
    service.setBoolean('flag', true);
    expect(service.getBoolean('flag')).toBe(true);
    service.setBoolean('flag', false);
    expect(service.getBoolean('flag')).toBe(false);
  });

  it('should return default for missing boolean', () => {
    expect(service.getBoolean('missing', true)).toBe(true);
    expect(service.getBoolean('missing', false)).toBe(false);
  });
});
