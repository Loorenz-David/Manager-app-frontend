import { lazyRoute } from "@beyo/ui";
import {
  Navigate,
  createBrowserRouter,
  type RouteObject,
} from "react-router-dom";

import { AppShell } from "@/app/AppShell";
import { RootRoute } from "@/app/RootRoute";
import {
  FloorGuestRoute,
  FloorProtectedRoute,
} from "@/app/router-guards";
import { ROUTES } from "@/lib/routes";

export const floorRoutes: RouteObject[] = [
  {
    element: <RootRoute />,
    children: [
      {
        element: <FloorGuestRoute />,
        children: [
          {
            path: ROUTES.signIn,
            element: lazyRoute(() =>
              import("@/pages/SignInPage").then((module) => ({
                default: module.SignInPage,
              })),
            ),
          },
        ],
      },
      {
        element: <FloorProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                path: ROUTES.home,
                element: lazyRoute(() =>
                  import("@/pages/KioskPlaceholderPage").then((module) => ({
                    default: module.KioskPlaceholderPage,
                  })),
                ),
              },
            ],
          },
        ],
      },
      {
        path: "*",
        element: <Navigate replace to={ROUTES.home} />,
      },
    ],
  },
];

export const router = createBrowserRouter(floorRoutes);
