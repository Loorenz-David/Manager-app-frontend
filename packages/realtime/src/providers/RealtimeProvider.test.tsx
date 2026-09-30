import { act, cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { useEntityView } from "../hooks/use-entity-view";
import { useSocketStatus } from "../hooks/use-socket";
import type { SocketEventHandlers } from "../lib/socket-registry-types";
import { RealtimeProvider } from "./RealtimeProvider";

// --- mocks -----------------------------------------------------------------

type Listener = (...args: unknown[]) => void;

class FakeSocket {
  connected = false;
  active = false;
  id: string | undefined = undefined;
  emitted: Array<[string, unknown]> = [];
  private listeners = new Map<string, Set<Listener>>();
  private nextId = 1;
  io = { on: vi.fn(), off: vi.fn() };

  readonly url: string;
  readonly options: Record<string, unknown>;

  constructor(url: string, options: Record<string, unknown>) {
    this.url = url;
    this.options = options;
  }

  connect = vi.fn(() => {
    this.active = true;
    return this;
  });

  disconnect = vi.fn(() => {
    const wasConnected = this.connected;
    this.active = false;
    this.connected = false;
    this.id = undefined;
    if (wasConnected) this.fire("disconnect", "io client disconnect");
    return this;
  });

  on(event: string, fn: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return this;
  }

  off(event: string, fn: Listener) {
    this.listeners.get(event)?.delete(fn);
    return this;
  }

  emit(event: string, payload: unknown) {
    this.emitted.push([event, payload]);
    return this;
  }

  fire(event: string, ...args: unknown[]) {
    for (const fn of [...(this.listeners.get(event) ?? [])]) fn(...args);
  }

  // --- test drivers ---

  /** The server accepts the connection the client opened. */
  accept() {
    expect(this.active).toBe(true);
    this.connected = true;
    this.id = `sid-${this.nextId++}`;
    this.fire("connect");
  }

  /** socket.io-client 4.8 on a CONNECT_ERROR packet: destroy(), then connect_error. */
  reject(message: string, data?: unknown) {
    this.active = false;
    this.connected = false;
    const err = Object.assign(new Error(message), { data });
    this.fire("connect_error", err);
  }

  /** A transport failure: the socket stays active, the manager reconnects. */
  drop() {
    this.connected = false;
    this.id = undefined;
    this.fire("disconnect", "transport close");
  }

  views() {
    return this.emitted.filter(([event]) => event === "view_entity").map(([, p]) => p);
  }

  leaves() {
    return this.emitted.filter(([event]) => event === "leave_entity").map(([, p]) => p);
  }

  get auth() {
    let token: unknown;
    (this.options.auth as (cb: (data: { token: unknown }) => void) => void)((data) => {
      token = data.token;
    });
    return token;
  }
}

const h = vi.hoisted(() => {
  const gateListeners = new Set<(snapshot: { state: string }) => void>();
  return {
    sockets: [] as unknown[],
    token: { current: "token-1" as string | null },
    refresh: null as unknown as Mock,
    auth: { isAuthenticated: true },
    gate: {
      state: "BOOT",
      listeners: gateListeners,
    },
  };
});

vi.mock("socket.io-client", () => ({
  io: vi.fn((url: string, options: Record<string, unknown>) => {
    const socket = new FakeSocket(url, options);
    h.sockets.push(socket);
    return socket;
  }),
}));

vi.mock("@beyo/api-client", () => ({
  getAccessToken: () => h.token.current,
  refreshAccessToken: (...args: unknown[]) => h.refresh(...args),
}));

vi.mock("@beyo/lib", () => ({
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock("@beyo/auth", () => ({
  useAuthStore: (selector: (state: typeof h.auth) => unknown) => selector(h.auth),
  selectIsAuthenticated: (state: typeof h.auth) => state.isAuthenticated,
  selectWorkspaceId: () => "ws-1",
  selectUser: () => ({ id: "user-1" }),
}));

vi.mock("@beyo/system-control", () => ({
  getSystemState: () => ({ state: h.gate.state }),
  subscribeSystemState: (listener: (snapshot: { state: string }) => void) => {
    h.gate.listeners.add(listener);
    return () => h.gate.listeners.delete(listener);
  },
}));

function setGate(state: string) {
  act(() => {
    h.gate.state = state;
    for (const listener of [...h.gate.listeners]) listener({ state });
  });
}

// --- helpers ---------------------------------------------------------------

const registry: SocketEventHandlers = {};

function socketAt(index = 0): FakeSocket {
  const socket = h.sockets[index] as FakeSocket | undefined;
  if (!socket) throw new Error(`no socket #${index}`);
  return socket;
}

let statusSeen: { connected: boolean; reconnecting: boolean } | null = null;

function StatusProbe() {
  statusSeen = useSocketStatus();
  return null;
}

function View({ type, id }: { type: string; id: string | null }) {
  useEntityView(type, id);
  return null;
}

function renderProvider(children: ReactNode = null) {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider registry={registry}>
        <StatusProbe />
        {children}
      </RealtimeProvider>
    </QueryClientProvider>,
  );
  return { ...utils, invalidate };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  });
}

function view(type: string, id: string, resumed: boolean) {
  return { entity_type: type, entity_client_id: id, resumed };
}

beforeEach(() => {
  h.sockets.length = 0;
  h.token.current = "token-1";
  h.auth.isAuthenticated = true;
  h.gate.state = "BOOT";
  h.gate.listeners.clear();
  h.refresh = vi.fn(async () => "ok");
  statusSeen = null;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// --- tests -----------------------------------------------------------------

describe("RealtimeProvider — connection", () => {
  it("creates the socket with unlimited, capped reconnection and connects it itself", () => {
    renderProvider();
    const socket = socketAt();
    expect(socket.options).toMatchObject({
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 30_000,
      transports: ["websocket"],
    });
    // No gate mounted (BOOT): connects as before.
    expect(socket.connect).toHaveBeenCalledTimes(1);
    expect(socket.auth).toBe("token-1");
  });

  it("no longer registers a reconnect_failed dead end", () => {
    renderProvider();
    expect(socketAt().io.on).not.toHaveBeenCalledWith("reconnect_failed", expect.anything());
  });

  it("invalidates the active queries on every (re)connect", () => {
    const { invalidate } = renderProvider();
    const socket = socketAt();
    act(() => socket.accept());
    act(() => socket.drop());
    act(() => socket.accept());
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(statusSeen).toEqual({ connected: true, reconnecting: false });
  });

  it("a transport failure leaves reconnection to the manager (no refresh)", async () => {
    renderProvider();
    const socket = socketAt();
    act(() => socket.fire("connect_error", new Error("websocket error")));
    await flush();
    expect(h.refresh).not.toHaveBeenCalled();
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });
});

describe("RealtimeProvider — server rejection (a)", () => {
  it("refreshes (background) and connects again with the new token on 'ok'", async () => {
    h.refresh = vi.fn(async () => {
      h.token.current = "token-2";
      return "ok";
    });
    renderProvider();
    const socket = socketAt();
    act(() => socket.reject("Connection rejected by server"));
    expect(statusSeen).toEqual({ connected: false, reconnecting: true });
    await flush();

    expect(h.refresh).toHaveBeenCalledTimes(1);
    expect(h.refresh).toHaveBeenCalledWith(undefined, { activity: "background" });
    expect(socket.connect).toHaveBeenCalledTimes(2);
    expect(socket.auth).toBe("token-2");
    act(() => socket.accept());
    expect(statusSeen).toEqual({ connected: true, reconnecting: false });
  });

  it("signs out on 'invalid' and does not reconnect", async () => {
    h.refresh = vi.fn(async () => "invalid");
    const expired = vi.fn();
    window.addEventListener("auth:session-expired", expired);
    try {
      renderProvider();
      const socket = socketAt();
      act(() => socket.reject("Connection rejected by server"));
      await flush();
      expect(expired).toHaveBeenCalledTimes(1);
      expect(socket.connect).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener("auth:session-expired", expired);
    }
  });

  it("backs off when the fresh token is refused again (no tight refresh loop)", async () => {
    vi.useFakeTimers();
    renderProvider();
    const socket = socketAt();
    act(() => socket.reject("Connection rejected by server"));
    await flush();
    expect(socket.connect).toHaveBeenCalledTimes(2); // first retry: at once

    act(() => socket.reject("Connection rejected by server"));
    await flush();
    expect(h.refresh).toHaveBeenCalledTimes(2);
    expect(socket.connect).toHaveBeenCalledTimes(2); // waits
    act(() => vi.advanceTimersByTime(1_000));
    expect(socket.connect).toHaveBeenCalledTimes(3);
  });

  it("'unavailable' keeps the session, does not refresh again, and connects when the gate is READY", async () => {
    vi.useFakeTimers();
    h.gate.state = "READY";
    h.refresh = vi.fn(async () => "unavailable");
    const expired = vi.fn();
    window.addEventListener("auth:session-expired", expired);
    try {
      renderProvider();
      const socket = socketAt();
      act(() => socket.reject("Connection rejected by server"));
      await flush();
      expect(h.refresh).toHaveBeenCalledTimes(1);
      expect(socket.connect).toHaveBeenCalledTimes(1);

      // The backend went away: the gate leaves READY, then comes back.
      setGate("UNAVAILABLE");
      act(() => vi.advanceTimersByTime(60_000));
      expect(socket.connect).toHaveBeenCalledTimes(1);
      setGate("READY");
      expect(socket.connect).toHaveBeenCalledTimes(2);
      expect(h.refresh).toHaveBeenCalledTimes(1);
      expect(expired).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("auth:session-expired", expired);
    }
  });

  it("'unavailable' with the gate staying READY retries after a backoff", async () => {
    vi.useFakeTimers();
    h.gate.state = "READY";
    h.refresh = vi.fn(async () => "unavailable");
    renderProvider();
    const socket = socketAt();
    act(() => socket.reject("Connection rejected by server"));
    await flush();
    act(() => vi.advanceTimersByTime(4_999));
    expect(socket.connect).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1));
    expect(socket.connect).toHaveBeenCalledTimes(2);
  });

  it("auth_unavailable: no refresh; retries after retry_after_seconds, or at once on READY", async () => {
    vi.useFakeTimers();
    h.gate.state = "READY";
    renderProvider();
    const socket = socketAt();
    act(() =>
      socket.reject("auth_unavailable", { code: "auth_unavailable", retry_after_seconds: 7 }),
    );
    await flush();
    expect(h.refresh).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(6_999));
    expect(socket.connect).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1));
    expect(socket.connect).toHaveBeenCalledTimes(2);

    // Refused again, then the gate cycles: READY connects without waiting.
    act(() =>
      socket.reject("auth_unavailable", { code: "auth_unavailable", retry_after_seconds: 7 }),
    );
    setGate("STARTING");
    setGate("READY");
    expect(socket.connect).toHaveBeenCalledTimes(3);
    act(() => vi.advanceTimersByTime(60_000));
    expect(socket.connect).toHaveBeenCalledTimes(3);
    expect(h.refresh).not.toHaveBeenCalled();
  });
});

