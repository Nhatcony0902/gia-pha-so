import type { EvalQuestion } from "./questions.js";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Khớp nguyên cụm từ, không phân biệt hoa thường, phải đúng dấu: "cô" không khớp "có" hay "côn". */
export function containsPhrase(text: string, phrase: string) {
  const pattern = new RegExp(
    `(?<!\\p{L})${escapeRegExp(phrase.normalize("NFC").toLowerCase())}(?!\\p{L})`,
    "u",
  );
  return pattern.test(text.normalize("NFC").toLowerCase());
}

export function gradeAnswer(
  question: EvalQuestion,
  answer: string,
  toolsCalled: string[],
) {
  const failures: string[] = [];
  for (const phrase of question.mustInclude ?? [])
    if (!containsPhrase(answer, phrase)) failures.push(`thiếu "${phrase}"`);
  if (
    question.mustIncludeAny?.length &&
    !question.mustIncludeAny.some((phrase) => containsPhrase(answer, phrase))
  )
    failures.push(
      `không có cụm nào trong: ${question.mustIncludeAny.map((p) => `"${p}"`).join(", ")}`,
    );
  for (const phrase of question.mustNotInclude ?? [])
    if (containsPhrase(answer, phrase))
      failures.push(`không được có "${phrase}"`);
  for (const tool of question.expectTools ?? [])
    if (!toolsCalled.includes(tool)) failures.push(`không gọi ${tool}`);
  return { pass: failures.length === 0, failures };
}
