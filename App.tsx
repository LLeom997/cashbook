import React, { useState, useEffect } from 'react';
import { ViewState, User } from './types';
import { getCurrentUser, logoutUser } from './services/storage';
import { supabase } from './services/supabase';
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { BusinessDetailView } from './views/BusinessDetailView';
import { BookDetailView } from './views/BookDetailView';

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [viewState, setViewState] = useState<ViewState>({ name: 'AUTH' });

  useEffect(() => {
    // 1. Initial Load from LocalStorage
    const existingUser = getCurrentUser();
    if (existingUser) {
      setUser(existingUser);
      setViewState({ name: 'DASHBOARD' });
    } else {
      setViewState({ name: 'AUTH' });
    }

    // 2. Sync with Supabase Auth State
    // This handles expiry, external logout, or tab sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
         setUser(null);
         setViewState({ name: 'AUTH' });
         localStorage.removeItem('cashflow_user');
      } else if (event === 'SIGNED_IN' && session?.user && !existingUser) {
          // If we have a session but no local user (rare), we could fetch it here
          // But usually login flow handles this.
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = () => {
    const u = getCurrentUser();
    if (u) {
      setUser(u);
      setViewState({ name: 'DASHBOARD' });
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setViewState({ name: 'AUTH' });
  };

  // Router Logic
  if (viewState.name === 'AUTH' || !user) {
    return <AuthView onLogin={handleLogin} />;
  }

  if (viewState.name === 'DASHBOARD') {
    return (
      <DashboardView 
        user={user}
        onSelectBusiness={(id) => setViewState({ name: 'BUSINESS_DETAIL', businessId: id })}
        onLogout={handleLogout}
      />
    );
  }

  if (viewState.name === 'BUSINESS_DETAIL') {
    return (
      <BusinessDetailView 
        businessId={viewState.businessId}
        onBack={() => setViewState({ name: 'DASHBOARD' })}
        onSelectBook={(bookId) => setViewState({ name: 'BOOK_DETAIL', businessId: viewState.businessId, bookId })}
      />
    );
  }

  if (viewState.name === 'BOOK_DETAIL') {
    return (
      <BookDetailView 
        bookId={viewState.bookId}
        onBack={() => setViewState({ name: 'BUSINESS_DETAIL', businessId: viewState.businessId })}
      />
    );
  }

  return <div>Unknown State</div>;
};

export default App;