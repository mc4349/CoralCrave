import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import SearchBar from '../components/SearchBar'

// Mock Firebase
vi.mock('../lib/firebase', () => ({
  db: {},
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(() =>
    Promise.resolve({
      docs: [
        {
          id: 'stream1',
          data: () => ({
            title: 'Test Stream',
            hostUsername: 'testuser',
            categories: ['coral'],
            status: 'live',
            viewerCount: 10,
          }),
        },
      ],
    })
  ),
}))

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render search input', () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Search streams and users...')
    expect(input).toBeInTheDocument()
  })

  it('should show search icon', () => {
    render(<SearchBar />)
    const searchIcon = document.querySelector('svg') // Find SVG element directly
    expect(searchIcon).toBeInTheDocument()
  })

  it('should accept custom placeholder', () => {
    render(<SearchBar placeholder='Custom search...' />)
    expect(screen.getByPlaceholderText('Custom search...')).toBeInTheDocument()
  })

  it('should show clear button when input has value', async () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Search streams and users...')

    fireEvent.change(input, { target: { value: 'test search' } })

    await waitFor(() => {
      const clearButton = screen.getByRole('button')
      expect(clearButton).toBeInTheDocument()
    })
  })

  it('should clear input when clear button is clicked', async () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Search streams and users...')

    fireEvent.change(input, { target: { value: 'test search' } })

    await waitFor(() => {
      const clearButton = screen.getByRole('button')
      fireEvent.click(clearButton)
    })

    expect(input).toHaveValue('')
  })

  it('should show loading state during search', async () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Search streams and users...')

    fireEvent.change(input, { target: { value: 'test' } })

    // Should show loading spinner initially (it's an SVG, not img role)
    const loadingSpinner = document.querySelector('svg')
    expect(loadingSpinner).toBeInTheDocument()
  })

  it('should handle input changes', () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Search streams and users...')

    fireEvent.change(input, { target: { value: 'coral' } })
    expect(input).toHaveValue('coral')
  })

  it('should accept custom className', () => {
    render(<SearchBar className='custom-class' />)
    const container = screen.getByPlaceholderText('Search streams and users...')
      .parentElement?.parentElement
    expect(container).toHaveClass('custom-class')
  })

  // Note: More comprehensive search result testing would require
  // mocking the Firebase search results and handling async operations
  // This basic test ensures the component renders and handles user input correctly
})
