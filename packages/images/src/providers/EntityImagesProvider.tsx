import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";

import {
  type ImageDeleteMode,
  useEntityImagesController,
  type EntityImagesController,
  type ImageCaptureFlow,
  type ImageViewerMode,
} from "../controllers/use-entity-images.controller";
import { forceReleaseAnyCameraStream } from "../lib/camera-session-manager";
import type { ImageLinkEntityType } from "../types";

const EntityImagesContext = createContext<EntityImagesController | null>(null);

type EntityImagesProviderProps = {
  entityType: ImageLinkEntityType;
  entityClientId: string;
  viewerMode?: ImageViewerMode;
  captureFlow?: ImageCaptureFlow;
  deleteMode?: ImageDeleteMode;
  onImagesChanged?: () => void;
  children: ReactNode;
};

export function useEntityImagesContext(): EntityImagesController {
  const context = useContext(EntityImagesContext);

  if (context === null) {
    throw new Error(
      "useEntityImagesContext must be used inside EntityImagesProvider",
    );
  }

  return context;
}

export function EntityImagesProvider({
  entityType,
  entityClientId,
  viewerMode,
  captureFlow,
  deleteMode,
  onImagesChanged,
  children,
}: EntityImagesProviderProps): React.JSX.Element {
  const controller = useEntityImagesController({
    entityType,
    entityClientId,
    viewerMode,
    captureFlow,
    deleteMode,
    onImagesChanged,
  });
  useEffect(() => {
    return () => {
      forceReleaseAnyCameraStream();
    };
  }, []);

  return (
    <EntityImagesContext.Provider value={controller}>
      {children}
    </EntityImagesContext.Provider>
  );
}
