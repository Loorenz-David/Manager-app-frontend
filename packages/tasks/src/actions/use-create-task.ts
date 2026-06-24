import { useMutation } from "@tanstack/react-query";

import { createTask } from "../api/create-task";

export function useCreateTask() {
  return useMutation({
    mutationFn: createTask,
  });
}
