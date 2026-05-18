import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from './client';
import type {
  AdminNote,
  AdminOverview,
  ExerciseLibraryItem,
  FAQ,
  FoodLibraryItem,
  LandingSection,
  MemberUser,
  MemberStatus,
  NutritionPlan,
  PricingPlan,
  Service,
  SiteSettings,
  Testimonial,
  TrainingPlan,
  WeightLog,
  BodyMeasurementRow,
  ProgressPhoto,
  CheckIn,
  MemberOverview,
} from './types';

// =====================================================================
// Overview
// =====================================================================
export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => unwrap<AdminOverview>(api.get('/admin/overview')),
  });
}

// =====================================================================
// Members
// =====================================================================
export interface MembersQuery {
  search?: string;
  status?: MemberStatus;
  page?: number;
  pageSize?: number;
}

export function useMembers(q: MembersQuery = {}) {
  return useQuery({
    queryKey: ['admin', 'members', q],
    queryFn: async () => {
      const r = await api.get('/admin/members', { params: q });
      return { items: r.data.data as MemberUser[], meta: r.data.meta as { total: number; page: number; pageSize: number } };
    },
  });
}

export function useMember(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'member', id],
    queryFn: () => unwrap<MemberUser>(api.get(`/admin/members/${id}`)),
    enabled: !!id,
  });
}

export function useMemberOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'member', id, 'overview'],
    queryFn: () =>
      unwrap<{
        member: MemberUser;
        weights: WeightLog[];
        measurements: BodyMeasurementRow[];
        photos: ProgressPhoto[];
        checkIns: CheckIn[];
        plans: TrainingPlan[];
        nutrition: NutritionPlan[];
      }>(api.get(`/admin/members/${id}/overview`)),
    enabled: !!id,
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => unwrap<MemberUser>(api.post('/admin/members', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'members'] }),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      unwrap<MemberUser>(api.patch(`/admin/members/${id}`, body)),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'members'] });
      qc.invalidateQueries({ queryKey: ['admin', 'member', vars.id] });
    },
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/members/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'members'] }),
  });
}

export function useResetMemberPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.post(`/admin/members/${id}/password`, { password }),
  });
}

export function useSetMemberStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MemberStatus }) =>
      api.post(`/admin/members/${id}/status`, { status }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'member', vars.id] });
      qc.invalidateQueries({ queryKey: ['admin', 'members'] });
    },
  });
}

// =====================================================================
// Training plans
// =====================================================================
export function useTrainingPlans(params: { memberId?: string; template?: 'true' | 'false' } = {}) {
  return useQuery({
    queryKey: ['admin', 'training-plans', params],
    queryFn: () => unwrap<TrainingPlan[]>(api.get('/admin/training-plans', { params })),
  });
}

export function useTrainingPlan(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'training-plan', id],
    queryFn: () => unwrap<TrainingPlan>(api.get(`/admin/training-plans/${id}`)),
    enabled: !!id,
  });
}

export function useCreateTrainingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => unwrap<TrainingPlan>(api.post('/admin/training-plans', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'training-plans'] }),
  });
}

export function useUpdateTrainingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      unwrap<TrainingPlan>(api.patch(`/admin/training-plans/${id}`, body)),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'training-plan', vars.id] });
      qc.invalidateQueries({ queryKey: ['admin', 'training-plans'] });
    },
  });
}

export function useDeleteTrainingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/training-plans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'training-plans'] }),
  });
}

export function useDuplicateTrainingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<TrainingPlan>(api.post(`/admin/training-plans/${id}/duplicate`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'training-plans'] }),
  });
}

export function useAssignTrainingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, memberIds }: { id: string; memberIds: string[] }) =>
      api.post(`/admin/training-plans/${id}/assign`, { memberIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'training-plans'] }),
  });
}

// =====================================================================
// Nutrition plans
// =====================================================================
export function useNutritionPlans(params: { memberId?: string; template?: 'true' | 'false' } = {}) {
  return useQuery({
    queryKey: ['admin', 'nutrition-plans', params],
    queryFn: () => unwrap<NutritionPlan[]>(api.get('/admin/nutrition-plans', { params })),
  });
}

export function useNutritionPlan(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'nutrition-plan', id],
    queryFn: () => unwrap<NutritionPlan>(api.get(`/admin/nutrition-plans/${id}`)),
    enabled: !!id,
  });
}

export function useCreateNutritionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => unwrap<NutritionPlan>(api.post('/admin/nutrition-plans', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'nutrition-plans'] }),
  });
}

