import { useEffect } from "react";
import { useSocket } from "./use-socket";

export function useEntityView(entityType: string, entityClientId: string | null): void {
  const socket = useSocket();

  useEffect(() => {
    if (!entityClientId) {
      console.debug(`[RT:view_entity] skipped — no entityClientId yet (type="${entityType}")`);
      return;
    }
    if (!socket) {
      console.warn(`[RT:view_entity] skipped — socket is null (type="${entityType}", id="${entityClientId}")`);
      return;
    }

    console.info(`[RT:view_entity] joining room type="${entityType}" id="${entityClientId}"`);
    socket.emit("view_entity", {
      entity_type: entityType,
      entity_client_id: entityClientId,
    });

    return () => {
      console.info(`[RT:view_entity] leaving room type="${entityType}" id="${entityClientId}"`);
      socket.emit("leave_entity", {
        entity_type: entityType,
        entity_client_id: entityClientId,
      });
    };
  }, [socket, entityType, entityClientId]);
}
