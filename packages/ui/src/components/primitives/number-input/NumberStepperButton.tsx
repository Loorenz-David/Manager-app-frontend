import { Minus, Plus } from 'lucide-react';

import { cn } from '@beyo/lib';

import { numberStepperButtonVariants } from './number-input.variants';
import type { NumberStepperButtonProps } from './types';

export function NumberStepperButton({
  direction,
  disabled = false,
  testId,
  onPress,
}: NumberStepperButtonProps): React.JSX.Element {
  const Icon = direction === 'increment' ? Plus : Minus;

  return (
    <button
      aria-label={direction === 'increment' ? 'Increase value' : 'Decrease value'}
      className={cn(numberStepperButtonVariants())}
      data-testid={testId}
      disabled={disabled}
      type="button"
      onClick={onPress}
    >
      <Icon className="size-4" />
    </button>
  );
}
