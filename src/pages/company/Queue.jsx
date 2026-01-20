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
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">🚀 Customer Queue</h1>
        <p className="text-gray-600">Real-time queue management and customer tracking</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 text-lg mt-4">Loading queue...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 text-lg font-semibold">Queue is empty</p>
          <p className="text-gray-400 mt-2">No customers waiting. Great job!</p>
        </div>
      )}

      {/* Queue List */}
      {!loading && items.length > 0 && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-6">
              <p className="text-sm font-semibold text-gray-700">In Queue</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{items.length}</p>
              <p className="text-xs text-gray-600 mt-2">customers waiting</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 p-6">
              <p className="text-sm font-semibold text-gray-700">Now Serving</p>
              <p className="text-xl font-bold text-green-600 mt-2 truncate">{items[0]?.CustomerName || "—"}</p>
              <p className="text-xs text-gray-600 mt-2">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse mr-1"></span>
                Live
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 p-6">
              <p className="text-sm font-semibold text-gray-700">Avg Wait Time</p>
              <p className="text-4xl font-bold text-amber-600 mt-2">~{Math.max(15, items.length * 15)}m</p>
              <p className="text-xs text-gray-600 mt-2">estimated</p>
            </div>
          </div>

          {/* Queue Items */}
          <div className="space-y-4 mb-8">
            {items.map((q, index) => (
              <div
                key={q.Id}
                className={`rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ${
                  index === 0
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white scale-100 shadow-xl ring-2 ring-blue-400 ring-offset-2"
                    : "bg-white hover:shadow-xl hover:scale-105"
                }`}
              >
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-6 flex-1">
                    {/* Position Badge */}
                    <div className={`text-4xl font-black ${
                      index === 0 ? "text-blue-100" : "text-indigo-600"
                    }`}>
                      #{index + 1}
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1">
                      <h3 className={`text-2xl font-bold ${
                        index === 0 ? "text-white" : "text-gray-900"
                      }`}>
                        {q.CustomerName}
                      </h3>
                      {index === 0 && (
                        <p className="text-blue-100 text-sm mt-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-200 rounded-full animate-pulse"></span>
                          Currently Being Served
                        </p>
                      )}
                      {index > 0 && (
                        <p className={`text-sm mt-2 ${
                          index === 1 ? "text-gray-600 font-semibold" : "text-gray-500"
                        }`}>
                          {index === 1 ? "Next in line" : `Wait time: ~${(index * 15)} minutes`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  {index === 0 && (
                    <div className="bg-white bg-opacity-20 backdrop-blur-sm px-5 py-2 rounded-full">
                      <span className="text-white font-bold text-sm flex items-center gap-2">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        NOW SERVING
                      </span>
                    </div>
                  )}
                  {index === 1 && (
                    <div className="bg-blue-50 px-5 py-2 rounded-full border-2 border-blue-200">
                      <span className="text-blue-700 font-bold text-sm">NEXT</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Call Next Button */}
          <button
            onClick={() => dispatch(moveNext())}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-xl hover:shadow-2xl text-lg flex items-center justify-center gap-3 group"
          >
            <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Call Next Customer
          </button>
        </>
      )}
    </div>
  );
}
