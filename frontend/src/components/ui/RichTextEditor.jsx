import React, { useEffect, useRef } from 'react';
import FormatBoldRoundedIcon from '@mui/icons-material/FormatBoldRounded';
import FormatUnderlinedRoundedIcon from '@mui/icons-material/FormatUnderlinedRounded';
import FormatItalicRoundedIcon from '@mui/icons-material/FormatItalicRounded';
import FormatStrikethroughRoundedIcon from '@mui/icons-material/FormatStrikethroughRounded';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded';
import FormatListNumberedRoundedIcon from '@mui/icons-material/FormatListNumberedRounded';
import FormatAlignLeftRoundedIcon from '@mui/icons-material/FormatAlignLeftRounded';
import FormatAlignCenterRoundedIcon from '@mui/icons-material/FormatAlignCenterRounded';
import FormatAlignRightRoundedIcon from '@mui/icons-material/FormatAlignRightRounded';
import FormatAlignJustifyRoundedIcon from '@mui/icons-material/FormatAlignJustifyRounded';
import FormatColorTextRoundedIcon from '@mui/icons-material/FormatColorTextRounded';
import FormatSizeRoundedIcon from '@mui/icons-material/FormatSizeRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import RedoRoundedIcon from '@mui/icons-material/RedoRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import CropSquareRoundedIcon from '@mui/icons-material/CropSquareRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];
const BLOCK_OPTIONS = [
  { label: 'Paragraph', value: 'p' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
  { label: 'Quote', value: 'blockquote' },
  { label: 'Code block', value: 'pre' },
];

const TABLE_PRESETS = [
  { label: '2 x 2 table', rows: 2, cols: 2 },
  { label: '2 x 3 table', rows: 2, cols: 3 },
  { label: '3 x 3 table', rows: 3, cols: 3 },
  { label: '4 x 4 table', rows: 4, cols: 4 },
];

const SHAPE_PRESETS = [
  { label: 'Rounded box', value: 'rounded-box' },
  { label: 'Callout box', value: 'callout-box' },
  { label: 'Pill label', value: 'pill-label' },
  { label: 'Circle note', value: 'circle-note' },
];

function normalizeUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|#|\/)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function ToolbarButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-lg border border-theme bg-surface-card px-2.5 py-2 text-secondary transition-colors hover:border-[#4F7CF3] hover:text-[#4F7CF3]"
    >
      {children}
    </button>
  );
}

