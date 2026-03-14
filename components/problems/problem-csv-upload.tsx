"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ProblemImage } from "@/components/problem-image";
import { parseProblemsWorkbook, triggerCsvTemplateDownload, validateCsvRows } from "@/lib/csv/problem-csv";
import { createProblemsFromCsv } from "@/lib/queries/problems";
import type { ParsedCsvProblemRow } from "@/types/problem-csv";
import type { CategoryRow } from "@/types/problem-management";

interface ProblemCsvUploadProps {
  userId: string;
  categories: CategoryRow[];
  onUploaded: () => Promise<void>;
}

interface UploadSummary {
  createdProblems: number;
  createdCategories: number;
}

const PAGE_SIZE = 10;
const TEXT = {
  active: "\uD65C\uC131",
  inactive: "\uBE44\uD65C\uC131",
  uploadSuccess: "\uC5C5\uB85C\uB4DC\uC5D0 \uC131\uACF5\uD588\uC2B5\uB2C8\uB2E4",
  emptyData: "XLSX \uB370\uC774\uD130\uAC00 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.",
  readError: "XLSX \uD30C\uC77C\uC744 \uC77D\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
  selectFileFirst: "\uC5C5\uB85C\uB4DC\uD560 XLSX \uD30C\uC77C\uC744 \uBA3C\uC800 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.",
  fixValidationFirst: "\uC720\uD6A8\uC131 \uC624\uB958\uB97C \uBA3C\uC800 \uD574\uACB0\uD574 \uC8FC\uC138\uC694.",
  uploadError: "XLSX \uC5C5\uB85C\uB4DC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
  title: "XLSX \uC5C5\uB85C\uB4DC",
  description:
    "`\uCE74\uD14C\uACE0\uB9AC`, `\uBB38\uC81C`, `\uBB38\uD56D1~4`, `\uC815\uB2F5`, `\uD574\uC124`, `\uD65C\uC131\uC5EC\uBD80` \uD615\uC2DD\uC73C\uB85C \uC5C5\uB85C\uB4DC\uD558\uC138\uC694.",
  sampleTemplate: "\uC0D8\uD50C \uD15C\uD50C\uB9BF",
  uploading: "\uC5C5\uB85C\uB4DC \uC911...",
  validationTitle: "\uC720\uD6A8\uC131 \uC624\uB958",
  rowPrefix: "\uD589",
  resultPrefix: "\uC5C5\uB85C\uB4DC \uACB0\uACFC:",
  createdProblems: "\uBB38\uC81C",
  createdCategories: "\uC2E0\uADDC \uCE74\uD14C\uACE0\uB9AC",
  createdSuffix: "\uAC1C \uC0DD\uC131",
  category: "\uCE74\uD14C\uACE0\uB9AC",
  question: "\uBB38\uC81C",
  imageUrl: "\uC774\uBBF8\uC9C0 URL",
  imagePreviewAlt: "\uC5C5\uB85C\uB4DC \uBB38\uC81C \uC774\uBBF8\uC9C0 \uBBF8\uB9AC\uBCF4\uAE30",
  correct: "\uC815\uB2F5",
  choice: "\uBB38\uD56D",
  explanation: "\uD574\uC124",
  previous: "\uC774\uC804",
  next: "\uB2E4\uC74C",
} as const;

