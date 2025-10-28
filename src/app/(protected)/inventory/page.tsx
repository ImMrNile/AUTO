'use client';

import InventoryManagement from '../../components/InventoryManagement';

export default function InventoryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <InventoryManagement />
      </div>
    </div>
  );
}
