'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';
import { FileUp, FileText, CheckCircle, AlertCircle, Trash2, Download } from 'lucide-react';

interface Material {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  sizeBytes: number;
  createdAt: string;
}

interface MaterialUploaderProps {
  lessonId: string;
  materials?: Material[];
  onMaterialAdded?: () => void;
  onMaterialDeleted?: (id: string) => void;
}

export default function MaterialUploader({
  lessonId,
  materials = [],
  onMaterialAdded,
  onMaterialDeleted,
}: MaterialUploaderProps) {
  const { lang } = useAppStore();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError(lang === 'ar' ? 'يرجى اختيار ملف للمستند' : 'Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('lessonId', lessonId);
      formData.append('title', title.trim() || file.name);
      formData.append('file', file);

      // fetchApi attaches the bearer token and keeps FormData's
      // browser-generated multipart boundary intact.
      await fetchApi('/materials/upload', {
        method: 'POST',
        body: formData,
      });

      setSuccess(true);
      setFile(null);
      setTitle('');
      if (onMaterialAdded) onMaterialAdded();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to upload document'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت تأكد من حذف هذا المرفق؟' : 'Are you sure you want to delete this file?')) return;
    try {
      await fetchApi(`/materials/${id}`, { method: 'DELETE' });
      if (onMaterialDeleted) onMaterialDeleted(id);
    } catch (err: unknown) {
      alert(errorMessage(err, 'Failed to delete file'));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          {lang === 'ar' ? 'ملفات ومرفقات الدرس (PDF / Doc)' : 'Lesson Attachments & PDFs'}
        </h3>
        <span className="text-xs text-gray-400">
          {materials.length} {lang === 'ar' ? 'ملفات مرفقة' : 'files attached'}
        </span>
      </div>

      {/* Existing Materials List */}
      {materials.length > 0 && (
        <div className="space-y-2">
          {materials.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{item.title}</p>
                  <p className="text-xs text-gray-400">{formatSize(item.sizeBytes)} • {new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  title="Delete File"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="space-y-4 pt-2">
        <h4 className="text-sm font-semibold text-gray-300">{lang === 'ar' ? 'إضافة ملف جديد:' : 'Attach New File:'}</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder={lang === 'ar' ? 'عنوان المستند (مثال: ملخص الفصل الأول)' : 'Document title (e.g. Chapter 1 Summary)'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="glass-input px-4 py-2.5 rounded-xl text-sm"
          />

          <div className="relative">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar"
              className="hidden"
              id={`file-input-${lessonId}`}
            />
            <label
              htmlFor={`file-input-${lessonId}`}
              className="glass-button w-full px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between cursor-pointer border border-dashed border-indigo-500/40 hover:border-indigo-400"
            >
              <span className="truncate text-gray-300">
                {file ? file.name : (lang === 'ar' ? 'اختر ملف PDF أو Word...' : 'Select PDF or Word file...')}
              </span>
              <FileUp className="w-4 h-4 text-indigo-400 shrink-0" />
            </label>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{lang === 'ar' ? 'تم رفع المستند بنجاح!' : 'Document uploaded successfully!'}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all disabled:opacity-50"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <FileUp className="w-4 h-4" />
              {lang === 'ar' ? 'رفع المرفق' : 'Upload File'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
