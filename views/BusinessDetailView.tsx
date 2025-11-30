
import React, { useEffect, useState } from 'react';
import { BusinessWithTotals, BookWithTotals, User } from '../types';
import { getBusiness, getBooks, createBook, getBusinessMembers, rotateBusinessCode, getCurrentUser } from '../services/storage';
import { PlusIcon, ChevronLeftIcon, DownloadIcon, CopyIcon, RefreshIcon } from '../components/Icons';

interface Props {
  businessId: string;
  onBack: () => void;
  onSelectBook: (id: string) => void;
}

export const BusinessDetailView = ({ businessId, onBack, onSelectBook }: Props) => {
  const [business, setBusiness] = useState<BusinessWithTotals | null>(null);
  const [books, setBooks] = useState<BookWithTotals[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  
  // Modals
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  
  // Form State
  const [newBookName, setNewBookName] = useState('');
  const [error, setError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);

  const currentUser = getCurrentUser();

  const loadData = async () => {
    setLoading(true);
    try {
      let bRaw = await getBusiness(businessId);
      
      // Auto-rotate logic: If I am the owner, generate a fresh code every time I enter this view.
      if (bRaw && currentUser?.id === bRaw.userId) {
          const { newCode } = await rotateBusinessCode(businessId);
          if (newCode) {
              bRaw = { ...bRaw, joinCode: newCode };
          }
      }

      if (bRaw) {
        // Fetch books with totals
        const booksData = await getBooks(businessId);
        setBooks(booksData);

        // Fetch team members
        const teamData = await getBusinessMembers(businessId);
        setMembers(teamData);

        // Aggregate locally for the view
        const totalIn = booksData.reduce((sum, b) => sum + b.totalIn, 0);
        const totalOut = booksData.reduce((sum, b) => sum + b.totalOut, 0);
        
        setBusiness({
          ...bRaw,
          totalIn,
          totalOut,
          balance: totalIn - totalOut,
          bookCount: booksData.length
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [businessId]);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookName) return;
    setError('');
    
    const { data, error: createError } = await createBook(businessId, newBookName);
    
    if (createError) {
        setError(createError);
        return;
    }

    if (data) {
        setNewBookName('');
        setShowAddBookModal(false);
        loadData();
    }
  };

  const copyCode = () => {
      if (business?.joinCode) {
          navigator.clipboard.writeText(business.joinCode);
          setCopyFeedback(true);
          setTimeout(() => setCopyFeedback(false), 2000);
      }
  };

  const handleRotateCode = async () => {
    // Manual rotation still available if needed without reloading
    if (!window.confirm("This will invalidate the old joining code. Continue?")) return;
    
    setRotating(true);
    const { newCode, error } = await rotateBusinessCode(businessId);
    if (newCode && business) {
      setBusiness({ ...business, joinCode: newCode });
    } else if (error) {
      alert(error);
    }
    setRotating(false);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  };

  const exportCSV = () => {
    // Simple CSV export of books summary
    const headers = ['Book Name', 'Total In', 'Total Out', 'Balance', 'Date Created'];
    const rows = books.map(b => [
      b.name,
      b.totalIn,
      b.totalOut,
      b.balance,
      new Date(b.createdAt).toLocaleDateString()
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${business?.name || 'business'}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isOwner = currentUser?.id === business?.userId;

  if (loading) return <div className="p-10 text-center text-gray-500">Loading business details...</div>;
  if (!business) return <div className="p-10 text-center text-red-500">Business not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600">
              <ChevronLeftIcon />
            </button>
            <h1 className="text-xl font-bold text-gray-900 truncate max-w-[200px]">{business.name}</h1>
          </div>
          <div className="flex space-x-2">
             <button onClick={exportCSV} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <DownloadIcon />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Join Code Card */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
            <div>
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Business Join Code</p>
                <p className="text-sm text-blue-800 mt-0.5">Share this code with your team to let them join.</p>
            </div>
            <div className="flex items-center space-x-2">
                <button 
                    onClick={copyCode}
                    className="bg-white px-3 py-2 rounded-lg border border-blue-200 shadow-sm flex items-center space-x-2 active:bg-blue-50 transition-colors"
                >
                    <span className="font-mono font-bold text-blue-900 text-lg tracking-widest">{business.joinCode}</span>
                    {copyFeedback ? (
                        <span className="text-green-600 text-xs font-bold">Copied!</span>
                    ) : (
                        <CopyIcon className="w-4 h-4 text-gray-400" />
                    )}
                </button>
                {isOwner && (
                  <button 
                    onClick={handleRotateCode}
                    disabled={rotating}
                    className="p-2.5 bg-white rounded-lg border border-blue-200 shadow-sm text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                    title="Generate new code"
                  >
                    <RefreshIcon className={`w-5 h-5 ${rotating ? 'animate-spin' : ''}`} />
                  </button>
                )}
            </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 grid grid-cols-2 gap-4">
           <div className="text-center p-2 border-r border-gray-100">
              <p className="text-gray-500 text-xs uppercase mb-1">Cash In</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(business.totalIn)}</p>
           </div>
           <div className="text-center p-2">
              <p className="text-gray-500 text-xs uppercase mb-1">Cash Out</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(business.totalOut).replace('-', '')}</p>
           </div>
           <div className="col-span-2 border-t border-gray-100 pt-4 text-center">
              <p className="text-gray-500 text-xs uppercase">Current Balance</p>
              <p className={`text-3xl font-bold mt-1 ${business.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {formatCurrency(business.balance)}
              </p>
           </div>
        </div>
        
        {/* Team List Preview */}
        {members.length > 0 && (
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 no-scrollbar">
                <span className="text-xs text-gray-500 font-medium uppercase mr-2">Team:</span>
                {members.map(m => (
                    <div key={m.id} className="flex-shrink-0 bg-white border border-gray-200 px-3 py-1 rounded-full text-xs font-medium text-gray-700 shadow-sm">
                        {m.name || m.email}
                    </div>
                ))}
            </div>
        )}

        <h3 className="text-lg font-semibold text-gray-800">Books</h3>
        
        <div className="space-y-3">
          {books.map(book => (
             <button
              key={book.id}
              onClick={() => onSelectBook(book.id)}
              className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex justify-between items-center group"
             >
               <div className="text-left">
                 <h4 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600">{book.name}</h4>
                 <p className="text-sm text-gray-400 mt-1">Created {new Date(book.createdAt).toLocaleDateString()}</p>
               </div>
               <div className="text-right">
                 <span className={`block font-bold text-lg ${book.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                   {formatCurrency(book.balance)}
                 </span>
               </div>
             </button>
          ))}
          {books.length === 0 && (
             <div className="text-center py-10 text-gray-400">
               No books found. Create one for monthly or daily tracking.
             </div>
          )}
        </div>
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowAddBookModal(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        <PlusIcon />
      </button>

      {/* Add Book Modal */}
      {showAddBookModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">New Book</h3>
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <form onSubmit={handleAddBook}>
              <input
                autoFocus
                type="text"
                placeholder="Book Name (e.g. Jan 2024)"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newBookName}
                onChange={e => setNewBookName(e.target.value)}
              />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowAddBookModal(false); setError(''); }}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newBookName}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
