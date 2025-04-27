import { emojiToFaviconDataUrl } from '../emoji';

describe('Emoji转Favicon功能测试', () => {
  beforeAll(() => {
    // 模拟canvas和context
    const mockContext = {
      font: '',
      textAlign: '',
      textBaseline: '',
      fillText: jest.fn()
    };
    
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: jest.fn().mockReturnValue(mockContext),
      toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mockDataUrl')
    };
    
    // 替换document.createElement
    document.createElement = jest.fn().mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas;
      }
      return {};
    });
  });

  test('应返回正确格式的dataURL', () => {
    const result = emojiToFaviconDataUrl('😀');
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  test('应使用正确的canvas大小', () => {
    const size = 32;
    emojiToFaviconDataUrl('🌟', size);
    
    const canvas = document.createElement('canvas') as any;
    expect(canvas.width).toBe(size);
    expect(canvas.height).toBe(size);
  });

  test('应设置正确的字体大小', () => {
    const size = 64;
    emojiToFaviconDataUrl('🔥', size);
    
    const canvas = document.createElement('canvas') as any;
    const ctx = canvas.getContext('2d');
    expect(ctx.font).toBe(`${size * 0.8}px serif`);
  });
});
