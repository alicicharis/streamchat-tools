'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MODEL_DISPLAY_NAMES, MODEL_IDS, type ModelId } from '@/lib/models';

interface ModelPickerProps {
  value: ModelId;
  onChange: (value: ModelId) => void;
  disabled?: boolean;
}

export function ModelPicker({ value, onChange, disabled }: ModelPickerProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as ModelId)}
      disabled={disabled}
    >
      <SelectTrigger aria-label="Model">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MODEL_IDS.map((modelId) => (
          <SelectItem key={modelId} value={modelId}>
            {MODEL_DISPLAY_NAMES[modelId]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