function normalizeActiveValue(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();
  return [TEXT.active, "true", "yes", "y", "1"].includes(trimmed) || ["true", "yes", "y", "1"].includes(normalized);
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const start = Math.floor((currentPage - 1) / 10) * 10 + 1;
  const end = Math.min(totalPages, start + 9);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function ProblemCsvUpload({ userId, categories, onUploaded }: ProblemCsvUploadProps) {
  const [rows, setRows] = useState<ParsedCsvProblemRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validation = useMemo(() => validateCsvRows(rows), [rows]);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = useMemo(() => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [page, rows]);
  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setMessage(null);
    setSummary(null);
    setPage(1);

    if (!file) {
      setRows([]);
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const parsedRows = parseProblemsWorkbook(buffer);
      setRows(parsedRows);
      if (parsedRows.length === 0) setMessage(TEXT.emptyData);
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : TEXT.readError);
    }
  };

  const updateRow = (rowIndex: number, updater: (row: ParsedCsvProblemRow) => ParsedCsvProblemRow) => {
    setRows((prev) => prev.map((row, index) => (index === rowIndex ? updater(row) : row)));
  };

  const handleUpload = async () => {
    if (rows.length === 0) {
      setMessage(TEXT.selectFileFirst);
      return;
    }

    if (validation.errors.length > 0) {
      setMessage(TEXT.fixValidationFirst);
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await createProblemsFromCsv(userId, validation.validRows, categories);
      setSummary(result);
      setRows([]);
      setPage(1);
      setToastMessage(TEXT.uploadSuccess);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await onUploaded();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : TEXT.uploadError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {toastMessage && (
        <div className="mb-4 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm">
          {toastMessage}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{TEXT.title}</h2>
          <p className="mt-2 text-sm text-slate-600">{TEXT.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={triggerCsvTemplateDownload}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
          >
            {TEXT.sampleTemplate}
          </button>
          <button
            type="button"
            disabled={busy || rows.length === 0 || validation.validRows.length === 0 || validation.errors.length > 0}
            onClick={handleUpload}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-brand-500/20 hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy ? TEXT.uploading : TEXT.title}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={onFileChange}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-medium"
        />
      </div>

      {message && <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">{message}</div>}

      {validation.errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">{TEXT.validationTitle}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {validation.errors.map((error, index) => (
              <li key={`${error.rowNumber}-${index}`}>
                {TEXT.rowPrefix} {error.rowNumber}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {TEXT.resultPrefix} {TEXT.createdProblems} {summary.createdProblems}
          {TEXT.createdSuffix}, {TEXT.createdCategories} {summary.createdCategories}
          {TEXT.createdSuffix}
        </div>
      )}

      <div className="mt-4 space-y-4">
        {pagedRows.map((row, indexOnPage) => {
          const rowIndex = (page - 1) * PAGE_SIZE + indexOnPage;
          const isActive = normalizeActiveValue(row.raw.is_active);
          return (
            <article
              key={`${row.rowNumber}-${rowIndex}`}
              className={`rounded-2xl border p-4 shadow-sm ${isActive ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50"}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {TEXT.rowPrefix} {row.rowNumber}
                </span>
                <select
                  value={row.raw.is_active}
                  onChange={(e) =>
                    updateRow(rowIndex, (current) => ({
                      ...current,
                      raw: { ...current.raw, is_active: e.target.value },
                    }))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value={TEXT.active}>{TEXT.active}</option>
                  <option value={TEXT.inactive}>{TEXT.inactive}</option>
                </select>
              </div>

              <div className="grid gap-3">
                <input
                  value={row.raw.category}
                  onChange={(e) =>
                    updateRow(rowIndex, (current) => ({
                      ...current,
                      raw: { ...current.raw, category: e.target.value },
                    }))
                  }
                  placeholder={TEXT.category}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />

                <textarea
                  value={row.raw.question_text}
                  onChange={(e) =>
                    updateRow(rowIndex, (current) => ({
                      ...current,
                      raw: { ...current.raw, question_text: e.target.value },
                    }))
                  }
                  placeholder={TEXT.question}
                  className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />

                <input
                  value={row.raw.image_url}
                  onChange={(e) =>
                    updateRow(rowIndex, (current) => ({
                      ...current,
                      raw: { ...current.raw, image_url: e.target.value },
                    }))
                  }
                  placeholder={TEXT.imageUrl}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />

                <ProblemImage src={row.raw.image_url} alt={TEXT.imagePreviewAlt} />

                {(["choice_1", "choice_2", "choice_3", "choice_4"] as const).map((key, choiceIndex) => {
                  const selected = Number(row.raw.correct_answer) === choiceIndex + 1;
                  return (
                    <div key={key} className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateRow(rowIndex, (current) => ({
                            ...current,
                            raw: { ...current.raw, correct_answer: String(choiceIndex + 1) },
                          }))
                        }
                        className={`w-14 rounded-lg border px-3 py-2 text-sm font-semibold ${
                          selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-slate-700"
                        }`}
                      >
                        {selected ? TEXT.correct : `${choiceIndex + 1}`}
                      </button>
                      <input
                        value={row.raw[key]}
                        onChange={(e) =>
                          updateRow(rowIndex, (current) => ({
                            ...current,
                            raw: { ...current.raw, [key]: e.target.value },
                          }))
                        }
                        placeholder={`${TEXT.choice} ${choiceIndex + 1}`}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  );
                })}

                <textarea
                  value={row.raw.explanation}
                  onChange={(e) =>
                    updateRow(rowIndex, (current) => ({
                      ...current,
                      raw: { ...current.raw, explanation: e.target.value },
                    }))
                  }
                  placeholder={TEXT.explanation}
                  className="min-h-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </article>
          );
        })}
      </div>

      {rows.length > PAGE_SIZE && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
          >
            {TEXT.previous}
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
              className={`min-w-9 rounded-lg px-3 py-2 text-sm ${
                page === pageNumber ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"
              }`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
          >
            {TEXT.next}
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={busy || validation.validRows.length === 0 || validation.errors.length > 0}
            onClick={handleUpload}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-brand-500/20 hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy ? TEXT.uploading : TEXT.title}
          </button>
        </div>
      )}
    </section>
  );
}
