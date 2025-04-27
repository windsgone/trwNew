export type MatchMode = 'exact' | 'startsWith' | 'endsWith' | 'contains';

export interface TabRule {
  id: string;
  urlPattern: string;
  matchMode: MatchMode;
  title: string;
  faviconEmoji: string;
  originalTitle: string;
  originalFavicon: string;
  updatedAt: number;
}

export interface CreateTabRuleInput {
  urlPattern: string;
  matchMode: MatchMode;
  title: string;
  faviconEmoji: string;
}
