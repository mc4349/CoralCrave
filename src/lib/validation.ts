// Input validation utilities for CoralCrave

export interface ValidationResult {
  isValid: boolean
  message?: string
}

export interface ValidationRules {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: string) => ValidationResult
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, message: 'Email is required' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' }
  }

  return { isValid: true }
}

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, message: 'Password is required' }
  }

  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long',
    }
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    }
  }

  return { isValid: true }
}

// Username validation
export const validateUsername = (username: string): ValidationResult => {
  if (!username.trim()) {
    return { isValid: false, message: 'Username is required' }
  }

  if (username.length < 3) {
    return {
      isValid: false,
      message: 'Username must be at least 3 characters long',
    }
  }

  if (username.length > 20) {
    return {
      isValid: false,
      message: 'Username must be less than 20 characters long',
    }
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      isValid: false,
      message: 'Username can only contain letters, numbers, and underscores',
    }
  }

  return { isValid: true }
}

// Stream title validation
export const validateStreamTitle = (title: string): ValidationResult => {
  if (!title.trim()) {
    return { isValid: false, message: 'Stream title is required' }
  }

  if (title.length < 3) {
    return {
      isValid: false,
      message: 'Stream title must be at least 3 characters long',
    }
  }

  if (title.length > 100) {
    return {
      isValid: false,
      message: 'Stream title must be less than 100 characters long',
    }
  }

  return { isValid: true }
}

// Generic field validation
export const validateField = (
  value: string,
  rules: ValidationRules
): ValidationResult => {
  // Required check
  if (rules.required && !value.trim()) {
    return { isValid: false, message: 'This field is required' }
  }

  // Skip other validations if field is empty and not required
  if (!value.trim() && !rules.required) {
    return { isValid: true }
  }

  // Min length check
  if (rules.minLength && value.length < rules.minLength) {
    return {
      isValid: false,
      message: `Must be at least ${rules.minLength} characters long`,
    }
  }

  // Max length check
  if (rules.maxLength && value.length > rules.maxLength) {
    return {
      isValid: false,
      message: `Must be less than ${rules.maxLength} characters long`,
    }
  }

  // Pattern check
  if (rules.pattern && !rules.pattern.test(value)) {
    return { isValid: false, message: 'Invalid format' }
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value)
  }

  return { isValid: true }
}

// Sanitize input (basic XSS prevention)
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Validate form data
export const validateForm = (
  data: Record<string, string>,
  rules: Record<string, ValidationRules>
): Record<string, ValidationResult> => {
  const results: Record<string, ValidationResult> = {}

  Object.keys(rules).forEach(field => {
    results[field] = validateField(data[field] || '', rules[field])
  })

  return results
}

// Check if form is valid
export const isFormValid = (
  validationResults: Record<string, ValidationResult>
): boolean => {
  return Object.values(validationResults).every(result => result.isValid)
}
