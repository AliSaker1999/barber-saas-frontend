import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchQueue, moveNext } from "../../features/queue/queueSlice";
import { getSocket } from "../../services/socket";

export default function Queue() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector(state => state.queue);

  useEffect(() => {
    dispatch(fetchQueue());

    const socket = getSocket();
    if (socket) {
      socket.on("queue:update", () => {
        dispatch(fetchQueue());
      });
    }

    return () => socket?.off("queue:update");
  }, [dispatch]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        Queue
      </h1>

      {loading && <p>Loading...</p>}

      {!loading && items.length === 0 && (
        <div className="bg-white p-6 rounded shadow text-gray-500">
          No one is currently in the queue.
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="bg-white rounded shadow overflow-hidden mb-4">
            <ul>
              {items.map((q, index) => (
                <li
                  key={q.Id}
                  className={`flex justify-between items-center p-4 border-b ${
                    index === 0 ? "bg-blue-50" : ""
                  }`}
                >
                  <div>
                    <p className="font-semibold">
                      #{index + 1} — {q.CustomerName}
                    </p>
                    {index === 0 && (
                      <p className="text-xs text-blue-600">
                        Currently serving
                      </p>
                    )}
                  </div>

                  {index === 0 && (
                    <span className="px-2 py-1 text-xs rounded bg-blue-600 text-white">
                      NOW
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => dispatch(moveNext())}
            className="px-6 py-3 bg-green-600 text-white rounded text-lg font-semibold hover:bg-green-700"
          >
            Next Customer
          </button>
        </>
      )}
    </div>
  );
}
