import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import axios from 'axios'
import useAuth from '../../../hooks/useAuth'
import manWashingCar1 from '../../../assets/img/bg/manwashingacar.jpeg'
import manWashingCar2 from '../../../assets/img/bg/manwashingcar2.jpeg'
import manWashingCar3 from '../../../assets/img/bg/manwashingcar3.jpeg'
import manWashingCar4 from '../../../assets/img/bg/manwashingcar4.jpeg'
import manWashingCar5 from '../../../assets/img/bg/manwashingcar5.jpeg'

const bgImages = [
  manWashingCar1,
  manWashingCar2,
  manWashingCar3,
  manWashingCar4,
  manWashingCar5,
]

const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [bg, setBg] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setBg((i) => (i + 1) % bgImages.length), 4000)
    return () => clearInterval(t)
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await useAuth.login(email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || 'Wrong email or password.'
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {bgImages.map((src, i) => (
        <div
          key={i}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ backgroundImage: `url(${src})`, opacity: i === bg ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-slate-950/70" />

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-teal-400 to-teal-700 shadow-lg shadow-teal-900/40">
              <span className="material-icons text-3xl text-white">
                local_car_wash
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              WASHINGTON
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Sign in to book your next wash
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl bg-red-500/15 px-3 py-2.5 text-sm text-red-300"
            >
              <span className="material-icons mt-0.5 text-lg">error_outline</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="input input-bordered w-full rounded-xl border-slate-700 bg-slate-950 text-white placeholder:text-slate-600 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="input input-bordered w-full rounded-xl border-slate-700 bg-slate-950 pr-12 text-white placeholder:text-slate-600 focus:border-teal-500 focus:outline-none"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-300"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-icons text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn mt-1 w-full rounded-xl border-0 bg-teal-600 text-white hover:bg-teal-500 disabled:bg-slate-700"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            New here?{' '}
            <Link to="/register" className="font-semibold text-teal-400 hover:text-teal-300">
              Create an account
            </Link>
          </p>
        </div>

        <div className="mt-5 flex justify-center gap-2">
          {bgImages.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Background ${i + 1}`}
              onClick={() => setBg(i)}
              className={`h-2 rounded-full transition-all ${
                i === bg ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Login