import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../utils/api';
import {
  RiFolder2Line, RiFile3Line, RiDownload2Line, RiArrowRightLine,
  RiProgress3Line, RiExternalLinkLine, RiFolderOpenLine,
} from 'react-icons/ri';
import FileIcon from '@mui/icons-material/InsertDriveFileOutlined';
import FolderIcon from '@mui/icons-material/FolderOutlined';
import ImageIcon from '@mui/icons-material/ImageOutlined';
import AudiotrackOutlinedIcon from '@mui/icons-material/AudiotrackOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import DescriptionIcon from '@mui/icons-material/Description';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

const MEDIA_ICON_MAP = {
  folder: FolderIcon,
  pdf: PictureAsPdfIcon,
  image: ImageIcon,
  video: SlideshowIcon,
  audio: AudiotrackOutlinedIcon,
  office: DescriptionIcon,
  text: DescriptionIcon,
  link: LinkRoundedIcon,
  file: FileIcon,
};

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'avi', 'mov', 'mkv', 'webm', 'mpeg', 'mpg']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']);
const PDF_EXTENSIONS = new Set(['pdf']);
const OFFICE_EXTENSIONS = new Set(['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'ods', 'odt', 'odp']);
const TEXT_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json', 'xml', 'html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'sh', 'yml', 'yaml', 'ini', 'log']);
const OFFICE_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/xml',
]);

const OFFICE_VIEWER_BASE = 'https://view.officeapps.live.com/op/embed.aspx?src=';

const getFileExtension = (filename) => filename?.split('.')?.pop()?.toLowerCase() || '';

const getFileCategory = (filename, contentType = '', itemType = '') => {
  if (itemType === 'link') return 'link';

  const ext = getFileExtension(filename);
  const normalizedType = (contentType || '').toLowerCase();

  if (normalizedType.startsWith('image/') || IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (normalizedType.startsWith('video/') || VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (normalizedType.startsWith('audio/') || AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (normalizedType === 'application/pdf' || PDF_EXTENSIONS.has(ext)) return 'pdf';
  if (OFFICE_MIME_TYPES.has(normalizedType) || OFFICE_EXTENSIONS.has(ext)) return 'office';
  if (TEXT_MIME_TYPES.has(normalizedType) || TEXT_EXTENSIONS.has(ext)) return 'text';
  return 'file';
};

const getFileIcon = (category) => {
  const IconComponent = MEDIA_ICON_MAP[category] || MEDIA_ICON_MAP.file;
  return IconComponent;
};

const getPreviewKind = (item) => {
  const contentType = item?.content_type || '';
  const category = item?.type === 'link' ? 'link' : (item?.category || getFileCategory(item?.name, contentType, item?.type));
  if (category === 'link') return 'link';
  if (category === 'image' || contentType.startsWith('image/')) return 'image';
  if (category === 'video' || contentType.startsWith('video/')) return 'video';
  if (category === 'audio' || contentType.startsWith('audio/')) return 'audio';
  if (category === 'pdf' || contentType === 'application/pdf') return 'pdf';
  if (category === 'office' || OFFICE_MIME_TYPES.has(contentType.toLowerCase())) return 'office';
  if (category === 'text' || TEXT_MIME_TYPES.has(contentType.toLowerCase())) return 'text';
  return 'file';
};

function TextPreview({ url, name }) {
  const [state, setState] = useState({ status: 'loading', content: '' });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setState({ status: 'loading', content: '' });

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load text preview');
        }

        const content = await response.text();
        if (active) {
          setState({ status: 'ready', content });
        }
      })
      .catch(() => {
        if (active) {
          setState({ status: 'fallback', content: '' });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [url]);

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-72 items-center justify-center text-secondary">
        Loading preview...
      </div>
    );
  }

  if (state.status === 'ready') {
    return (
      <pre className="max-h-[70vh] overflow-auto rounded-2xl border border-theme bg-slate-950 p-4 text-sm leading-6 text-slate-100 whitespace-pre-wrap break-words">
        {state.content || '(empty file)'}
      </pre>
    );
  }

  return (
    <iframe
      src={url}
      title={name}
      className="h-[70vh] w-full rounded-2xl border border-theme bg-white"
    />
  );
}

