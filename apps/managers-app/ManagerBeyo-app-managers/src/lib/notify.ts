import { toast } from 'sonner';

function buildDescription(description?: string) {
  return description ? { description } : undefined;
}

export const notify = {
  success(title: string, description?: string) {
    toast.success(title, buildDescription(description));
  },
  error(title: string, description?: string) {
    toast.error(title, buildDescription(description));
  },
  info(title: string, description?: string) {
    toast(title, buildDescription(description));
  },
};
