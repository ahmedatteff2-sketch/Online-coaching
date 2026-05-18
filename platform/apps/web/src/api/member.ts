import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from './client';
import type {
  AdminNote,
  BodyMeasurementRow,
  CheckIn,
  MemberNote,
  MemberOverview,
  MemberUser,
  Notification,
  NutritionPlan,
  PersonalRecord,
  ProgressPhoto,
  TrainingPlan,
  WeightLog,
  PhotoType,
  MealStatus,
} from './types';

// =====================================================================
// Profile
// =====================================================================
export function useMemberMe() {
  return useQuery({
    queryKey: ['member', 'me'],
    queryFn: () => unwrap<MemberUser>(api.get('/member/me')),
  });
}

export function useUpdateMemberMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => unwrap<MemberUser>(api.patch('/member/me', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', 'me'] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      api.post('/member/me/password', body),
  });
}

export function useMemberOverviewSelf() {
  return useQuery({
    queryKey: ['member', 'overview'],
    queryFn: () => unwrap<MemberOverview>(api.get('/member/overview')),
  });
}

// =====================================================================
// Training plan + workout logs
// =====================================================================
export function useMemberTrainingPlan() {
  return useQuery({
    queryKey: ['member', 'training-plan'],
    queryFn: () => unwrap<TrainingPlan | null>(api.get('/member/training-plan')),
  });
}

export interface WorkoutLogPayload {
  dayId?: string | null;
  date?: string;
  durationSec?: number | null;
  notes?: string | null;
  sets: {
    exerciseId: string;
    setNumber: number;
    weightKg?: number | null;
    reps?: number | null;
    completed?: boolean;
    restSecondsUsed?: number | null;
    rpe?: number | null;
    notes?: string | null;
  }[];
}

export function useLogWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WorkoutLogPayload) => api.post('/member/workout-logs', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', 'workout-logs'] });
      qc.invalidateQueries({ queryKey: ['member', 'overview'] });
      qc.invalidateQueries({ queryKey: ['member', 'personal-records'] });
    },
  });
}

export function useWorkoutLogs(params: { from?: string; to?: string; dayId?: string } = {}) {
  return useQuery({
    queryKey: ['member', 'workout-logs', params],
    queryFn: () => unwrap<unknown[]>(api.get('/member/workout-logs', { params })),
  });
}

export function usePersonalRecords() {
  return useQuery({
    queryKey: ['member', 'personal-records'],
    queryFn: () => unwrap<PersonalRecord[]>(api.get('/member/personal-records')),
  });
}

// =====================================================================
// Nutrition
// =====================================================================
export function useMemberNutritionPlan() {
  return useQuery({
    queryKey: ['member', 'nutrition-plan'],
    queryFn: () => unwrap<NutritionPlan | null>(api.get('/member/nutrition-plan')),
  });
}

export function useLogNutrition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { mealId: string; status: MealStatus; percentFollowed?: number | null; notes?: string | null }) =>
      api.post('/member/nutrition-logs', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', 'nutrition-logs'] });
      qc.invalidateQueries({ queryKey: ['member', 'overview'] });
    },
  });
}

export function useNutritionLogs() {
  return useQuery({
    queryKey: ['member', 'nutrition-logs'],
    queryFn: () => unwrap<{ id: string; mealId: string | null; date: string; status: MealStatus }[]>(
      api.get('/member/nutrition-logs'),
    ),
  });
}

// =====================================================================
// Weight / Measurements / Photos
// =====================================================================
export function useWeights() {
  return useQuery({
    queryKey: ['member', 'weights'],
    queryFn: () => unwrap<WeightLog[]>(api.get('/member/weights')),
  });
}

export function useAddWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { weightKg: number; date?: string; notes?: string | null }) =>
      api.post('/member/weights', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', 'weights'] });
      qc.invalidateQueries({ queryKey: ['member', 'overview'] });
    },
  });
}

export function useMeasurements() {
  return useQuery({
    queryKey: ['member', 'measurements'],
    queryFn: () => unwrap<BodyMeasurementRow[]>(api.get('/member/measurements')),
  });
}

export function useAddMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<BodyMeasurementRow> & { date?: string }) =>
      api.post('/member/measurements', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', 'measurements'] }),
  });
}

export function usePhotos() {
  return useQuery({
    queryKey: ['member', 'photos'],
    queryFn: () => unwrap<ProgressPhoto[]>(api.get('/member/photos')),
  });
}

export function useUploadPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { url: string; type: PhotoType; date?: string; notes?: string | null }) =>
      api.post('/member/photos', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', 'photos'] }),
  });
}

export function useDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/member/photos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', 'photos'] }),
  });
}

// =====================================================================
// Check-ins
// =====================================================================
export function useCheckIns() {
  return useQuery({
    queryKey: ['member', 'check-ins'],
    queryFn: () => unwrap<CheckIn[]>(api.get('/member/check-ins')),
  });
}

export function useSubmitCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CheckIn>) => api.post('/member/check-ins', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', 'check-ins'] }),
  });
}

// =====================================================================
// Notes / Notifications
// =====================================================================
export function useCoachNotes() {
  return useQuery({
    queryKey: ['member', 'coach-notes'],
    queryFn: () => unwrap<AdminNote[]>(api.get('/member/notes')),
  });
}

export function useMyNotes() {
  return useQuery({
    queryKey: ['member', 'my-notes'],
    queryFn: () => unwrap<MemberNote[]>(api.get('/member/my-notes')),
  });
}

export function useAddMyNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { body: string }) => api.post('/member/my-notes', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', 'my-notes'] }),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['member', 'notifications'],
    queryFn: () => unwrap<Notification[]>(api.get('/member/notifications')),
  });
}

export function useReadNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/member/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', 'notifications'] }),
  });
}

export function useReadAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/member/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', 'notifications'] }),
  });
}