function MediaPreview({ item, previewFailed, onPreviewError }) {
  const previewKind = getPreviewKind(item);

  if (previewKind === 'image') {
    return previewFailed ? (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center text-secondary">
        <p>Preview unavailable for this file.</p>
        <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white">
          <RiExternalLinkLine className="w-4 h-4" /> Open file
        </a>
      </div>
    ) : (
      <img
        src={item.url}
        alt={item.name}
        className="mx-auto max-h-[70vh] w-auto rounded-2xl object-contain"
        onError={onPreviewError}
      />
    );
  }

  if (previewKind === 'video') {
    return (
      <video
        src={item.url}
        controls
        className="mx-auto max-h-[70vh] w-full rounded-2xl bg-black"
        onError={onPreviewError}
      />
    );
  }

  if (previewKind === 'audio') {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-3xl border border-theme bg-surface px-6 py-8 shadow-sm">
          <AudiotrackOutlinedIcon sx={{ fontSize: 54 }} className="text-primary" />
        </div>
        <audio controls className="w-full max-w-2xl" src={item.url} onError={onPreviewError} />
      </div>
    );
  }

  if (previewKind === 'pdf') {
    return previewFailed ? (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center text-secondary">
        <p>Preview unavailable for this PDF.</p>
        <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white">
          <RiExternalLinkLine className="w-4 h-4" /> Open file
        </a>
      </div>
    ) : (
      <iframe
        src={item.url}
        title={item.name}
        className="h-[70vh] w-full rounded-2xl border border-theme bg-white"
        onError={onPreviewError}
      />
    );
  }

  if (previewKind === 'office') {
    return previewFailed ? (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center text-secondary">
        <p>Preview unavailable for this document.</p>
        <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white">
          <RiExternalLinkLine className="w-4 h-4" /> Open file
        </a>
      </div>
    ) : (
      <iframe
        src={`${OFFICE_VIEWER_BASE}${encodeURIComponent(item.url)}`}
        title={item.name}
        className="h-[70vh] w-full rounded-2xl border border-theme bg-white"
        onError={onPreviewError}
      />
    );
  }

  if (previewKind === 'text') {
    return <TextPreview url={item.url} name={item.name} />;
  }

  if (previewKind === 'link') {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-2xl border border-theme bg-surface p-6 text-center">
        <div className="rounded-2xl border border-theme bg-white p-4 text-primary shadow-sm">
          <LinkRoundedIcon sx={{ fontSize: 40 }} />
        </div>
        <div className="max-w-2xl space-y-1">
          <p className="text-sm font-semibold text-primary break-all">{item.url}</p>
          <p className="text-xs text-secondary">This is an external link. Open it in a new tab to preview the content.</p>
        </div>
        <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white">
          <RiExternalLinkLine className="w-4 h-4" /> Open link
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center text-secondary">
      <p>Preview unavailable for this file type.</p>
      <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white">
        <RiExternalLinkLine className="w-4 h-4" /> Open file
      </a>
    </div>
  );
}

