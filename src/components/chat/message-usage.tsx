import { computeCost, formatCost } from '@/lib/pricing';
import type { ChatMessageMetadata } from '@/types/chat';

interface MessageUsageProps {
  metadata: ChatMessageMetadata;
}

export function MessageUsage({ metadata }: MessageUsageProps) {
  const { model, inputTokens, outputTokens } = metadata;
  const cost = computeCost(model, inputTokens, outputTokens);

  return (
    <div className="text-xs text-muted-foreground">
      {inputTokens} in / {outputTokens} out tokens · {formatCost(cost)}
    </div>
  );
}
