import React from "react";

const AdminDataState = ({ loading, error, children }) => {
  if (loading) {
    return (
      <div className="rounded-[28px] border border-stone-200 bg-white p-8 text-sm text-stone-600 shadow-[0_16px_40px_rgba(28,25,23,0.06)]">
        Loading admin data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700 shadow-[0_16px_40px_rgba(127,29,29,0.08)]">
        {error}
      </div>
    );
  }

  return children;
};

export default AdminDataState;
