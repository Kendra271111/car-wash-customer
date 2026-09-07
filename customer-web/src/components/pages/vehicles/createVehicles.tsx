// src/components/pages/vehicles/create.tsx
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import axios from 'axios'
import useAuth from '../../../hooks/useAuth'
import useVehicles from '../../../hooks/useVehicles'
import ThemeToggle from '../../ui/themeToggle'

const CreateVehicle = () => {
  const navigate = useNavigate()
  const user = useAuth.getUser()
  const customerId = typeof user?.id === 'number' ? user.id : null

  const [plateNumber, setPlateNumber] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [type, setType] = useState('car')
  const [year, setYear] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!plateNumber.trim()) {
      setError('Plate number is required.')
      return
    }
    if (customerId == null) {
      setError('You must be logged in.')
      return
    }

    setLoading(true)
    try {
      await useVehicles.createVehicle({
        name: name.trim() || `${brand.trim()} ${model.trim()}`.trim() || plateNumber.trim(),
        plateNumber: plateNumber.trim().toUpperCase(),
        brand: brand.trim() || '-',
        model: model.trim() || '-',
        customerId: customerId!, // number from auth
      })
      setSuccess(true)
      setTimeout(() => navigate('/vehicles', { replace: true }), 800)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to add vehicle.')
      } else {
        setError('Failed to add vehicle.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fieldClass =
    'input input-bordered w-full rounded-xl border-slate-300 bg-white text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 text-slate-900 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-100">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Link
              to="/vehicles"
              className="btn btn-ghost btn-sm btn-circle text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span className="material-icons">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-lg font-bold leading-tight">Add Vehicle</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Register a car for wash orders</p>
            </div>
          </div>
          <ThemeToggle className="text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/15 p-3 text-sm text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
            <span className="material-icons">check_circle</span>
            Vehicle added successfully!
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/15 p-3 text-sm text-red-700 dark:bg-red-500/20 dark:text-red-300">
            <span className="material-icons">error_outline</span>
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-6"
        >
          <div className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-slate-700 dark:text-slate-300">Plate number *</span>
              </label>
              <input
                className={fieldClass}
                placeholder="B 1234 ABC"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-slate-700 dark:text-slate-300">Brand</span>
                </label>
                <input
                  className={fieldClass}
                  placeholder="Toyota"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-slate-700 dark:text-slate-300">Model</span>
                </label>
                <input
                  className={fieldClass}
                  placeholder="Avanza"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-slate-700 dark:text-slate-300">Color</span>
                </label>
                <input
                  className={fieldClass}
                  placeholder="Silver"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-slate-700 dark:text-slate-300">Year</span>
                </label>
                <input
                  type="number"
                  className={fieldClass}
                  placeholder="2020"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min={1980}
                  max={2100}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-slate-700 dark:text-slate-300">Type</span>
              </label>
              <select
                className="select select-bordered w-full rounded-xl border-slate-300 bg-white text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="car">Car</option>
                <option value="suv">SUV</option>
                <option value="mpv">MPV</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-slate-700 dark:text-slate-300">Nickname (optional)</span>
              </label>
              <input
                className={fieldClass}
                placeholder="My daily driver"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="submit"
              className="btn flex-1 rounded-xl border-0 bg-teal-600 text-white hover:bg-teal-500"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Saving...
                </>
              ) : (
                'Save vehicle'
              )}
            </button>
            <Link
              to="/vehicles"
              className="btn flex-1 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}

export default CreateVehicle