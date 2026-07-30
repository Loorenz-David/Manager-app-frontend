import { lazyRoute } from "@beyo/ui";
import { loadClockKioskPage } from "@beyo/clock-kiosk";
import {
  Navigate,
  createBrowserRouter,
  type RouteObject,
} from "react-router-dom";

import { AppShell } from "@/app/AppShell";
import { FloorKioskRoute, RootRoute } from "@/app/RootRoute";
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
            element: <FloorKioskRoute />,
            children: [
              {
                element: <AppShell />,
                children: [
                  {
                    path: ROUTES.home,
                    element: lazyRoute(loadClockKioskPage),
                  },
                ],
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
