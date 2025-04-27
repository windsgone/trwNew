import { TabRule } from '../../types';

// Mock a base chrome API object
const mockChrome = {
  tabs: {
    onUpdated: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
  },
  webNavigation: {
    onCompleted: {
      addListener: jest.fn(),
    },
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

// Assign the mock object to the global scope before tests run
(global as any).chrome = mockChrome as any;

describe('Background Script', () => {
  let tabUpdateListener: jest.Mock;
  let navigationListener: jest.Mock;
  let getAllRulesMock: jest.Mock;
  let findBestMatchRuleMock: jest.Mock;

  // Common mock data
  const mockRules: TabRule[] = [
    { id: '1', urlPattern: 'example.com', title: 'Test Rule', matchMode: 'contains', faviconEmoji: '🧪', originalTitle: 'Original', originalFavicon: '', updatedAt: Date.now() },
  ];
  const mockBestMatchRule = mockRules[0];

  // Setup mocks and load script before each test
  beforeEach(() => {
    // Reset mocks and modules for isolation
    jest.resetAllMocks();
    jest.resetModules();

    // Create fresh mock functions for storage and rules
    getAllRulesMock = jest.fn();
    findBestMatchRuleMock = jest.fn();

    // Re-assign the mock chrome object globally
    global.chrome = mockChrome as any;

    // Dynamically mock dependencies *before* requiring the background script
    jest.mock('../utils/storage', () => ({
      // Important: Use the mock function created above
      getAllRules: getAllRulesMock,
    }));
    jest.mock('../utils/rules', () => ({
      // Important: Use the mock function created above
      findBestMatchRule: findBestMatchRuleMock,
    }));

    // Load the background script *after* mocks are set up
    require('../index');

    // Capture the listener mocks (ensure they are the ones from mockChrome)
    tabUpdateListener = mockChrome.tabs.onUpdated.addListener;
    navigationListener = mockChrome.webNavigation.onCompleted.addListener;
  });

  // --- 场景：找到匹配规则 --- 
  describe('when a matching rule is found', () => {
    beforeEach(() => {
      // Configure mock return values for this specific scenario
      getAllRulesMock.mockResolvedValue(mockRules);
      findBestMatchRuleMock.mockReturnValue(mockBestMatchRule);
    });

    it('should register listeners', () => {
      // Background script loaded in top-level beforeEach should register listeners
      expect(tabUpdateListener).toHaveBeenCalledTimes(1);
      expect(navigationListener).toHaveBeenCalledTimes(1);
    });

    it('should send message on tab update', async () => {
      expect(tabUpdateListener).toHaveBeenCalledTimes(1); // Listener should be registered
      const callback = tabUpdateListener.mock.calls[0][0];
      await callback(1, { status: 'complete' }, { url: 'https://example.com' });

      // Assert using the mock variables
      expect(getAllRulesMock).toHaveBeenCalledTimes(1);
      expect(findBestMatchRuleMock).toHaveBeenCalledWith('https://example.com', mockRules);
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'APPLY_TAB_RULE',
        payload: mockBestMatchRule,
      });
    });

    it('should send message on web navigation complete', async () => {
      expect(navigationListener).toHaveBeenCalledTimes(1); // Listener should be registered
      const callback = navigationListener.mock.calls[0][0];
      await callback({ tabId: 1, frameId: 0, url: 'https://example.com' });

      // Assert using the mock variables
      expect(getAllRulesMock).toHaveBeenCalledTimes(1);
      expect(findBestMatchRuleMock).toHaveBeenCalledWith('https://example.com', mockRules);
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'APPLY_TAB_RULE',
        payload: mockBestMatchRule,
      });
    });
  });

  // --- 场景：未找到匹配规则 --- 
  describe('when no matching rule is found', () => {
    beforeEach(() => {
      // Configure mock return values for this specific scenario
      getAllRulesMock.mockResolvedValue(mockRules); // Still fetches rules
      findBestMatchRuleMock.mockReturnValue(null);  // But finds no match
    });

    it('should not send message on tab update', async () => {
      expect(tabUpdateListener).toHaveBeenCalledTimes(1);
      const callback = tabUpdateListener.mock.calls[0][0];
      await callback(1, { status: 'complete' }, { url: 'https://nomatch.com' });

      // Assert mocks were called, but sendMessage was not
      expect(getAllRulesMock).toHaveBeenCalledTimes(1);
      expect(findBestMatchRuleMock).toHaveBeenCalledWith('https://nomatch.com', mockRules);
      expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalled();
    });

    it('should not send message on web navigation complete', async () => {
      expect(navigationListener).toHaveBeenCalledTimes(1);
      const callback = navigationListener.mock.calls[0][0];
      await callback({ tabId: 1, frameId: 0, url: 'https://nomatch.com' });

      // Assert mocks were called, but sendMessage was not
      expect(getAllRulesMock).toHaveBeenCalledTimes(1);
      expect(findBestMatchRuleMock).toHaveBeenCalledWith('https://nomatch.com', mockRules);
      expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalled();
    });
  });

  // --- 场景：特殊 URL 或状态 --- 
  describe('with special URLs or states', () => {
    beforeEach(() => {
       // Configure mocks (though they shouldn't be called for rule finding)
       getAllRulesMock.mockResolvedValue(mockRules);
       findBestMatchRuleMock.mockReturnValue(mockBestMatchRule);
    });

    it('should not process chrome:// URLs on tab update', async () => {
      expect(tabUpdateListener).toHaveBeenCalledTimes(1);
      const callback = tabUpdateListener.mock.calls[0][0];
      await callback(1, { status: 'complete' }, { url: 'chrome://extensions' });

      // Assert rule finding logic was not called
      expect(getAllRulesMock).not.toHaveBeenCalled();
      expect(findBestMatchRuleMock).not.toHaveBeenCalled();
      expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalled();
    });

    it('should not process incomplete status on tab update', async () => {
      expect(tabUpdateListener).toHaveBeenCalledTimes(1);
      const callback = tabUpdateListener.mock.calls[0][0];
      await callback(1, { status: 'loading' }, { url: 'https://example.com' });

      // Assert rule finding logic was not called
      expect(getAllRulesMock).not.toHaveBeenCalled();
      expect(findBestMatchRuleMock).not.toHaveBeenCalled();
      expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalled();
    });

    it('should not process non-main frames on web navigation complete', async () => {
      expect(navigationListener).toHaveBeenCalledTimes(1);
      const callback = navigationListener.mock.calls[0][0];
      await callback({ tabId: 1, frameId: 1, url: 'https://example.com' }); // frameId !== 0

      // Assert rule finding logic was not called
      expect(getAllRulesMock).not.toHaveBeenCalled();
      expect(findBestMatchRuleMock).not.toHaveBeenCalled();
      expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalled();
    });

    it('should not process chrome:// URLs on web navigation complete', async () => {
      expect(navigationListener).toHaveBeenCalledTimes(1);
      const callback = navigationListener.mock.calls[0][0];
      await callback({ tabId: 1, frameId: 0, url: 'chrome://settings' });

      // Assert rule finding logic was not called
      expect(getAllRulesMock).not.toHaveBeenCalled();
      expect(findBestMatchRuleMock).not.toHaveBeenCalled();
      expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalled();
    });
  });
});
