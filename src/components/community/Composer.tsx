import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { useAppUiStore } from '../../stores/appUiStore';
import { useLanguage } from '../../contexts/LanguageContext';

type ComposerProps = {
  isSubmitting?: boolean;
  onSubmit: (payload: { content: string; files: File[] }) => Promise<unknown>;
};

export default function Composer({ onSubmit, isSubmitting = false }: ComposerProps) {
  const { t } = useLanguage();
  const draft = useAppUiStore((state) => state.communityDraft);
  const setDraft = useAppUiStore((state) => state.setCommunityDraft);
  const [files, setFiles] = useState<File[]>([]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files).slice(0, 4));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const content = draft.trim();
    if (!content && files.length === 0) return;

    try {
      await onSubmit({ content, files });
      setDraft('');
      setFiles([]);
    } catch (err) {
      console.error('Failed to create post', err);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] p-4 shadow-[var(--km-shadow-sm)]"
    >
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="mb-3 w-full rounded-lg border border-[var(--km-border)] p-3 text-sm outline-none transition focus:border-[var(--km-primary)]"
        rows={3}
        maxLength={2000}
        placeholder={t('postsCommentsUpdates', 'Posts, comments and crop updates')}
      />

      {files.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {files.map((file, idx) => (
            <img
              key={`${file.name}-${idx}`}
              src={URL.createObjectURL(file)}
              alt={file.name}
              className="h-24 w-full rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--km-border)] px-3 text-sm text-[var(--km-muted)] hover:bg-slate-50">
          <ImagePlus className="h-4 w-4" />
          {t('addImages', 'Add images')} ({files.length})
          <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || (!draft.trim() && files.length === 0)}
          className="h-10 rounded-lg bg-[var(--km-primary)] px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t('posting', 'Posting...') : t('post', 'Post')}
        </button>
      </div>
    </form>
  );
}
