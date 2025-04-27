import { findBestMatchRule } from '../rules';
import { TabRule } from '../../types';

describe('规则匹配算法测试', () => {
  const mockRules: TabRule[] = [
    {
      id: '1',
      urlPattern: 'example.com',
      matchMode: 'contains',
      title: '示例网站',
      faviconEmoji: '🌐',
      originalTitle: '',
      originalFavicon: '',
      updatedAt: Date.now() - 3000
    },
    {
      id: '2',
      urlPattern: 'https://example.com/exact',
      matchMode: 'exact',
      title: '精确匹配',
      faviconEmoji: '📌',
      originalTitle: '',
      originalFavicon: '',
      updatedAt: Date.now() - 2000
    },
    {
      id: '3',
      urlPattern: 'https://example.com',
      matchMode: 'startsWith',
      title: '前缀匹配',
      faviconEmoji: '🔍',
      originalTitle: '',
      originalFavicon: '',
      updatedAt: Date.now() - 1000
    },
    {
      id: '4',
      urlPattern: '.com/page',
      matchMode: 'endsWith',
      title: '后缀匹配',
      faviconEmoji: '🔎',
      originalTitle: '',
      originalFavicon: '',
      updatedAt: Date.now()
    }
  ];

  test('空规则列表应返回null', () => {
    expect(findBestMatchRule('https://example.com', [])).toBeNull();
  });

  test('精确匹配应优先于其他匹配模式', () => {
    const result = findBestMatchRule('https://example.com/exact', mockRules);
    expect(result?.id).toBe('2');
  });

  test('前缀匹配应优先于包含匹配', () => {
    const result = findBestMatchRule('https://example.com/page', mockRules);
    expect(result?.id).toBe('3');
  });

  test('后缀匹配应优先于包含匹配', () => {
    const result = findBestMatchRule('test.com/page', mockRules);
    expect(result?.id).toBe('4');
  });

  test('URL模式长度相同时，更新时间较新的规则应优先', () => {
    const samePatternRules: TabRule[] = [
      {
        id: 'old',
        urlPattern: 'test.com',
        matchMode: 'contains',
        title: '旧规则',
        faviconEmoji: '🕰️',
        originalTitle: '',
        originalFavicon: '',
        updatedAt: Date.now() - 1000
      },
      {
        id: 'new',
        urlPattern: 'test.com',
        matchMode: 'contains',
        title: '新规则',
        faviconEmoji: '⏰',
        originalTitle: '',
        originalFavicon: '',
        updatedAt: Date.now()
      }
    ];
    
    const result = findBestMatchRule('https://test.com', samePatternRules);
    expect(result?.id).toBe('new');
  });

  test('没有匹配的规则应返回null', () => {
    const result = findBestMatchRule('https://nomatch.org', mockRules);
    expect(result).toBeNull();
  });
});
