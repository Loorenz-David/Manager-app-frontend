import { QueryClient, onlineManager } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";

import { installOnlineManagerBridge } from "./online-bridge";

function gateSource(initial: boolean) {
  let online = initial;
  const listeners = new Set<() => void>();
  return {
    isOnline: () => online,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next: boolean) {
      online = next;
      for (const listener of listeners) listener();
    },
  };
}

afterEach(() => {
  onlineManager.setOnline(true);
});

describe("installOnlineManagerBridge", () => {
  it("online = browser online AND gate online; the gate is the only way back online", () => {
    const gate = gateSource(false);
    const uninstall = installOnlineManagerBridge(gate, onlineManager);

    expect(onlineManager.isOnline()).toBe(false);
    window.dispatchEvent(new Event("online"));
    expect(onlineManager.isOnline()).toBe(false);

    gate.set(true);
    expect(onlineManager.isOnline()).toBe(true);

    window.dispatchEvent(new Event("offline"));
    expect(onlineManager.isOnline()).toBe(false);
    gate.set(true);
    expect(onlineManager.isOnline()).toBe(false);
    window.dispatchEvent(new Event("online"));
    expect(onlineManager.isOnline()).toBe(true);

    gate.set(false);
    expect(onlineManager.isOnline()).toBe(false);

    uninstall();
    expect(onlineManager.isOnline()).toBe(true);
    window.dispatchEvent(new Event("offline"));
    expect(onlineManager.isOnline()).toBe(false);
    window.dispatchEvent(new Event("online"));
    expect(onlineManager.isOnline()).toBe(true);
  });

  it("survives react-query subscribing and unsubscribing (a QueryClient mount cycle)", () => {
    const gate = gateSource(false);
    const uninstall = installOnlineManagerBridge(gate, onlineManager);
    const client = new QueryClient();

    client.mount();
    expect(onlineManager.isOnline()).toBe(false);
    client.unmount();
    client.mount();
    window.dispatchEvent(new Event("online"));
    expect(onlineManager.isOnline()).toBe(false);
    gate.set(true);
    expect(onlineManager.isOnline()).toBe(true);

    client.unmount();
    uninstall();
  });
});
