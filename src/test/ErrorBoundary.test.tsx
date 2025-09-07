import { describe, it, expect, vi, afterEach, afterAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary'

// Mock console.error to avoid test output pollution
const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

// Component that throws an error
const ErrorComponent = () => {
  throw new Error('Test error')
}

// Component that doesn't throw
const SafeComponent = () => <div>Safe component</div>

describe('ErrorBoundary', () => {
  afterEach(() => {
    consoleError.mockClear()
  })

  afterAll(() => {
    consoleError.mockRestore()
  })

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Safe component')).toBeInTheDocument()
  })

  it('should render fallback UI when an error occurs', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Refresh Page')).toBeInTheDocument()
    expect(screen.getByText('Go Home')).toBeInTheDocument()
  })

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <ErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument()
  })

  it('should call console.error when an error occurs', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    )

    expect(consoleError).toHaveBeenCalled()
  })

  it('should show error details in development mode', () => {
    // Mock NODE_ENV
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument()

    // Restore original environment
    process.env.NODE_ENV = originalEnv
  })

  it('should not show error details in production mode', () => {
    // Mock NODE_ENV
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument()

    // Restore original environment
    process.env.NODE_ENV = originalEnv
  })

  it('should handle refresh button click', () => {
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true
    })

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    )

    const refreshButton = screen.getByText('Refresh Page')
    fireEvent.click(refreshButton)

    expect(reloadMock).toHaveBeenCalled()
  })

  it('should handle go home button click', () => {
    const hrefMock = vi.fn()
    Object.defineProperty(window.location, 'href', {
      set: hrefMock,
      configurable: true
    })

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    )

    const homeButton = screen.getByText('Go Home')
    fireEvent.click(homeButton)

    expect(hrefMock).toHaveBeenCalledWith('/')
  })
})
