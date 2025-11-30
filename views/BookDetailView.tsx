
import React, { useEffect, useState, useMemo } from 'react';
import { BookWithTotals, TransactionWithBalance, TransactionType, Transaction } from '../types';
import { getBookTotals, getTransactionsWithBalance, addTransaction, deleteTransaction, updateTransaction } from '../services/storage';
import { uploadToCloudinary } from '../services/cloudinary';
import { ChevronLeftIcon, DownloadIcon, FilterIcon, PlusIcon, SearchIcon, TrashIcon, CameraIcon, PencilIcon } from '../components/Icons';

interface Props {
  bookId: string;
  onBack: () => void;
}

export const BookDetailView = ({ bookId, onBack }: Props) => {
  const [book, setBook] = useState<BookWithTotals | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithBalance[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // New/Edit Transaction Form State
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState<TransactionType>(TransactionType.OUT);
  const [note, setNote] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txTime, setTxTime] = useState(new Date().toTimeString().split(' ')[0].substr(0, 5));
  const [attachment, setAttachment] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const b = await getBookTotals(bookId);
      if (b) {
        setBook(b);
        const txs = await getTransactionsWithBalance(bookId);
        setTransactions(txs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [bookId]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.note.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.amount.toString().includes(searchTerm);
      const matchesType = filterType === 'ALL' || t.type === filterType;
      
      let matchesDate = true;
      if (dateStart && t.date < dateStart) matchesDate = false;
      if (dateEnd && t.date > dateEnd) matchesDate = false;

      return matchesSearch && matchesType && matchesDate;
    });
  }, [transactions, searchTerm, filterType, dateStart, dateEnd]);

  const openAddModal = (type: TransactionType) => {
      setEditingTxId(null);
      setAmount('');
      setTxType(type);
      setNote('');
      setTxDate(new Date().toISOString().split('T')[0]);
      setTxTime(new Date().toTimeString().split(' ')[0].substr(0, 5));
      setAttachment('');
      setShowAddModal(true);
  };

  const openEditModal = (tx: Transaction) => {
      setEditingTxId(tx.id);
      setAmount(tx.amount.toString());
      setTxType(tx.type);
      setNote(tx.note);
      setTxDate(tx.date);
      setTxTime(tx.time);
      setAttachment(tx.attachmentUrl || '');
      setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    setIsSubmitting(true);
    try {
      let result;
      const commonData = {
          amount: parseFloat(amount),
          type: txType,
          date: txDate,
          time: txTime,
          note,
          attachmentUrl: attachment
      };

      if (editingTxId) {
          result = await updateTransaction({
              id: editingTxId,
              bookId,
              ...commonData,
              createdAt: 0 // Not updated, but needed for type matching
          });
      } else {
          result = await addTransaction({
              bookId,
              ...commonData
          });
      }

      const { error } = result;

      if (error) {
          alert(error);
      } else {
          setShowAddModal(false);
          await loadData();
      }
    } catch(e) {
      alert("Failed to save transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this transaction?')) {
      await deleteTransaction(id);
      loadData();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setAttachment(url);
    } catch (err: any) {
      console.error(err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  };

  const exportPDF = () => {
    window.print();
  };

  if (loading && !book) return <div className="p-10 text-center text-gray-400">Loading transactions...</div>;
  if (!book) return <div className="p-10 text-center text-red-500">Book not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white shadow-sm sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600">
              <ChevronLeftIcon />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-gray-900 truncate max-w-[150px] md:max-w-md">{book.name}</h1>
              <span className="text-xs text-gray-500">{transactions.length} entries</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`p-2 rounded-lg ${showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <FilterIcon />
            </button>
            <button onClick={exportPDF} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
              <DownloadIcon />
            </button>
          </div>
        </div>
        
        {/* Search & Filter Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by note or amount..."
              className="w-full bg-gray-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-2 text-gray-400">
              <SearchIcon className="w-5 h-5" />
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-3">
              <div className="flex space-x-2">
                 {['ALL', 'IN', 'OUT'].map(t => (
                   <button
                    key={t}
                    onClick={() => setFilterType(t as any)}
                    className={`flex-1 text-xs font-bold py-1.5 rounded ${filterType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                   >
                     {t}
                   </button>
                 ))}
              </div>
              <div className="flex space-x-2">
                <input 
                  type="date" 
                  className="flex-1 text-xs p-1 border rounded bg-gray-50" 
                  value={dateStart}
                  onChange={e => setDateStart(e.target.value)}
                />
                <span className="self-center text-gray-400">-</span>
                <input 
                  type="date" 
                  className="flex-1 text-xs p-1 border rounded bg-gray-50"
                  value={dateEnd}
                  onChange={e => setDateEnd(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Summary Header (Printable) */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
            <div className="text-center">
              <span className="text-xs text-gray-500 uppercase">Total In</span>
              <p className="text-lg font-bold text-green-600">+{formatCurrency(book.totalIn).replace('₹', '')}</p>
            </div>
            <div className="h-8 w-px bg-gray-200 mx-2"></div>
            <div className="text-center">
              <span className="text-xs text-gray-500 uppercase">Total Out</span>
              <p className="text-lg font-bold text-red-600">{formatCurrency(book.totalOut).replace('₹', '-').replace('--', '-')}</p>
            </div>
            <div className="h-8 w-px bg-gray-200 mx-2"></div>
            <div className="text-center">
              <span className="text-xs text-gray-500 uppercase">Balance</span>
              <p className={`text-lg font-bold ${book.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(book.balance)}
              </p>
            </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 space-y-3 print:space-y-1">
        {filteredTransactions.map((tx, index) => {
          const isDateHeader = index === 0 || tx.date !== filteredTransactions[index - 1].date;
          return (
            <React.Fragment key={tx.id}>
              {isDateHeader && (
                <div className="sticky top-[130px] z-0 bg-gray-50 py-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide bg-gray-200 px-2 py-1 rounded">
                    {new Date(tx.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex flex-col relative group print:break-inside-avoid">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                     <p className="font-medium text-gray-900 text-base">{tx.note || 'No description'}</p>
                     <p className="text-xs text-gray-400 mt-1">{tx.time} • Balance: {formatCurrency(tx.runningBalance)}</p>
                     {tx.attachmentUrl && (
                       <div className="mt-2">
                         <a href={tx.attachmentUrl} target="_blank" rel="noopener noreferrer">
                            <img src={tx.attachmentUrl} alt="Receipt" className="h-16 w-16 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity" />
                         </a>
                       </div>
                     )}
                  </div>
                  <div className={`font-bold text-lg ${tx.type === TransactionType.IN ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === TransactionType.IN ? '+' : '-'}{formatCurrency(tx.amount).replace('₹', '')}
                  </div>
                </div>
                
                {/* Action Buttons (Visible on Hover/Focus) */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden flex space-x-1">
                  <button 
                    onClick={() => openEditModal(tx)}
                    className="p-1.5 text-gray-300 hover:text-blue-500"
                    title="Edit"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(tx.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500"
                    title="Delete"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            {transactions.length === 0 ? 'No transactions found.' : 'No matches found.'}
          </div>
        )}
      </main>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-4 print:hidden">
        <button
          onClick={() => openAddModal(TransactionType.OUT)}
          className="bg-red-500 text-white p-4 rounded-full shadow-lg hover:bg-red-600 transition-colors focus:outline-none focus:ring-4 focus:ring-red-300 flex items-center justify-center"
        >
          <span className="font-bold text-xl">-</span>
        </button>
        <button
          onClick={() => openAddModal(TransactionType.IN)}
          className="bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-4 focus:ring-green-300 flex items-center justify-center"
        >
           <PlusIcon />
        </button>
      </div>

      {/* Add/Edit Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-6 w-full max-w-md animate-slide-up sm:animate-none">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${txType === TransactionType.IN ? 'bg-green-500' : 'bg-red-500'}`}></span>
              {editingTxId ? 'Edit Transaction' : (txType === TransactionType.IN ? 'New Cash In' : 'New Cash Out')}
            </h3>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                 <button
                   type="button"
                   onClick={() => setTxType(TransactionType.IN)}
                   className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${txType === TransactionType.IN ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}
                 >
                   Cash In (+)
                 </button>
                 <button
                   type="button"
                   onClick={() => setTxType(TransactionType.OUT)}
                   className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${txType === TransactionType.OUT ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500'}`}
                 >
                   Cash Out (-)
                 </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                  <input
                    autoFocus
                    type="number"
                    step="0.01"
                    required
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Note (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Lunch with client"
                />
              </div>

              <div className="flex space-x-4">
                 <div className="flex-1">
                   <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                   <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={txDate}
                    onChange={e => setTxDate(e.target.value)}
                   />
                 </div>
                 <div className="flex-1">
                   <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
                   <input
                    type="time"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={txTime}
                    onChange={e => setTxTime(e.target.value)}
                   />
                 </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Photo Receipt (Optional)</label>
                <div className="flex items-center space-x-3">
                  <label className={`cursor-pointer flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 text-sm ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <CameraIcon className="w-5 h-5 mr-2" />
                    {isUploading ? 'Uploading...' : (attachment ? 'Change Photo' : 'Add Photo')}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
                  </label>
                  
                  {isUploading && <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>}

                  {attachment && !isUploading && (
                    <div className="relative h-10 w-10 group">
                      <img src={attachment} alt="Preview" className="h-10 w-10 object-cover rounded border border-gray-200" />
                      <button 
                        type="button" 
                        onClick={() => setAttachment('')}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 text-xs w-4 h-4 flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAttachment(''); }}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className={`px-6 py-2 text-white font-medium rounded-lg shadow-md transition-colors ${txType === TransactionType.IN ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${isSubmitting || isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? 'Saving...' : (editingTxId ? 'Update' : 'Save Transaction')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
