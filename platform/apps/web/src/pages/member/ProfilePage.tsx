import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Save, Upload } from 'lucide-react';

import { uploadImage } from '@/api/admin';
import { useChangePassword, useMemberMe, useUpdateMemberMe } from '@/api/member';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/PageHeader';
import { getApiErrorMessage } from '@/lib/apiError';

export function ProfilePage() {
  const { data } = useMemberMe();
  const update = useUpdateMemberMe();
  const changePw = useChangePassword();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    profileImage: '',
    age: '',
    heightCm: '',
    currentWeightKg: '',
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    if (!data) return;
    setForm({
      fullName: data.fullName,
      profileImage: data.profileImage ?? '',
      age: data.memberProfile?.age?.toString() ?? '',
      heightCm: data.memberProfile?.heightCm?.toString() ?? '',
      currentWeightKg: data.memberProfile?.currentWeightKg?.toString() ?? '',
    });
  }, [data]);

  async function pickAvatar(file: File) {
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, profileImage: url }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  function save() {
    update.mutate(
      {
        fullName: form.fullName,
        profileImage: form.profileImage || null,
        profile: {
          age: form.age ? Number(form.age) : null,
          heightCm: form.heightCm ? Number(form.heightCm) : null,
          currentWeightKg: form.currentWeightKg ? Number(form.currentWeightKg) : null,
        },
      },
      {
        onSuccess: () => toast.success('Profile updated'),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }

  function changePassword() {
    if (pw.newPassword.length < 6) return toast.error('Password too short');
    changePw.mutate(pw, {
      onSuccess: () => {
        toast.success('Password changed');
        setPw({ currentPassword: '', newPassword: '' });
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  }

  return (
    <div>
      <PageHeader title="Profile" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-base font-semibold">Your details</h3>
          <div className="mb-4 flex items-center gap-3">
            {form.profileImage ? (
              <img src={form.profileImage} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-full bg-ink-700 text-2xl font-bold">
                {form.fullName.slice(0, 1).toUpperCase() || '?'}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && e.target.files[0] && pickAvatar(e.target.files[0])}
            />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            {form.profileImage ? (
              <Button variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, profileImage: '' }))}>
                Remove
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3">
            <Field label="Full name">
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </Field>
            <Field label="Phone (read only)">
              <Input value={data?.phone ?? ''} disabled />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Age">
                <Input
                  inputMode="numeric"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                />
              </Field>
              <Field label="Height (cm)">
                <Input
                  inputMode="decimal"
                  value={form.heightCm}
                  onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                />
              </Field>
              <Field label="Weight (kg)">
                <Input
                  inputMode="decimal"
                  value={form.currentWeightKg}
                  onChange={(e) => setForm({ ...form, currentWeightKg: e.target.value })}
                />
              </Field>
            </div>
            <div className="text-right">
              <Button onClick={save} loading={update.isPending}>
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-base font-semibold">Change password</h3>
          <div className="grid gap-3">
            <Field label="Current password">
              <Input
                type="password"
                value={pw.currentPassword}
                onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              />
            </Field>
            <Field label="New password">
              <Input
                type="password"
                value={pw.newPassword}
                onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
              />
            </Field>
            <div className="text-right">
              <Button
                onClick={changePassword}
                loading={changePw.isPending}
                disabled={pw.currentPassword.length < 6 || pw.newPassword.length < 6}
              >
                Update password
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
