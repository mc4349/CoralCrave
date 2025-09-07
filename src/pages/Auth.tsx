import { useState } from 'react'
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setError('')
      setLoading(true)
      await login(email, password)
      navigate('/')
    } catch (error: any) {
      setError('Failed to sign in: ' + error.message)
    }

    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    try {
      setError('')
      setGoogleLoading(true)
      const result = await loginWithGoogle()

      if (result.needsUsername) {
        navigate('/auth/setup-username')
      } else {
        navigate('/')
      }
    } catch (error: any) {
      setError('Failed to sign in with Google: ' + error.message)
    }

    setGoogleLoading(false)
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 py-12 px-4 sm:px-6 lg:px-8'>
      {/* Floating ocean elements */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-20 left-10 w-4 h-4 bg-cyan-400/20 rounded-full animate-pulse'></div>
        <div className='absolute top-40 right-20 w-6 h-6 bg-blue-400/20 rounded-full animate-bounce'></div>
        <div className='absolute bottom-40 left-1/4 w-3 h-3 bg-cyan-300/30 rounded-full animate-pulse'></div>
        <div className='absolute bottom-60 right-1/3 w-5 h-5 bg-blue-300/20 rounded-full animate-bounce'></div>
      </div>

      <div className='relative max-w-md w-full space-y-8'>
        <div>
          <div className='mx-auto h-12 w-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/25'>
            <span className='text-white font-bold text-xl'>CC</span>
          </div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-slate-100'>
            Sign in to CoralCrave
          </h2>
          <p className='mt-2 text-center text-sm text-slate-400'>
            Or{' '}
            <Link
              to='/auth/signup'
              className='font-medium text-cyan-400 hover:text-cyan-300 transition-colors duration-300'
            >
              create a new account
            </Link>
          </p>
        </div>
        <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
          {error && (
            <div className='bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg backdrop-blur-sm'>
              {error}
            </div>
          )}
          <div className='space-y-4'>
            <div>
              <label htmlFor='email-address' className='sr-only'>
                Email address
              </label>
              <input
                id='email-address'
                name='email'
                type='email'
                autoComplete='email'
                required
                className='input-primary'
                placeholder='Email address'
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor='password' className='sr-only'>
                Password
              </label>
              <input
                id='password'
                name='password'
                type='password'
                autoComplete='current-password'
                required
                className='input-primary'
                placeholder='Password'
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className='flex items-center justify-between'>
            <Link
              to='/auth/reset'
              className='text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-300'
            >
              Forgot your password?
            </Link>
          </div>

          <div>
            <button
              type='submit'
              disabled={loading}
              className='btn-primary w-full disabled:opacity-50'
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className='mt-6'>
            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-slate-600' />
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='px-2 bg-slate-900 text-slate-400'>
                  Or continue with
                </span>
              </div>
            </div>

            <div className='mt-6'>
              <button
                type='button'
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className='w-full inline-flex justify-center py-3 px-4 border border-slate-600 rounded-lg shadow-sm bg-slate-800/50 backdrop-blur-sm text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:border-cyan-400/50 disabled:opacity-50 transition-all duration-300'
              >
                <svg className='w-5 h-5' viewBox='0 0 24 24'>
                  <path
                    fill='#4285F4'
                    d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                  />
                  <path
                    fill='#34A853'
                    d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                  />
                  <path
                    fill='#FBBC05'
                    d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                  />
                  <path
                    fill='#EA4335'
                    d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                  />
                </svg>
                <span className='ml-2'>
                  {googleLoading ? 'Signing in...' : 'Sign in with Google'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signup, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      return setError('Passwords do not match')
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters')
    }

    try {
      setError('')
      setLoading(true)
      await signup(email, password, username)
      setSuccess(true)
    } catch (error: any) {
      setError('Failed to create account: ' + error.message)
    }

    setLoading(false)
  }

  const handleGoogleSignUp = async () => {
    try {
      setError('')
      setGoogleLoading(true)
      const result = await loginWithGoogle()

      if (result.needsUsername) {
        navigate('/auth/setup-username')
      } else {
        navigate('/')
      }
    } catch (error: any) {
      setError('Failed to sign up with Google: ' + error.message)
    }

    setGoogleLoading(false)
  }

  if (success) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 py-12 px-4 sm:px-6 lg:px-8'>
        {/* Floating ocean elements */}
        <div className='absolute inset-0 overflow-hidden pointer-events-none'>
          <div className='absolute top-20 left-10 w-4 h-4 bg-cyan-400/20 rounded-full animate-pulse'></div>
          <div className='absolute top-40 right-20 w-6 h-6 bg-blue-400/20 rounded-full animate-bounce'></div>
          <div className='absolute bottom-40 left-1/4 w-3 h-3 bg-cyan-300/30 rounded-full animate-pulse'></div>
          <div className='absolute bottom-60 right-1/3 w-5 h-5 bg-blue-300/20 rounded-full animate-bounce'></div>
        </div>

        <div className='relative max-w-md w-full space-y-8'>
          <div className='text-center'>
            <div className='mx-auto h-12 w-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/25'>
              <svg
                className='h-6 w-6 text-white'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5 13l4 4L19 7'
                />
              </svg>
            </div>
            <h2 className='mt-6 text-center text-3xl font-extrabold text-slate-100'>
              Account Created!
            </h2>
            <p className='mt-2 text-center text-sm text-slate-400'>
              Please check your email to verify your account before signing in.
            </p>
            <Link
              to='/auth/signin'
              className='mt-4 inline-block font-medium text-cyan-400 hover:text-cyan-300 transition-colors duration-300'
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 py-12 px-4 sm:px-6 lg:px-8'>
      {/* Floating ocean elements */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-20 left-10 w-4 h-4 bg-cyan-400/20 rounded-full animate-pulse'></div>
        <div className='absolute top-40 right-20 w-6 h-6 bg-blue-400/20 rounded-full animate-bounce'></div>
        <div className='absolute bottom-40 left-1/4 w-3 h-3 bg-cyan-300/30 rounded-full animate-pulse'></div>
        <div className='absolute bottom-60 right-1/3 w-5 h-5 bg-blue-300/20 rounded-full animate-bounce'></div>
      </div>

      <div className='relative max-w-md w-full space-y-8'>
        <div>
          <div className='mx-auto h-12 w-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/25'>
            <span className='text-white font-bold text-xl'>CC</span>
          </div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-slate-100'>
            Create your account
          </h2>
          <p className='mt-2 text-center text-sm text-slate-400'>
            Or{' '}
            <Link
              to='/auth/signin'
              className='font-medium text-cyan-400 hover:text-cyan-300 transition-colors duration-300'
            >
              sign in to your existing account
            </Link>
          </p>
        </div>
        <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
          {error && (
            <div className='bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg backdrop-blur-sm'>
              {error}
            </div>
          )}
          <div className='space-y-4'>
            <div>
              <label
                htmlFor='username'
                className='block text-sm font-medium text-slate-300'
              >
                Username
              </label>
              <input
                id='username'
                name='username'
                type='text'
                required
                className='input-primary mt-1'
                placeholder='Choose a username'
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor='email'
                className='block text-sm font-medium text-slate-300'
              >
                Email address
              </label>
              <input
                id='email'
                name='email'
                type='email'
                autoComplete='email'
                required
                className='input-primary mt-1'
                placeholder='Email address'
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor='password'
                className='block text-sm font-medium text-slate-300'
              >
                Password
              </label>
              <input
                id='password'
                name='password'
                type='password'
                autoComplete='new-password'
                required
                className='input-primary mt-1'
                placeholder='Password (min 6 characters)'
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor='confirm-password'
                className='block text-sm font-medium text-slate-300'
              >
                Confirm Password
              </label>
              <input
                id='confirm-password'
                name='confirm-password'
                type='password'
                autoComplete='new-password'
                required
                className='input-primary mt-1'
                placeholder='Confirm password'
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type='submit'
              disabled={loading}
              className='btn-primary w-full disabled:opacity-50'
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className='mt-6'>
            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-slate-600' />
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='px-2 bg-slate-900 text-slate-400'>
                  Or sign up with
                </span>
              </div>
            </div>

            <div className='mt-6'>
              <button
                type='button'
                onClick={handleGoogleSignUp}
                disabled={googleLoading}
                className='w-full inline-flex justify-center py-3 px-4 border border-slate-600 rounded-lg shadow-sm bg-slate-800/50 backdrop-blur-sm text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:border-cyan-400/50 disabled:opacity-50 transition-all duration-300'
              >
                <svg className='w-5 h-5' viewBox='0 0 24 24'>
                  <path
                    fill='#4285F4'
                    d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                  />
                  <path
                    fill='#34A853'
                    d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                  />
                  <path
                    fill='#FBBC05'
                    d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                  />
                  <path
                    fill='#EA4335'
                    d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                  />
                </svg>
                <span className='ml-2'>
                  {googleLoading ? 'Signing up...' : 'Sign up with Google'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function ResetPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setMessage('')
      setError('')
      setLoading(true)
      await resetPassword(email)
      setMessage('Check your inbox for further instructions')
    } catch (error: any) {
      setError('Failed to reset password: ' + error.message)
    }

    setLoading(false)
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 py-12 px-4 sm:px-6 lg:px-8'>
      {/* Floating ocean elements */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-20 left-10 w-4 h-4 bg-cyan-400/20 rounded-full animate-pulse'></div>
        <div className='absolute top-40 right-20 w-6 h-6 bg-blue-400/20 rounded-full animate-bounce'></div>
        <div className='absolute bottom-40 left-1/4 w-3 h-3 bg-cyan-300/30 rounded-full animate-pulse'></div>
        <div className='absolute bottom-60 right-1/3 w-5 h-5 bg-blue-300/20 rounded-full animate-bounce'></div>
      </div>

      <div className='relative max-w-md w-full space-y-8'>
        <div>
          <div className='mx-auto h-12 w-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/25'>
            <span className='text-white font-bold text-xl'>CC</span>
          </div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-slate-100'>
            Reset your password
          </h2>
          <p className='mt-2 text-center text-sm text-slate-400'>
            Or{' '}
            <Link
              to='/auth/signin'
              className='font-medium text-cyan-400 hover:text-cyan-300 transition-colors duration-300'
            >
              back to sign in
            </Link>
          </p>
        </div>
        <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
          {error && (
            <div className='bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg backdrop-blur-sm'>
              {error}
            </div>
          )}
          {message && (
            <div className='bg-green-900/50 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg backdrop-blur-sm'>
              {message}
            </div>
          )}
          <div>
            <label
              htmlFor='email'
              className='block text-sm font-medium text-slate-300'
            >
              Email address
            </label>
            <input
              id='email'
              name='email'
              type='email'
              autoComplete='email'
              required
              className='input-primary mt-1'
              placeholder='Email address'
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <button
              type='submit'
              disabled={loading}
              className='btn-primary w-full disabled:opacity-50'
            >
              {loading ? 'Sending...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Auth() {
  const { currentUser } = useAuth()

  // Redirect to home if already authenticated
  if (currentUser) {
    return <Navigate to='/' replace />
  }

  return (
    <Routes>
      <Route path='signin' element={<SignIn />} />
      <Route path='signup' element={<SignUp />} />
      <Route path='reset' element={<ResetPassword />} />
      <Route path='*' element={<Navigate to='/auth/signin' replace />} />
    </Routes>
  )
}
