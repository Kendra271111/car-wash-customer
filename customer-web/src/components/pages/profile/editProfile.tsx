// src/components/pages/profile/editProfile.tsx
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import axios from 'axios'
import useAuth, { type User } from '../../../hooks/useAuth'
import { getToken, setUser } from '../../../api/api'
import useCustomer from '../../../hooks/useProfile'


const EditProfile = () => {
  const navigate = useNavigate()
  const current = useAuth.getUser()

  const [name, setName] = useState(current?.name ?? '')
  const [email, setEmail] = useState(current?.email ?? '')
  const [phone, setPhone] = useState(
    current?.phone != null ? String(current.phone) : ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.')
      return
    }

    const phoneDigits = phone.replace(/\D/g, '')
    setLoading(true)

    try {
      const updated = (await useCustomer.updateMyProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phoneDigits ? Number(phoneDigits) : null,
      })) as Partial<User>

      const token = getToken()
      const nextUser: User = {
        id: updated.id ?? current?.id ?? 0,
        name: updated.name ?? name.trim(),
        email: updated.email ?? email.trim(),
        role: updated.role ?? current?.role ?? 'USER',
        phone:
          updated.phone ??
          (phoneDigits ? Number(phoneDigits) : current?.phone),
        pfp: updated.pfp ?? current?.pfp,
        type: 'customer',
      }

      if (token) setUser(token, nextUser)
      setSuccess('Profile updated.')
      setTimeout(() => navigate('/profile', { replace: true }), 600)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to update profile.')
      } else {
        setError('Failed to update profile.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 sm:px-6">
          <Link
            to="/profile"
            className="btn btn-ghost btn-sm btn-circle text-slate-300 hover:bg-slate-800"
            aria-label="Back"
          >
            <span className="material-icons">arrow_back</span>
          </Link>
          <h1 className="text-lg font-bold">Edit Profile</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
          {error && (
            <div role="alert" className="alert alert-error mb-4 text-sm">
              <span className="material-icons text-lg">error</span>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div role="alert" className="alert alert-success mb-4 text-sm">
              <span className="material-icons text-lg">check_circle</span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-slate-300">
                  Full name
                </span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full rounded-xl border-slate-700 bg-slate-950"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-slate-300">Email</span>
              </label>
              <input
                type="email"
                className="input input-bordered w-full rounded-xl border-slate-700 bg-slate-950"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-slate-300">Phone</span>
              </label>
              <input
                type="tel"
                className="input input-bordered w-full rounded-xl border-slate-700 bg-slate-950"
                placeholder="08xxxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="submit"
                className="btn flex-1 rounded-xl border-0 bg-linear-to-r from-teal-400 to-teal-700 text-white hover:from-teal-500 hover:to-teal-800"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
              <Link
                to="/profile"
                className="btn flex-1 rounded-xl border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default EditProfile