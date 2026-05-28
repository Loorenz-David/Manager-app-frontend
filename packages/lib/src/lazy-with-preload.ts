import { lazy, type ComponentType } from 'react';

type Module<T> = { default: T };

/**
 * Wraps React.lazy() so that once preload() has resolved, the component
 * renders without ever hitting the Suspense fallback.
 *
 * React.lazy() always suspends on first render because Promise .then()
 * callbacks are always async — even for already-resolved Promises. The
 * factory here returns a synchronous thenable when the module is in memory,
 * which React's lazy initializer reads synchronously, skipping the suspend.
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  factory: () => Promise<Module<T>>,
): { Component: ReturnType<typeof lazy<T>>; preload: () => Promise<void> } {
  let module: Module<T> | undefined;
  let loadingPromise: Promise<Module<T>> | undefined;

  function ensureLoading(): Promise<Module<T>> {
    if (!loadingPromise) {
      loadingPromise = factory().then((m) => {
        module = m;
        return m;
      });
    }
    return loadingPromise;
  }

  const Component = lazy((): Promise<Module<T>> => {
    if (module) {
      // Synchronous thenable: React calls .then(resolve) and resolve fires
      // immediately, so _status is already 1 when React checks synchronously.
      return {
        then(resolve: (value: Module<T>) => void) {
          resolve(module!);
        },
      } as unknown as Promise<Module<T>>;
    }
    return ensureLoading();
  });

  function preload(): Promise<void> {
    return ensureLoading().then(() => undefined);
  }

  return { Component, preload };
}
