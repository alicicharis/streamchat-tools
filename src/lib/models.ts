export const MODEL_IDS = [
  'claude-opus-4-8',
  'claude-sonnet-5',
  'claude-haiku-4-5',
] as const;

export type ModelId = (typeof MODEL_IDS)[number];

export const MODEL_DISPLAY_NAMES: Record<ModelId, string> = {
  'claude-opus-4-8': 'Claude Opus 4.8',
  'claude-sonnet-5': 'Claude Sonnet 5',
  'claude-haiku-4-5': 'Claude Haiku 4.5',
};

export const DEFAULT_MODEL_ID: ModelId = 'claude-sonnet-5';
