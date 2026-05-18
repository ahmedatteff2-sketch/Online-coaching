import { useQuery, useMutation } from '@tanstack/react-query';
import { api, unwrap } from './client';
import type { LandingPayload } from './types';

export function useLanding() {
  return useQuery({
    queryKey: ['landing'],
    queryFn: () => unwrap<LandingPayload>(api.get('/landing')),
    staleTime: 60_000,
  });
}

export interface ContactPayload {
  name: string;
  phone: string;
  email?: string;
  message: string;
}

export function useSubmitContact() {
  return useMutation({
    mutationFn: (body: ContactPayload) => api.post('/contact', body).then((r) => r.data),
  });
}