describe("RealtimeProvider — the gate controls the connection (b)", () => {
  it.each(["SLEEPING", "STARTING", "FAILED", "DORMANT", "UNAVAILABLE"])(
    "%s disconnects the socket; READY connects it again",
    (state) => {
      h.gate.state = "READY";
      renderProvider();
      const socket = socketAt();
      act(() => socket.accept());

      setGate(state);
      expect(socket.disconnect).toHaveBeenCalledTimes(1);
      expect(socket.active).toBe(false);
      expect(statusSeen).toEqual({ connected: false, reconnecting: true });

      setGate("READY");
      expect(socket.connect).toHaveBeenCalledTimes(2);
    },
  );

  it("does not connect while the gate is not READY at mount", () => {
    h.gate.state = "DORMANT";
    renderProvider();
    const socket = socketAt();
    expect(socket.connect).not.toHaveBeenCalled();
    setGate("READY");
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it("a rejection refreshed while the gate sleeps connects only on READY", async () => {
    h.gate.state = "READY";
    let resolve!: (outcome: string) => void;
    h.refresh = vi.fn(() => new Promise((r) => (resolve = r)));
    renderProvider();
    const socket = socketAt();
    act(() => socket.reject("Connection rejected by server"));
    setGate("SLEEPING");
    await act(async () => resolve("ok"));
    await flush();
    expect(socket.connect).toHaveBeenCalledTimes(1);
    setGate("READY");
    expect(socket.connect).toHaveBeenCalledTimes(2);
  });

  it("a gate cycle during the refresh waits for the refresh (old token never reused)", async () => {
    h.gate.state = "READY";
    let resolve!: (outcome: string) => void;
    h.refresh = vi.fn(() => new Promise((r) => (resolve = r)));
    renderProvider();
    const socket = socketAt();
    act(() => socket.reject("Connection rejected by server"));
    setGate("STARTING");
    setGate("READY");
    expect(socket.connect).toHaveBeenCalledTimes(1);
    await act(async () => resolve("ok"));
    await flush();
    expect(socket.connect).toHaveBeenCalledTimes(2);
  });

  it("READY -> BOOT (gate unmounted) keeps a pending retry's delay", async () => {
    vi.useFakeTimers();
    h.gate.state = "READY";
    renderProvider();
    const socket = socketAt();
    act(() =>
      socket.reject("auth_unavailable", { code: "auth_unavailable", retry_after_seconds: 5 }),
    );
    setGate("BOOT");
    expect(socket.connect).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(5_000));
    expect(socket.connect).toHaveBeenCalledTimes(2);
  });

  it("an unchanged READY snapshot does not reconnect", () => {
    h.gate.state = "READY";
    renderProvider();
    const socket = socketAt();
    setGate("READY");
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it("disconnects and stops listening to the gate on unmount", () => {
    const { unmount } = renderProvider();
    const socket = socketAt();
    unmount();
    expect(socket.disconnect).toHaveBeenCalled();
    expect(h.gate.listeners.size).toBe(0);
  });
});

describe("RealtimeProvider — entity views (c)", () => {
  it("announces a view once per connection: resumed=false first, true after reconnects", () => {
    renderProvider(<View type="conversation" id="conv-1" />);
    const socket = socketAt();
    expect(socket.views()).toEqual([]); // nothing while disconnected

    act(() => socket.accept());
    expect(socket.views()).toEqual([view("conversation", "conv-1", false)]);

    act(() => socket.drop());
    act(() => socket.accept());
    expect(socket.views()).toEqual([
      view("conversation", "conv-1", false),
      view("conversation", "conv-1", true),
    ]);
  });

  it("re-announces after a gate cycle (resumed) and after a rejection recovery", async () => {
    h.gate.state = "READY";
    renderProvider(<View type="conversation" id="conv-1" />);
    const socket = socketAt();
    act(() => socket.accept());
    setGate("DORMANT");
    setGate("READY");
    act(() => socket.accept());
    act(() => socket.drop());
    act(() => socket.reject("Connection rejected by server"));
    await flush();
    act(() => socket.accept());
    expect(socket.views()).toEqual([
      view("conversation", "conv-1", false),
      view("conversation", "conv-1", true),
      view("conversation", "conv-1", true),
    ]);
    expect(socket.leaves()).toEqual([]);
  });

  it("a view mounted on a connected socket is emitted once, and not again for the same connection", () => {
    function Toggle() {
      const [on, setOn] = useState(false);
      (globalThis as { __toggle?: () => void }).__toggle = () => setOn(true);
      return on ? <View type="task_step" id="step-1" /> : null;
    }
    renderProvider(<Toggle />);
    const socket = socketAt();
    act(() => socket.accept());
    act(() => (globalThis as { __toggle?: () => void }).__toggle?.());
    expect(socket.views()).toEqual([view("task_step", "step-1", false)]);
    // A spurious second connect event on the same connection: no double emit.
    act(() => socket.fire("connect"));
    expect(socket.views()).toHaveLength(1);
  });

  it("ref-counts: two consumers share one view; leave only after both unmount", () => {
    function Consumers({ count }: { count: number }) {
      return (
        <>
          {count >= 1 ? <View type="conversation" id="conv-1" /> : null}
          {count >= 2 ? <View type="conversation" id="conv-1" /> : null}
        </>
      );
    }
    const queryClient = new QueryClient();
    const tree = (count: number) => (
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider registry={registry}>
          <Consumers count={count} />
        </RealtimeProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(tree(2));
    const socket = socketAt();
    act(() => socket.accept());
    expect(socket.views()).toEqual([view("conversation", "conv-1", false)]);

    rerender(tree(1));
    expect(socket.leaves()).toEqual([]);
    rerender(tree(0));
    expect(socket.leaves()).toEqual([
      { entity_type: "conversation", entity_client_id: "conv-1" },
    ]);

    // Gone: not re-announced on the next connection.
    act(() => socket.drop());
    act(() => socket.accept());
    expect(socket.views()).toHaveLength(1);
  });

  it("does not emit leave_entity while disconnected (nothing buffered)", () => {
    const queryClient = new QueryClient();
    const tree = (mounted: boolean) => (
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider registry={registry}>
          {mounted ? <View type="conversation" id="conv-1" /> : null}
        </RealtimeProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(tree(true));
    const socket = socketAt();
    act(() => socket.accept());
    act(() => socket.drop());
    rerender(tree(false));
    expect(socket.leaves()).toEqual([]);
    act(() => socket.accept());
    expect(socket.views()).toHaveLength(1);
  });

  it("an idle socket emits nothing on reconnect when no view is open", () => {
    renderProvider();
    const socket = socketAt();
    act(() => socket.accept());
    act(() => socket.drop());
    act(() => socket.accept());
    expect(socket.emitted).toEqual([]);
  });

  it("skips null entity ids", () => {
    renderProvider(<View type="conversation" id={null} />);
    const socket = socketAt();
    act(() => socket.accept());
    expect(socket.views()).toEqual([]);
  });
});
