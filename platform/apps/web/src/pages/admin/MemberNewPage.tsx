import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useCreateMember } from '@/api/admin';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { PageHeader } from '@/components/PageHeader';
import { ErrorMessage } from '@/components/ErrorMessage';
import { getApiErrorMessage } from '@/lib/apiError';

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  password: z.string().min(6),
  age: z
    .preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().min(8).max(110).optional()),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().or(z.literal('').transform(() => undefined)),
  heightCm: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().min(80).max(260).optional()),
  currentWeightKg: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().min(20).max(400).optional()),
  goal: z
    .enum(['MUSCLE_GAIN', 'FAT_LOSS', 'STRENGTH', 'ENDURANCE', 'GENERAL_FITNESS', 'RECOMP'])
    .optional()
    .or(z.literal('').transform(() => undefined)),
  fitnessLevel: z
    .enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
    .optional()
    .or(z.literal('').transform(() => undefined)),
  medicalNotes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function MemberNewPage() {
  const navigate = useNavigate();
  const create = useCreateMember();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(values: FormValues) {
    const body = {
      fullName: values.fullName,
      phone: values.phone,
      password: values.password,
      profile: {
        age: values.age,
        gender: values.gender,
        heightCm: values.heightCm,
        currentWeightKg: values.currentWeightKg,
        goal: values.goal,
        fitnessLevel: values.fitnessLevel,
        medicalNotes: values.medicalNotes,
      },
    };
    create.mutate(body, {
      onSuccess: (m) => {
        toast.success(`Member ${m.fullName} created`);
        navigate(`/admin/members/${m.id}`);
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  }

  return (
    <div>
      <PageHeader
        title="Add new member"
        actions={
          <Link to="/admin/members">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <Card className="max-w-3xl">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          {create.isError ? <ErrorMessage message={getApiErrorMessage(create.error)} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" error={errors.fullName?.message}>
              <Input {...register('fullName')} placeholder="Mohamed Adel" />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <Input {...register('phone')} inputMode="tel" placeholder="01012345678" />
            </Field>
            <Field label="Initial password" error={errors.password?.message}>
              <Input {...register('password')} type="text" placeholder="Min 6 characters" />
            </Field>
            <Field label="Age">
              <Input {...register('age')} inputMode="numeric" placeholder="25" />
            </Field>
            <Field label="Gender">
              <Select {...register('gender')}>
                <option value="">—</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>
            <Field label="Height (cm)">
              <Input {...register('heightCm')} inputMode="decimal" placeholder="178" />
            </Field>
            <Field label="Current weight (kg)">
              <Input {...register('currentWeightKg')} inputMode="decimal" placeholder="84.5" />
            </Field>
            <Field label="Goal">
              <Select {...register('goal')}>
                <option value="">—</option>
                <option value="FAT_LOSS">Fat loss</option>
                <option value="MUSCLE_GAIN">Muscle gain</option>
                <option value="STRENGTH">Strength</option>
                <option value="ENDURANCE">Endurance</option>
                <option value="GENERAL_FITNESS">General fitness</option>
                <option value="RECOMP">Recomposition</option>
              </Select>
            </Field>
            <Field label="Fitness level">
              <Select {...register('fitnessLevel')}>
                <option value="">—</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </Select>
            </Field>
          </div>
          <Field label="Medical notes">
            <Textarea {...register('medicalNotes')} rows={3} placeholder="Injuries, medications, allergies..." />
          </Field>
          <div className="flex justify-end gap-2">
            <Link to="/admin/members">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" loading={create.isPending}>
              <Save className="h-4 w-4" />
              Create member
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
