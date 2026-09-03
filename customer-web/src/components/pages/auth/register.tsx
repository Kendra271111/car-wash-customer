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

const inputClass =
  'input input-bordered w-full rounded-xl border-slate-700 bg-slate-950 text-white placeholder:text-slate-600 focus:border-teal-500 focus:outline-none'

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
    const t = setInterval(() => setBg((i) => (i + 1) % bgImages.length), 4000)
    return () => clearInterval(t)
  }, [])

  const passwordsMatch = !confirm || password === confirm
  const phoneDigits = phone.replace(/\D/g, '')
  const canSubmit =
    name.trim() &&
    email.trim() &&
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
      await useAuth.register(name.trim(), email.trim(), password, Number(phoneDigits))
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
              <span className="material-icons text-3xl text-white">person_add</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Join WASHINGTON
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Create an account to book washes in minutes
            </p>
          </div>

          {/* Quick benefits */}
          <ul className="mb-5 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400">
            <li className="rounded-xl border border-slate-800 bg-slate-950/60 px-1 py-2">
              <span className="material-icons mb-0.5 text-base text-teal-400">
                event_available
              </span>
              <p>Easy booking</p>
            </li>
            <li className="rounded-xl border border-slate-800 bg-slate-950/60 px-1 py-2">
              <span className="material-icons mb-0.5 text-base text-teal-400">
                directions_car
              </span>
              <p>Save vehicles</p>
            </li>
            <li className="rounded-xl border border-slate-800 bg-slate-950/60 px-1 py-2">
              <span className="material-icons mb-0.5 text-base text-teal-400">
                payments
              </span>
              <p>Pay online</p>
            </li>
          </ul>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl bg-red-500/15 px-3 py-2.5 text-sm text-red-300"
            >
              <span className="material-icons mt-0.5 text-lg">error_outline</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-300">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-300">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className={`${inputClass} pr-12`}
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
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="mb-1.5 block text-sm font-medium text-slate-300"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className={`${inputClass} pr-12 ${
                    confirm && !passwordsMatch ? 'border-red-500' : ''
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
                <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn mt-1 w-full rounded-xl border-0 bg-teal-600 text-white hover:bg-teal-500 disabled:bg-slate-700"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-teal-400 hover:text-teal-300">
              Sign in
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

export default Register