import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router'
import useAuth from '../../../hooks/useAuth'
import manWashingCar1 from '../../../assets/img/bg/manwashingacar.jpeg'
import manWashingCar2 from '../../../assets/img/bg/manwashingcar2.jpeg'
import manWashingCar3 from '../../../assets/img/bg/manwashingcar3.jpeg'
import manWashingCar4 from '../../../assets/img/bg/manwashingcar4.jpeg'
import manWashingCar5 from '../../../assets/img/bg/manwashingcar5.jpeg'
import axios from 'axios'

const bgImages = [
  manWashingCar1,
  manWashingCar2,
  manWashingCar3,
  manWashingCar4,
  manWashingCar5,
]

const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentBg, setCurrentBg] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    const phoneDigits = phone.replace(/\D/g, '')
    if (!phoneDigits) {
      setError('Phone number is required.')
      return
    }

    setLoading(true)

    try {
      // schema uses Int — send digits only as number
      await useAuth.register(name, email, password, Number(phoneDigits))
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Registration failed.')
      } else {
        setError('Registration failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {bgImages.map((img, i) => (
        <div
          key={i}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${img})`,
            opacity: i === currentBg ? 1 : 0,
          }}
        />
      ))}

      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <div className="card bg-base-100/95 backdrop-blur shadow-2xl">
          <div className="card-body p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary text-primary-content flex items-center justify-center mx-auto mb-3 shadow-lg">
                <span className="material-icons text-2xl sm:text-3xl">directions_car</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">WASHINGTON</h1>
              <p className="text-sm opacity-60 mt-1">Create your account</p>
            </div>

            {error && (
              <div role="alert" className="alert alert-error text-sm mb-4">
                <span className="material-icons text-lg">error</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Full Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered rounded-xl"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Email</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered rounded-xl"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Phone</span>
                </label>
                <input
                  type="tel"
                  className="input input-bordered rounded-xl"
                  placeholder="08xxxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered rounded-xl"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Confirm Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered rounded-xl"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary rounded-xl mt-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            <p className="text-center text-sm mt-5 opacity-70">
              Already have an account?{' '}
              <Link to="/login" className="link link-primary font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-5">
          {bgImages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentBg(i)}
              className={`h-2 rounded-full transition-all ${
                i === currentBg ? 'w-6 bg-white' : 'w-2 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Register