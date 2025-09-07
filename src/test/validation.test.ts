import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateStreamTitle,
  validateField,
  sanitizeInput,
  validateForm,
  isFormValid
} from '../lib/validation'

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com').isValid).toBe(true)
      expect(validateEmail('user.name+tag@domain.co.uk').isValid).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(validateEmail('').isValid).toBe(false)
      expect(validateEmail('invalid-email').isValid).toBe(false)
      expect(validateEmail('test@').isValid).toBe(false)
      expect(validateEmail('@example.com').isValid).toBe(false)
    })

    it('should return appropriate error messages', () => {
      expect(validateEmail('').message).toBe('Email is required')
      expect(validateEmail('invalid').message).toBe('Please enter a valid email address')
    })
  })

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('StrongPass123').isValid).toBe(true)
      expect(validatePassword('MySecure789!').isValid).toBe(true)
    })

    it('should reject weak passwords', () => {
      expect(validatePassword('').isValid).toBe(false)
      expect(validatePassword('weak').isValid).toBe(false)
      expect(validatePassword('12345678').isValid).toBe(false)
      expect(validatePassword('password').isValid).toBe(false)
      expect(validatePassword('PASSWORD123').isValid).toBe(false)
    })

    it('should return appropriate error messages', () => {
      expect(validatePassword('').message).toBe('Password is required')
      expect(validatePassword('weak').message).toContain('at least 8 characters')
    })
  })

  describe('validateUsername', () => {
    it('should validate correct usernames', () => {
      expect(validateUsername('testuser').isValid).toBe(true)
      expect(validateUsername('user_123').isValid).toBe(true)
      expect(validateUsername('TestUser').isValid).toBe(true)
    })

    it('should reject invalid usernames', () => {
      expect(validateUsername('').isValid).toBe(false)
      expect(validateUsername('ab').isValid).toBe(false)
      expect(validateUsername('a'.repeat(21)).isValid).toBe(false)
      expect(validateUsername('user@name').isValid).toBe(false)
      expect(validateUsername('user name').isValid).toBe(false)
    })

    it('should return appropriate error messages', () => {
      expect(validateUsername('').message).toBe('Username is required')
      expect(validateUsername('ab').message).toContain('at least 3 characters')
    })
  })

  describe('validateStreamTitle', () => {
    it('should validate correct stream titles', () => {
      expect(validateStreamTitle('My Live Stream').isValid).toBe(true)
      expect(validateStreamTitle('Coral Auction Event').isValid).toBe(true)
    })

    it('should reject invalid stream titles', () => {
      expect(validateStreamTitle('').isValid).toBe(false)
      expect(validateStreamTitle('ab').isValid).toBe(false)
      expect(validateStreamTitle('a'.repeat(101)).isValid).toBe(false)
    })
  })

  describe('validateField', () => {
    it('should validate required fields', () => {
      expect(validateField('', { required: true }).isValid).toBe(false)
      expect(validateField('test', { required: true }).isValid).toBe(true)
    })

    it('should validate length constraints', () => {
      expect(validateField('ab', { minLength: 3 }).isValid).toBe(false)
      expect(validateField('abcd', { minLength: 3 }).isValid).toBe(true)
      expect(validateField('abcd', { maxLength: 3 }).isValid).toBe(false)
    })

    it('should validate patterns', () => {
      expect(validateField('abc123', { pattern: /^[a-z]+$/ }).isValid).toBe(false)
      expect(validateField('abc', { pattern: /^[a-z]+$/ }).isValid).toBe(true)
    })
  })

  describe('sanitizeInput', () => {
    it('should sanitize HTML characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('<script>alert("xss")</script>')
      expect(sanitizeInput('"hello"')).toBe('"hello"')
      expect(sanitizeInput("'hello'")).toBe('&#x27;hello&#x27;')
    })
  })

  describe('validateForm', () => {
    it('should validate multiple fields', () => {
      const data = { email: 'test@example.com', password: 'StrongPass123' }
      const rules = {
        email: { required: true },
        password: { required: true, minLength: 8 }
      }

      const results = validateForm(data, rules)
      expect(results.email.isValid).toBe(true)
      expect(results.password.isValid).toBe(true)
    })

    it('should handle validation errors', () => {
      const data = { email: 'invalid-email', password: 'weak' }
      const rules = {
        email: { required: true },
        password: { required: true, minLength: 8 }
      }

      const results = validateForm(data, rules)
      expect(results.email.isValid).toBe(false)
      expect(results.password.isValid).toBe(false)
    })
  })

  describe('isFormValid', () => {
    it('should check if all validations pass', () => {
      const validResults = {
        email: { isValid: true },
        password: { isValid: true }
      }
      const invalidResults = {
        email: { isValid: false },
        password: { isValid: true }
      }

      expect(isFormValid(validResults)).toBe(true)
      expect(isFormValid(invalidResults)).toBe(false)
    })
  })
})
