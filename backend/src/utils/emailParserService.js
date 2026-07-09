import { stripHtml } from './emailParser.js';

// Predefined set of labels and their associated keywords for matching
const LABEL_KEYWORDS = {
  Frontend: ['frontend', 'react', 'vue', 'angular', 'css', 'html', 'ui', 'ux', 'tailwind', 'style', 'styling', 'responsive'],
  Backend: ['backend', 'node', 'express', 'django', 'laravel', 'php', 'python', 'api', 'endpoints', 'server'],
  Bug: ['bug', 'fix', 'error', 'crash', 'broken', 'fails', 'issue', 'not working', 'defect'],
  Feature: ['feature', 'implement', 'new page', 'add button', 'requested', 'enhance'],
  Urgent: ['urgent', 'asap', 'immediate', 'critical', 'emergency', 'highest priority'],
  Meeting: ['meeting', 'discussion', 'call', 'zoom', 'sync', 'huddle'],
  Documentation: ['documentation', 'wiki', 'docs', 'readme', 'guide', 'manual'],
  Design: ['design', 'wireframe', 'mockup', 'figma', 'sketch', 'layout'],
  Testing: ['testing', 'test', 'qa', 'jest', 'cypress', 'unit test'],
  Deployment: ['deployment', 'deploy', 'production', 'vps', 'docker', 'aws', 'vercel', 'host'],
  Client: ['client', 'customer', 'feedback', 'requested', 'demand'],
  API: ['api', 'graphql', 'rest', 'json', 'payload'],
  Authentication: ['authentication', 'auth', 'login', 'signup', 'jwt', 'oauth', 'token'],
  Database: ['database', 'db', 'mysql', 'postgres', 'sqlite', 'prisma', 'query', 'schema'],
  DevOps: ['devops', 'ci/cd', 'github actions', 'pipeline', 'deployment'],
  Research: ['research', 'investigate', 'analyze', 'explore', 'look into']
};

const ACTION_VERBS = [
  'create', 'design', 'build', 'implement', 'optimize', 'fix', 'improve', 
  'deploy', 'setup', 'configure', 'write', 'test', 'review', 'add', 
  'update', 'delete', 'migrate', 'integrate', 'publish', 'refactor',
  'check', 'remove', 'add', 'make', 'change', 'send', 'get'
];

/**
 * Parses raw email content and extracts structured task fields with highlights.
 */
