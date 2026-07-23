import sanitizeHtml from 'sanitize-html';
import { convert } from 'html-to-text';
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
  'check', 'remove', 'make', 'change', 'send', 'get', 'complete', 'upload', 'finish'
];

/**
 * Clean Subject Line of RE:, FW:, FWD:, etc.
 */
export function cleanSubject(subject = '') {
  let cleaned = subject;
  // Patterns matching RE:, FW:, FWD:, etc. and variations like Re[2]: or Fwd: fwd:
  const prefixPattern = /^\s*(re|fw|fwd|aw|wg|reply|forward|回复|转发|答复)\s*(\[\d+\])?\s*:\s*/i;
  while (prefixPattern.test(cleaned)) {
    cleaned = cleaned.replace(prefixPattern, '');
  }
  return cleaned.replace(/\s+/g, ' ').trim() || 'No Subject';
}

/**
 * Parses a sender address string to extract Name and Email
 */
export function parseSender(senderStr = '') {
  let name = '';
  let email = '';
  const emailMatch = senderStr.match(/<([^>]+)>/);
  if (emailMatch) {
    email = emailMatch[1].trim();
    name = senderStr.replace(/<[^>]+>/, '').replace(/['"]/g, '').trim();
  } else {
    email = senderStr.trim();
    name = email.split('@')[0] || '';
  }
  return { name, email };
}

/**
 * Cleans raw html email using sanitize-html and html-to-text.
 */
export function cleanHtmlBody(html = '') {
  if (!html) return '';
  
  // 1. Sanitize using sanitize-html to remove scripts, styles, hidden elements, tracking pixels
  const sanitized = sanitizeHtml(html, {
    nonTextTags: ['style', 'script', 'textarea', 'noscript', 'head', 'title', 'meta'],
    allowedTags: [
      'p', 'br', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'b', 'i', 'strong', 'em', 'span', 'div'
    ],
    allowedAttributes: {
      'a': ['href', 'title'],
      'img': ['src', 'alt', 'width', 'height'],
      'span': ['style'],
      'div': ['style'],
      'p': ['style']
    },
    exclusiveFilter: function(frame) {
      // Remove hidden elements (e.g. display:none or visibility:hidden)
      const style = frame.attribs.style || '';
      if (/display:\s*none/i.test(style) || /visibility:\s*hidden/i.test(style)) {
        return true;
      }
      
      // Remove tracking pixels
      if (frame.tag === 'img') {
        const width = frame.attribs.width;
        const height = frame.attribs.height;
        const src = frame.attribs.src || '';
        if (width === '1' || height === '1' || /pixel|spacer|tracking|open|trck|t\.gif/i.test(src)) {
          return true;
        }
      }
      return false;
    }
  });

  // 2. Convert to formatted plain text, preserving structure
  const text = convert(sanitized, {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
      { selector: 'img', format: 'skip' },
      { selector: 'table', options: { uppercaseHeader: false } }
    ]
  });

  return text.trim();
}

/**
 * Parses email plain text body to strip signatures, chains, disclaimers, unsubscribe footers, etc.
 */
export function cleanBodyText(bodyText = '') {
  if (!bodyText) return '';
  
  let lines = bodyText.split(/\r?\n/);
  let cleanLines = [];
  
  // Quoted email headers & history cutoff patterns
  const quotePatterns = [
    /^\s*On\s+.*\s+wrote:\s*$/i,
    /^\s*-+\s*Original Message\s*-+\s*$/i,
    /^\s*From:\s+.*$/i,
    /^\s*>+.*$/ // lines starting with >
  ];
  
  // Common company disclaimers
  const disclaimerPatterns = [
    /confidentiality\s+note/i,
    /this\s+email\s+and\s+any\s+attachments\s+are\s+confidential/i,
    /legally\s+privileged/i,
    /intended\s+solely\s+for\s+the\s+addressee/i,
    /do\s+not\s+disclose\s+this/i,
    /sender\s+accepts\s+no\s+liability/i,
    /disclaimer/i,
    /privileged\/confidential/i
  ];
  
  // Unsubscribe footers
  const unsubscribePatterns = [
    /unsubscribe/i,
    /opt-out/i,
    /manage\s+preferences/i,
    /click\s+here\s+to\s+unsubscribe/i
  ];
  
  for (let line of lines) {
    const trimmed = line.trim();
    
    // Stop processing if we hit quoted previous email chains
    if (quotePatterns.some(pat => pat.test(line)) || trimmed.startsWith('>')) {
      break;
    }
    
    // Skip disclaimer & unsubscribe lines
    if (disclaimerPatterns.some(pat => pat.test(trimmed)) || unsubscribePatterns.some(pat => pat.test(trimmed))) {
      continue;
    }
    
    // Skip raw MIME/base64 headers and boundaries
    if (trimmed.startsWith('------=_NextPart') || trimmed.startsWith('Content-Type:') || trimmed.startsWith('Content-Transfer-Encoding:')) {
      continue;
    }
    
    cleanLines.push(line);
  }
  
  let cleaned = cleanLines.join('\n').trim();
  
  // Strip standard email signatures
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
    /^Sent\s+from\s+my\s+Android/mi,
    /^Sent\s+from\s+Mail/mi
  ];
  
  for (const pat of signaturePatterns) {
    const match = cleaned.match(pat);
    if (match && match.index !== undefined) {
      cleaned = cleaned.substring(0, match.index).trim();
    }
  }

  // Remove tracking parameters from links
  cleaned = cleaned.replace(/(https?:\/\/[^\s]+)/g, (url) => {
    try {
      const parsed = new URL(url);
      const params = parsed.searchParams;
      let hasTracking = false;
      for (const key of Array.from(params.keys())) {
        if (key.startsWith('utm_') || key === 'clickid' || key === 'gclid' || key === 'fbclid') {
          params.delete(key);
          hasTracking = true;
        }
      }
      return hasTracking ? parsed.toString() : url;
    } catch (e) {
      return url;
    }
  });
  
  // Remove lines containing pure base64 code that might leak from poorly formatted MIME sections
  cleaned = cleaned.replace(/^[a-zA-Z0-9+/]{60,}\s*$/gm, '');

  return cleaned.trim();
}

