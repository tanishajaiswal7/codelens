import validator from 'validator';

/**
 * Validates and sanitizes code input
 * - Min length: 10 characters
 * - Max length: 5000 characters
 * - Wraps code in triple backtick block to prevent prompt injection
 */
export const validateCode = (code) => {
  if (!code || typeof code !== 'string') {
    throw new Error('Code must be a non-empty string');
  }

  const trimmedCode = code.trim();

  if (trimmedCode.length < 10) {
    throw new Error('Code must be at least 10 characters');
  }

  if (trimmedCode.length > 5000) {
    throw new Error('Code must not exceed 5000 characters');
  }

  // Wrap code in triple backticks to prevent prompt injection
  return `\`\`\`\n${trimmedCode}\n\`\`\``;
};

/**
 * Sanitizes string inputs (email, names, etc.)
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  // Escape HTML special characters
  return validator.escape(str.trim());
};

/**
 * Validates email format
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required');
  }

  if (!validator.isEmail(email)) {
    throw new Error('Invalid email format');
  }

  return sanitizeString(email.toLowerCase());
};

/**
 * Validates password strength
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  if (password.length > 128) {
    throw new Error('Password must not exceed 128 characters');
  }

  return password;
};

/**
 * Validates persona enum
 */
export const validatePersona = (persona) => {
  const validPersonas = ['faang', 'startup', 'security'];

  if (!persona || !validPersonas.includes(persona)) {
    throw new Error('Invalid persona. Must be one of: ' + validPersonas.join(', '));
  }

  return persona;
};

/**
 * Validates theme enum
 */
export const validateTheme = (theme) => {
  const validThemes = ['light', 'dark'];

  if (!theme || !validThemes.includes(theme)) {
    throw new Error('Invalid theme. Must be one of: ' + validThemes.join(', '));
  }

  return theme;
};

/**
 * Validates language enum
 */
export const validateLanguage = (language) => {
  const validLanguages = ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'sql'];

  if (!language || !validLanguages.includes(language)) {
    throw new Error('Invalid language. Must be one of: ' + validLanguages.join(', '));
  }

  return language;
};