export function parseEmailIntelligently(subject = '', text = '', html = '') {
  let bodyText = text || stripHtml(html) || '';

  // 1. Remove reply history/quotes and signatures first to extract only actionable text
  const quotesRegex = /(On\s+.*\s+wrote:|-+\s*Original Message\s*-+|From:\s+.*|On\s+.*,\s+.*\s+wrote:|>+.*)/mi;
  const signatureRegex = /(^--\s*$|^Best\s+regards|^Warm\s+regards|^Kind\s+regards|^Regards|^Sincerely|^Thanks|^Thank\s+you|^Sent\s+from\s+my)/mi;

  let actionableText = bodyText;
  
  const quoteMatch = bodyText.match(quotesRegex);
  if (quoteMatch && quoteMatch.index !== undefined) {
    actionableText = bodyText.substring(0, quoteMatch.index);
  }

  const sigMatch = actionableText.match(signatureRegex);
  if (sigMatch && sigMatch.index !== undefined) {
    actionableText = actionableText.substring(0, sigMatch.index);
  }

  actionableText = actionableText.trim();

  // Split actionable text into sentences for sentence-level parsing
  const sentences = actionableText
    .split(/[.!?\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  // Initialize extracted fields and highlights
  let extractedTitle = subject.replace(/^(Fwd|Re|Fw|[FWD]):\s*/i, '').trim();
  let extractedDescription = '';
  let extractedPriority = 'MEDIUM';
  let extractedDueDate = null;
  const extractedLabels = [];
  const extractedChecklist = [];

  const highlights = {
    title: { text: extractedTitle, match: extractedTitle },
    priority: null,
    dueDate: null,
    checklist: [],
    labels: {}
  };

  // Ensure title highlight matches some text in subject/body if possible
  const subjectMatch = subject.match(new RegExp(extractedTitle, 'i'));
  if (subjectMatch) {
    highlights.title = { text: subject, match: subjectMatch[0] };
  }

  // --- Priority Extraction ---
  const priorityPatterns = {
    URGENT: ['urgent', 'asap', 'immediate', 'emergency', 'highest priority', 'critical'],
    HIGH: ['high priority', 'important', 'crucial', 'must do', 'high'],
    MEDIUM: ['medium', 'normal', 'standard'],
    LOW: ['low', 'minor', 'trivial', 'whenever']
  };

  let foundPriority = false;
  for (const sentence of sentences) {
    if (foundPriority) break;
    const lowerSentence = sentence.toLowerCase();
    for (const [level, keywords] of Object.entries(priorityPatterns)) {
      for (const kw of keywords) {
        if (lowerSentence.includes(kw)) {
          extractedPriority = level;
          highlights.priority = { text: sentence, match: kw };
          foundPriority = true;
          break;
        }
      }
      if (foundPriority) break;
    }
  }

  // --- Due Date Extraction ---
  const today = new Date();
  let calculatedDate = null;
  let dateTextMatch = '';
  let dateSentence = '';

  for (const sentence of sentences) {
    if (calculatedDate) break;
    const lowerSentence = sentence.toLowerCase();

    // 1. "today"
    if (lowerSentence.includes('today')) {
      calculatedDate = new Date(today);
      dateTextMatch = 'today';
      dateSentence = sentence;
    }
    // 2. "tomorrow"
    else if (lowerSentence.includes('tomorrow')) {
      calculatedDate = new Date(today);
      calculatedDate.setDate(today.getDate() + 1);
      dateTextMatch = 'tomorrow';
      dateSentence = sentence;
    }
    // 3. "next week"
    else if (lowerSentence.includes('next week')) {
      calculatedDate = new Date(today);
      calculatedDate.setDate(today.getDate() + 7);
      dateTextMatch = 'next week';
      dateSentence = sentence;
    }
    // 4. "end of month"
    else if (lowerSentence.includes('end of month') || lowerSentence.includes('end of the month')) {
      calculatedDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
      dateTextMatch = lowerSentence.includes('end of the month') ? 'end of the month' : 'end of month';
      dateSentence = sentence;
    }
    // 5. Day of week (e.g. "before Friday", "on Friday", "by Wednesday")
    else {
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      for (let i = 0; i < daysOfWeek.length; i++) {
        const day = daysOfWeek[i];
        if (lowerSentence.includes(`before ${day}`) || lowerSentence.includes(`by ${day}`) || lowerSentence.includes(`on ${day}`)) {
          calculatedDate = new Date(today);
          const currentDay = today.getDay();
          let daysToAdd = i - currentDay;
          if (daysToAdd <= 0) daysToAdd += 7; // Next week's target day
          calculatedDate.setDate(today.getDate() + daysToAdd);
          
          const matchPattern = new RegExp(`(before|by|on)\\s+${day}`, 'i');
          const m = sentence.match(matchPattern);
          dateTextMatch = m ? m[0] : day;
          dateSentence = sentence;
          break;
        }
      }
    }
  }

  if (calculatedDate) {
    calculatedDate.setHours(12, 0, 0, 0); // Set default due time to noon
    extractedDueDate = calculatedDate.toISOString();
    highlights.dueDate = { text: dateSentence, match: dateTextMatch };
  }

  // --- Labels Extraction ---
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    for (const [labelName, keywords] of Object.entries(LABEL_KEYWORDS)) {
      if (extractedLabels.includes(labelName)) continue;
      for (const kw of keywords) {
        if (lowerSentence.includes(kw)) {
          extractedLabels.push(labelName);
          highlights.labels[labelName] = { text: sentence, match: kw };
          break;
        }
      }
    }
  }

  // --- Checklist Extraction ---
  for (const sentence of sentences) {
    // 1. Detect standard checklist markers first
    const listPattern = /^\s*[-*+]?\s*\[\s*\]\s+(.+)$/i;
    const bulletPattern = /^\s*[-*+]\s+(.+)$/;
    const numPattern = /^\d+\.\s+(.+)$/;

    let parsedItem = '';
    let matchKw = '';

    const listMatch = sentence.match(listPattern);
    if (listMatch) {
      parsedItem = listMatch[1].trim();
      matchKw = sentence;
    } else {
      const bulletMatch = sentence.match(bulletPattern);
      if (bulletMatch) {
        parsedItem = bulletMatch[1].trim();
        matchKw = sentence;
      } else {
        const numMatch = sentence.match(numPattern);
        if (numMatch) {
          parsedItem = numMatch[1].trim();
          matchKw = sentence;
        }
      }
    }

    // 2. If no bullet points exist, check for action verbs at the start of sentences
    if (!parsedItem) {
      const words = sentence.split(/\s+/);
      if (words.length > 2) {
        const firstWord = words[0].toLowerCase().replace(/[^a-z]/g, '');
        if (ACTION_VERBS.includes(firstWord)) {
          parsedItem = sentence;
          matchKw = words[0];
        }
      }
    }

    if (parsedItem && parsedItem.length > 3 && parsedItem.length < 100) {
      // Clean leading action structures if needed, capitalize first letter
      const cleanItem = parsedItem.charAt(0).toUpperCase() + parsedItem.slice(1);
      if (!extractedChecklist.includes(cleanItem)) {
        extractedChecklist.push(cleanItem);
        highlights.checklist.push({ text: sentence, match: matchKw });
      }
    }
  }

  // --- Description Synthesis ---
  // Generate a clean summary paragraph from the actionable text
  const descParagraphs = actionableText.split(/\n+/).map(p => p.trim()).filter(p => p.length > 20);
  if (descParagraphs.length > 0) {
    extractedDescription = descParagraphs[0];
    if (descParagraphs.length > 1) {
      extractedDescription += '\n\n' + descParagraphs.slice(1, 3).join('\n\n');
    }
  } else {
    extractedDescription = actionableText;
  }

  return {
    title: extractedTitle,
    description: extractedDescription,
    priority: extractedPriority,
    dueDate: extractedDueDate,
    labels: extractedLabels,
    checklist: extractedChecklist,
    highlights
  };
}

/**
 * Compares two strings using Sørensen-Dice coefficient (n-grams matching).
 * Returns similarity score between 0 and 100.
 */
export function getDiceSimilarity(s1 = '', s2 = '') {
  const getBigrams = (str) => {
    const s = str.toLowerCase().replace(/\s+/g, '');
    const bigrams = [];
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.push(s.slice(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);

  if (b1.length === 0 && b2.length === 0) return 100;
  if (b1.length === 0 || b2.length === 0) return 0;

  const intersection = [];
  const b2Copy = [...b2];

  for (const gram of b1) {
    const idx = b2Copy.indexOf(gram);
    if (idx !== -1) {
      intersection.push(gram);
      b2Copy.splice(idx, 1);
    }
  }

  const similarity = (2.0 * intersection.length) / (b1.length + b2.length);
  return Math.round(similarity * 100);
}
