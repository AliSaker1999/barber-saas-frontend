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
        <h1 className="text-3xl font-bold text-app-text">Barbers</h1>
        <p className="text-sm text-app-muted">Manage your active staff availability.</p>
      </div>

      {formError && <ErrorState message={formError} onRetry={() => setFormError("")} retryLabel="Dismiss" />}

      <form onSubmit={submit} className="bg-app-surface rounded-[25px] border border-app-border p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          placeholder="Full name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full rounded-[12px] border border-app-border px-3 py-2 text-sm text-app-text"
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-[12px] border border-app-border px-3 py-2 text-sm text-app-text"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-[12px] bg-app-accent text-white text-sm font-semibold px-4 py-2 hover:bg-app-accent-dark disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add Barber"}
        </button>
      </form>

      {loading && <LoadingState label="Loading barbers..." blocks={2} />}

      {!loading && items.length === 0 && (
        <EmptyState title="No barbers found" description="Add your first barber above." />
      )}

      {!loading && items.length > 0 && (
        <div className="bg-app-surface rounded-[25px] border border-app-border divide-y divide-app-border">
          {items.map(u => (
            <div key={u.Id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-app-text">{u.FullName}</p>
                <p className="text-xs text-app-muted">{u.Email}</p>
              </div>
              <button
                onClick={() => dispatch(toggleStaff({ id: u.Id, isAvailable: !u.IsAvailable }))}
                className={`text-xs font-semibold px-3 py-2 rounded-full ${u.IsAvailable ? "bg-app-accent/10 text-app-accent" : "bg-app-surface-2 text-app-muted"}`}
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
