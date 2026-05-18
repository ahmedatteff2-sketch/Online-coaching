import { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { useAuthStore } from '@/store/auth';
import { authApi } from '@/api/auth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageLoader } from '@/components/PageLoader';

import { LandingPage } from '@/pages/public/LandingPage';
import { LoginPage } from '@/pages/public/LoginPage';
import { ContactPage } from '@/pages/public/ContactPage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';

import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { MembersListPage } from '@/pages/admin/MembersListPage';
import { MemberNewPage } from '@/pages/admin/MemberNewPage';
import { MemberDetailPage } from '@/pages/admin/MemberDetailPage';
import { TrainingPlansPage } from '@/pages/admin/TrainingPlansPage';
import { TrainingPlanEditorPage } from '@/pages/admin/TrainingPlanEditorPage';
import { NutritionPlansPage } from '@/pages/admin/NutritionPlansPage';
import { NutritionPlanEditorPage } from '@/pages/admin/NutritionPlanEditorPage';
import { ExerciseLibraryPage } from '@/pages/admin/ExerciseLibraryPage';
import { FoodLibraryPage } from '@/pages/admin/FoodLibraryPage';
import { LandingEditorPage } from '@/pages/admin/LandingEditorPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';

import { MemberLayout } from '@/pages/member/MemberLayout';
import { MemberDashboard } from '@/pages/member/MemberDashboard';
import { WorkoutsPage } from '@/pages/member/WorkoutsPage';
import { WorkoutDayPage } from '@/pages/member/WorkoutDayPage';
import { NutritionPage } from '@/pages/member/NutritionPage';
import { WeightPage } from '@/pages/member/WeightPage';
import { MeasurementsPage } from '@/pages/member/MeasurementsPage';
import { PhotosPage } from '@/pages/member/PhotosPage';
import { ProgressPage } from '@/pages/member/ProgressPage';
import { CheckInPage } from '@/pages/member/CheckInPage';
import { NotesPage } from '@/pages/member/NotesPage';
import { ProfilePage } from '@/pages/member/ProfilePage';

export default function App() {
  const { user, accessToken, hydrated, setSession, clearSession } = useAuthStore();

  // Boot: if we have persisted user but no access token, try to refresh.
  useEffect(() => {
    if (!hydrated) return;
    if (user && !accessToken) {
      authApi
        .refresh()
        .then((r) => setSession({ user: r.user, accessToken: r.accessToken }))
        .catch(() => clearSession());
    }
  }, [hydrated, user, accessToken, setSession, clearSession]);

  if (!hydrated) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Admin */}
        <Route
          element={
            <ProtectedRoute role="ADMIN">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/members" element={<MembersListPage />} />
          <Route path="/admin/members/new" element={<MemberNewPage />} />
          <Route path="/admin/members/:id" element={<MemberDetailPage />} />
          <Route path="/admin/training-plans" element={<TrainingPlansPage />} />
          <Route path="/admin/training-plans/:id" element={<TrainingPlanEditorPage />} />
          <Route path="/admin/nutrition-plans" element={<NutritionPlansPage />} />
          <Route path="/admin/nutrition-plans/:id" element={<NutritionPlanEditorPage />} />
          <Route path="/admin/exercise-library" element={<ExerciseLibraryPage />} />
          <Route path="/admin/food-library" element={<FoodLibraryPage />} />
          <Route path="/admin/landing-page-editor" element={<LandingEditorPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>

        {/* Member */}
        <Route
          element={
            <ProtectedRoute role="MEMBER">
              <MemberLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/member" element={<Navigate to="/member/dashboard" replace />} />
          <Route path="/member/dashboard" element={<MemberDashboard />} />
          <Route path="/member/workouts" element={<WorkoutsPage />} />
          <Route path="/member/workouts/:dayId" element={<WorkoutDayPage />} />
          <Route path="/member/nutrition" element={<NutritionPage />} />
          <Route path="/member/weight" element={<WeightPage />} />
          <Route path="/member/measurements" element={<MeasurementsPage />} />
          <Route path="/member/photos" element={<PhotosPage />} />
          <Route path="/member/progress" element={<ProgressPage />} />
          <Route path="/member/check-in" element={<CheckInPage />} />
          <Route path="/member/notes" element={<NotesPage />} />
          <Route path="/member/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
