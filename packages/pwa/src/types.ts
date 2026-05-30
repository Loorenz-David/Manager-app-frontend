export type PwaUpdateSurfaceProps = {
  onUpdate: () => Promise<void>;
};

export type PwaInstallSurfaceProps = {
  onInstall: () => Promise<void>;
};

export type PwaSurfaceOpeners = {
  openUpdatePrompt?: (props: PwaUpdateSurfaceProps) => void;
  openInstallPrompt?: (props: PwaInstallSurfaceProps) => void;
  closeInstallPrompt?: () => void;
};
