import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import api from '../../utils/api';
import toast from 'react-hot-toast';

/**
 * Reusable file upload component that uploads to S3 via /upload endpoint.
 * Props:
 *  - onUpload(result): called with { url, filename, category, size_mb }
 *  - accept: MIME type object for react-dropzone
 *  - label: string label
 *  - folder: S3 subfolder (default "uploads")
 *  - currentUrl: existing file URL to show as preview
 */
export default function FileUpload({
  onUpload,
  accept,
  label = 'Upload file',
  folder = 'uploads',
  currentUrl = '',
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [result, setResult]       = useState(null);

  const onDrop = useCallback(async (files) => {
    if (!files.length) return;
    const file = files[0];
    const fd = new FormData();
    fd.append('file', file);

    setUploading(true);
    setProgress(0);
    try {
      const res = await api.post(`/upload/?folder=${folder}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      setResult(res.data);
      onUpload?.(res.data);
      toast.success('File uploaded successfully');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [folder, onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false, accept,
  });

  const preview = result?.url || currentUrl;

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`relative rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-theme hover:border-primary/40 hover:bg-primary/5'
        }`}
      >
        <input {...getInputProps()} />
        <CloudUploadOutlinedIcon
          sx={{ fontSize: 36 }}
          className={`mx-auto mb-2 ${isDragActive ? 'text-primary' : 'text-secondary'}`}
        />
        <p className="text-sm font-medium text-primary">
          {isDragActive ? 'Drop file here' : label}
        </p>
        <p className="text-xs text-secondary mt-1">
          or click to browse
        </p>

        {uploading && (
          <div className="mt-4">
            <div className="h-1.5 bg-surface-lighter rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#3DA4FF] to-[#7A5CFF] rounded-full"
                animate={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-secondary mt-1">{progress}% uploaded</p>
          </div>
        )}
      </div>

      {/* Preview */}
      <AnimatePresence>
        {preview && !uploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200"
          >
            <CheckCircleOutlineRoundedIcon
              sx={{ fontSize: 18 }}
              className="text-emerald-600 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-emerald-900 truncate">
                {result?.filename || 'File uploaded'}
              </p>
              {result?.size_mb && (
                <p className="text-[11px] text-emerald-700">{result.size_mb} MB</p>
              )}
            </div>
            <a
              href={preview}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-xs text-emerald-700 hover:underline"
            >
              View
            </a>
            <button
              type="button"
              onClick={() => { setResult(null); onUpload?.(null); }}
              className="shrink-0 text-emerald-500 hover:text-emerald-700"
            >
              <CloseRoundedIcon sx={{ fontSize: 14 }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
