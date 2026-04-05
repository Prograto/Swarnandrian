import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import VideoFileOutlinedIcon from '@mui/icons-material/VideoFileOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import AddLinkOutlinedIcon from '@mui/icons-material/AddLinkOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

/* ─── helpers ─────────────────────────────────────────── */
function FileIcon({ category, contentType }) {
  const cls = 'text-2xl';
  if (category === 'video')  return <VideoFileOutlinedIcon className={`${cls} text-purple-500`} />;
  if (contentType === 'application/pdf') return <PictureAsPdfOutlinedIcon className={`${cls} text-red-500`} />;
  if (contentType === 'application/vnd.ms-powerpoint' || contentType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return <SlideshowOutlinedIcon className={`${cls} text-amber-500`} />;
  if (category === 'image')  return <ImageOutlinedIcon className={`${cls} text-teal-500`} />;
  if (category === 'link')   return <LinkOutlinedIcon className={`${cls} text-blue-500`} />;
  return <InsertDriveFileOutlinedIcon className={`${cls} text-indigo-400`} />;
}

function getPreviewKind(item) {
  const contentType = item?.content_type || '';
  const category = item?.category || item?.type || '';
  if (category === 'image' || contentType.startsWith('image/')) return 'image';
  if (category === 'video' || contentType.startsWith('video/')) return 'video';
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType === 'application/vnd.ms-powerpoint' || contentType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'ppt';
  if (category === 'link') return 'link';
  return 'file';
}

function Breadcrumb({ crumbs, onNavigate }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 flex-wrap">
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
      >
        <HomeRoundedIcon sx={{ fontSize: 16 }} />
        Media
      </button>
      {crumbs.map((c, i) => (
        <React.Fragment key={c.id}>
          <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
          <button
            type="button"
            onClick={() => onNavigate(c.id)}
            className={`hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors ${
              i === crumbs.length - 1 ? 'text-gray-800 dark:text-slate-200 font-medium' : ''
            }`}
          >
            {c.name}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}

/* ─── modals ───────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto overscroll-contain sm:items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] my-4"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400">
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
      </motion.div>
    </div>
  );
}

/* ─── main component ───────────────────────────────────── */
export default function MediaSection() {
  const { user, role } = useAuthStore();
  const effectiveRole = role || user?.role;
  const canEdit  = effectiveRole === 'faculty' || effectiveRole === 'admin';

  const [folderId, setFolderId]   = useState(null);
  const [crumbs, setCrumbs]       = useState([]);
  const [folders, setFolders]     = useState([]);
  const [files, setFiles]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);

  const [modal, setModal] = useState(null); // 'folder'|'link'|'preview'
  const [previewItem, setPreviewItem] = useState(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderBanner, setNewFolderBanner] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newFolderBranch, setNewFolderBranch] = useState('');
  const [newFolderActive, setNewFolderActive] = useState(true);
  const [linkForm, setLinkForm] = useState({ name: '', url: '', description: '', branch: '', is_active: true });
  const [errors, setErrors] = useState({});

  /* load contents */
  const load = useCallback(async (fid) => {
    setLoading(true);
    try {
      const [fRes, cRes] = await Promise.all([
        api.get('/media/folders', { params: fid ? { parent_id: fid } : {} }),
        api.get('/media/contents',  { params: fid ? { folder_id: fid } : {} }),
      ]);
      setFolders(fRes.data || []);
      setFiles(cRes.data || []);
    } catch { toast.error('Failed to load media'); }
    finally { setLoading(false); }
  }, []);

  /* load breadcrumb */
  const loadCrumbs = useCallback(async (fid) => {
    if (!fid) { setCrumbs([]); return; }
    try {
      const res = await api.get(`/media/breadcrumb/${fid}`);
      setCrumbs(res.data || []);
    } catch {}
  }, []);

  const navigate = useCallback((fid) => {
    setFolderId(fid);
    load(fid);
    loadCrumbs(fid);
  }, [load, loadCrumbs]);

  useEffect(() => { load(null); }, [load]);

  /* dropzone upload */
  const onDrop = useCallback(async (accepted) => {
    if (!canEdit || accepted.length === 0) return;
    setUploading(true);
    setProgress(0);
    for (let i = 0; i < accepted.length; i++) {
      const f = accepted[i];
      const fd = new FormData();
      fd.append('file', f);
      if (folderId) fd.append('folder_id', folderId);
      try {
        await api.post('/media/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
        });
        toast.success(`Uploaded: ${f.name}`);
      } catch (err) {
        toast.error(err.response?.data?.detail || `Failed: ${f.name}`);
      }
      setProgress(((i + 1) / accepted.length) * 100);
    }
    setUploading(false);
    setProgress(0);
    load(folderId);
  }, [canEdit, folderId, load]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, noClick: true, disabled: !canEdit,
    accept: {
      'image/*': [], 'video/*': [], 'application/pdf': [],
      'application/vnd.ms-powerpoint': [],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': [],
    },
  });

  /* create folder */
  const createFolder = async () => {
    if (!newFolderName.trim()) {
      setErrors((prev) => ({ ...prev, folder: 'Folder name is required' }));
      return;
    }
    try {
      await api.post('/media/folders', {
        name: newFolderName,
        parent_id: folderId,
        banner_url: newFolderBanner || undefined,
        description: newFolderDescription || undefined,
        branch: newFolderBranch || undefined,
        is_active: newFolderActive,
      });
      toast.success('Folder created');
      setNewFolderName('');
      setNewFolderBanner('');
      setNewFolderDescription('');
      setNewFolderBranch('');
      setNewFolderActive(true);
      setErrors((prev) => ({ ...prev, folder: null }));
      setModal(null);
      load(folderId);
    } catch { toast.error('Failed to create folder'); }
  };

  /* add link */
  const addLink = async () => {
    const next = {};
    if (!linkForm.name.trim()) next.name = 'Name is required';
    if (!linkForm.url.trim()) next.url = 'URL is required';
    else {
      try { new URL(linkForm.url); }
      catch { next.url = 'Enter a valid URL'; }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    try {
      await api.post('/media/links', { ...linkForm, folder_id: folderId });
      toast.success('Link added');
      setLinkForm({ name: '', url: '', description: '', branch: '', is_active: true });
      setErrors({});
      setModal(null);
      load(folderId);
    } catch { toast.error('Failed to add link'); }
  };

  /* delete */
  const deleteItem = async (id, type) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      if (type === 'folder') await api.delete(`/media/folders/${id}`);
      else await api.delete(`/media/${id}`);
      toast.success('Deleted');
      load(folderId);
    } catch { toast.error('Delete failed'); }
  };

  const toggleItem = async (id) => {
    try {
      await api.patch(`/media/${id}/toggle`);
      toast.success('Access updated');
      load(folderId);
    } catch {
      toast.error('Failed to update access');
    }
  };

  /* ─── render ─────────────────────────────────────────── */
  return (
    <div {...getRootProps()} className="relative min-h-[60vh]">
      <input {...getInputProps()} />

      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
          <div className="text-center">
            <UploadFileOutlinedIcon sx={{ fontSize: 48 }} className="text-primary mb-2" />
            <p className="text-primary font-medium">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-primary">Media Library</h1>
          <p className="text-sm text-secondary mt-0.5">
            {canEdit ? 'Drag files anywhere to upload' : 'Browse course materials'}
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModal('folder')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-theme text-sm text-primary hover:bg-surface-lighter transition-colors"
            >
              <CreateNewFolderOutlinedIcon sx={{ fontSize: 16 }} />
              New folder
            </button>
            <button
              type="button"
              onClick={() => setModal('link')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-theme text-sm text-primary hover:bg-surface-lighter transition-colors"
            >
              <AddLinkOutlinedIcon sx={{ fontSize: 16 }} />
              Add link
            </button>
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:brightness-110 text-white text-sm font-medium cursor-pointer transition-colors">
              <UploadFileOutlinedIcon sx={{ fontSize: 16 }} />
              Upload
              <input
                type="file"
                className="hidden"
                multiple
                onChange={e => onDrop(Array.from(e.target.files))}
              />
            </label>
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      {crumbs.length > 0 && (
        <div className="mb-4">
          <Breadcrumb crumbs={crumbs} onNavigate={navigate} />
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="mb-4 bg-surface-card rounded-xl border border-theme p-4">
          <div className="flex items-center justify-between text-sm text-secondary mb-2">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-surface-lighter rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#3DA4FF] to-[#7A5CFF] rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>
      )}

      {loading ? (
        /* Skeleton */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-secondary">
          <FolderOpenRoundedIcon sx={{ fontSize: 52 }} className="mb-3 opacity-40" />
          <p className="text-base font-medium">This folder is empty</p>
          {canEdit && <p className="text-sm mt-1">Upload files or create a subfolder</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Folders */}
          {folders.map(folder => (
            <motion.div
              key={folder.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative bg-surface-card border border-theme rounded-xl p-4 cursor-pointer hover:border-primary/30 hover:shadow-soft transition-all"
              onClick={() => navigate(folder.id)}
            >
              {folder.banner_url ? (
                <img src={folder.banner_url} alt={folder.name} className="w-full h-16 object-cover rounded-lg mb-2" loading="lazy" />
              ) : (
                <FolderRoundedIcon sx={{ fontSize: 36 }} className="text-amber-400 mb-2" />
              )}
              <p className="text-sm font-medium text-primary truncate">{folder.name}</p>
              <p className="text-[11px] text-secondary line-clamp-2">{folder.description || 'Folder'}</p>
              <p className="text-[11px] text-secondary mt-1">{folder.branch || 'All branches'} • {folder.is_active === false ? 'Disabled' : 'Enabled'}</p>
              {canEdit && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); toggleItem(folder.id); }}
                    className="p-1 rounded-lg bg-surface-card border border-theme text-secondary hover:text-primary transition-colors"
                  >
                    {folder.is_active === false ? 'E' : 'D'}
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); deleteItem(folder.id, 'folder'); }}
                    className="p-1 rounded-lg hover:bg-red-50 text-secondary hover:text-red-500 transition-all"
                  >
                    <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}

          {/* Files */}
          {files.map(file => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all"
            >
              {/* Preview thumbnail for images */}
              {getPreviewKind(file) === 'image' && file.url ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-16 object-cover rounded-lg mb-2 cursor-pointer"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  onClick={() => { setPreviewFailed(false); setPreviewItem(file); setModal('preview'); }}
                />
              ) : (
                <div
                  className="flex items-center justify-center h-16 mb-2 cursor-pointer"
                  onClick={() => { setPreviewFailed(false); setPreviewItem(file); setModal('preview'); }}
                >
                  <FileIcon category={file.category || file.type} contentType={file.content_type} />
                </div>
              )}
              <p className="text-sm font-medium text-primary truncate">{file.name}</p>
              <p className="text-[11px] text-secondary capitalize">
                {file.size_mb ? `${file.size_mb} MB` : file.category || file.type}
              </p>
              <p className="text-[11px] text-secondary">{file.branch || 'All branches'} • {file.is_active === false ? 'Disabled' : 'Enabled'}</p>

              {/* Actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded-lg bg-surface-card border border-theme text-secondary hover:text-primary transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
                </a>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); toggleItem(file.id); }}
                      className="p-1 rounded-lg bg-surface-card border border-theme text-secondary hover:text-primary transition-colors text-[11px]"
                    >
                      {file.is_active === false ? 'E' : 'D'}
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); deleteItem(file.id, 'file'); }}
                      className="p-1 rounded-lg bg-surface-card border border-theme text-secondary hover:text-red-500 transition-colors"
                    >
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 13 }} />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modal === 'folder' && (
          <Modal title="Create new folder" onClose={() => setModal(null)}>
            <div className="space-y-2">
              <input
                autoFocus
                className="w-full rounded-xl border border-theme bg-surface px-3 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary mb-1"
                placeholder="Folder name"
                value={newFolderName}
                onChange={e => {
                  setNewFolderName(e.target.value);
                  if (errors.folder) setErrors(prev => ({ ...prev, folder: null }));
                }}
                onKeyDown={e => e.key === 'Enter' && createFolder()}
              />
              {errors.folder && <p className="text-xs text-red-500">{errors.folder}</p>}
              <input
                className="w-full rounded-xl border border-theme bg-surface px-3 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Banner image URL (optional)"
                value={newFolderBanner}
                onChange={e => setNewFolderBanner(e.target.value)}
              />
              <textarea
                className="w-full rounded-xl border border-theme bg-surface px-3 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none h-20"
                placeholder="Description (optional)"
                value={newFolderDescription}
                onChange={e => setNewFolderDescription(e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-theme bg-surface px-3 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Branch access (optional)"
                value={newFolderBranch}
                onChange={e => setNewFolderBranch(e.target.value)}
              />
              <label className="inline-flex items-center gap-2 text-xs text-secondary font-medium">
                <input type="checkbox" checked={newFolderActive} onChange={e => setNewFolderActive(e.target.checked)} />
                Enabled for students
              </label>
            </div>
            <button
              type="button"
              onClick={createFolder}
              className="w-full py-2.5 rounded-xl bg-primary hover:brightness-110 text-white text-sm font-medium transition-colors"
            >
              Create folder
            </button>
          </Modal>
        )}

        {modal === 'link' && (
          <Modal title="Add external link" onClose={() => setModal(null)}>
            <div className="space-y-3">
              <div>
                <input
                  className="w-full rounded-xl border border-theme bg-surface px-3 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Display name"
                  value={linkForm.name}
                  onChange={e => {
                    setLinkForm(f => ({ ...f, name: e.target.value }));
                    if (errors.name) setErrors(prev => ({ ...prev, name: null }));
                  }}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>
              <div>
                <input
                  className="w-full rounded-xl border border-theme bg-surface px-3 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://drive.google.com/..."
                  value={linkForm.url}
                  onChange={e => {
                    setLinkForm(f => ({ ...f, url: e.target.value }));
                    if (errors.url) setErrors(prev => ({ ...prev, url: null }));
                  }}
                />
                {errors.url && <p className="mt-1 text-xs text-red-500">{errors.url}</p>}
              </div>
              <input
                className="w-full rounded-xl border border-theme bg-surface px-3 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Description (optional)"
                value={linkForm.description}
                onChange={e => setLinkForm(f => ({ ...f, description: e.target.value }))}
              />
              <input
                className="w-full rounded-xl border border-theme bg-surface px-3 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Branch access (optional)"
                value={linkForm.branch}
                onChange={e => setLinkForm(f => ({ ...f, branch: e.target.value }))}
              />
              <label className="inline-flex items-center gap-2 text-xs text-secondary font-medium">
                <input type="checkbox" checked={linkForm.is_active !== false} onChange={e => setLinkForm(f => ({ ...f, is_active: e.target.checked }))} />
                Enabled for students
              </label>
              <button
                type="button"
                onClick={addLink}
                className="w-full py-2.5 rounded-xl bg-primary hover:brightness-110 text-white text-sm font-medium transition-colors"
              >
                Add link
              </button>
            </div>
          </Modal>
        )}

        {modal === 'preview' && previewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="relative max-w-4xl w-full max-h-[84vh] bg-surface-card rounded-2xl overflow-hidden shadow-2xl border border-theme">
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-theme">
                <p className="text-sm font-semibold text-primary truncate">{previewItem.name}</p>
                <div className="flex items-center gap-2">
                  <a
                    href={previewItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
                  >
                    <OpenInNewRoundedIcon sx={{ fontSize: 13 }} /> Open
                  </a>
                  <a
                    href={previewItem.url}
                    download
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 text-xs font-medium hover:bg-emerald-500/15 transition-colors"
                  >
                    <DownloadRoundedIcon sx={{ fontSize: 13 }} /> Download
                  </a>
                  <button
                    type="button"
                    onClick={() => { setModal(null); setPreviewFailed(false); }}
                    className="p-1.5 rounded-lg hover:bg-surface-lighter text-secondary"
                  >
                    <CloseRoundedIcon sx={{ fontSize: 18 }} />
                  </button>
                </div>
              </div>
              <div className="overflow-auto max-h-[72vh] p-4 flex items-center justify-center bg-surface">
                {getPreviewKind(previewItem) === 'image' ? (
                  previewFailed ? (
                    <div className="text-center py-8">
                      <ImageNotSupportedOutlinedIcon sx={{ fontSize: 44 }} className="text-secondary mx-auto" />
                      <p className="text-sm text-secondary mt-3">Preview unavailable</p>
                      <a href={previewItem.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:brightness-110">
                        <OpenInNewRoundedIcon sx={{ fontSize: 14 }} /> Open file
                      </a>
                    </div>
                  ) : (
                    <img
                      src={previewItem.url}
                      alt={previewItem.name}
                      className="max-w-full max-h-[62vh] object-contain rounded-xl"
                      onError={() => setPreviewFailed(true)}
                    />
                  )
                ) : previewItem.content_type === 'application/pdf' ? (
                  <iframe src={previewItem.url} title={previewItem.name} className="w-full h-[62vh] rounded-xl border border-theme bg-white" />
                ) : getPreviewKind(previewItem) === 'ppt' ? (
                  <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewItem.url)}`}
                    title={previewItem.name}
                    className="w-full h-[62vh] rounded-xl border border-theme bg-white"
                  />
                ) : getPreviewKind(previewItem) === 'video' ? (
                  <video controls className="max-w-full max-h-[62vh] rounded-xl">
                    <source src={previewItem.url} type={previewItem.content_type} />
                  </video>
                ) : (
                  <div className="text-center py-8">
                    <FileIcon category={previewItem.category} contentType={previewItem.content_type} />
                    <p className="text-sm text-secondary mt-3">Preview not available</p>
                    <a href={previewItem.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:brightness-110">
                      <OpenInNewRoundedIcon sx={{ fontSize: 14 }} /> Open file
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
