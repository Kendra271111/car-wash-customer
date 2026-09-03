// src/components/pages/auth/register.tsx
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
    title: 'Join WASHINGTON',
    text: 'Create an account once, then book washes whenever you need.',
  },
  {
    title: 'Your vehicles, saved',
    text: 'Add your cars and plates so checkout stays quick next time.',
  },
  {
    title: 'Track every wash',
    text: 'From waiting to in progress to completed. All in one place.',
  },
  {
    title: 'Pay how you like',
    text: 'QRIS, transfer, e-money, or cash when you are at the bay.',
  },
  {
    title: 'Built for drivers',
    text: 'A simple customer portal for busy schedules.',
  },
]

const fieldClass =
  'w-full rounded-2xl border-0 bg-slate-800 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/40'

const Register = () => {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [bg, setBg] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setBg((i) => (i + 1) % bgImages.length), 5000)
    return () => clearInterval(t)
  }, [])

  const passwordsMatch = !confirm || password === confirm
  const phoneDigits = phone.replace(/\D/g, '')
  const canSubmit =
    !!name.trim() &&
    !!email.trim() &&
    phoneDigits.length >= 8 &&
    password.length >= 6 &&
    passwordsMatch &&
    !loading

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!passwordsMatch) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (phoneDigits.length < 8) {
      setError('Enter a valid phone number.')
      return
    }

    setLoading(true)
    try {
      await useAuth.register(
        name.trim(),
        email.trim(),
        password,
        Number(phoneDigits)
      )
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || 'Registration failed.'
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
        <div className="flex w-full flex-col justify-between p-8 sm:p-10 lg:w-1/2 lg:p-12">
          <div>
            <div className="mb-8 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white">
                <span className="material-icons text-xl">local_car_wash</span>
              </span>
              <span className="text-lg font-semibold tracking-tight text-white">
                WASHINGTON
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Create account
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
              Fill in your details to start booking car washes with WASHINGTON.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2 rounded-xl bg-red-500/15 px-3 py-2.5 text-sm text-red-300"
              >
                <span className="material-icons mt-0.5 text-lg">error_outline</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <input
                type="text"
                autoComplete="name"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className={fieldClass}
              />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className={fieldClass}
              />
              <input
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (08xxxxxxxxxx)"
                className={fieldClass}
              />

              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min. 6 characters)"
                  className={`${fieldClass} pr-12`}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-300"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  <span className="material-icons text-xl">
                    {showPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  className={`${fieldClass} pr-12 ${
                    confirm && !passwordsMatch ? 'ring-2 ring-red-500' : ''
                  }`}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-300"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  <span className="material-icons text-xl">
                    {showConfirm ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {confirm && !passwordsMatch && (
                <p className="text-xs text-red-400">Passwords do not match</p>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-1 flex w-full items-center justify-center rounded-2xl bg-teal-600 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-teal-400 hover:text-teal-300"
              >
                Sign in
              </Link>
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            WASHINGTON Car Wash · Customer portal
          </p>
        </div>

        <div className="relative hidden min-h-[640px] w-1/2 overflow-hidden lg:block">
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

export default Register