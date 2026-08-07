'use client';

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from 'react';
import { Icons } from '@/components/ui/Icons';

const MAX_KEYWORDS = 750;

function parseKeywords(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_KEYWORDS);
}

function normalizeText(value: string) {
  return parseKeywords(value).join('\n');
}

export function KeywordPickerClient() {
  const [text, setText] = useState('');
  const [excludeBrand, setExcludeBrand] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const keywords = useMemo(() => parseKeywords(text), [text]);
  const lineCount = Math.max(10, text.split('\n').length);

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = normalizeText(event.target.value);
    setText(next);
  };

  const readFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== 'csv' && extension !== 'txt') return;

    const content = await file.text();
    const nextKeywords = parseKeywords(`${text}\n${content}`);
    setText(nextKeywords.join('\n'));
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await readFile(file);
    event.target.value = '';
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) await readFile(file);
  };

  return (
    <main className="keyword-page">
      <section className="keyword-shell" aria-labelledby="keyword-title">
        <header className="keyword-header">
          <h1 id="keyword-title">Let&apos;s pick the keywords you care about</h1>
          <p>You can always add more keywords later</p>
        </header>

        <div className="keyword-toolbar">
          <label className="keyword-checkbox">
            <input
              type="checkbox"
              checked={excludeBrand}
              onChange={(event) => setExcludeBrand(event.target.checked)}
            />
            <span>Exclude brand name</span>
          </label>

          <button
            className="keyword-clear"
            type="button"
            disabled={!text}
            onClick={() => setText('')}
          >
            Clear all
          </button>
        </div>

        <div
          className={`keyword-editor${isDragging ? ' is-dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="keyword-textarea-row">
            <div className="keyword-lines" aria-hidden="true">
              {Array.from({ length: lineCount }, (_, index) => (
                <span key={index}>{index + 1}</span>
              ))}
            </div>
            <textarea
              aria-label="Keywords"
              value={text}
              onChange={handleTextChange}
              spellCheck={false}
              rows={10}
            />
          </div>

          <div className="keyword-footer">
            <button
              type="button"
              className="keyword-import"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="keyword-import-icon" aria-hidden="true">
                {Icons.folder}
              </span>
              <span>Import from file (.csv, .txt) or drag and drop here</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={handleFileChange}
              hidden
            />

            <div className="keyword-count" aria-live="polite">
              <span aria-hidden="true">{Icons.chart}</span>
              <span>Keywords:</span>
              <strong>{keywords.length} of {MAX_KEYWORDS}</strong>
            </div>
          </div>
        </div>

        <button
          className="keyword-launch"
          type="button"
          disabled={keywords.length === 0}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('keywords:launch', {
              detail: { keywords, excludeBrand },
            }));
          }}
        >
          Launch tracking
        </button>
      </section>
    </main>
  );
}
