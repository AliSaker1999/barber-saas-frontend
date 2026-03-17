import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchAdminPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from "../../features/promotions/promotionsSlice";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import Modal from "../../components/Modal";

const EMPTY_FORM = {
  Title: "",
  Description: "",
  DiscountType: "PERCENTAGE",
  DiscountValue: "",
  ValidFrom: "",
  ValidUntil: "",
  IsActive: true,
};

export default function Promotions() {
  const dispatch = useAppDispatch();
  const { adminItems, isLoading } = useAppSelector((s) => s.promotions);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    dispatch(fetchAdminPromotions());
  }, [dispatch]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (promo) => {
    setForm({
      Title: promo.Title,
      Description: promo.Description || "",
      DiscountType: promo.DiscountType,
      DiscountValue: promo.DiscountValue,
      ValidFrom: promo.ValidFrom ? promo.ValidFrom.slice(0, 10) : "",
      ValidUntil: promo.ValidUntil ? promo.ValidUntil.slice(0, 10) : "",
      IsActive: promo.IsActive,
    });
    setEditId(promo.Id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      DiscountValue: Number(form.DiscountValue),
      ValidFrom: form.ValidFrom || null,
      ValidUntil: form.ValidUntil || null,
    };
    if (editId) {
      await dispatch(updatePromotion({ id: editId, ...payload }));
    } else {
      await dispatch(createPromotion(payload));
    }
    setModalOpen(false);
    dispatch(fetchAdminPromotions());
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this promotion?")) return;
    await dispatch(deletePromotion(id));
    dispatch(fetchAdminPromotions());
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-app-text">Promotions & Offers</h1>
          <p className="text-sm text-app-muted mt-1">
            Create special offers to attract more customers
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-app-primary text-white font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-all active:scale-95 flex items-center gap-2"
        >
          <span className="text-lg">+</span> New Offer
        </button>
      </div>

      {isLoading && <LoadingState label="Loading promotions..." blocks={3} />}

      {!isLoading && adminItems.length === 0 && (
        <EmptyState
          title="No promotions yet"
          description="Create your first promotion to attract more customers!"
        />
      )}

      <div className="space-y-4">
        {adminItems.map((promo) => (
          <div
            key={promo.Id}
            className={`bg-app-surface border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
              promo.IsActive ? "border-app-border" : "border-gray-200 opacity-60"
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-black text-app-text">{promo.Title}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    promo.IsActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {promo.IsActive ? "Active" : "Inactive"}
                </span>
              </div>
              {promo.Description && (
                <p className="text-sm text-app-muted mb-1">{promo.Description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {promo.DiscountType === "PERCENTAGE"
                    ? `${promo.DiscountValue}% OFF`
                    : `$${promo.DiscountValue} OFF`}
                </span>
                {promo.ValidFrom && (
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    From: {new Date(promo.ValidFrom).toLocaleDateString()}
                  </span>
                )}
                {promo.ValidUntil && (
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    Until: {new Date(promo.ValidUntil).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openEdit(promo)}
                className="px-4 py-2 rounded-xl bg-app-surface-2 text-app-text font-bold text-sm hover:bg-app-surface transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(promo.Id)}
                className="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Promotion" : "New Promotion"}>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-bold text-app-text mb-1">Title *</label>
            <input
              type="text"
              required
              value={form.Title}
              onChange={(e) => handleChange("Title", e.target.value)}
              className="w-full px-4 py-2.5 border border-app-border rounded-xl bg-app-surface text-app-text focus:ring-2 focus:ring-app-primary"
              placeholder="e.g., Summer Special"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-app-text mb-1">Description</label>
            <textarea
              value={form.Description}
              onChange={(e) => handleChange("Description", e.target.value)}
              className="w-full px-4 py-2.5 border border-app-border rounded-xl bg-app-surface text-app-text focus:ring-2 focus:ring-app-primary"
              rows={2}
              placeholder="Describe the offer..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-app-text mb-1">Discount Type</label>
              <select
                value={form.DiscountType}
                onChange={(e) => handleChange("DiscountType", e.target.value)}
                className="w-full px-4 py-2.5 border border-app-border rounded-xl bg-app-surface text-app-text"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-app-text mb-1">Discount Value *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.DiscountValue}
                onChange={(e) => handleChange("DiscountValue", e.target.value)}
                className="w-full px-4 py-2.5 border border-app-border rounded-xl bg-app-surface text-app-text focus:ring-2 focus:ring-app-primary"
                placeholder={form.DiscountType === "PERCENTAGE" ? "e.g., 20" : "e.g., 5.00"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-app-text mb-1">Valid From</label>
              <input
                type="date"
                value={form.ValidFrom}
                onChange={(e) => handleChange("ValidFrom", e.target.value)}
                className="w-full px-4 py-2.5 border border-app-border rounded-xl bg-app-surface text-app-text"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-app-text mb-1">Valid Until</label>
              <input
                type="date"
                value={form.ValidUntil}
                onChange={(e) => handleChange("ValidUntil", e.target.value)}
                className="w-full px-4 py-2.5 border border-app-border rounded-xl bg-app-surface text-app-text"
              />
            </div>
          </div>

          {editId && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.IsActive}
                onChange={(e) => handleChange("IsActive", e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm font-bold text-app-text">Active</span>
            </label>
          )}

          <button
            type="submit"
            className="w-full bg-app-primary text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all"
          >
            {editId ? "Update Promotion" : "Create Promotion"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
