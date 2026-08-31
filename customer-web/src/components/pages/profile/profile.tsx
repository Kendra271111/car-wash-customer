// src/components/pages/profile/profile.tsx
import { useState } from 'react'
import { Link } from 'react-router'
import axios from 'axios'
import useAuth from '../../../hooks/useAuth'
import { logout } from '../../../api/api'
import useCustomer from '../../../hooks/useProfile'

const Profile = () => {
  const user = useAuth.getUser()

  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const name = user?.name ?? 'Customer'
  const email = user?.email ?? '—'
  const phone = user?.phone != null ? String(user.phone) : '—'
  const role = user?.role ?? 'USER'
  const initial = name.charAt(0).toUpperCase()

  const handleDeleteAccount = async () => {
    setDeleteError('')
    setDeleting(true)
    try {
      await useCustomer.deleteMyAccount()
      logout() // clears auth + redirects to /login
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setDeleteError(err.response?.data?.message || 'Failed to delete account.')
      } else {
        setDeleteError('Failed to delete account.')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="btn btn-ghost btn-sm btn-circle text-slate-300 hover:bg-slate-800"
              aria-label="Back"
            >
              <span className="material-icons">arrow_back</span>
            </Link>
            <h1 className="text-lg font-bold">Profile</h1>
          </div>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-teal-400 to-teal-700 text-white">
              <span className="material-icons text-lg">directions_car</span>
            </div>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
        <section className="mb-5 overflow-hidden rounded-2xl bg-linear-to-br from-teal-400 to-teal-800 p-5 shadow-lg sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold text-white ring-2 ring-white/30">
              {user?.pfp ? (
                <img
                  src={user.pfp}
                  alt={name}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-white sm:text-2xl">
                {name}
              </h2>
              <p className="mt-0.5 truncate text-sm text-teal-50">{email}</p>
              <span className="mt-2 inline-block rounded-full bg-white/15 px-3 py-0.5 text-xs font-medium text-white">
                {role}
              </span>
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Account
          </h3>
          <ul className="divide-y divide-slate-800">
            <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-teal-400">
                <span className="material-icons">person</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Full name</p>
                <p className="truncate font-medium text-white">{name}</p>
              </div>
            </li>
            <li className="flex items-center gap-3 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-teal-400">
                <span className="material-icons">email</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Email</p>
                <p className="truncate font-medium text-white">{email}</p>
              </div>
            </li>
            <li className="flex items-center gap-3 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-teal-400">
                <span className="material-icons">phone</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Phone</p>
                <p className="truncate font-medium text-white">{phone}</p>
              </div>
            </li>
          </ul>
        </section>

        <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Shortcuts
          </h3>
          <div className="flex flex-col gap-2">
            <Link
              to="/vehicles"
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3 transition-colors hover:border-teal-500/40"
            >
              <span className="material-icons text-teal-400">directions_car</span>
              <span className="flex-1 font-medium">My Vehicles</span>
              <span className="material-icons text-slate-600">chevron_right</span>
            </Link>
            <Link
              to="/orders"
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3 transition-colors hover:border-teal-500/40"
            >
              <span className="material-icons text-teal-400">receipt_long</span>
              <span className="flex-1 font-medium">My Orders</span>
              <span className="material-icons text-slate-600">chevron_right</span>
            </Link>
            <Link
              to="/history"
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3 transition-colors hover:border-teal-500/40"
            >
              <span className="material-icons text-teal-400">history</span>
              <span className="flex-1 font-medium">History</span>
              <span className="material-icons text-slate-600">chevron_right</span>
            </Link>
          </div>
        </section>

        <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
          <Link
            to="/profile/edit"
            className="btn mb-3 w-full rounded-xl border-0 bg-linear-to-r from-teal-400 to-teal-700 text-white"
          >
            <span className="material-icons text-lg">edit</span>
            Edit profile
          </Link>

          <button
            type="button"
            onClick={() => logout()}
            className="btn mb-3 w-full rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            <span className="material-icons text-lg">logout</span>
            Log out
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="btn w-full rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
          >
            <span className="material-icons text-lg">delete_forever</span>
            Delete account
          </button>
        </section>
      </main>

      {showDeleteModal && (
        <dialog className="modal modal-open">
          <div className="modal-box border border-slate-700 bg-slate-900 text-slate-100">
            <h3 className="text-lg font-bold text-red-400">Delete account?</h3>
            <p className="py-3 text-sm text-slate-300">
              This will permanently remove your account and related data. This
              cannot be undone.
            </p>

            {deleteError && (
              <p className="mb-2 text-sm text-red-400">{deleteError}</p>
            )}

            <div className="modal-action">
              <button
                type="button"
                className="btn rounded-xl border-slate-600 bg-slate-800"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn rounded-xl border-0 bg-red-600 text-white hover:bg-red-700"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Deleting...
                  </>
                ) : (
                  'Yes, delete'
                )}
              </button>
            </div>
          </div>

          <form method="dialog" className="modal-backdrop">
            <button type="button" onClick={() => setShowDeleteModal(false)}>
              close
            </button>
          </form>
        </dialog>
      )}
    </div>
  )
}

export default Profile