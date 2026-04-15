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

  // @ts-expect-error - localStorage is provided by the browser runtime
  global.localStorage = mockStorage;
  // @ts-expect-error - sessionStorage is provided by the browser runtime
  global.sessionStorage = mockStorage;
}

export {};
