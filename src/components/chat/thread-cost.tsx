import { computeCost, formatCost } from '@/lib/pricing';
import type { ChatUIMessage } from '@/types/chat';

interface ThreadCostProps {
  messages: ChatUIMessage[];
}

export function ThreadCost({ messages }: ThreadCostProps) {
  const total = messages.reduce((sum, message) => {
    const metadata = message.metadata;
    if (!metadata) return sum;
    return (
      sum +
      computeCost(metadata.model, metadata.inputTokens, metadata.outputTokens)
    );
  }, 0);

  if (total <= 0) return null;

  return (
    <div className="text-xs text-muted-foreground">{formatCost(total)}</div>
  );
}
