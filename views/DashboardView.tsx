
import React, { useEffect, useState } from 'react';
import { BusinessWithTotals, User } from '../types';
import { getBusinesses, createBusiness, updateBusiness, deleteBusiness, joinBusiness } from '../services/storage';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/Icons';

interface Props {
  user: User;
  onSelectBusiness: (id: string) => void;
  onLogout: () => void;
}

export const DashboardView = ({ user, onSelectBusiness, onLogout }: Props) => {
  const [businesses, setBusinesses] = useState<BusinessWithTotals[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [activeTab, setActiveTab] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [newBizName, setNewBizName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<{id: string, name: string} | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getBusinesses(user.id);
      setBusinesses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName) return;
    setError('');
    
    if (editingId) {
        // Update Mode
        const { error: updateError } = await updateBusiness(editingId, newBizName);
        if (updateError) {
            setError(updateError);
            return;
        }
        setNewBizName('');
        setEditingId(null);
        setShowAddModal(false);
        loadData();
    } else {
        // Create Mode
        const { data, error: createError } = await createBusiness(user.id, newBizName);
        if (createError) {
            setError(createError);
            return;
        }
        if (data) {
            setNewBizName('');
            setShowAddModal(false);
            loadData();
        }
    }
  };

  const handleEditClick = (b: BusinessWithTotals, e: React.MouseEvent) => {
    e.stopPropagation();
    setNewBizName(b.name);
    setEditingId(b.id);
    setActiveTab('CREATE');
    setError('');
    setShowAddModal(true);
  };

  const handleDeleteClick = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBusinessToDelete({ id, name });
    setDeleteConfirmationName('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const confirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessToDelete) return;
    
    if (deleteConfirmationName !== businessToDelete.name) {
      setDeleteError('Name does not match.');
      return;
    }

    const { error } = await deleteBusiness(businessToDelete.id);
    if (error) {
        setDeleteError(error);
    } else {
        setShowDeleteModal(false);
        setBusinessToDelete(null);
        loadData();
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!joinCode || joinCode.length !== 6) {
          setError('Please enter a valid 6-digit code.');
          return;
      }
      setError('');
      
      const res = await joinBusiness(joinCode);
      if (res.success) {
          setSuccessMsg(res.message);
          setTimeout(() => {
              setJoinCode('');
              setSuccessMsg('');
              setShowAddModal(false);
              loadData();
          }, 1500);
      } else {
          setError(res.message);
      }
  };

  const resetModal = () => {
      setShowAddModal(false);
      setError('');
      setSuccessMsg('');
      setNewBizName('');
      setJoinCode('');
      setEditingId(null);
      setActiveTab('CREATE');
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  };

  const totalBalance = businesses.reduce((acc, b) => acc + b.balance, 0);
  const totalIn = businesses.reduce((acc, b) => acc + b.totalIn, 0);
  const totalOut = businesses.reduce((acc, b) => acc + b.totalOut, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <button onClick={onLogout} className="text-sm text-gray-500 hover:text-gray-700">Logout</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Overview Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-blue-100 text-sm font-medium">Net Worth</p>
          <h2 className="text-4xl font-bold mt-1">{formatCurrency(totalBalance)}</h2>
          <div className="flex mt-6 space-x-8">
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-wide">Total Cash In</p>
              <p className="text-xl font-semibold text-green-300">+{formatCurrency(totalIn)}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-wide">Total Cash Out</p>
              <p className="text-xl font-semibold text-red-300">{formatCurrency(totalOut).replace('-', '-')}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8">
          <h3 className="text-lg font-semibold text-gray-800">My Businesses</h3>
          <button 
            onClick={() => { setActiveTab('JOIN'); setShowAddModal(true); }}
            className="text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
          >
            Join with Code
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading businesses...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map(b => (
              <div
                key={b.id}
                onClick={() => onSelectBusiness(b.id)}
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left group relative cursor-pointer flex flex-col justify-between"
              >
                {b.isShared && (
                  <div className="absolute top-3 right-3 flex flex-col items-end">
                    <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Shared
                    </span>
                    {b.ownerEmail && (
                        <span className="text-[10px] text-gray-400 mt-1 max-w-[100px] truncate">
                            by {b.ownerEmail}
                        </span>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-2">
                  <div className="pr-2">
                    <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate max-w-[180px]">{b.name}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">{b.bookCount} Books</p>
                  </div>
                  {!b.isShared && (
                    <span className={`text-sm font-bold px-2 py-1 rounded-md ${b.balance >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {formatCurrency(b.balance)}
                    </span>
                  )}
                  {b.isShared && (
                    <span className={`text-sm font-bold px-2 py-1 rounded-md mt-6 ${b.balance >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {formatCurrency(b.balance)}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex justify-between items-end">
                  <div className="flex space-x-4 text-xs text-gray-500">
                    <span>In: <span className="text-green-600 font-medium">{formatCurrency(b.totalIn)}</span></span>
                    <span>Out: <span className="text-red-600 font-medium">{formatCurrency(b.totalOut).replace('-', '')}</span></span>
                  </div>

                  {!b.isShared && (
                     <div className="flex space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => handleEditClick(b, e)} 
                            className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Name"
                        >
                            <PencilIcon className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => handleDeleteClick(b.id, b.name, e)} 
                            className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Business"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                     </div>
                  )}
                </div>
              </div>
            ))}
            
            {businesses.length === 0 && (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                No businesses yet. Add one to get started.
              </div>
            )}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => { setActiveTab('CREATE'); setEditingId(null); setNewBizName(''); setShowAddModal(true); }}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        <PlusIcon />
      </button>

      {/* Add / Join Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            
            {/* Tabs (Hide if editing) */}
            {!editingId && (
                <div className="flex border-b border-gray-200 mb-6">
                    <button 
                        onClick={() => { setActiveTab('CREATE'); setError(''); }}
                        className={`flex-1 pb-2 text-sm font-semibold border-b-2 ${activeTab === 'CREATE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                    >
                        Create New
                    </button>
                    <button 
                        onClick={() => { setActiveTab('JOIN'); setError(''); }}
                        className={`flex-1 pb-2 text-sm font-semibold border-b-2 ${activeTab === 'JOIN' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                    >
                        Join Existing
                    </button>
                </div>
            )}
            
            {editingId && (
                <h3 className="text-lg font-bold mb-4">Edit Business</h3>
            )}

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            {successMsg && <p className="text-sm text-green-600 mb-3">{successMsg}</p>}

            {activeTab === 'CREATE' ? (
                <form onSubmit={handleCreate}>
                    <input
                        autoFocus
                        type="text"
                        placeholder="Business Name (e.g. Cafe Downtown)"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newBizName}
                        onChange={e => setNewBizName(e.target.value)}
                    />
                    <div className="flex justify-end space-x-3">
                        <button
                        type="button"
                        onClick={resetModal}
                        className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                        >
                        Cancel
                        </button>
                        <button
                        type="submit"
                        disabled={!newBizName}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                        {editingId ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleJoin}>
                    <p className="text-sm text-gray-500 mb-3">Ask the business owner for their 6-digit joining code.</p>
                    <input
                        autoFocus
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-widest text-lg font-mono"
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value)}
                    />
                    <div className="flex justify-end space-x-3">
                        <button
                        type="button"
                        onClick={resetModal}
                        className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                        >
                        Cancel
                        </button>
                        <button
                        type="submit"
                        disabled={joinCode.length !== 6}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                        Join
                        </button>
                    </div>
                </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && businessToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-red-600 mb-2">Delete Business?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This action cannot be undone. All books and transactions inside <strong>{businessToDelete.name}</strong> will be permanently deleted.
            </p>
            
            <form onSubmit={confirmDelete}>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Type <span className="font-bold select-all">{businessToDelete.name}</span> to confirm
              </label>
              <input
                autoFocus
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-red-500 border-red-200 bg-red-50"
                value={deleteConfirmationName}
                onChange={e => setDeleteConfirmationName(e.target.value)}
                placeholder={businessToDelete.name}
              />
              
              {deleteError && <p className="text-sm text-red-600 mb-3">{deleteError}</p>}

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setBusinessToDelete(null); }}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteConfirmationName !== businessToDelete.name}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Forever
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
