import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchMyQueuePosition } from "../../features/queue/queueSlice";
import { getSocket } from "../../services/socket";
import { leaveQueue } from "../../features/queue/queueSlice";

export default function QueueStatus() {
  const dispatch = useAppDispatch();
  const tenantId = useAppSelector(
    s => s.booking.tenantId
  );
  const position = useAppSelector(
    s => s.queue.myPosition
  );

  useEffect(() => {
    if (!tenantId) return;

    dispatch(fetchMyQueuePosition(tenantId));

    const socket = getSocket();
    if (socket) {
      socket.on("queue:update", () => {
        dispatch(fetchMyQueuePosition(tenantId));
      });
    }

    return () => {
      if (socket) socket.off("queue:update");
    };
  }, [dispatch, tenantId]);

  if (!tenantId) {
    return <p>No active queue.</p>;
  }

  if (position === null) {
    return <p>You are not in the queue.</p>;
  }

  return (
    <div>
      <h2>Queue Status</h2>
      <p>
        You are currently <strong>#{position}</strong> in line.
      </p>
      {position !== null && (
  <button
    style={{ marginTop: 12 }}
    onClick={() =>
      dispatch(leaveQueue(tenantId))
    }
  >
    Leave Queue
  </button>
)}

    </div>
  );
}
