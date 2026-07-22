export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  editor: (presentationId: string) => `/editor/${presentationId}`,
} as const;
