export function emojiToFaviconDataUrl(emoji: string, size = 64): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${size * 0.9}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 检测是否为 Windows 系统
  const isWindows = navigator.userAgent.indexOf('Windows') !== -1;
  
  // 根据系统调整垂直位置
  const verticalPosition = isWindows ? size / 2.1 : size / 1.7;
  
  ctx.fillText(emoji, size / 2, verticalPosition);
  return canvas.toDataURL('image/png');
}
