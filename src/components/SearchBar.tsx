import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { collection, query as firestoreQuery, where, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'

interface SearchResult {
  id: string
  type: 'stream' | 'user'
  title?: string
  username?: string
  hostUsername?: string
  categories?: string[]
  status?: string
  viewerCount?: number
}

interface SearchBarProps {
  placeholder?: string
  className?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search streams and users...",
  className = ""
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      await performSearch(query)
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true)
    try {
      const searchResults: SearchResult[] = []

      // Search live streams
      const streamsQuery = firestoreQuery(
        collection(db, 'livestreams'),
        where('status', '==', 'live'),
        limit(10)
      )

      const streamsSnapshot = await getDocs(streamsQuery)
      streamsSnapshot.docs.forEach(doc => {
        const data = doc.data() as any
        const title = (data.title as string)?.toLowerCase() || ''
        const hostUsername = (data.hostUsername as string)?.toLowerCase() || ''
        const categories = (data.categories as string[]) || []

        if (
          title.includes(searchQuery.toLowerCase()) ||
          hostUsername.includes(searchQuery.toLowerCase()) ||
          categories.some((cat: string) => cat.toLowerCase().includes(searchQuery.toLowerCase()))
        ) {
          searchResults.push({
            id: doc.id,
            type: 'stream',
            title: data.title as string,
            hostUsername: data.hostUsername as string,
            categories: data.categories as string[],
            status: data.status as string,
            viewerCount: data.viewerCount as number
          })
        }
      })

      // Search users (if you have a users collection)
      // const usersQuery = query(
      //   collection(db, 'users'),
      //   orderBy('username'),
      //   limit(5)
      // )
      // const usersSnapshot = await getDocs(usersQuery)
      // usersSnapshot.docs.forEach(doc => {
      //   const data = doc.data()
      //   if (data.username?.toLowerCase().includes(searchQuery.toLowerCase())) {
      //     searchResults.push({
      //       id: doc.id,
      //       type: 'user',
      //       username: data.username
      //     })
      //   }
      // })

      setResults(searchResults.slice(0, 8)) // Limit to 8 results
      setIsOpen(searchResults.length > 0)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  const handleResultClick = () => {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-12 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent backdrop-blur-sm"
        />
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
          ) : (
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setResults([])
              setIsOpen(false)
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
          {results.map((result) => (
            <Link
              key={`${result.type}-${result.id}`}
              to={result.type === 'stream' ? `/live/${result.id}` : `/profile/${result.id}`}
              onClick={handleResultClick}
              className="block px-4 py-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {result.type === 'stream' ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <span className="text-cyan-400 font-medium">{result.title}</span>
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">LIVE</span>
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        by @{result.hostUsername}
                        {result.viewerCount && (
                          <span className="ml-2">• 👥 {result.viewerCount} viewers</span>
                        )}
                      </div>
                      {result.categories && result.categories.length > 0 && (
                        <div className="flex space-x-1 mt-2">
                          {result.categories.slice(0, 3).map((category) => (
                            <span key={category} className="text-xs px-2 py-1 bg-slate-700/50 text-slate-300 rounded-full">
                              {category}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-cyan-400 font-medium">@{result.username}</span>
                      <div className="text-sm text-slate-400 mt-1">User</div>
                    </>
                  )}
                </div>
                <div className="ml-3">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* No Results */}
      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-xl shadow-xl z-50 p-4 text-center">
          <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-slate-400">No results found for "{query}"</p>
        </div>
      )}
    </div>
  )
}

export default SearchBar
