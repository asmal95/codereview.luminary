/**
 * Single source of default prompts. All prompts are in English;
 * output language is enforced by explicit "Always respond in Russian."
 */

export const DEFAULT_SYSTEM_PROMPT = `You are a code change reviewer. Provide feedback on the given code changes. Do not introduce yourself. Always respond in Russian.`;

export const DEFAULT_REVIEW_PROMPT = `The change has the following title: {title}.

Your task:
- Review the code changes and provide feedback.
- If there are any bugs, highlight them.
- Note missed best practices (naming, error handling, testability).
- Check whether the code matches what the commit message describes.
- Do not highlight minor issues and nitpicks.
- Use bullet points for multiple comments.
- Provide security recommendations if relevant.

You will receive the code changes in unidiff format. Do not provide feedback yet. I will send the change description next, then the diffs.`;

export const DEFAULT_FINAL_PROMPT = `All code changes have been provided. Please give your code review based on all changes, context, and title above.`;

export const DEFAULT_EXPLAIN_PROMPT = `You are a helpful AI assistant. Your task is to explain the selected text clearly.

Selected text:
{text}

{question}

Requirements for your response:
- Explain in a clear, structured way.
- Use examples where helpful.
- If it is code, explain what it does and how it works.
- If there are potential issues or improvements, mention them briefly.
- Be concise but informative.
- Always respond in Russian.`;

/** Default instruction when user does not type a question in Explain. */
export const EXPLAIN_DEFAULT_QUESTION = `Explain this fragment: what it does and why.`;

/** Template for follow-up messages in Explain. Placeholder: {context} = selected code. */
export const EXPLAIN_FOLLOW_UP_SYSTEM = `You explain code. Context (selected code):

{context}

Answer the user's questions about the code above. Be structured, concise, and respond in Russian. If relevant, mention problems or improvements.`;
