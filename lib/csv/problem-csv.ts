import type {
  CsvProblemRow,
  CsvValidationError,
  ParsedCsvProblemRow,
  ValidatedCsvProblemRow,
} from "@/types/problem-csv";

const requiredHeaders: (keyof CsvProblemRow)[] = [
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

export const csvTemplateText = `category,order_index,question_text,choice_1,choice_2,choice_3,choice_4,correct_answer,explanation,difficulty,is_active\nsample,1,대한민국의 수도는?,서울,부산,대구,인천,1,서울은 대한민국의 수도이다,easy,true\nsample,2,2+2는?,1,2,3,4,4,2+2는 4이다,easy,true`;

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const isEscapedQuote = inQuotes && line[i + 1] === '"';
      if (isEscapedQuote) {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseProblemsCsv(csvText: string): ParsedCsvProblemRow[] {
  const normalized = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const headerMap = new Map(headers.map((header, index) => [header, index]));

  const missingHeaders = requiredHeaders.filter((key) => !headerMap.has(key));
  if (missingHeaders.length > 0) {
    throw new Error(`CSV 헤더가 올바르지 않습니다. 누락 컬럼: ${missingHeaders.join(", ")}`);
  }

  const rows: ParsedCsvProblemRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);

    const row = requiredHeaders.reduce((acc, key) => {
      const index = headerMap.get(key);
      acc[key] = typeof index === "number" ? (values[index] ?? "").trim() : "";
      return acc;
    }, {} as CsvProblemRow);

    rows.push({
      rowNumber: i + 1,
      raw: row,
    });
  }

  return rows;
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
      errors.push({ rowNumber, message: "category는 필수입니다." });
    }

    if (!raw.question_text) {
      errors.push({ rowNumber, message: "question_text는 필수입니다." });
    }

    if (!raw.choice_1 || !raw.choice_2 || !raw.choice_3 || !raw.choice_4) {
      errors.push({ rowNumber, message: "choice_1~choice_4는 모두 필수입니다." });
    }

    const orderIndex = Number(raw.order_index);
    if (!Number.isFinite(orderIndex)) {
      errors.push({ rowNumber, message: "order_index는 숫자여야 합니다." });
    }

    const correctAnswer = Number(raw.correct_answer);
    if (![1, 2, 3, 4].includes(correctAnswer)) {
      errors.push({ rowNumber, message: "correct_answer는 1~4만 허용됩니다." });
    }

    if (!["easy", "medium", "hard"].includes(raw.difficulty)) {
      errors.push({ rowNumber, message: "difficulty는 easy|medium|hard만 허용됩니다." });
    }

    if (!["true", "false"].includes(raw.is_active.toLowerCase())) {
      errors.push({ rowNumber, message: "is_active는 true|false만 허용됩니다." });
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
      difficulty: raw.difficulty as "easy" | "medium" | "hard",
      is_active: raw.is_active.toLowerCase() === "true",
    });
  });

  return { validRows, errors };
}

export function triggerCsvTemplateDownload(): void {
  const blob = new Blob([csvTemplateText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "problem_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
