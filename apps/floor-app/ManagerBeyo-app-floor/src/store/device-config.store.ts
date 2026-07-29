import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";

const DEFAULT_AUTO_RETURN_SECONDS = 12;

export const AUTO_RETURN_SECONDS_RANGE = {
  min: 4,
  max: 120,
} as const;

const PersistedDeviceConfigSchema = z.object({
  terminalLabel: z.string(),
  autoReturnSeconds: z
    .number()
    .int()
    .min(AUTO_RETURN_SECONDS_RANGE.min)
    .max(AUTO_RETURN_SECONDS_RANGE.max),
});

type DeviceConfigState = z.infer<typeof PersistedDeviceConfigSchema> & {
  setTerminalLabel: (terminalLabel: string) => void;
  setAutoReturnSeconds: (autoReturnSeconds: number) => void;
  resetDeviceConfig: () => void;
};

export const DEVICE_CONFIG_STORAGE_KEY = "beyo.floor.device-config";

export const useDeviceConfigStore = create<DeviceConfigState>()(
  persist(
    (set) => ({
      terminalLabel: "",
      autoReturnSeconds: DEFAULT_AUTO_RETURN_SECONDS,
      setTerminalLabel: (terminalLabel) => set({ terminalLabel }),
      setAutoReturnSeconds: (autoReturnSeconds) =>
        set({ autoReturnSeconds }),
      resetDeviceConfig: () =>
        set({
          terminalLabel: "",
          autoReturnSeconds: DEFAULT_AUTO_RETURN_SECONDS,
        }),
    }),
    {
      name: DEVICE_CONFIG_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        terminalLabel: state.terminalLabel,
        autoReturnSeconds: state.autoReturnSeconds,
      }),
      merge: (persistedState, currentState) => {
        const parsed = PersistedDeviceConfigSchema.safeParse(persistedState);
        return parsed.success
          ? { ...currentState, ...parsed.data }
          : currentState;
      },
    },
  ),
);
