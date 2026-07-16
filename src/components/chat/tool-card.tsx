'use client';

import { useState } from 'react';
import { CaretDownIcon, CircleNotchIcon } from '@phosphor-icons/react';
import type { InferUITools, ToolUIPart } from 'ai';
import { tools } from '@/lib/tools';
import { cn } from '@/lib/utils';

type ChatToolUIPart = ToolUIPart<InferUITools<typeof tools>>;

interface ToolCardProps {
  part: ChatToolUIPart;
}

function toolLabel(toolName: string): string {
  switch (toolName) {
    case 'weather':
      return 'Weather';
    case 'calculator':
      return 'Calculator';
    case 'currency':
      return 'Currency';
    default:
      return toolName;
  }
}

type OutputAvailablePart = Extract<
  ChatToolUIPart,
  { state: 'output-available' }
>;

function summarize(part: OutputAvailablePart): string {
  if (part.type === 'tool-weather') {
    const output = part.output;
    return `${output.temperatureC}°C, ${output.condition} in ${output.location}, ${output.country}`;
  }

  if (part.type === 'tool-calculator') {
    const output = part.output;
    return `${output.expression} = ${output.result}`;
  }

  if (part.type === 'tool-currency') {
    const output = part.output;
    return `${output.amount} ${output.from} = ${output.converted} ${output.to}`;
  }

  return '';
}

export function ToolCard({ part }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false);
  const toolName = part.type.replace(/^tool-/, '');
  const label = toolLabel(toolName);

  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
        <CircleNotchIcon className="animate-spin" />
        <span>Running {label}...</span>
      </div>
    );
  }

  if (part.state === 'output-error') {
    return (
      <div className="rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
        <p className="font-medium">{label} failed</p>
        <p>{part.errorText}</p>
      </div>
    );
  }

  if (part.state !== 'output-available') {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-muted px-4 py-2 text-sm text-foreground">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span>
          <span className="font-medium">{label}:</span> {summarize(part)}
        </span>
        <CaretDownIcon
          className={cn(
            'shrink-0 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          <pre className="overflow-x-auto rounded-lg bg-background p-2 text-xs">
            {JSON.stringify(part.input, null, 2)}
          </pre>
          <pre className="overflow-x-auto rounded-lg bg-background p-2 text-xs">
            {JSON.stringify(part.output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