export function useUpdateNutritionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      unwrap<NutritionPlan>(api.patch(`/admin/nutrition-plans/${id}`, body)),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'nutrition-plan', vars.id] });
      qc.invalidateQueries({ queryKey: ['admin', 'nutrition-plans'] });
    },
  });
}

export function useDeleteNutritionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/nutrition-plans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'nutrition-plans'] }),
  });
}

// =====================================================================
// Libraries
// =====================================================================
export function useExerciseLibrary(search = '') {
  return useQuery({
    queryKey: ['admin', 'exercise-library', search],
    queryFn: () => unwrap<ExerciseLibraryItem[]>(api.get('/admin/exercise-library', { params: { search } })),
  });
}

export function useFoodLibrary(search = '') {
  return useQuery({
    queryKey: ['admin', 'food-library', search],
    queryFn: () => unwrap<FoodLibraryItem[]>(api.get('/admin/food-library', { params: { search } })),
  });
}

function makeCrud<T>(base: string, key: string) {
  return {
    useCreate() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (body: unknown) => unwrap<T>(api.post(base, body)),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', key] }),
      });
    },
    useUpdate() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, body }: { id: string; body: unknown }) =>
          unwrap<T>(api.patch(`${base}/${id}`, body)),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', key] }),
      });
    },
    useDelete() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (id: string) => api.delete(`${base}/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', key] }),
      });
    },
  };
}

export const exerciseLibrary = makeCrud<ExerciseLibraryItem>('/admin/exercise-library', 'exercise-library');
export const foodLibrary = makeCrud<FoodLibraryItem>('/admin/food-library', 'food-library');
export const services = makeCrud<Service>('/admin/services', 'services');
export const testimonials = makeCrud<Testimonial>('/admin/testimonials', 'testimonials');
export const faqs = makeCrud<FAQ>('/admin/faqs', 'faqs');
export const pricingPlans = makeCrud<PricingPlan>('/admin/pricing-plans', 'pricing-plans');
export const sections = makeCrud<LandingSection>('/admin/sections', 'sections');

// =====================================================================
// Site settings
// =====================================================================
export function useSiteSettings() {
  return useQuery({
    queryKey: ['admin', 'site-settings'],
    queryFn: () => unwrap<SiteSettings>(api.get('/admin/site-settings')),
  });
}

export function useUpdateSiteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SiteSettings>) => unwrap<SiteSettings>(api.patch('/admin/site-settings', body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'site-settings'] });
      qc.invalidateQueries({ queryKey: ['landing'] });
    },
  });
}

// =====================================================================
// Sections + Services + Testimonials + FAQs + Pricing (lists)
// =====================================================================
export function useSections() {
  return useQuery({
    queryKey: ['admin', 'sections'],
    queryFn: () => unwrap<LandingSection[]>(api.get('/admin/sections')),
  });
}
export function useServicesAdmin() {
  return useQuery({
    queryKey: ['admin', 'services'],
    queryFn: () => unwrap<Service[]>(api.get('/admin/services')),
  });
}
export function useTestimonialsAdmin() {
  return useQuery({
    queryKey: ['admin', 'testimonials'],
    queryFn: () => unwrap<Testimonial[]>(api.get('/admin/testimonials')),
  });
}
export function useFaqsAdmin() {
  return useQuery({
    queryKey: ['admin', 'faqs'],
    queryFn: () => unwrap<FAQ[]>(api.get('/admin/faqs')),
  });
}
export function usePricingPlansAdmin() {
  return useQuery({
    queryKey: ['admin', 'pricing-plans'],
    queryFn: () => unwrap<PricingPlan[]>(api.get('/admin/pricing-plans')),
  });
}

// =====================================================================
// Notes
// =====================================================================
export function useAdminNotes(memberId?: string) {
  return useQuery({
    queryKey: ['admin', 'notes', memberId],
    queryFn: () => unwrap<AdminNote[]>(api.get('/admin/notes', { params: { memberId } })),
    enabled: !!memberId,
  });
}

export function useCreateAdminNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => unwrap<AdminNote>(api.post('/admin/notes', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'notes'] }),
  });
}

export function useDeleteAdminNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'notes'] }),
  });
}

// =====================================================================
// File upload helper
// =====================================================================
export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const r = await api.post('/uploads/image', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return (r.data.data as { url: string }).url;
}

// re-export the member-overview type for convenience
export type { MemberOverview };
