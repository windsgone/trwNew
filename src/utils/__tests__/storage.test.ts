import { getAllRules, saveRule, deleteRule } from '../storage';
import { CreateTabRuleInput, TabRule } from '../../types';

describe('存储接口测试', () => {
  const RULES_KEY = 'tab_rename_rules';
  
  beforeEach(() => {
    // 重置mock
    jest.clearAllMocks();
    
    // 模拟Date.now()
    jest.spyOn(Date, 'now').mockImplementation(() => 1234567890);
    
    // 模拟Math.random()
    jest.spyOn(global.Math, 'random').mockReturnValue(0.123456789);
    
    // 类型断言chrome API
    (chrome.storage.local.get as jest.Mock) = jest.fn();
    (chrome.storage.local.set as jest.Mock) = jest.fn();
  });

  test('getAllRules应返回存储中的规则列表', async () => {
    const mockRules: TabRule[] = [
      { id: 'test1', urlPattern: '', matchMode: 'contains', title: '', faviconEmoji: '', originalTitle: '', originalFavicon: '', updatedAt: 0 },
      { id: 'test2', urlPattern: '', matchMode: 'contains', title: '', faviconEmoji: '', originalTitle: '', originalFavicon: '', updatedAt: 0 }
    ];
    
    (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({ [RULES_KEY]: mockRules });
    });

    const result = await getAllRules();
    expect(chrome.storage.local.get).toHaveBeenCalledWith(RULES_KEY);
    expect(result).toEqual(mockRules);
  });

  test('getAllRules在没有规则时应返回空数组', async () => {
    (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({});
    });

    const result = await getAllRules();
    expect(result).toEqual([]);
  });

  test('saveRule应创建新规则并保存到存储中', async () => {
    const existingRules: TabRule[] = [];
    
    (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({ [RULES_KEY]: existingRules });
    });
    
    (chrome.storage.local.set as jest.Mock).mockImplementation(() => {
      return Promise.resolve();
    });

    const input: CreateTabRuleInput = {
      urlPattern: 'test.com',
      matchMode: 'contains',
      title: '测试网站',
      faviconEmoji: '🧪'
    };

    // 生成的ID将是 Date.now().toString(36) + Math.random().toString(36).substring(2)
    // 1234567890 的36进制是 kf12oi
    // 0.123456789 的36进制substring(2)是 4fzzzxjylrx
    const expectedId = 'kf12oi4fzzzxjylrx';
    const expectedRule: TabRule = {
      ...input,
      id: expectedId,
      originalTitle: '',
      originalFavicon: '',
      updatedAt: 1234567890
    };

    const result = await saveRule(input);
    
    expect(chrome.storage.local.get).toHaveBeenCalledWith(RULES_KEY);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [RULES_KEY]: [expectedRule]
    });
    expect(result).toEqual(expectedRule);
  });

  test('deleteRule应从存储中删除指定ID的规则', async () => {
    const existingRules: TabRule[] = [
      { id: 'rule1', title: '规则1', urlPattern: '', matchMode: 'contains', faviconEmoji: '', originalTitle: '', originalFavicon: '', updatedAt: 0 },
      { id: 'rule2', title: '规则2', urlPattern: '', matchMode: 'contains', faviconEmoji: '', originalTitle: '', originalFavicon: '', updatedAt: 0 }
    ];
    
    (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({ [RULES_KEY]: existingRules });
    });
    
    (chrome.storage.local.set as jest.Mock).mockImplementation(() => {
      return Promise.resolve();
    });

    await deleteRule('rule1');
    
    expect(chrome.storage.local.get).toHaveBeenCalledWith(RULES_KEY);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [RULES_KEY]: [{ id: 'rule2', title: '规则2', urlPattern: '', matchMode: 'contains', faviconEmoji: '', originalTitle: '', originalFavicon: '', updatedAt: 0 }]
    });
  });

  test('deleteRule在规则不存在时不应报错', async () => {
    const existingRules: TabRule[] = [
      { id: 'rule1', title: '规则1', urlPattern: '', matchMode: 'contains', faviconEmoji: '', originalTitle: '', originalFavicon: '', updatedAt: 0 }
    ];
    
    (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({ [RULES_KEY]: existingRules });
    });
    
    (chrome.storage.local.set as jest.Mock).mockImplementation(() => {
      return Promise.resolve();
    });

    await expect(deleteRule('nonexistent')).resolves.not.toThrow();
    
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [RULES_KEY]: existingRules
    });
  });
});
