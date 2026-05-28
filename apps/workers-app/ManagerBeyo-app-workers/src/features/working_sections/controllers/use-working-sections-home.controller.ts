import { useMemo } from "react";
import { useWorkerWorkingSectionsQuery } from "../api/use-worker-working-sections";
import {
  toWorkingSectionViewModel,
  type WorkingSectionViewModel,
} from "../types";

export type WorkingSectionsHomeController = {
  sections: WorkingSectionViewModel[];
  isPending: boolean;
  isError: boolean;
};

export function useWorkingSectionsHomeController(): WorkingSectionsHomeController {
  const query = useWorkerWorkingSectionsQuery();

  const sections = useMemo(
    () => (query.data ?? []).map(toWorkingSectionViewModel),
    [query.data],
  );

  return {
    sections,
    isPending: query.isPending,
    isError: query.isError,
  };
}
