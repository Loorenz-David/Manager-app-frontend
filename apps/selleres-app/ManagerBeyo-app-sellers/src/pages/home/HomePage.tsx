import { HomeView, HomeViewProvider } from "@/features/home";

export function HomePage(): React.JSX.Element {
  return (
    <HomeViewProvider>
      <HomeView />
    </HomeViewProvider>
  );
}
