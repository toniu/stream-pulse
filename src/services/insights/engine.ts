import type { Insight, InsightContext } from '@/types';
import { insightRules } from './rules';

export function generateInsights(context: InsightContext): Insight[] {
  const insights: Insight[] = [];

  for (const rule of insightRules) {
    try {
      const insight = rule.evaluate(context);
      if (insight) insights.push(insight);
    } catch {
      // Skip rules that throw — don't crash the feed
    }
  }

  // Sort: positive first, then info, then neutral, then warning
  const order: Record<string, number> = { positive: 0, info: 1, neutral: 2, warning: 3 };
  return insights.sort(
    (a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9)
  );
}
