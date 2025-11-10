import React, { useState } from 'react';
import DisparoList from '@/components/DisparoList';
import DisparoFormSimple from '@/components/DisparoFormSimple';

const DisparosPage: React.FC = () => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setEditingId(null);
    setView('form');
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setView('form');
  };

  const handleBack = () => {
    setEditingId(null);
    setView('list');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {view === 'list' ? (
          <DisparoList 
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
          />
        ) : (
          <DisparoFormSimple 
            onBack={handleBack}
            editingId={editingId}
          />
        )}
      </div>
    </div>
  );
};

export default DisparosPage;
