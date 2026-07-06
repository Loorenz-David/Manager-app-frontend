import { createContext, useContext, type ReactNode } from 'react';
import {
  useSettingsViewController,
  type SettingsViewController,
} from '../controllers/use-settings-view.controller';

const SettingsViewContext = createContext<SettingsViewController | null>(null);

type Props = { children: ReactNode };

export function useSettingsViewContext(): SettingsViewController {
  const context = useContext(SettingsViewContext);
  if (context === null) {
    throw new Error('useSettingsViewContext must be used inside SettingsViewProvider');
  }
  return context;
}

export function SettingsViewProvider({ children }: Props): React.JSX.Element {
  const controller = useSettingsViewController();
  return <SettingsViewContext.Provider value={controller}>{children}</SettingsViewContext.Provider>;
}
