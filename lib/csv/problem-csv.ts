import * as XLSX from "xlsx";
import type { CsvProblemRow, CsvValidationError, ParsedCsvProblemRow, ValidatedCsvProblemRow } from "@/types/problem-csv";

const fieldOrder: (keyof CsvProblemRow)[] = [
  "category",
  "question_text",
  "image_url",
  "choice_1",
  "choice_2",
  "choice_3",
  "choice_4",
  "correct_answer",
  "explanation",
  "is_active",
];

const headerAliases: Record<keyof CsvProblemRow, string[]> = {
  category: ["카테고리", "category"],
  question_text: ["문제", "question_text"],
  image_url: ["이미지 URL", "image_url", "image"],
  choice_1: ["문항1", "선지1", "choice_1"],
  choice_2: ["문항2", "선지2", "choice_2"],
  choice_3: ["문항3", "선지3", "choice_3"],
  choice_4: ["문항4", "선지4", "choice_4"],
  correct_answer: ["정답", "정답번호", "correct_answer"],
  explanation: ["해설", "explanation"],
  is_active: ["활성여부", "is_active"],
};

const activeMap: Record<string, boolean> = {
  true: true,
  false: false,
  활성: true,
  비활성: false,
  예: true,
  아니요: false,
  yes: true,
  no: false,
  y: true,
  n: false,
};

const templateRows = [
  {
    카테고리: "sample",
    문제: "대한민국의 수도는 어디인가요?",
    "이미지 URL": "https://example.com/sample-question.png",
    문항1: "서울",
    문항2: "부산",
    문항3: "대구",
    문항4: "인천",
    정답: "1",
    해설: "서울은 대한민국의 수도입니다.",
    활성여부: "활성",
  },
];

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function getCanonicalKey(header: string): keyof CsvProblemRow | null {
  const normalized = header.trim();
  for (const field of fieldOrder) {
    if (headerAliases[field].includes(normalized)) return field;
  }
  return null;
}

function normalizeActive(value: string) {
  return activeMap[value.trim()] ?? activeMap[value.trim().toLowerCase()];
}

export function parseProblemsWorkbook(buffer: ArrayBuffer): ParsedCsvProblemRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "", raw: false });
  if (rows.length === 0) return [];

  const sourceHeaders = Object.keys(rows[0] ?? {});
  const keyMap = new Map<keyof CsvProblemRow, string>();

  sourceHeaders.forEach((header) => {
    const canonicalKey = getCanonicalKey(header);
    if (canonicalKey && !keyMap.has(canonicalKey)) keyMap.set(canonicalKey, header);
  });

  const missingHeaders = fieldOrder.filter((key) => !keyMap.has(key));
  if (missingHeaders.length > 0) {
    const missingLabels = missingHeaders.map((key) => headerAliases[key][0]);
    throw new Error(`XLSX 헤더가 올바르지 않습니다. 누락 컬럼: ${missingLabels.join(", ")}`);
  }

  return rows.map((rawRow, index) => ({
    rowNumber: index + 2,
    raw: fieldOrder.reduce((acc, key) => {
      const sourceHeader = keyMap.get(key) ?? key;
      acc[key] = normalizeCell(rawRow[sourceHeader]);
      return acc;
    }, {} as CsvProblemRow),
  }));
}

export function validateCsvRows(rows: ParsedCsvProblemRow[]) {
  const errors: CsvValidationError[] = [];
  const validRows: ValidatedCsvProblemRow[] = [];

  rows.forEach((row) => {
    const { raw, rowNumber } = row;

    if (!raw.category) errors.push({ rowNumber, message: "카테고리는 필수입니다." });
    if (!raw.question_text) errors.push({ rowNumber, message: "문제는 필수입니다." });
    if (!raw.choice_1 || !raw.choice_2 || !raw.choice_3 || !raw.choice_4) {
      errors.push({ rowNumber, message: "문항 1~4는 모두 입력해야 합니다." });
    }

    const correctAnswer = Number(raw.correct_answer);
    if (![1, 2, 3, 4].includes(correctAnswer)) {
      errors.push({ rowNumber, message: "정답은 1~4 중 하나여야 합니다." });
    }

    const normalizedActive = normalizeActive(raw.is_active);
    if (typeof normalizedActive !== "boolean") {
      errors.push({ rowNumber, message: "활성여부는 활성/비활성 또는 true/false만 사용할 수 있습니다." });
    }

    if (errors.some((error) => error.rowNumber === rowNumber)) return;

    validRows.push({
      rowNumber,
      categoryName: raw.category,
      question_text: raw.question_text,
      image_url: raw.image_url ?? "",
      choice_1: raw.choice_1,
      choice_2: raw.choice_2,
      choice_3: raw.choice_3,
      choice_4: raw.choice_4,
      correct_answer: correctAnswer,
      explanation: raw.explanation ?? "",
      is_active: normalizedActive!,
    });
  });

  return { validRows, errors };
}

export function triggerCsvTemplateDownload() {
  const worksheet = XLSX.utils.json_to_sheet(templateRows, {
    header: ["카테고리", "문제", "이미지 URL", "문항1", "문항2", "문항3", "문항4", "정답", "해설", "활성여부"],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "problems");
  XLSX.writeFile(workbook, "problem_template.xlsx");
}
