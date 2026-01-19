import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchCustomers,
  deactivateCustomer,
  reactivateCustomer
} from "../../features/platformCustomers/platformCustomersSlice";

import ResetCustomerPasswordModal from "./ResetCustomerPasswordModal";

export default function PlatformCustomers() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector(
    s => s.platformCustomers
  );

  const [resetId, setResetId] = useState(null);

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        Customers
      </h1>

      {loading && <p>Loading...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(c => (
          <div
            key={c.Id}
            className="bg-white border rounded p-4 shadow-sm"
          >
            <div className="flex justify-between mb-2">
              <div>
                <p className="font-semibold">
                  {c.FullName}
                </p>
                <p className="text-sm text-gray-600">
                  {c.Email}
                </p>
              </div>

              <span
                className={`px-2 py-1 text-xs rounded ${
                  c.IsActive
                    ? "bg-green-600 text-white"
                    : "bg-red-600 text-white"
                }`}
              >
                {c.IsActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {c.IsActive ? (
                <button
                  onClick={() =>
                    dispatch(deactivateCustomer(c.Id))
                  }
                  className="px-3 py-1 text-sm border border-red-500 text-red-600 rounded hover:bg-red-50"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  onClick={() =>
                    dispatch(reactivateCustomer(c.Id))
                  }
                  className="px-3 py-1 text-sm border border-green-600 text-green-700 rounded hover:bg-green-50"
                >
                  Reactivate
                </button>
              )}

              <button
                onClick={() => setResetId(c.Id)}
                className="px-3 py-1 text-sm border border-gray-500 rounded hover:bg-gray-100"
              >
                Reset Password
              </button>
            </div>
          </div>
        ))}
      </div>

      <ResetCustomerPasswordModal
        customerId={resetId}
        open={!!resetId}
        onClose={() => setResetId(null)}
      />
    </div>
  );
}
