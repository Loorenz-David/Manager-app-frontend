import { beforeEach, describe, expect, it } from "vitest";

import {
  DEVICE_CONFIG_STORAGE_KEY,
  useDeviceConfigStore,
} from "@/store/device-config.store";

beforeEach(() => {
  localStorage.clear();
  useDeviceConfigStore.getState().resetDeviceConfig();
});

describe("device config store", () => {
  it("persists terminal label and auto-return seconds", () => {
    useDeviceConfigStore.getState().setTerminalLabel("TERMINAL 04 · BAY B");
    useDeviceConfigStore.getState().setAutoReturnSeconds(18);

    expect(useDeviceConfigStore.getState()).toMatchObject({
      terminalLabel: "TERMINAL 04 · BAY B",
      autoReturnSeconds: 18,
    });

    const persisted = localStorage.getItem(DEVICE_CONFIG_STORAGE_KEY);
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted ?? "{}")).toMatchObject({
      state: {
        terminalLabel: "TERMINAL 04 · BAY B",
        autoReturnSeconds: 18,
      },
      version: 1,
    });
  });

  it("resets the persisted device values to their defaults", () => {
    useDeviceConfigStore.getState().setTerminalLabel("TERMINAL 09");
    useDeviceConfigStore.getState().setAutoReturnSeconds(30);

    useDeviceConfigStore.getState().resetDeviceConfig();

    expect(useDeviceConfigStore.getState()).toMatchObject({
      terminalLabel: "",
      autoReturnSeconds: 12,
    });
  });

  it("falls back to the default when persisted auto-return seconds are out of range", async () => {
    localStorage.setItem(
      DEVICE_CONFIG_STORAGE_KEY,
      JSON.stringify({
        state: {
          terminalLabel: "HAND-EDITED TERMINAL",
          autoReturnSeconds: 121,
        },
        version: 1,
      }),
    );

    await useDeviceConfigStore.persist.rehydrate();

    expect(useDeviceConfigStore.getState()).toMatchObject({
      terminalLabel: "",
      autoReturnSeconds: 12,
    });
  });
});