export default function StudentMediaPage() {
  const [currentPath, setCurrentPath] = useState([{ id: null, name: 'Media Library' }]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [previewItem, setPreviewItem] = useState(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const currentFolderId = currentPath[currentPath.length - 1]?.id;

  const { data: mediaData, isLoading } = useQuery(
    ['student-media', currentFolderId],
    async () => {
      const [foldersResponse, filesResponse] = await Promise.all([
        api.get('/media/folders', { params: currentFolderId ? { parent_id: currentFolderId } : {} }),
        api.get('/media/contents', { params: currentFolderId ? { folder_id: currentFolderId } : {} }),
      ]);

      return {
        folders: foldersResponse.data || [],
        files: filesResponse.data || [],
      };
    },
    { staleTime: 60000 }
  );

  const folders = mediaData?.folders || [];
  const files = mediaData?.files || [];
  const normalizedSearch = search.trim().toLowerCase();

  const visibleFolders = useMemo(() => {
    if (filter === 'files') return [];
    return folders.filter((folder) => !normalizedSearch || `${folder.name} ${folder.description || ''}`.toLowerCase().includes(normalizedSearch));
  }, [folders, filter, normalizedSearch]);

  const visibleFiles = useMemo(() => {
    if (filter === 'folders') return [];
    return files.filter((file) => !normalizedSearch || `${file.name} ${file.description || ''}`.toLowerCase().includes(normalizedSearch));
  }, [files, filter, normalizedSearch]);

  const handleNavigateTo = (folder) => {
    setCurrentPath([...currentPath, { id: folder.id, name: folder.name }]);
  };

  const handleGoBack = () => {
    if (currentPath.length > 1) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  const handleDownload = (item) => {
    if (item.url) {
      const link = document.createElement('a');
      link.href = item.url;
      link.download = item.name || 'download';
      link.click();
    }
  };

  const MediaItemCard = ({ item }) => {
    const category = item.type === 'folder' ? 'folder' : getFileCategory(item.name, item.content_type, item.type);
    const IconComponent = getFileIcon(category);
    const isLink = item.type === 'link';

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        hover={{ y: -4 }}
        className={`rounded-2xl overflow-hidden border transition-all group ${
          item.type === 'folder'
            ? 'border-blue-200 bg-blue-50 hover:shadow-md'
            : 'border-gray-100 bg-white hover:shadow-md cursor-pointer'
        }`}
      >
        <div
          onClick={() => {
            if (item.type === 'folder') {
              handleNavigateTo(item);
              return;
            }
            setPreviewFailed(false);
            setPreviewItem(item);
          }}
          className="p-6"
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all ${
              item.type === 'folder'
                ? 'bg-blue-100 text-blue-600'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <IconComponent sx={{ fontSize: 24 }} />
          </div>

          <p className="font-semibold text-gray-800 line-clamp-2 text-sm">
            {item.name}
          </p>

          {item.type !== 'folder' && (item.size_mb != null || item.size != null) && (
            <p className="text-xs text-gray-500 mt-2">
              {Number(item.size_mb ?? item.size).toFixed(2)} MB
            </p>
          )}

          {item.created_at && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(item.created_at).toLocaleDateString()}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.type === 'folder' ? (
              <>
                <RiArrowRightLine className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">Open</span>
              </>
            ) : (
              <>
                {isLink ? (
                  <RiExternalLinkLine className="w-4 h-4 text-gray-600" />
                ) : (
                  <RiDownload2Line className="w-4 h-4 text-gray-600" />
                )}
                <span className="text-xs text-gray-600 font-medium">{isLink ? 'Open' : 'Preview'}</span>
              </>
            )}
          </div>
        </div>

        {item.type !== 'folder' && (
          <div
            className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex gap-2"
            onClick={(e) => {
              e.stopPropagation();
              if (isLink) {
                window.open(item.url, '_blank', 'noopener,noreferrer');
              } else {
                handleDownload(item);
              }
            }}
          >
            {isLink ? (
              <button className="flex-1 flex items-center justify-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors font-medium">
                <RiExternalLinkLine className="w-4 h-4" /> Open link
              </button>
            ) : (
              <button className="flex-1 flex items-center justify-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors font-medium">
                <RiDownload2Line className="w-4 h-4" /> Download
              </button>
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors font-medium border-l border-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <RiExternalLinkLine className="w-4 h-4" /> Open
              </a>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="sticky top-16 z-20 bg-surface/95 backdrop-blur border-b border-theme">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
            <p className="text-sm text-gray-500 mt-1">
              Access study materials and resources shared by your faculty
            </p>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-2 rounded-2xl border border-theme bg-surface-card px-3 py-2">
              <SearchRoundedIcon sx={{ fontSize: 18 }} className="text-secondary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search folders or files"
                className="w-full bg-transparent text-sm text-primary outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'folders', label: 'Folders' },
                { id: 'files', label: 'Files' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-medium transition-colors ${filter === option.id ? 'border-primary/30 bg-primary/10 text-primary' : 'border-theme bg-surface-card text-secondary hover:text-primary'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {currentPath.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && <RiArrowRightLine className="w-4 h-4 text-gray-400 shrink-0" />}
                <button
                  onClick={() => {
                    if (index === 0) {
                      setCurrentPath(currentPath.slice(0, 1));
                    } else if (index < currentPath.length - 1) {
                      setCurrentPath(currentPath.slice(0, index + 1));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                    index === currentPath.length - 1
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {index === 0 ? (
                    <span className="flex items-center gap-1">
                      <RiFolderOpenLine className="w-4 h-4" /> {crumb.name}
                    </span>
                  ) : (
                    crumb.name
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RiProgress3Line className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-600">Loading media...</p>
            </div>
          </div>
        ) : visibleFolders.length === 0 && visibleFiles.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RiFolder2Line className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No media items found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try a different search or filter
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Folders Section */}
            {visibleFolders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <RiFolder2Line className="w-5 h-5" /> Folders
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {visibleFolders.map((folder) => (
                    <MediaItemCard key={folder.id} item={folder} />
                  ))}
                </div>
              </div>
            )}

            {/* Files Section */}
            {visibleFiles.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <RiFile3Line className="w-5 h-5" /> Files ({visibleFiles.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {visibleFiles.map((file) => (
                    <MediaItemCard key={file.id} item={file} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <AnimatePresence>
        {previewItem && previewItem.type !== 'folder' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-lenis-prevent-wheel
            data-lenis-prevent-touch
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
            onClick={() => {
              setPreviewItem(null);
              setPreviewFailed(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              className="w-full max-w-4xl overflow-hidden rounded-3xl border border-theme bg-surface-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-theme px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-primary line-clamp-1">{previewItem.name}</p>
                  <p className="text-xs text-secondary">Preview</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={previewItem.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-theme bg-surface px-3 py-2 text-xs font-medium text-secondary hover:text-primary">
                    <RiExternalLinkLine className="w-4 h-4" /> Open
                  </a>
                  <button type="button" onClick={() => { setPreviewItem(null); setPreviewFailed(false); }} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-theme bg-surface text-secondary hover:text-primary">
                    <CloseRoundedIcon sx={{ fontSize: 18 }} />
                  </button>
                </div>
              </div>
              <div data-lenis-prevent-wheel data-lenis-prevent-touch className="max-h-[75vh] overflow-auto bg-surface p-4">
                {previewFailed ? (
                  <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center text-secondary">
                    <p>Preview not available for this file.</p>
                    <a href={previewItem.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white">
                      <RiExternalLinkLine className="w-4 h-4" /> Open file
                    </a>
                  </div>
                ) : (
                  <MediaPreview
                    item={previewItem}
                    previewFailed={previewFailed}
                    onPreviewError={() => setPreviewFailed(true)}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
