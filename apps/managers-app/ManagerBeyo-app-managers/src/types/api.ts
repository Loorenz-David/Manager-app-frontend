export type ApiResponse<T> = {
  data: T;
};

export type ApiListResponse<T> = {
  data: T[];
  total: number;
  page: number;
  per_page: number;
};

export type ApiError = {
  message: string;
  code?: string;
  field?: string;
};
