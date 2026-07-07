/**
 * PlexCode — Monaco Editor Module
 */

import { toMonacoLang, langLabel, debounce } from '../utils/helpers.js';

let _editor = null;
let _monacoReady = false;
let _onChangeCallback = null;
let _onCursorCallback = null;

/**
 * Load Monaco editor asynchronously.
 * @returns {Promise<void>}
 */
export function loadMonaco() {
  return new Promise((resolve) => {
    require(['vs/editor/editor.main'], () => {
      _monacoReady = true;
      resolve();
    });
  });
}

/**
 * Create the Monaco editor instance.
 * @param {string} containerId
 * @param {string} theme 'dark'|'light'
 */
export function createEditor(containerId, theme = 'dark') {
  if (!_monacoReady) { console.error('Monaco not loaded yet'); return; }

  // Define PlexCode dark theme
  monaco.editor.defineTheme('plexcode-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '555566', fontStyle: 'italic' },
      { token: 'keyword', foreground: '22c55e', fontStyle: 'bold' },
      { token: 'string', foreground: '86efac' },
      { token: 'number', foreground: 'a3e635' },
      { token: 'type', foreground: '4ade80' },
    ],
    colors: {
      'editor.background': '#0d0d0f',
      'editor.foreground': '#f0f0f2',
      'editor.lineHighlightBackground': '#18181d',
      'editor.selectionBackground': '#22c55e33',
      'editorCursor.foreground': '#22c55e',
      'editorLineNumber.foreground': '#333340',
      'editorLineNumber.activeForeground': '#22c55e',
      'editorIndentGuide.background': '#1e1e24',
      'editorIndentGuide.activeBackground': '#22c55e44',
      'editor.findMatchBackground': '#22c55e44',
      'editor.findMatchHighlightBackground': '#22c55e22',
      'scrollbarSlider.background': '#22222a',
      'scrollbarSlider.hoverBackground': '#2a2a33',
    },
  });

  // Define PlexCode light theme
  monaco.editor.defineTheme('plexcode-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '888888', fontStyle: 'italic' },
      { token: 'keyword', foreground: '16a34a', fontStyle: 'bold' },
      { token: 'string', foreground: '15803d' },
      { token: 'number', foreground: '4d7c0f' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#111118',
      'editor.lineHighlightBackground': '#f0f0f2',
      'editor.selectionBackground': '#22c55e33',
      'editorCursor.foreground': '#16a34a',
      'editorLineNumber.foreground': '#aaaaaa',
      'editorLineNumber.activeForeground': '#16a34a',
    },
  });

  _editor = monaco.editor.create(document.getElementById(containerId), {
    value: '',
    language: 'plaintext',
    theme: theme === 'light' ? 'plexcode-light' : 'plexcode-dark',
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontLigatures: true,
    lineNumbers: 'on',
    minimap: { enabled: true, scale: 1 },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'off',
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    renderLineHighlight: 'all',
    bracketPairColorization: { enabled: true },
    guides: { bracketPairs: true, indentation: true },
    suggest: { showIcons: true, preview: true },
    quickSuggestions: { other: true, comments: false, strings: true },
    padding: { top: 12, bottom: 12 },
    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
  });

  // On content change
  _editor.onDidChangeModelContent(debounce(() => {
    if (_onChangeCallback) _onChangeCallback(_editor.getValue());
  }, 300));

  // Cursor position → status bar
  _editor.onDidChangeCursorPosition((e) => {
    if (_onCursorCallback) _onCursorCallback(e.position);
  });

  return _editor;
}

export function getEditor() { return _editor; }
export function isReady() { return _monacoReady && !!_editor; }

export function onContentChange(fn) { _onChangeCallback = fn; }
export function onCursorChange(fn) { _onCursorCallback = fn; }

/**
 * Open a file in the editor.
 * @param {{ filename: string, language: string, content: string }} file
 */
export function openFile(file) {
  if (!_editor) return;
  const monacoLang = toMonacoLang(file.language);
  const model = monaco.editor.createModel(file.content || '', monacoLang);
  _editor.setModel(model);
  _editor.focus();
  document.getElementById('editor-empty')?.classList.add('hidden');
}

/**
 * Set editor content without creating a new model.
 * @param {string} content
 */
export function setContent(content) {
  if (!_editor) return;
  _editor.setValue(content);
}

/**
 * Get current editor content.
 * @returns {string}
 */
export function getContent() {
  return _editor ? _editor.getValue() : '';
}

/**
 * Change the editor language.
 * @param {string} lang PlexCode lang key
 */
export function setLanguage(lang) {
  if (!_editor) return;
  monaco.editor.setModelLanguage(_editor.getModel(), toMonacoLang(lang));
}

/**
 * Switch editor theme.
 * @param {'dark'|'light'} theme
 */
export function setTheme(theme) {
  monaco.editor.setTheme(theme === 'light' ? 'plexcode-light' : 'plexcode-dark');
}

/** Trigger undo */
export function undo() { _editor?.trigger('keyboard', 'undo', null); }

/** Trigger redo */
export function redo() { _editor?.trigger('keyboard', 'redo', null); }

/** Open find widget */
export function openSearch() {
  _editor?.trigger('keyboard', 'actions.find', null);
}

/**
 * Get line/column count for status bar.
 * @returns {{ line: number, column: number, lineCount: number }}
 */
export function getEditorStats() {
  if (!_editor) return { line: 1, column: 1, lineCount: 0 };
  const pos = _editor.getPosition();
  return {
    line: pos?.lineNumber || 1,
    column: pos?.column || 1,
    lineCount: _editor.getModel()?.getLineCount() || 0,
  };
}