/**
 * Segment email plain text into latest message and previous conversation
 */
export function segmentEmailText(bodyText = '') {
  if (!bodyText) return { latest: '', previous: '' };

  const lines = bodyText.split(/\r?\n/);
  const latestLines = [];
  const previousLines = [];
  let isPrevious = false;

  const quotePatterns = [
    /^\s*On\s+.*\s+wrote:\s*$/i,
    /^\s*-+\s*Original Message\s*-+\s*$/i,
    /^\s*From:\s+.*$/i,
    /^\s*>+.*$/
  ];

  for (const line of lines) {
    if (!isPrevious) {
      if (quotePatterns.some(pat => pat.test(line)) || line.trim().startsWith('>')) {
        isPrevious = true;
        previousLines.push(line);
        continue;
      }
      latestLines.push(line);
    } else {
      previousLines.push(line);
    }
  }

  return {
    latest: cleanBodyText(latestLines.join('\n')),
    previous: previousLines.join('\n').trim()
  };
}

/**
 * Parses raw email content and extracts structured task fields with highlights.
 */
export function parseEmailIntelligently(subject = '', text = '', html = '') {
  // 1. Clean Subject
  const extractedTitle = cleanSubject(subject);
  
  // 2. Prefer cleanHtmlBody for rich email content when html is available, else text (or if text contains raw HTML code)
  const isHtml = (str) => /<html|<doctype|<head|<body|<style/i.test(str || '');
  let rawBodyText = '';
  if (html) {
    rawBodyText = cleanHtmlBody(html);
  } else if (text && isHtml(text)) {
    rawBodyText = cleanHtmlBody(text);
  } else {
    rawBodyText = text || '';
  }
  const { latest, previous } = segmentEmailText(rawBodyText);
  const bodyText = latest || cleanBodyText(html ? cleanHtmlBody(html) : (isHtml(text) ? cleanHtmlBody(text) : (text || '')));

  // Split text into sentences for sentence-level parsing
  const sentences = bodyText
    .split(/[.!?\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  let extractedDescription = '';
  let extractedPriority = 'MEDIUM';
  let extractedDueDate = null;
  const extractedLabels = [];
  const extractedChecklist = [];

  const highlights = {
    title: { text: subject, match: extractedTitle },
    priority: null,
    dueDate: null,
    checklist: [],
    labels: {}
  };

  // --- Priority Extraction ---
  const priorityPatterns = {
    URGENT: ['urgent', 'asap', 'immediate', 'emergency', 'highest priority', 'critical', 'immediately'],
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
      calculatedDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
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

  // --- Checklist / List Extraction ---
  // Standard list patterns
  const listPattern = /^\s*[-*+]?\s*\[\s*\]\s+(.+)$/i;
  const bulletPattern = /^\s*[-*+•]\s+(.+)$/;
  const numPattern = /^\d+\.\s+(.+)$/;

  for (const sentence of sentences) {
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

    // Natural action verb scanner if not explicitly in list format
    if (!parsedItem) {
      const cleanSentence = sentence.replace(/^(please|can you|could you|make sure to|should|we need to)\s+/i, '');
      const words = cleanSentence.split(/\s+/);
      if (words.length > 2) {
        const firstWord = words[0].toLowerCase().replace(/[^a-z]/g, '');
        if (ACTION_VERBS.includes(firstWord)) {
          parsedItem = cleanSentence;
          matchKw = words[0];
        }
      }
    }

    // Split sentence if it contains "and" connecting two action items
    if (parsedItem) {
      const dateSuffixPattern = /\s+(before|by|on)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|today|tomorrow)\b/i;
      const lowerItem = parsedItem.toLowerCase();
      if (lowerItem.includes(' and ')) {
        const parts = parsedItem.split(/\s+and\s+/i);
        for (const part of parts) {
          const cleanPart = part.trim()
            .replace(/^(please|can you|could you|make sure to)\s+/i, '')
            .replace(dateSuffixPattern, '');
          if (cleanPart.length > 3) {
            const formattedPart = cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1);
            if (!extractedChecklist.includes(formattedPart)) {
              extractedChecklist.push(formattedPart);
            }
          }
        }
        highlights.checklist.push({ text: sentence, match: matchKw });
      } else {
        const cleanPart = parsedItem
          .replace(/^(please|can you|could you|make sure to)\s+/i, '')
          .replace(dateSuffixPattern, '');
        const formattedPart = cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1);
        if (formattedPart.length > 3 && !extractedChecklist.includes(formattedPart)) {
          extractedChecklist.push(formattedPart);
          highlights.checklist.push({ text: sentence, match: matchKw });
        }
      }
    }
  }

  // --- Description Synthesis ---
  // Only include pure prose paragraphs — exclude list items, greetings, sign-offs, and metadata noise
  const listLinePattern = /^\s*[-*+•]?\s*\[[\sx]?\]\s+/i;        // "- [ ] item"
  const bulletLinePattern = /^\s*[-*+•]\s+/;                       // "- item" / "• item"
  const numberedLinePattern = /^\d+\.\s+/;                         // "1. item"
  const greetingPattern = /^(hi|hello|hey|dear|good\s+(morning|afternoon|evening))\b/i;
  const signoffPattern = /^(best|regards|thanks|thank\s+you|sincerely|cheers|warm\s+regards|kind\s+regards|yours|sent\s+from)/i;
  const metaPattern = /^\*?(source|simulated|note|from|to|cc|bcc|subject|date)[\s:*]/i;
  const subjectRepeatPattern = new RegExp(extractedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const rawLines = bodyText.split(/\n/);
  const proseLines = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip list-style lines (they become checklist items)
    if (listLinePattern.test(trimmed)) continue;
    if (bulletLinePattern.test(trimmed)) continue;
    if (numberedLinePattern.test(trimmed)) continue;
    // Skip greetings and sign-offs
    if (greetingPattern.test(trimmed)) continue;
    if (signoffPattern.test(trimmed)) continue;
    // Skip metadata / source annotation lines
    if (metaPattern.test(trimmed)) continue;
    // Skip lines that are just the email subject repeated
    if (subjectRepeatPattern.test(trimmed) && trimmed.length < extractedTitle.length + 20) continue;
    // Skip very short fragments (names, single words etc.)
    if (trimmed.length < 8) continue;
    proseLines.push(trimmed);
  }

  if (proseLines.length > 0) {
    extractedDescription = proseLines.join('\n\n');
  } else {
    // Fallback: use the full bodyText only if nothing prose was found
    extractedDescription = bodyText.trim();
  }

  return {
    title: extractedTitle,
    description: extractedDescription,
    priority: extractedPriority,
    dueDate: extractedDueDate,
    labels: extractedLabels,
    checklist: extractedChecklist,
    highlights,
    latestMessage: latest,
    previousConversation: previous
  };
}

/**
 * Compares two strings using Sørensen-Dice coefficient.
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
