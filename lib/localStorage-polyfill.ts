// Polyfill localStorage for server-side rendering
if (typeof window === 'undefined') {
  const mockStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };

  global.localStorage = mockStorage;
  global.sessionStorage = mockStorage;
}

export {};
