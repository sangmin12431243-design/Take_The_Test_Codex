import * as XLSX from "xlsx";
import type {
  CsvProblemRow,
  CsvValidationError,
  ParsedCsvProblemRow,
  ValidatedCsvProblemRow,
} from "@/types/problem-csv";

const fieldOrder: (keyof CsvProblemRow)[] = [
  "category",
  "order_index",
  "question_text",
  "choice_1",
  "choice_2",
  "choice_3",
  "choice_4",
  "correct_answer",
  "explanation",
  "difficulty",
  "is_active",
];

const headerAliases: Record<keyof CsvProblemRow, string[]> = {
  category: ["카테고리", "category"],
  order_index: ["문제순서", "order_index"],
  question_text: ["문제", "question_text"],
  choice_1: ["선지1", "choice_1"],
  choice_2: ["선지2", "choice_2"],
  choice_3: ["선지3", "choice_3"],
  choice_4: ["선지4", "choice_4"],
  correct_answer: ["정답번호", "correct_answer"],
  explanation: ["해설", "explanation"],
  difficulty: ["난이도", "difficulty"],
  is_active: ["활성여부", "is_active"],
};

const difficultyMap: Record<string, "easy" | "medium" | "hard"> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
  쉬움: "easy",
  보통: "medium",
  어려움: "hard",
};

const activeMap: Record<string, boolean> = {
  true: true,
  false: false,
  활성: true,
  비활성: false,
  예: true,
  아니오: false,
  yes: true,
  no: false,
  y: true,
  n: false,
};

const templateRows = [
  {
    카테고리: "sample",
    문제순서: "1",
    문제: "대한민국의 수도는?",
    선지1: "서울",
    선지2: "부산",
    선지3: "대구",
    선지4: "인천",
    정답번호: "1",
    해설: "서울은 대한민국의 수도이다",
    난이도: "쉬움",
    활성여부: "활성",
  },
  {
    카테고리: "sample",
    문제순서: "2",
    문제: "2+2는?",
    선지1: "1",
    선지2: "2",
    선지3: "3",
    선지4: "4",
    정답번호: "4",
    해설: "2+2는 4이다",
    난이도: "쉬움",
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
    if (headerAliases[field].includes(normalized)) {
      return field;
    }
  }

  return null;
}

function normalizeDifficulty(value: string) {
  return difficultyMap[value.trim()] ?? difficultyMap[value.trim().toLowerCase()];
}

function normalizeActive(value: string) {
  return activeMap[value.trim()] ?? activeMap[value.trim().toLowerCase()];
}

export function parseProblemsWorkbook(buffer: ArrayBuffer): ParsedCsvProblemRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
    raw: false,
  });

  if (rows.length === 0) {
    return [];
  }

  const sourceHeaders = Object.keys(rows[0] ?? {});
  const keyMap = new Map<keyof CsvProblemRow, string>();

  sourceHeaders.forEach((header) => {
    const canonicalKey = getCanonicalKey(header);
    if (canonicalKey && !keyMap.has(canonicalKey)) {
      keyMap.set(canonicalKey, header);
    }
  });

  const missingHeaders = fieldOrder.filter((key) => !keyMap.has(key));
  if (missingHeaders.length > 0) {
    const missingLabels = missingHeaders.map((key) => headerAliases[key][0]);
    throw new Error(`XLSX 헤더가 올바르지 않습니다. 누락 컬럼: ${missingLabels.join(", ")}`);
  }

  return rows.map((rawRow, index) => {
    const raw = fieldOrder.reduce((acc, key) => {
      const sourceHeader = keyMap.get(key) ?? key;
      acc[key] = normalizeCell(rawRow[sourceHeader]);
      return acc;
    }, {} as CsvProblemRow);

    return {
      rowNumber: index + 2,
      raw,
    };
  });
}

export function validateCsvRows(rows: ParsedCsvProblemRow[]): {
  validRows: ValidatedCsvProblemRow[];
  errors: CsvValidationError[];
} {
  const errors: CsvValidationError[] = [];
  const validRows: ValidatedCsvProblemRow[] = [];

  rows.forEach((row) => {
    const { raw, rowNumber } = row;

    if (!raw.category) {
      errors.push({ rowNumber, message: "카테고리는 필수입니다." });
    }

    if (!raw.question_text) {
      errors.push({ rowNumber, message: "문제는 필수입니다." });
    }

    if (!raw.choice_1 || !raw.choice_2 || !raw.choice_3 || !raw.choice_4) {
      errors.push({ rowNumber, message: "선지 1~4는 모두 필수입니다." });
    }

    const orderIndex = Number(raw.order_index);
    if (!Number.isFinite(orderIndex)) {
      errors.push({ rowNumber, message: "문제순서는 숫자여야 합니다." });
    }

    const correctAnswer = Number(raw.correct_answer);
    if (![1, 2, 3, 4].includes(correctAnswer)) {
      errors.push({ rowNumber, message: "정답번호는 1~4만 허용됩니다." });
    }

    const normalizedDifficulty = normalizeDifficulty(raw.difficulty);
    if (!normalizedDifficulty) {
      errors.push({ rowNumber, message: "난이도는 쉬움, 보통, 어려움 또는 easy, medium, hard만 허용됩니다." });
    }

    const normalizedActive = normalizeActive(raw.is_active);
    if (typeof normalizedActive !== "boolean") {
      errors.push({ rowNumber, message: "활성여부는 활성, 비활성, 예, 아니오 또는 true, false만 허용됩니다." });
    }

    const hasCurrentRowError = errors.some((error) => error.rowNumber === rowNumber);
    if (hasCurrentRowError) {
      return;
    }

    validRows.push({
      rowNumber,
      categoryName: raw.category,
      order_index: orderIndex,
      question_text: raw.question_text,
      choice_1: raw.choice_1,
      choice_2: raw.choice_2,
      choice_3: raw.choice_3,
      choice_4: raw.choice_4,
      correct_answer: correctAnswer,
      explanation: raw.explanation ?? "",
      difficulty: normalizedDifficulty!,
      is_active: normalizedActive!,
    });
  });

  return { validRows, errors };
}

export function triggerCsvTemplateDownload(): void {
  const worksheet = XLSX.utils.json_to_sheet(templateRows, {
    header: ["카테고리", "문제순서", "문제", "선지1", "선지2", "선지3", "선지4", "정답번호", "해설", "난이도", "활성여부"],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "problems");
  XLSX.writeFile(workbook, "problem_template.xlsx");
}
