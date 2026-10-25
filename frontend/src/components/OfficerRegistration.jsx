import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const initialForm = {
  full_name: '',
  email: '',
  phone: '',
  department_id: '',
  designation: '',
  reason: '',
};

export function OfficerRegistration() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadDepartments() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/officer-registrations/departments`,
          { signal: controller.signal }
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error?.message || 'Unable to load departments.'
          );
        }

        setDepartments(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load departments.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingDepartments(false);
        }
      }
    }

    loadDepartments();

    return () => controller.abort();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setFieldErrors({});
    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/officer-registrations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            department_id: Number(form.department_id),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        const details = result.error?.details;

        if (Array.isArray(details)) {
          const nextErrors = {};
          details.forEach(({ field, message }) => {
            if (field && !nextErrors[field]) {
              nextErrors[field] = message;
            }
          });
          setFieldErrors(nextErrors);
        }

        throw new Error(
          result.error?.message || 'Unable to submit your application.'
        );
      }

      setSuccess(
        `Application submitted successfully. Reference number: ${result.data.request_id}. Your application is pending administrator review.`
      );
      setForm(initialForm);
    } catch (err) {
      setError(
        err.message ||
          'Unable to connect to the server. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            to="/login"
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            ← Back to sign in
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              CivicPulse Hub
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Register as an Officer
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Submit your details for administrator review. An application
              does not automatically create an officer account or grant access.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium text-slate-700"
              >
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                className={inputClass}
                autoComplete="name"
                maxLength={255}
                required
              />
              {fieldErrors.full_name && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.full_name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={inputClass}
                autoComplete="email"
                maxLength={255}
                required
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-slate-700"
              >
                Phone number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                className={inputClass}
                autoComplete="tel"
                maxLength={30}
                required
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.phone}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="department_id"
                className="block text-sm font-medium text-slate-700"
              >
                Department
              </label>
              <select
                id="department_id"
                name="department_id"
                value={form.department_id}
                onChange={handleChange}
                className={inputClass}
                required
                disabled={loadingDepartments || departments.length === 0}
              >
                <option value="">
                  {loadingDepartments
                    ? 'Loading departments...'
                    : departments.length === 0
                      ? 'No active departments available'
                      : 'Select a department'}
                </option>
                {departments.map((department) => (
                  <option
                    key={department.department_id}
                    value={department.department_id}
                  >
                    {department.name}
                  </option>
                ))}
              </select>
              {fieldErrors.department_id && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.department_id}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="designation"
                className="block text-sm font-medium text-slate-700"
              >
                Designation
              </label>
              <input
                id="designation"
                name="designation"
                value={form.designation}
                onChange={handleChange}
                className={inputClass}
                maxLength={150}
                placeholder="e.g. Sanitation Officer"
                required
              />
              {fieldErrors.designation && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.designation}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-slate-700"
              >
                Reason for applying
              </label>
              <textarea
                id="reason"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                className={inputClass}
                rows={4}
                maxLength={5000}
                placeholder="Briefly explain your role and why you are applying."
                required
              />
              {fieldErrors.reason && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.reason}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingDepartments ||
                departments.length === 0
              }
              className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Submitting application...' : 'Submit application'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-blue-700 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
