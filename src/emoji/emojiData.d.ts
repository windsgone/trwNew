interface EmojiInfo {
  keywords: string[];
  category: string;
}

declare const emojiData: Record<string, EmojiInfo>;

export default emojiData;
