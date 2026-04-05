import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/common/DashboardLayout';
import api from '../../utils/api';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

const NAV = [
  { label: 'Dashboard',   href: '/admin',           icon: <DashboardRoundedIcon sx={{ fontSize: 18 }} /> },
  { label: 'Users',       href: '/admin/users',      icon: <GroupRoundedIcon sx={{ fontSize: 18 }} /> },
  { label: 'Bulk Upload', href: '/admin/bulk-upload', icon: <UploadFileRoundedIcon sx={{ fontSize: 18 }} /> },
  { label: 'Analytics',   href: '/admin/analytics',  icon: <InsightsRoundedIcon sx={{ fontSize: 18 }} /> },
];

const ROLES = ['student','faculty','admin'];

export default function AdminBulkUpload() {
  const [role, setRole]     = useState('student');
  const [file, setFile]     = useState(null);
  const [loading, setLoad]  = useState(false);
  const [result, setResult] = useState(null);

  const onDrop = useCallback(accepted => {
    setFile(accepted[0]);
    setResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) { toast.error('Please select a file'); return; }
    setLoad(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post(`/admin/bulk-upload/${role}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      toast.success(`${data.created} users created successfully`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setLoad(false);
    }
  };

  const downloadTemplate = async () => {
    const resp = await api.get(`/admin/bulk-upload/${role}/template`, { responseType: 'blob' });
    const url = URL.createObjectURL(resp.data);
    const a = document.createElement('a');
    a.href = url; a.download = `${role}_template.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout navItems={NAV} role="admin">
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="section-title">Bulk Upload</h1>
          <p className="text-secondary text-sm mt-1">Upload up to 2,000 users at once via Excel.</p>
        </div>

        {/* Role tabs */}
        <div className="flex gap-2">
          {ROLES.map(r => (
            <button key={r} onClick={() => { setRole(r); setFile(null); setResult(null); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all
                ${role === r ? 'bg-primary-600 text-white' : 'bg-surface-light text-secondary hover:text-primary'}`}
            >{r}</button>
          ))}
        </div>

        {/* Download template */}
        <div className="flex items-center justify-between card p-4">
          <div>
            <p className="font-medium text-primary text-sm">Download Excel Template</p>
            <p className="text-secondary text-xs mt-0.5">Get the required column format for {role} upload.</p>
          </div>
          <button onClick={downloadTemplate} className="btn-secondary text-sm">
            <span className="inline-flex items-center gap-1"><DownloadRoundedIcon sx={{ fontSize: 16 }} /> Template</span>
          </button>
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
            ${isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-white/20'}`}
        >
          <input {...getInputProps()} />
          <div className="text-4xl mb-4 inline-flex items-center justify-center text-blue-500">
            {file ? <CheckCircleRoundedIcon sx={{ fontSize: 36 }} /> : <FolderOpenRoundedIcon sx={{ fontSize: 36 }} />}
          </div>
          {file ? (
            <div>
              <p className="font-medium text-primary">{file.name}</p>
              <p className="text-secondary text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="font-medium text-primary">Drop your Excel file here</p>
              <p className="text-secondary text-sm mt-1">or click to browse (.xlsx only)</p>
            </div>
          )}
        </div>

        {/* Upload button */}
        <button onClick={handleUpload} disabled={!file || loading} className="btn-primary w-full py-3">
          {loading ? 'Uploading…' : `Upload ${role.charAt(0).toUpperCase() + role.slice(1)}s`}
        </button>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="card p-6 space-y-3"
            >
              <h3 className="font-display font-semibold text-primary">Upload Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: 'Total Rows', value: result.total, color: 'text-white' },
                  { label: 'Created',    value: result.created, color: 'text-emerald-400' },
                  { label: 'Skipped',    value: result.skipped, color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="bg-surface-light rounded-lg p-3">
                    <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-secondary mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {result.errors.length > 0 && (
                <div>
                  <p className="text-sm text-red-500 font-medium mb-2 inline-flex items-center gap-1"><WarningAmberRoundedIcon sx={{ fontSize: 16 }} /> {result.errors.length} errors:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {result.errors.map((e, i) => (
                      <div key={i} className="text-xs text-secondary bg-red-500/10 rounded px-3 py-1.5">
                        Row {e.row}: {e.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