function ToolbarSelect({ title, icon: Icon, options, onPick, onMouseDown }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-theme bg-surface-card px-2.5 py-1.5">
      {Icon ? <Icon sx={{ fontSize: 16 }} className="text-secondary" /> : null}
      <select
        defaultValue=""
        onMouseDown={onMouseDown}
        onChange={(event) => {
          const selected = options.find((option) => option.value === event.target.value);
          if (selected) {
            onPick(selected);
          }
          event.target.value = '';
        }}
        className="bg-transparent text-xs font-medium text-primary focus:outline-none"
      >
        <option value="" disabled>{title}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function buildTableHtml(rows, cols) {
  const width = Math.max(320, cols * 140);
  const headerCells = Array.from({ length: cols }, (_, columnIndex) => (
    `<th style="border:1px solid rgba(148,163,184,0.4);padding:0.75rem 0.85rem;background:rgba(79,124,243,0.08);font-weight:600;color:rgb(var(--text-primary));min-width:120px;">Heading ${columnIndex + 1}</th>`
  )).join('');

  const bodyRows = Array.from({ length: Math.max(rows - 1, 1) }, (_, rowIndex) => (
    `<tr>${Array.from({ length: cols }, (_, columnIndex) => (
      `<td style="border:1px solid rgba(148,163,184,0.35);padding:0.75rem 0.85rem;min-width:120px;vertical-align:top;">Cell ${rowIndex + 1}.${columnIndex + 1}</td>`
    )).join('')}</tr>`
  )).join('');

  return `
    <div class="blog-table-wrap" style="margin:1rem 0;overflow-x:auto;">
      <table class="blog-table" style="width:100%;min-width:${width}px;border-collapse:collapse;border:1px solid rgba(148,163,184,0.35);border-radius:1rem;overflow:hidden;background:rgba(255,255,255,0.75);">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

function buildShapeHtml(shape) {
  const baseStyles = 'margin:1rem 0;color:rgb(var(--text-primary));';
  switch (shape) {
    case 'callout-box':
      return `<div class="blog-shape blog-shape-callout" style="${baseStyles}border-left:5px solid #4F7CF3;background:rgba(79,124,243,0.08);border-radius:1.25rem;padding:1rem 1.1rem;">Type your text here</div>`;
    case 'pill-label':
      return `<div class="blog-shape blog-shape-pill" style="${baseStyles}display:inline-flex;align-items:center;justify-content:center;max-width:100%;padding:0.8rem 1.1rem;background:rgba(79,124,243,0.12);border:1px solid rgba(79,124,243,0.24);border-radius:9999px;min-height:3rem;width:max-content;">Type your text here</div>`;
    case 'circle-note':
      return `<div class="blog-shape blog-shape-circle" style="${baseStyles}width:min(100%,220px);min-height:220px;display:flex;align-items:center;justify-content:center;text-align:center;padding:1.25rem;border:1px solid rgba(79,124,243,0.24);background:rgba(124,140,255,0.10);border-radius:9999px;">Type your text here</div>`;
    case 'rounded-box':
    default:
      return `<div class="blog-shape blog-shape-box" style="${baseStyles}padding:1rem 1.1rem;border:1px solid rgba(148,163,184,0.35);background:rgba(255,255,255,0.78);border-radius:1.25rem;box-shadow:0 12px 28px rgba(2,8,23,0.06);">Type your text here</div>`;
  }
}

export default function RichTextEditor({ value = '', onChange, placeholder = 'Start writing your blog post...' }) {
  const editorRef = useRef(null);
  const selectionRef = useRef(null);

  const syncValue = () => {
    if (!editorRef.current) return;
    onChange?.(editorRef.current.innerHTML === '<br>' ? '' : editorRef.current.innerHTML);
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (selectionRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(selectionRef.current);
    }
  };

  const runCommand = (command, argument = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(command, false, argument);
    saveSelection();
    syncValue();
  };

  const insertHtml = (html) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('insertHTML', false, html);
    saveSelection();
    syncValue();
  };

  const applyBlock = (tagName) => {
    if (!tagName) return;
    runCommand('formatBlock', `<${tagName}>`);
  };

  const applyAlignment = (command) => {
    runCommand(command);
  };

  const applyLink = () => {
    const url = window.prompt('Enter a URL to link');
    const normalizedUrl = normalizeUrl(url || '');
    if (!normalizedUrl) return;
    runCommand('createLink', normalizedUrl);
  };

  const applyFontSize = (size) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('fontSize', false, '7');

    const fontNodes = editorRef.current.querySelectorAll('font[size="7"]');
    let lastSpan = null;
    fontNodes.forEach((fontNode) => {
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      span.innerHTML = fontNode.innerHTML;
      fontNode.parentNode?.replaceChild(span, fontNode);
      lastSpan = span;
    });

    if (lastSpan) {
      const range = document.createRange();
      range.selectNodeContents(lastSpan);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      selectionRef.current = range;
    }

    syncValue();
  };

  const applyColor = (color) => {
    if (!editorRef.current || !color) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
    saveSelection();
    syncValue();
  };

  useEffect(() => {
    if (!editorRef.current) return;
    const nextValue = value || '';
    if (editorRef.current.innerHTML !== nextValue && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = nextValue;
    }
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-theme bg-surface-lighter p-2.5">
        <ToolbarButton title="Bold" onClick={() => runCommand('bold')}>
          <FormatBoldRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => runCommand('italic')}>
          <FormatItalicRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Underline" onClick={() => runCommand('underline')}>
          <FormatUnderlinedRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Strike through" onClick={() => runCommand('strikeThrough')}>
          <FormatStrikethroughRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Quote" onClick={() => applyBlock('blockquote')}>
          <FormatQuoteRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Code block" onClick={() => applyBlock('pre')}>
          <CodeRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Bullet list" onClick={() => runCommand('insertUnorderedList')}>
          <FormatListBulletedRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" onClick={() => runCommand('insertOrderedList')}>
          <FormatListNumberedRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Align left" onClick={() => applyAlignment('justifyLeft')}>
          <FormatAlignLeftRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Align center" onClick={() => applyAlignment('justifyCenter')}>
          <FormatAlignCenterRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Align right" onClick={() => applyAlignment('justifyRight')}>
          <FormatAlignRightRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Justify" onClick={() => applyAlignment('justifyFull')}>
          <FormatAlignJustifyRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Link" onClick={applyLink}>
          <LinkRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Undo" onClick={() => runCommand('undo')}>
          <UndoRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => runCommand('redo')}>
          <RedoRoundedIcon sx={{ fontSize: 16 }} />
        </ToolbarButton>
        <div className="h-8 w-px bg-theme" />
        <ToolbarSelect
          title="Blocks"
          options={BLOCK_OPTIONS}
          onMouseDown={saveSelection}
          onPick={(option) => applyBlock(option.value)}
        />
        <ToolbarSelect
          title="Table"
          icon={TableChartRoundedIcon}
          options={TABLE_PRESETS.map((preset) => ({ ...preset, value: `${preset.rows}x${preset.cols}` }))}
          onMouseDown={saveSelection}
          onPick={(option) => insertHtml(buildTableHtml(option.rows, option.cols))}
        />
        <ToolbarSelect
          title="Shape"
          icon={CropSquareRoundedIcon}
          options={SHAPE_PRESETS}
          onMouseDown={saveSelection}
          onPick={(option) => insertHtml(buildShapeHtml(option.value))}
        />
        <div className="flex items-center gap-2 rounded-lg border border-theme bg-surface-card px-2.5 py-1.5">
          <FormatSizeRoundedIcon sx={{ fontSize: 16 }} className="text-secondary" />
          <select
            defaultValue=""
            onMouseDown={(event) => event.preventDefault()}
            onChange={(event) => {
              const size = Number.parseInt(event.target.value, 10);
              if (Number.isFinite(size)) {
                applyFontSize(size);
              }
              event.target.value = '';
            }}
            className="bg-transparent text-xs font-medium text-primary focus:outline-none"
          >
            <option value="" disabled>Font size</option>
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>{size}px</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-theme bg-surface-card px-2.5 py-1.5 text-xs font-medium text-secondary">
          <FormatColorTextRoundedIcon sx={{ fontSize: 16 }} />
          <input
            type="color"
            defaultValue="#111827"
            onMouseDown={saveSelection}
            onChange={(event) => applyColor(event.target.value)}
            className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
            title="Text color"
          />
        </label>
        <ToolbarButton title="Clear formatting" onClick={() => runCommand('removeFormat')}>
          <span className="text-xs font-bold tracking-tight">Tx</span>
        </ToolbarButton>
      </div>

      <div className="relative">
        {!value && (
          <span className="pointer-events-none absolute left-4 top-3 text-xs text-secondary">
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncValue}
          onBlur={syncValue}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          className="min-h-[260px] rounded-2xl border border-theme bg-surface px-4 py-3 text-sm leading-6 text-primary outline-none whitespace-pre-wrap break-words"
          style={{ caretColor: '#4F7CF3' }}
        />
      </div>

      <p className="text-[11px] text-secondary">
        Rich text is saved as HTML. Use the toolbar to format text, insert tables, and add simple text shapes.
      </p>
    </div>
  );
}