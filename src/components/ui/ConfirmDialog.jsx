import Modal from "./Modal";

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Please Confirm" onClose={onCancel} width="max-w-sm">
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-2xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 rounded-2xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}
