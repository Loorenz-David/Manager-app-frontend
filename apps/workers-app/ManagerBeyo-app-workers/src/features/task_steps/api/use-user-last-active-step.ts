import { useQuery } from "@tanstack/react-query";
import { fetchUserLastActiveStep } from "./fetch-user-last-active-step";
import { taskStepKeys } from "./task-step-keys";
import type { TaskStep } from "../types";

export function useUserLastActiveStepQuery() {
  return useQuery<TaskStep | null>({
    queryKey: taskStepKeys.userLastActive(),
    queryFn: fetchUserLastActiveStep,
  });
}
