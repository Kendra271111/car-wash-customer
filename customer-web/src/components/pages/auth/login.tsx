// src/components/pages/auth/login.tsx
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

const CAPTIONS = [
  {
    title: 'Your car, our care',
    text: 'Book a wash in minutes and track progress from waiting to done.',
  },
  {
    title: 'Shine that lasts',
    text: 'From basic wash to full detailing — pick the service that fits.',
  },
  {
    title: 'Pay your way',
    text: 'QRIS, transfer, e-money, or cash — checkout when you are ready.',
  },
  {
    title: 'Save your vehicles',
    text: 'Add plates once and book faster every time you visit.',
  },
  {
    title: 'Real-time updates',
    text: 'See when your wash starts and when it is ready for pickup.',
  },
]

const fieldClass =
  'w-full rounded-2xl border-0 bg-slate-800 px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/40'

const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [bg, setBg] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setBg((i) => (i + 1) % bgImages.length), 5000)
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

  const caption = CAPTIONS[bg % CAPTIONS.length]

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 sm:p-6 lg:p-10">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
        {/* Left: form */}
        <div className="flex w-full flex-col justify-between p-8 sm:p-10 lg:w-1/2 lg:p-12">
          <div>
            <div className="mb-10 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white">
                <span className="material-icons text-xl">local_car_wash</span>
              </span>
              <span className="text-lg font-semibold tracking-tight text-white">
                WASHINGTON
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
              Sign in with your email and password to book washes and manage
              your vehicles.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-2 rounded-xl bg-red-500/15 px-3 py-2.5 text-sm text-red-300"
              >
                <span className="material-icons mt-0.5 text-lg">error_outline</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className={fieldClass}
              />

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
                  className={`${fieldClass} pr-12`}
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

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="mt-2 flex w-full items-center justify-center rounded-2xl bg-teal-600 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-400">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-teal-400 hover:text-teal-300"
              >
                Register
              </Link>
            </p>
          </div>

          <p className="mt-10 text-center text-xs text-slate-500">
            WASHINGTON Car Wash · Customer portal
          </p>
        </div>

        {/* Right: images */}
        <div className="relative hidden min-h-[560px] w-1/2 overflow-hidden lg:block">
          {bgImages.map((src, i) => (
            <div
              key={i}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
              style={{
                backgroundImage: `url(${src})`,
                opacity: i === bg ? 1 : 0,
              }}
            />
          ))}
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-900/30 to-transparent" />

          <div className="absolute inset-x-8 bottom-10 rounded-2xl border border-white/15 bg-slate-950/40 p-6 backdrop-blur-md">
            <div className="mb-3 h-1 w-10 rounded-full bg-teal-400" />
            <h2 className="text-xl font-semibold leading-snug text-white">
              {caption.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {caption.text}
            </p>
          </div>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {bgImages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setBg(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === bg ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login