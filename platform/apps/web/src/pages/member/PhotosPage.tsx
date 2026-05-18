import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, Upload } from 'lucide-react';

import { useDeletePhoto, usePhotos, useUploadPhoto } from '@/api/member';
import { uploadImage } from '@/api/admin'; // shared file upload helper
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Select } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';
import { PageHeader } from '@/components/PageHeader';
import { fmtDate } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/apiError';
import type { PhotoType } from '@/api/types';

export function PhotosPage() {
  const { data: photos = [] } = usePhotos();
  const upload = useUploadPhoto();
  const remove = useDeletePhoto();
  const [type, setType] = useState<PhotoType>('FRONT');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  async function pickAndUpload(file: File) {
    try {
      setBusy(true);
      const url = await uploadImage(file);
      upload.mutate(
        { url, type },
        {
          onSuccess: () => toast.success('Photo uploaded'),
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div>
      <PageHeader title="Progress photos" description="Weekly photos help you see real change." />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Type" className="sm:max-w-xs">
            <Select value={type} onChange={(e) => setType(e.target.value as PhotoType)}>
              <option value="FRONT">Front</option>
              <option value="SIDE">Side</option>
              <option value="BACK">Back</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && e.target.files[0] && pickAndUpload(e.target.files[0])}
          />
          <Button onClick={() => fileRef.current?.click()} loading={busy}>
            <Upload className="h-4 w-4" />
            Upload photo
          </Button>
        </div>
      </Card>

      {photos.length === 0 ? (
        <Empty title="No photos yet" description="Upload your first weekly photo." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="surface overflow-hidden">
              <a href={p.url} target="_blank" rel="noreferrer">
                <img src={p.url} alt="" className="aspect-[3/4] w-full object-cover" />
              </a>
              <div className="flex items-center justify-between p-2 text-xs">
                <div>
                  <div className="font-semibold">{p.type}</div>
                  <div className="text-ink-300">{fmtDate(p.date)}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (!confirm('Delete this photo?')) return;
                    remove.mutate(p.id, { onSuccess: () => toast.success('Deleted') });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
