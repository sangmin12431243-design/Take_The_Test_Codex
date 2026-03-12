"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { parseProblemsWorkbook, triggerCsvTemplateDownload, validateCsvRows } from "@/lib/csv/problem-csv";
import { createProblemsFromCsv } from "@/lib/queries/problems";
import type { CategoryRow } from "@/types/problem-management";
import type { CsvValidationError, ParsedCsvProblemRow } from "@/types/problem-csv";

interface ProblemCsvUploadProps {
  userId: string;
  categories: CategoryRow[];
  onUploaded: () => Promise<void>;
}

interface UploadSummary {
  createdProblems: number;
  createdCategories: number;
}

export function ProblemCsvUpload({ userId, categories, onUploaded }: ProblemCsvUploadProps) {
  const [parsedRows, setParsedRows] = useState<ParsedCsvProblemRow[]>([]);
  const [errors, setErrors] = useState<CsvValidationError[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<UploadSummary | null>(null);

  const validRows = useMemo(() => validateCsvRows(parsedRows).validRows, [parsedRows]);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setMessage(null);
    setSummary(null);

    if (!file) {
      setParsedRows([]);
      setErrors([]);
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const rows = parseProblemsWorkbook(buffer);
      const validation = validateCsvRows(rows);
      setParsedRows(rows);
      setErrors(validation.errors);
      if (rows.length === 0) {
        setMessage("XLSX 데이터가 비어 있습니다.");
      }
    } catch (error) {
      setParsedRows([]);
      setErrors([]);
      setMessage(error instanceof Error ? error.message : "XLSX 파싱 중 오류가 발생했습니다.");
    }
  };

  const handleUpload = async () => {
    if (parsedRows.length === 0) {
      setMessage("업로드할 XLSX 파일을 먼저 선택하세요.");
      return;
    }

    const validation = validateCsvRows(parsedRows);
    setErrors(validation.errors);

    if (validation.errors.length > 0) {
      setMessage("유효성 오류를 먼저 해결해주세요.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await createProblemsFromCsv(userId, validation.validRows, categories);
      setSummary(result);
      setMessage("XLSX 업로드가 완료되었습니다.");
      await onUploaded();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "XLSX 업로드 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">XLSX 업로드</h2>
        <button
          type="button"
          onClick={triggerCsvTemplateDownload}
          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
        >
          한글 템플릿 다운로드
        </button>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        한글 헤더 `카테고리`, `문제순서`, `문제`, `선지1~4`, `정답번호`, `해설`, `난이도`, `활성여부`를 사용하세요.
        기존 영문 헤더 파일도 같이 지원합니다.
      </p>

      <div className="mt-4">
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={onFileChange}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-medium"
        />
      </div>

      {message && <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">{message}</div>}

      {errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">유효성 오류</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map((error, index) => (
              <li key={`${error.rowNumber}-${index}`}>행 {error.rowNumber}: {error.message}</li>
            ))}
          </ul>
        </div>
      )}

      {summary && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          업로드 결과: 문제 {summary.createdProblems}개 생성, 신규 카테고리 {summary.createdCategories}개 생성
        </div>
      )}

      {parsedRows.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">행</th>
                <th className="px-3 py-2">카테고리</th>
                <th className="px-3 py-2">문제순서</th>
                <th className="px-3 py-2">문제</th>
                <th className="px-3 py-2">난이도</th>
                <th className="px-3 py-2">활성여부</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parsedRows.map((row) => (
                <tr key={`${row.rowNumber}-${row.raw.question_text}`}>
                  <td className="px-3 py-2">{row.rowNumber}</td>
                  <td className="px-3 py-2">{row.raw.category}</td>
                  <td className="px-3 py-2">{row.raw.order_index}</td>
                  <td className="px-3 py-2">{row.raw.question_text}</td>
                  <td className="px-3 py-2">{row.raw.difficulty}</td>
                  <td className="px-3 py-2">{row.raw.is_active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          disabled={busy || parsedRows.length === 0 || errors.length > 0 || validRows.length === 0}
          onClick={handleUpload}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busy ? "업로드 중..." : "XLSX 업로드"}
        </button>
      </div>
    </section>
  );
}
