import React, { useCallback, useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { getApiErrorMessage } from '../../utils/apiError';
import FormatBoldRoundedIcon from '@mui/icons-material/FormatBoldRounded';
import FormatItalicRoundedIcon from '@mui/icons-material/FormatItalicRounded';
import FormatUnderlinedRoundedIcon from '@mui/icons-material/FormatUnderlinedRounded';
import FormatStrikethroughRoundedIcon from '@mui/icons-material/FormatStrikethroughRounded';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded';
import FormatListNumberedRoundedIcon from '@mui/icons-material/FormatListNumberedRounded';
import FormatAlignLeftRoundedIcon from '@mui/icons-material/FormatAlignLeftRounded';
import FormatAlignCenterRoundedIcon from '@mui/icons-material/FormatAlignCenterRounded';
import FormatAlignRightRoundedIcon from '@mui/icons-material/FormatAlignRightRounded';
import FormatAlignJustifyRoundedIcon from '@mui/icons-material/FormatAlignJustifyRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import RedoRoundedIcon from '@mui/icons-material/RedoRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import VideoLibraryRoundedIcon from '@mui/icons-material/VideoLibraryRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';

const DEFAULT_UPLOAD_FOLDER = 'blog-media';
const BlockEmbed = Quill.import('blots/block/embed');

class VideoBlot extends BlockEmbed {
  static blotName = 'video';
  static tagName = 'video';
  static className = 'ql-video';

  static create(value) {
    const node = super.create();
    const src = typeof value === 'string' ? value : value?.src || value?.url || '';
    if (src) {
      node.setAttribute('src', src);
    }
    node.setAttribute('controls', 'true');
    node.setAttribute('preload', 'metadata');
    node.setAttribute('playsinline', 'true');
    node.setAttribute('style', 'max-width:100%;width:100%;display:block;border-radius:1rem;background:#000;');
    return node;
  }

  static value(node) {
    return node.getAttribute('src');
  }
}

if (typeof window !== 'undefined') {
  try {
    Quill.register(VideoBlot, true);
  } catch (error) {
    void error;
  }
}

function normalizeHtml(html = '') {
  return html === '<p><br></p>' ? '' : html;
}

function normalizeUrl(url = '') {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|#|\/)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function ToolbarButton({ title, onClick, disabled = false, children }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-xl border border-theme bg-surface-card px-2.5 py-2 text-secondary transition-colors hover:border-[#4F7CF3] hover:text-[#4F7CF3] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export default function QuillRichTextEditor({
  value = '',
  onChange,
  placeholder = 'Start writing your blog post...',
  uploadFolder = DEFAULT_UPLOAD_FOLDER,
  allowMediaUpload = true,
}) {
  const wrapperRef = useRef(null);
  const editorHostRef = useRef(null);
  const quillRef = useRef(null);
  const selectionRef = useRef(null);
  const lastHtmlRef = useRef(value || '');
  const onChangeRef = useRef(onChange);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [uploadingType, setUploadingType] = useState(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const emitChange = useCallback(() => {
    const quill = quillRef.current;
    if (!quill) return;
    const html = normalizeHtml(quill.root.innerHTML);
    lastHtmlRef.current = html;
    onChangeRef.current?.(html);
  }, []);

  const getSelection = useCallback(() => {
    const quill = quillRef.current;
    if (!quill) {
      return { index: 0, length: 0 };
    }

    const range = selectionRef.current || quill.getSelection(true) || { index: quill.getLength(), length: 0 };
    selectionRef.current = range;
    return range;
  }, []);

  const restoreSelection = useCallback(() => {
    const quill = quillRef.current;
    if (!quill) return null;

    quill.focus();
    const range = getSelection();
    quill.setSelection(range.index, range.length, 'silent');
    return range;
  }, [getSelection]);

  const applyFormat = useCallback((format, valueToApply = true) => {
    const quill = quillRef.current;
    if (!quill) return;

    const range = restoreSelection();
    if (!range) return;

    if (format === 'link') {
      const url = window.prompt('Enter a URL to link');
      const normalizedUrl = normalizeUrl(url || '');
      if (!normalizedUrl) return;

      if (range.length === 0) {
        quill.insertText(range.index, normalizedUrl, { link: normalizedUrl }, 'user');
        quill.setSelection(range.index + normalizedUrl.length, 0, 'silent');
      } else {
        quill.format('link', normalizedUrl, 'user');
      }
      return;
    }

    quill.format(format, valueToApply, 'user');
  }, [restoreSelection]);

  const insertMedia = useCallback(async (file, kind) => {
    if (!file) return;

    const quill = quillRef.current;
    if (!quill) return;

    setUploadingType(kind);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/upload/?folder=${uploadFolder}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      quill.focus();
      const range = getSelection();
      quill.setSelection(range.index, range.length, 'silent');
      quill.insertEmbed(range.index, kind === 'video' ? 'video' : 'image', data.url, 'user');
      quill.insertText(range.index + 1, '\n', 'user');
      quill.setSelection(range.index + 2, 0, 'silent');
      emitChange();
      toast.success(`${kind === 'video' ? 'Video' : 'Image'} uploaded to S3`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, `${kind === 'video' ? 'Video' : 'Image'} upload failed`));
    } finally {
      setUploadingType(null);
      if (kind === 'video' && videoInputRef.current) {
        videoInputRef.current.value = '';
      }
      if (kind !== 'video' && imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  }, [emitChange, getSelection, uploadFolder]);

  const triggerUpload = useCallback((kind) => {
    const quill = quillRef.current;
    if (quill) {
      selectionRef.current = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
    }

    if (kind === 'video') {
      videoInputRef.current?.click();
      return;
    }

    imageInputRef.current?.click();
  }, []);

  useEffect(() => {
    if (!editorHostRef.current || quillRef.current) return;

    wrapperRef.current?.querySelectorAll('.ql-toolbar, .ql-tooltip').forEach((node) => node.remove());
    editorHostRef.current.innerHTML = '';

    const quill = new Quill(editorHostRef.current, {
      theme: null,
      placeholder,
      modules: {
        toolbar: false,
        history: {
          delay: 1000,
          maxStack: 200,
          userOnly: true,
        },
      },
    });

    quillRef.current = quill;
  quill.root.setAttribute('dir', 'ltr');
  quill.root.style.direction = 'ltr';
  quill.root.style.unicodeBidi = 'plaintext';
  quill.root.style.textAlign = 'left';

    const initialHtml = value || '';
    lastHtmlRef.current = initialHtml;
    if (initialHtml) {
      quill.clipboard.dangerouslyPasteHTML(initialHtml, 'silent');
    }

    const handleTextChange = () => emitChange();
    const handleSelectionChange = (range) => {
      selectionRef.current = range;
    };

    quill.on('text-change', handleTextChange);
    quill.on('selection-change', handleSelectionChange);

    return () => {
      quill.off('text-change', handleTextChange);
      quill.off('selection-change', handleSelectionChange);
      wrapperRef.current?.querySelectorAll('.ql-toolbar, .ql-tooltip').forEach((node) => node.remove());
      if (editorHostRef.current) {
        editorHostRef.current.innerHTML = '';
      }
      quillRef.current = null;
      selectionRef.current = null;
    };
  }, [emitChange, placeholder]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;

    const nextHtml = value || '';
    const currentHtml = normalizeHtml(quill.root.innerHTML);
    if (nextHtml === lastHtmlRef.current || nextHtml === currentHtml) {
      return;
    }

    const selection = quill.getSelection();
    if (nextHtml) {
      quill.clipboard.dangerouslyPasteHTML(nextHtml, 'silent');
    } else {
      quill.setText('');
    }
    lastHtmlRef.current = nextHtml;

    if (selection) {
      quill.setSelection(selection.index, selection.length, 'silent');
    }
  }, [value]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill || !allowMediaUpload) return;

    const handlePaste = (event) => {
      const files = Array.from(event.clipboardData?.files || []);
      const imageFile = files.find((file) => file.type.startsWith('image/'));
      if (!imageFile) return;

      event.preventDefault();
      void insertMedia(imageFile, 'image');
    };

    quill.root.addEventListener('paste', handlePaste);
    return () => {
      quill.root.removeEventListener('paste', handlePaste);
    };
  }, [allowMediaUpload, insertMedia]);

  return (
    <div ref={wrapperRef} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-theme bg-surface-lighter p-2.5">
        <ToolbarButton title="Bold" onClick={() => applyFormat('bold')}>
          <FormatBoldRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => applyFormat('italic')}>
          <FormatItalicRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Underline" onClick={() => applyFormat('underline')}>
          <FormatUnderlinedRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Strike through" onClick={() => applyFormat('strike')}>
          <FormatStrikethroughRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>

        <div className="h-6 w-px bg-theme" />

        <ToolbarButton title="Heading 1" onClick={() => applyFormat('header', 1)}>
          <span className="text-xs font-bold">H1</span>
        </ToolbarButton>
        <ToolbarButton title="Heading 2" onClick={() => applyFormat('header', 2)}>
          <span className="text-xs font-bold">H2</span>
        </ToolbarButton>
        <ToolbarButton title="Heading 3" onClick={() => applyFormat('header', 3)}>
          <span className="text-xs font-bold">H3</span>
        </ToolbarButton>
        <ToolbarButton title="Quote" onClick={() => applyFormat('blockquote')}>
          <FormatQuoteRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Code block" onClick={() => applyFormat('code-block')}>
          <span className="text-xs font-bold tracking-tight">code</span>
        </ToolbarButton>
        <ToolbarButton title="Bullet list" onClick={() => applyFormat('list', 'bullet')}>
          <FormatListBulletedRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" onClick={() => applyFormat('list', 'ordered')}>
          <FormatListNumberedRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>

        <ToolbarButton title="Align left" onClick={() => applyFormat('align', false)}>
          <FormatAlignLeftRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Align center" onClick={() => applyFormat('align', 'center')}>
          <FormatAlignCenterRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Align right" onClick={() => applyFormat('align', 'right')}>
          <FormatAlignRightRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Justify" onClick={() => applyFormat('align', 'justify')}>
          <FormatAlignJustifyRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>

        <ToolbarButton title="Link" onClick={() => applyFormat('link')}>
          <LinkRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Undo" onClick={() => quillRef.current?.getModule('history')?.undo()}>
          <UndoRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => quillRef.current?.getModule('history')?.redo()}>
          <RedoRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton
          title="Clear formatting"
          onClick={() => {
            const quill = quillRef.current;
            if (!quill) return;
            const range = restoreSelection();
            if (!range) return;
            quill.removeFormat(range.index, Math.max(range.length, 1), 'user');
          }}
        >
          <ClearRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>

        {allowMediaUpload ? (
          <>
            <div className="h-6 w-px bg-theme" />
            <ToolbarButton title="Insert image from S3" onClick={() => triggerUpload('image')} disabled={uploadingType === 'image'}>
              <ImageRoundedIcon sx={{ fontSize: 16 }} />
            </ToolbarButton>
            <ToolbarButton title="Insert video from S3" onClick={() => triggerUpload('video')} disabled={uploadingType === 'video'}>
              <VideoLibraryRoundedIcon sx={{ fontSize: 16 }} />
            </ToolbarButton>
          </>
        ) : null}
      </div>

      <div
        ref={editorHostRef}
        className="overflow-hidden rounded-3xl border border-theme bg-surface-card shadow-[0_8px_30px_rgba(15,23,42,0.04)] [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[320px] [&_.ql-editor]:bg-surface [&_.ql-editor]:px-4 [&_.ql-editor]:py-4 [&_.ql-editor]:text-sm [&_.ql-editor]:leading-6 [&_.ql-editor]:text-primary [&_.ql-editor]:outline-none [&_.ql-editor]:whitespace-pre-wrap [&_.ql-editor]:break-words [&_.ql-editor]:focus:outline-none [&_.ql-editor_img]:my-4 [&_.ql-editor_img]:max-w-full [&_.ql-editor_img]:rounded-2xl [&_.ql-editor_video]:my-4 [&_.ql-editor_video]:max-w-full [&_.ql-editor_video]:rounded-2xl [&_.ql-editor_video]:bg-black"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[11px] text-secondary">
          Text stays in the blog content. Images and videos are uploaded to S3 and embedded into the HTML.
        </p>
        <p className="text-[11px] text-secondary">
          Paste screenshots directly or use the media buttons.
        </p>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void insertMedia(file, 'image');
          }
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void insertMedia(file, 'video');
          }
        }}
      />
    </div>
  );
}
