'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileVideo } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { errorMessage } from '../lib/apiTypes';
import { useAppStore } from '@/lib/store';

interface VideoUploaderProps {
  onUploadComplete?: (videoUrlOrId: string) => void;
}

export default function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
  const { lang } = useAppStore();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const uploadController = useRef<AbortController | null>(null);
  const t = (en: string, ar: string) => lang === 'ar' ? ar : en;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!/\.(mp4|webm|mov|avi|mkv|mpeg|mpg)$/i.test(selected.name)) {
        setError(t('Choose a supported video file.', 'يرجى اختيار ملف فيديو مدعوم.'));
        return;
      }
      if (selected.size > 500 * 1024 * 1024) {
        setError(t('File size exceeds the 500 MB limit.', 'حجم الملف يتجاوز الحد الأقصى 500 ميجابايت.'));
        return;
      }
      setFile(selected);
      setError(null);
      setSuccess(false);
      setProcessing(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    const controller = new AbortController();
    uploadController.current = controller;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetchApi('/videos/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      setSuccess(true);
      setProcessing(res.data?.status !== 'READY');
      setFile(null);
      if (onUploadComplete) {
        onUploadComplete(res.data?.videoUrl || res.data?.id || 'uploaded-video-url');
      }
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(errorMessage(err, t('Failed to upload video', 'تعذر رفع الفيديو')));
      }
    } finally {
      setIsUploading(false);
      uploadController.current = null;
    }
  };

  const cancelUpload = () => uploadController.current?.abort();

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <FileVideo className="w-5 h-5 text-indigo-400" />
        {t('Upload Video Lesson', 'رفع فيديو للدرس')}
      </h3>

      {success && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
          <CheckCircle className="w-5 h-5" />
          <p className="text-sm font-bold">{processing
            ? t('Video uploaded. Processing is required before playback.', 'تم رفع الفيديو. يجب إكمال المعالجة قبل تشغيله.')
            : t('Video uploaded and ready for playback.', 'تم رفع الفيديو وأصبح جاهزاً للتشغيل.')}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {!file ? (
        <label className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 hover:border-indigo-500 transition-colors group">
          <input
            type="file"
            accept=".mp4,.webm,.mov,.avi,.mkv,.mpeg,.mpg"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-colors">
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-400" />
          </div>
          <p className="text-sm font-bold text-slate-300 mb-1">{t('Click to browse for a video', 'اضغط لاختيار فيديو')}</p>
          <p className="text-xs text-slate-500">{t('MP4, WebM, MOV, AVI, MKV (max 500 MB)', 'MP4 وWebM وMOV وAVI وMKV (بحد أقصى 500 ميجابايت)')}</p>
        </label>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <FileVideo className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-[300px]">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!isUploading && (
              <button
                onClick={() => setFile(null)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {isUploading && (
              <button type="button" onClick={cancelUpload} aria-label={t('Cancel upload', 'إلغاء الرفع')}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {isUploading && <p role="status" className="mb-4 text-xs text-slate-400">{t('Uploading securely…', 'جارٍ رفع الفيديو بأمان…')}</p>}

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? t('Uploading…', 'جارٍ الرفع…') : t('Upload Video', 'رفع الفيديو')}
          </button>
        </div>
      )}
    </div>
  );
}
