import { TabRule } from '../types';

export function findBestMatchRule(url: string, rules: TabRule[]): TabRule | null {
  if (!rules || rules.length === 0) {
    return null;
  }

  const sortedRules = [...rules].sort((a, b) => {
    const aScore = getMatchScore(a, url);
    const bScore = getMatchScore(b, url);
    
    if (aScore !== bScore) {
      return bScore - aScore;
    }
    
    if (a.urlPattern.length !== b.urlPattern.length) {
      return b.urlPattern.length - a.urlPattern.length;
    }
    
    return b.updatedAt - a.updatedAt;
  });

  const bestMatch = sortedRules[0];
  const matchScore = getMatchScore(bestMatch, url);
  
  return matchScore > 0 ? bestMatch : null;
}

function getMatchScore(rule: TabRule, url: string): number {
  switch (rule.matchMode) {
    case 'exact':
      return url === rule.urlPattern ? 4 : 0;
    case 'startsWith':
      return url.startsWith(rule.urlPattern) ? 3 : 0;
    case 'endsWith':
      return url.endsWith(rule.urlPattern) ? 3 : 0;
    case 'contains':
      return url.includes(rule.urlPattern) ? 2 : 0;
    default:
      return 0;
  }
}
