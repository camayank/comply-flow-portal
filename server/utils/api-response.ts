import type { Response } from 'express';
import type { ApiErrorPayload, ApiMeta, ApiSuccessResponse, ApiErrorResponse } from '@shared/api-contract';

export function ok<T>(res: Response, data: T, meta?: ApiMeta) {
  const body: ApiSuccessResponse<T> = meta ? { data, meta } : { data };
  return res.status(200).json(body);
}

export function created<T>(res: Response, data: T, meta?: ApiMeta) {
  const body: ApiSuccessResponse<T> = meta ? { data, meta } : { data };
  return res.status(201).json(body);
}

export function accepted<T>(res: Response, data: T, meta?: ApiMeta) {
  const body: ApiSuccessResponse<T> = meta ? { data, meta } : { data };
  return res.status(202).json(body);
}

export function noContent(res: Response) {
  return res.status(204).send();
}

export function fail(
  res: Response,
  status: number,
  error: ApiErrorPayload,
  meta?: ApiMeta,
) {
  const body: ApiErrorResponse = meta ? { error, meta } : { error };
  return res.status(status).json(body);
}

export function paginated<T>(
  res: Response,
  data: T,
  meta: ApiMeta,
) {
  return res.status(200).json({ data, meta });
}
