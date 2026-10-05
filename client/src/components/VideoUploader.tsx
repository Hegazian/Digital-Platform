'use client';

import React, { useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileVideo } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { errorMessage } from '../lib/apiTypes';

interface VideoUploaderProps {
  onUploadComplete?: (videoUrlOrId: string) => void;
}

export default function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.type.startsWith('video/')) {
        setError('Please select a valid video file (MP4, WebM).');
        return;
      }
      if (selected.size > 500 * 1024 * 1024) {
        setError('File size exceeds 500MB limit.');
        return;
      }
      setFile(selected);
      setError(null);
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // We simulate progress for better UX
      const interval = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 10 : prev));
      }, 200);

      const res = await fetchApi('/videos/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      setUploadProgress(100);
      setSuccess(true);
      setFile(null);
      if (onUploadComplete) {
        onUploadComplete(res.data?.videoUrl || res.data?.id || 'uploaded-video-url');
      }
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to upload video'));
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <FileVideo className="w-5 h-5 text-indigo-400" />
        Upload Video Lesson
      </h3>

      {success && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
          <CheckCircle className="w-5 h-5" />
          <p className="text-sm font-bold">Video uploaded successfully!</p>
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
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-colors">
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-400" />
          </div>
          <p className="text-sm font-bold text-slate-300 mb-1">Click to browse or drag and drop</p>
          <p className="text-xs text-slate-500">MP4, WebM (Max 500MB)</p>
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
          </div>

          {isUploading && (
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? 'Uploading...' : 'Confirm Upload'}
          </button>
        </div>
      )}
    </div>
  );
}
