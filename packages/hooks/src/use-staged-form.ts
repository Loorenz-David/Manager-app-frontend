import { useCallback, useMemo, useState } from 'react';

import type { StepConfig, StepStatus, StepStatusMap } from '@beyo/lib';

export type StagedFormConfig = {
  steps: StepConfig[];
  mode?: 'sequential' | 'free';
  onBeforeAdvance?: (
    currentStepId: string,
    nextStepId: string | null,
    setStepStatus: (stepId: string, status: StepStatus) => void,
  ) => boolean | Promise<boolean>;
  onNavigationGuard?: (targetStepId: string) => boolean;
  onSubmit?: () => void | Promise<void>;
};

export type StagedFormReturn = {
  steps: StepConfig[];
  activeStepId: string;
  activeStepIndex: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  isAdvancing: boolean;
  direction: 1 | -1;
  navigationMode: 'sequential' | 'free';
  stepStatusMap: StepStatusMap;
  advance: () => void;
  back: () => void;
  navigateTo: (stepId: string) => void;
  setStepStatus: (stepId: string, status: StepStatus) => void;
  /**
   * Runs the onBeforeAdvance guard for the active step WITHOUT navigating.
   * Suited as a StagedForm/SlideStack `canAdvance` condition: the forward
   * drag only engages when the guard allows it, and any error statuses the
   * guard sets still surface. Resolves true when no guard is configured.
   */
  validateAdvance: () => Promise<boolean>;
};

export function useStagedForm({
  steps,
  mode = 'sequential',
  onBeforeAdvance,
  onNavigationGuard,
  onSubmit,
}: StagedFormConfig): StagedFormReturn {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [stepStatusMap, setStepStatusMap] = useState<StepStatusMap>({});

  const safeActiveStepIndex = Math.min(activeStepIndex, Math.max(steps.length - 1, 0));
  const activeStepId = steps[safeActiveStepIndex]?.id ?? '';
  const isFirstStep = safeActiveStepIndex === 0;
  const isLastStep = safeActiveStepIndex === steps.length - 1;

  const setStepStatus = useCallback((stepId: string, status: StepStatus) => {
    setStepStatusMap((previous) => ({
      ...previous,
      [stepId]: status,
    }));
  }, []);

  const advance = useCallback(() => {
    void (async () => {
      if (steps.length === 0 || isAdvancing) {
        return;
      }

      const currentStepId = steps[safeActiveStepIndex]?.id;

      if (!currentStepId) {
        return;
      }

      const nextStepId = isLastStep ? null : (steps[safeActiveStepIndex + 1]?.id ?? null);

      // Always run the guard — including on the last step before submit.
      if (onBeforeAdvance) {
        setIsAdvancing(true);

        try {
          const canAdvance = await onBeforeAdvance(currentStepId, nextStepId, setStepStatus);

          if (!canAdvance) {
            return;
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('useStagedForm onBeforeAdvance failed', error);
          }
          return;
        } finally {
          setIsAdvancing(false);
        }
      }

      if (isLastStep) {
        if (!onSubmit) {
          return;
        }

        setIsAdvancing(true);

        try {
          await onSubmit();
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('useStagedForm onSubmit failed', error);
          }
        } finally {
          setIsAdvancing(false);
        }

        return;
      }

      setStepStatusMap((previous) => ({
        ...previous,
        [currentStepId]: 'completed',
      }));
      setDirection(1);
      setActiveStepIndex((previous) => previous + 1);
    })();
  }, [isAdvancing, isLastStep, onBeforeAdvance, onSubmit, safeActiveStepIndex, setStepStatus, steps]);

  const validateAdvance = useCallback(async (): Promise<boolean> => {
    if (steps.length === 0 || isAdvancing) {
      return false;
    }

    const currentStepId = steps[safeActiveStepIndex]?.id;

    if (!currentStepId) {
      return false;
    }

    if (!onBeforeAdvance) {
      return true;
    }

    const nextStepId = isLastStep ? null : (steps[safeActiveStepIndex + 1]?.id ?? null);

    try {
      return await onBeforeAdvance(currentStepId, nextStepId, setStepStatus);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('useStagedForm validateAdvance failed', error);
      }
      return false;
    }
  }, [isAdvancing, isLastStep, onBeforeAdvance, safeActiveStepIndex, setStepStatus, steps]);

  const back = useCallback(() => {
    if (isFirstStep) {
      return;
    }

    setDirection(-1);
    setActiveStepIndex((previous) => previous - 1);
  }, [isFirstStep]);

  const navigateTo = useCallback(
    (stepId: string) => {
      const targetIndex = steps.findIndex((step) => step.id === stepId);

      if (targetIndex === -1 || mode === 'sequential') {
        return;
      }

      if (onNavigationGuard && !onNavigationGuard(stepId)) {
        return;
      }

      if (stepStatusMap[stepId] === 'locked') {
        return;
      }

      setDirection(targetIndex > safeActiveStepIndex ? 1 : -1);
      setActiveStepIndex(targetIndex);
    },
    [mode, onNavigationGuard, safeActiveStepIndex, stepStatusMap, steps],
  );

  return useMemo(
    () => ({
      steps,
      activeStepId,
      activeStepIndex: safeActiveStepIndex,
      isFirstStep,
      isLastStep,
      isAdvancing,
      direction,
      navigationMode: mode,
      stepStatusMap,
      advance,
      back,
      navigateTo,
      setStepStatus,
      validateAdvance,
    }),
    [
      steps,
      activeStepId,
      safeActiveStepIndex,
      isFirstStep,
      isLastStep,
      isAdvancing,
      direction,
      mode,
      stepStatusMap,
      advance,
      back,
      navigateTo,
      setStepStatus,
      validateAdvance,
    ],
  );
}
