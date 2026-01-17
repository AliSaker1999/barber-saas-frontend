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

    return () => {
      if (socket) socket.off("queue:update");
    };
  }, [dispatch]);

  return (
    <div>
      <h2>Queue</h2>

      {loading && <p>Loading...</p>}

      {items.length === 0 && <p>No one in queue.</p>}

      <ul>
        {items.map((q, index) => (
          <li key={q.Id}>
            {index + 1}. {q.CustomerName}
          </li>
        ))}
      </ul>

      {items.length > 0 && (
        <button onClick={() => dispatch(moveNext())}>
          Next
        </button>
      )}
    </div>
  );
}
