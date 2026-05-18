// Shared TS types mirroring API responses (kept narrow and readable).

export type Role = 'ADMIN' | 'MEMBER';
export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type Goal =
  | 'MUSCLE_GAIN'
  | 'FAT_LOSS'
  | 'STRENGTH'
  | 'ENDURANCE'
  | 'GENERAL_FITNESS'
  | 'RECOMP';
export type FitnessLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type PhotoType = 'FRONT' | 'SIDE' | 'BACK' | 'OTHER';
export type MealStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED';
export type NoteKind = 'GENERAL' | 'WORKOUT' | 'NUTRITION' | 'WEEKLY_FEEDBACK' | 'PLAN_UPDATE';
export type NotificationType =
  | 'PLAN_ASSIGNED'
  | 'NUTRITION_ASSIGNED'
  | 'NOTE_ADDED'
  | 'PHOTO_REMINDER'
  | 'WEIGHT_REMINDER'
  | 'CHECKIN_REVIEWED'
  | 'GENERIC';

export interface SiteSettings {
  id: number;
  brandName: string;
  tagline: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  heroFontScale: number;
  isDark: boolean;
  whatsappNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  twitter: string | null;
  facebook: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}

export interface LandingSection {
  id: string;
  key: string;
  order: number;
  isVisible: boolean;
  title: string | null;
  subtitle: string | null;
  content: Record<string, unknown>;
  image: string | null;
  ctaLabel: string | null;
  ctaLink: string | null;
}

export interface Service {
  id: string; order: number; icon: string; title: string; description: string; isVisible: boolean;
}
export interface Testimonial {
  id: string; order: number; name: string; image: string | null; rating: number; text: string; isVisible: boolean;
}
export interface FAQ {
  id: string; order: number; question: string; answer: string; isVisible: boolean;
}
export interface PricingPlan {
  id: string; order: number; name: string; description: string | null;
  priceCents: number; currency: string; durationDays: number;
  features: string[]; ctaLabel: string; ctaLink: string | null;
  isPopular: boolean; isVisible: boolean;
}

export interface LandingPayload {
  settings: SiteSettings;
  sections: LandingSection[];
  services: Service[];
  testimonials: Testimonial[];
  faqs: FAQ[];
  pricingPlans: PricingPlan[];
}

export interface MemberProfile {
  id: string;
  userId: string;
  age: number | null;
  gender: Gender | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  goal: Goal | null;
  fitnessLevel: FitnessLevel | null;
  medicalNotes: string | null;
  status: MemberStatus;
  startDate: string | null;
  expiryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberUser {
  id: string;
  phone: string;
  fullName: string;
  profileImage: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  memberProfile: MemberProfile | null;
}

export interface ExerciseDef {
  id: string;
  dayId: string;
  libraryId: string | null;
  name: string;
  muscleGroup: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  instructions: string | null;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  tempo: string | null;
  rpe: number | null;
  notes: string | null;
  order: number;
}

export interface TrainingDay {
  id: string;
  planId: string;
  dayNumber: number;
  name: string;
  targetMuscles: string[];
  notes: string | null;
  exercises: ExerciseDef[];
}

export interface TrainingPlan {
  id: string;
  memberId: string | null;
  authorId: string | null;
  isTemplate: boolean;
  isActive: boolean;
  name: string;
  goal: Goal | null;
  startDate: string | null;
  endDate: string | null;
  daysPerWeek: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  days?: TrainingDay[];
  member?: { id: string; fullName: string };
}

export interface FoodItem {
  id: string;
  mealId: string;
  libraryId: string | null;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  alternatives: string[];
  order: number;
}

export interface Meal {
  id: string;
  planId: string;
  order: number;
  name: string;
  time: string | null;
  notes: string | null;
  foods: FoodItem[];
}

export interface NutritionPlan {
  id: string;
  memberId: string | null;
  authorId: string | null;
  isTemplate: boolean;
  isActive: boolean;
  name: string;
  goal: Goal | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  waterMl: number;
  mealsPerDay: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  meals?: Meal[];
  member?: { id: string; fullName: string };
}

export interface WeightLog { id: string; memberId: string; date: string; weightKg: number; notes: string | null; }
export interface BodyMeasurementRow {
  id: string; memberId: string; date: string;
  chest: number | null; waist: number | null; hip: number | null; thigh: number | null;
  calf: number | null; biceps: number | null; forearm: number | null; shoulder: number | null;
  neck: number | null; bodyFatPct: number | null; notes: string | null;
}
export interface ProgressPhoto { id: string; memberId: string; date: string; type: PhotoType; url: string; notes: string | null; }
export interface CheckIn {
  id: string; memberId: string; weekStart: string;
  weightKg: number | null; energy: number | null; sleep: number | null; hunger: number | null;
  stress: number | null; workoutScore: number | null; nutritionScore: number | null; mood: number | null;
  notes: string | null; issues: string | null; adminFeedback: string | null; reviewedAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface AdminNote {
  id: string; memberId: string; authorId: string | null; body: string;
  isPrivate: boolean; kind: NoteKind; createdAt: string; updatedAt: string;
  author?: { id: string; fullName: string };
}

export interface MemberNote {
  id: string; memberId: string; body: string; createdAt: string; updatedAt: string;
}

export interface Notification {
  id: string; userId: string; type: NotificationType;
  title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string;
}

export interface ExerciseLibraryItem {
  id: string; name: string; muscleGroup: string;
  videoUrl: string | null; imageUrl: string | null; instructions: string | null;
  defaultSets: number; defaultRepsMin: number; defaultRepsMax: number; defaultRestSeconds: number;
  createdAt: string; updatedAt: string;
}

export interface FoodLibraryItem {
  id: string; name: string; servingSize: number; unit: string;
  calories: number; proteinG: number; carbsG: number; fatsG: number;
  createdAt: string; updatedAt: string;
}

export interface AdminOverview {
  totals: {
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
    expiredMembers: number;
  };
  recentWeights: (WeightLog & { member: { id: string; fullName: string; profileImage: string | null } })[];
  recentWorkouts: { id: string; date: string; member: { id: string; fullName: string } }[];
  recentPhotos: (ProgressPhoto & { member: { id: string; fullName: string } })[];
}

export interface MemberOverview {
  me: { id: string; fullName: string; profileImage: string | null; memberProfile: MemberProfile | null };
  plan: TrainingPlan | null;
  nutrition: NutritionPlan | null;
  latestWeight: WeightLog | null;
  latestNote: AdminNote | null;
  adherence: { workoutAdherence: number | null; nutritionAdherence: number | null };
}

export interface PersonalRecord {
  exerciseId: string;
  name: string;
  maxWeight: number;
  bestReps: number;
  bestVolume: number;
}
