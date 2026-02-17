import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchStaff,
  addStaff,
  toggleStaff
} from "../../features/staff/staffSlice";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import { getFriendlyErrorMessage } from "../../utils/errorMessages";

export default function Staff() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector(s => s.staff);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchStaff());
  }, [dispatch]);

  const submit = async e => {
    e.preventDefault();
    setFormError("");
    if (!name.trim() || !email.trim()) {
      setFormError("Please fill all fields.");
      return;
    }

    try {
      setSubmitting(true);
      await dispatch(addStaff({ email, fullName: name })).unwrap();
      setEmail("");
      setName("");
      dispatch(fetchStaff());
    } catch (err) {
      setFormError(getFriendlyErrorMessage(err, "Unable to add barber right now."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Barbers</h1>
        <p className="text-sm text-gray-600">Manage your active staff availability.</p>
      </div>

      {formError && <ErrorState message={formError} onRetry={() => setFormError("")} retryLabel="Dismiss" />}

      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          placeholder="Full name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-blue-600 text-white text-sm font-semibold px-4 py-2 hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add Barber"}
        </button>
      </form>

      {loading && <LoadingState label="Loading barbers..." blocks={2} />}

      {!loading && items.length === 0 && (
        <EmptyState title="No barbers found" description="Add your first barber above." />
      )}

      {!loading && items.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
          {items.map(u => (
            <div key={u.Id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{u.FullName}</p>
                <p className="text-xs text-gray-500">{u.Email}</p>
              </div>
              <button
                onClick={() => dispatch(toggleStaff({ id: u.Id, isAvailable: !u.IsAvailable }))}
                className={`text-xs font-semibold px-3 py-2 rounded-lg ${u.IsAvailable ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
              >
                {u.IsAvailable ? "Set Unavailable" : "Set Available"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
