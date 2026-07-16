const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables (.env). AI code review will fail.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Sends a prompt completion request to Google's Gemini model.
 * Enforces a 15-second timeout using Promise.race.
 * 
 * @param {string} prompt - The prompt instructions.
 * @returns {Promise<string>} - The raw text response.
 */
const callAI = async (prompt) => {
  if (!genAI) {
    throw new Error('Gemini API client is not initialized. Please set GEMINI_API_KEY in your .env file.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    
    // Create a 30-second timeout promise (30000ms)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000);
    });

    // Race model response against timeout
    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise
    ]);
    
    if (!result || !result.response) {
      throw new Error('Empty response received from Gemini API');
    }

    const text = result.response.text();
    return text || '';
  } catch (err) {
    if (err.message === 'TIMEOUT') {
      throw err;
    }
    throw new Error(`Gemini API execution failed: ${err.message}`);
  }
};

/**
 * Helper to strip markdown code blocks (```json) before JSON.parse.
 */
const cleanJSONResponse = (text) => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\s*```$/, '');
  }
  return cleaned.trim();
};

/**
 * Reviews a given code block (with optional linter findings context) and returns a JSON findings array.
 * Retries once with a stricter instructions block if the first response is not parseable.
 * 
 * @param {string} code - Source code to analyze.
 * @param {string} language - Code language (e.g. javascript, python).
 * @param {Array} [linterFindings] - Optional array of static findings to provide as context.
 * @returns {Promise<Array>} - Structured findings array.
 */
const getAIReview = async (code, language, linterFindings = []) => {
  let linterContextText = "";
  if (linterFindings && linterFindings.length > 0) {
    linterContextText = `\nAdditionally, a static analysis linter reported these issues in the file:
${JSON.stringify(linterFindings, null, 2)}
Please use this linter findings context to avoid duplicating simple syntax rule reports. Focus your review on code logic, naming clarity, complexity, performance bottleneck and security vulnerabilities.`;
  }

  const prompt = `You are an expert senior software developer and code reviewer.
Analyze the following source code written in ${language} and identify issues like security vulnerabilities, logical bugs, naming violations, efficiency problems, or general code smells.${linterContextText}

Specifically, you MUST analyze the code to detect and flag the following code smells:
1. Functions longer than 50 lines (issue field value: "code-smell-long-function")
2. Functions with more than 4 parameters (issue field value: "code-smell-excessive-parameters")
3. Deeply nested conditionals of 3+ levels (issue field value: "code-smell-deep-nesting")
4. Duplicate-looking code blocks within the file (issue field value: "code-smell-duplicate-code")

You must respond ONLY with a valid JSON array of objects. Do not wrap the JSON output in markdown formatting. Do not include any text before or after the JSON array.

Each finding object in the array must contain:
1. severity: must be one of "error", "warning", "info"
2. issue: a short machine-readable tag identifying the issue (use "code-smell-long-function", "code-smell-deep-nesting", etc. for code smells; or other appropriate tags like "sql-injection", "unused-variable")
3. explanation: human-readable description of the problem and its implications
4. suggested_fix: a concrete code block or guidance showing how to fix the issue
5. line_number: integer line number where the issue occurs (1-indexed)

Expected JSON Output Format:
[
  {
    "severity": "warning",
    "issue": "security-sensitive-data",
    "explanation": "Plain text credentials detected in code variables. Use env variables instead.",
    "suggested_fix": "const apiKey = process.env.API_KEY || 'default';",
    "line_number": 5
  }
]

Analyze this code:
\`\`\`
${code}
\`\`\``;

  try {
    const rawText = await callAI(prompt);
    const cleanedText = cleanJSONResponse(rawText);
    
    try {
      return JSON.parse(cleanedText);
    } catch (parseErr) {
      console.warn("AI response JSON parsing failed. Retrying once with a stricter instructions block...", parseErr.message);
      
      const retryPrompt = `${prompt}

WARNING: Your previous response was not valid JSON.
Please return ONLY the valid JSON array of findings. Do not include markdown code block fences, explanations outside the array, or any additional text. Return strictly the JSON array.`;

      const retryRawText = await callAI(retryPrompt);
      const retryCleanedText = cleanJSONResponse(retryRawText);
      return JSON.parse(retryCleanedText);
    }
  } catch (err) {
    throw new Error(`AI Review generation failed: ${err.message}`);
  }
};

module.exports = {
  callAI,
  getAIReview
};
