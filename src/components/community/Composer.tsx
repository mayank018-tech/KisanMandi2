import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { uploadPostImage, createPost } from '../../features/community/api';

export default function Composer({ onPost }: { onPost?: (p: any) => void }) {
  const { user, profile } = useAuth();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files).slice(0, 6));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return alert('Please login to post');
    if (!text.trim() && files.length === 0) return;

    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const f of files) {
        const publicUrl = await uploadPostImage(profile.id, f);
        uploadedUrls.push(publicUrl);
      }

      const post = await createPost(profile.id, text.trim(), uploadedUrls);
      onPost && onPost(post);
      setText('');
      setFiles([]);
    } catch (err) {
      console.error(err);
      alert('Failed to create post');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full p-3 border border-gray-200 rounded mb-3"
        rows={3}
        placeholder="Share crop news, price updates or a quick farming tip..."
      />
      {files.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {files.map((f, i) => (
            <img key={i} src={URL.createObjectURL(f)} alt={f.name} className="w-full h-24 object-cover rounded" />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="px-3 py-2 bg-green-50 rounded cursor-pointer text-sm">
            <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
            Upload ({files.length})
          </label>
          <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded">
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
        <div className="text-xs text-gray-500">Public</div>
      </div>
    </form>
  );
}
