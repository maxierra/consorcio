import React from 'react';

const Payments = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-600">Manage and track condominium fee payments</p>
      </div>

      {/* Placeholder for payments list */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <p className="text-gray-500 text-center">Loading payments...</p>
        </div>
      </div>
    </div>
  );
};

export default Payments;