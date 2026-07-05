/**
 * Email Parser Utility
 * Cleans quoted email text, removes signatures, and parses checklist items.
 */

/**
 * Parses email body (HTML or plain text) to remove signature and quoted text,
 * and extracts checklist items.
 * @param {string} text - The raw email plain text body.
 * @param {string} html - The raw email html body.
 * @returns {{ cleanDescription: string, checklists: string[] }}
 */
export function parseEmailBody(text = '', html = '') {
  let body = text || stripHtml(html) || '';

  // 1. Quoted text removal
  // Patterns for email replies (e.g. "On Thu, Jul 2, 2026 at 3:00 PM ... wrote:")
  const quotePatterns = [
    /^\s*On\s+.*\s+wrote:\s*$/mi,
    /^\s*-+\s*Original Message\s*-+\s*$/mi,
    /^\s*From:\s+.*$/mi,
    /^\s*On\s+.*,\s+.*\s+wrote:\s*$/mi,
    /^\s*On\s+.*,\s+.*<.*>\s+wrote:\s*$/mi,
    /^\s*On\s+.*at\s+.*<.*>\s+wrote:\s*$/mi,
    /^\s*On\s+.*at\s+.*wrote:\s*$/mi,
    /^\s*On\s+.*\s+wrote:\s*$/mi,
    /^\s*>+.*$/mi // lines starting with >
  ];

  let lines = body.split(/\r?\n/);
  let cleanLines = [];
  let cutOff = false;

  for (let line of lines) {
    // Check if line matches reply headers
    if (quotePatterns.some(pat => pat.test(line))) {
      cutOff = true;
    }
    // Also stop if we hit lines starting with '>'
    if (line.trim().startsWith('>')) {
      cutOff = true;
    }

    if (cutOff) break;
    cleanLines.push(line);
  }

  body = cleanLines.join('\n').trim();

  // 2. Remove standard email signature delimiters
  const signaturePatterns = [
    /^--\s*$/m,               // Standard dash-dash-space
    /^Best\s+regards/mi,
    /^Warm\s+regards/mi,
    /^Kind\s+regards/mi,
    /^Regards/mi,
    /^Sincerely/mi,
    /^Thanks/mi,
    /^Thank\s+you/mi,
    /^Sent\s+from\s+my\s+iPhone/mi,
    /^Sent\s+from\s+my\s+Android/mi
  ];

  for (const pat of signaturePatterns) {
    const match = body.match(pat);
    if (match && match.index !== undefined) {
      body = body.substring(0, match.index).trim();
    }
  }

  // 3. Extract checklist items
  // Look for patterns like "- [ ] item" or "* [ ] item" or "1. item" or "[] item"
  const checklists = [];
  const checklistLines = body.split(/\r?\n/);
  const checklistItemPattern = /^\s*[-*+]?\s*\[\s*\]\s+(.+)$/i;

  for (const line of checklistLines) {
    const match = line.match(checklistItemPattern);
    if (match) {
      checklists.push(match[1].trim());
    }
  }

  return {
    cleanDescription: body.trim(),
    checklists
  };
}

/**
 * Helper to strip HTML tags and resolve basic line breaks
 * @param {string} html 
 * @returns {string}
 */
export function stripHtml(html) {
  if (!html) return '';
  let text = html;
  
  // Replace line breaks and paragraph tags with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/tr>/gi, '\n');
  
  // Strip all other tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode basic HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return text.trim();
}
