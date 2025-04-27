// 模拟Chrome API
globalThis.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  runtime: {
    lastError: null,
  },
};
