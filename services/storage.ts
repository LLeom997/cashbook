
import { Business, Book, Transaction, TransactionType, User, BusinessWithTotals, BookWithTotals, TransactionWithBalance } from '../types';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  USER: 'cashflow_user',
};

// --- Auth ---

export const signUpUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) return { user: null, error };

  if (data.user) {
    // Sync with profiles table
    const { error: insertError } = await supabase
      .from('profiles')
      .insert([
        { 
          id: data.user.id, // CRITICAL: Use Auth UID
          email: email.trim(), 
          name: email.split('@')[0] 
        }
      ]);
    
    if (insertError && insertError.code !== '23505') {
       console.error("Failed to create profile", insertError);
    }
  }

  return { user: data.user, error: null };
};

export const signInUser = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('No user returned');

  // Fetch user details from public table
  let { data: publicUser } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (!publicUser) {
      // Create if missing
      const { data: newUser } = await supabase
        .from('profiles')
        .insert([{ id: data.user.id, email: data.user.email, name: email.split('@')[0] }])
        .select()
        .single();
      publicUser = newUser;
  }

  const user: User = {
    id: publicUser.id,
    name: publicUser.name,
    email: publicUser.email,
    phone: publicUser.phone // Note: profiles table doesn't have phone in new schema, but interface expects it. It's fine to be undefined.
  };

  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  return user;
};

export const getCurrentUser = (): User | null => {
  const u = localStorage.getItem(STORAGE_KEYS.USER);
  return u ? JSON.parse(u) : null;
};

export const logoutUser = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem(STORAGE_KEYS.USER);
};

// --- Business (Projects) ---

export const getBusinesses = async (userId: string): Promise<BusinessWithTotals[]> => {
  // 1. Fetch projects OWNED by user
  const { data: ownedData, error: ownedError } = await supabase
    .from('projects')
    .select(`
      *,
      ledgers (
        id, name, created_at,
        entries (amount, type)
      )
    `)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  // 2. Fetch projects SHARED with user
  const { data: sharedData, error: sharedError } = await supabase
    .from('project_members')
    .select(`
      project:projects (
        *,
        owner:profiles ( email ),
        ledgers (
            id, name, created_at,
            entries (amount, type)
        )
      )
    `)
    .eq('user_id', userId);

  if (ownedError) console.error("Owned Error", ownedError);
  if (sharedError) console.error("Shared Error", sharedError);

  const ownedBusinesses = ownedData || [];
  
  // Parse shared businesses and attach owner info
  const sharedBusinesses = sharedData?.map((item: any) => ({
    ...item.project, 
    isShared: true,
    ownerEmail: item.project.owner?.email
  })) || [];

  // Combine
  const allBusinesses = [...ownedBusinesses, ...sharedBusinesses];

  // Map to BusinessWithTotals
  return allBusinesses.map((b: any) => {
    let totalIn = 0;
    let totalOut = 0;
    let bookCount = 0;
    let books: BookWithTotals[] = [];

    if (b.ledgers) {
      bookCount = b.ledgers.length;
      books = b.ledgers.map((book: any) => {
          let bIn = 0;
          let bOut = 0;
          if (book.entries) {
            book.entries.forEach((t: any) => {
                if (t.type === 'IN') bIn += Number(t.amount);
                else bOut += Number(t.amount);
            });
          }
          totalIn += bIn;
          totalOut += bOut;

          return {
              id: book.id,
              businessId: b.id,
              name: book.name,
              createdAt: new Date(book.created_at).getTime(),
              totalIn: bIn,
              totalOut: bOut,
              balance: bIn - bOut
          };
      });
      // Sort books by newest first
      books.sort((a, b) => b.createdAt - a.createdAt);
    }

    return {
      id: b.id,
      userId: b.owner_id,
      name: b.name,
      currency: b.currency,
      joinCode: b.join_code,
      createdAt: new Date(b.created_at).getTime(),
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
      bookCount,
      books, // Quick links
      isShared: !!b.isShared,
      ownerEmail: b.ownerEmail
    };
  });
};

export const getBusiness = async (id: string): Promise<Business | undefined> => {
  const { data } = await supabase.from('projects').select('*').eq('id', id).single();
  if (!data) return undefined;
  return {
    id: data.id,
    userId: data.owner_id,
    name: data.name,
    currency: data.currency,
    joinCode: data.join_code,
    createdAt: new Date(data.created_at).getTime()
  };
};

export const createBusiness = async (userId: string, name: string): Promise<{ data: Business | null, error: string | null }> => {
  // Verify session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
      return { data: null, error: "Session expired. Please log in again." };
  }

  // Generate 6 digit code
  const joinCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Use session.user.id to ensure RLS compliance
  const { data, error } = await supabase
    .from('projects')
    .insert([{ owner_id: session.user.id, name, join_code: joinCode }])
    .select()
    .single();

  if (error) {
    console.error("Create Business Error", error);
    return { data: null, error: error.message };
  }

  return {
    data: {
        id: data.id,
        userId: data.owner_id,
        name: data.name,
        currency: data.currency,
        joinCode: data.join_code,
        createdAt: new Date(data.created_at).getTime()
    },
    error: null
  };
};

export const updateBusiness = async (id: string, name: string): Promise<{ error: string | null }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Session expired" };

  const { error } = await supabase
    .from('projects')
    .update({ name })
    .eq('id', id);

  if (error) {
    console.error("Update Business Error", error);
    return { error: error.message };
  }
  return { error: null };
};

export const deleteBusiness = async (id: string): Promise<{ error: string | null }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Session expired" };

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Delete Business Error", error);
    return { error: error.message };
  }
  return { error: null };
};

export const joinBusiness = async (code: string): Promise<{ success: boolean; message: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, message: "Session expired" };

    // 1. Find project by code
    const { data: project, error: findError } = await supabase
        .from('projects')
        .select('id')
        .eq('join_code', code)
        .single();

    if (findError || !project) {
        return { success: false, message: 'Invalid joining code.' };
    }

    // 2. Add to project_members
    const { error: joinError } = await supabase
        .from('project_members')
        .insert([{ 
            project_id: project.id, 
            user_id: session.user.id, 
            role: 'editor' 
        }]);

    if (joinError) {
        if (joinError.code === '23505') {
            return { success: false, message: 'You are already a member of this business.' };
        }
        return { success: false, message: joinError.message };
    }

    return { success: true, message: 'Joined business successfully!' };
};

export const rotateBusinessCode = async (businessId: string): Promise<{ newCode: string | null; error: string | null }> => {
  const { data, error } = await supabase.rpc('rotate_project_code', { project_id: businessId });
  if (error) {
    console.error('Rotate code error', error);
    return { newCode: null, error: error.message };
  }
  return { newCode: data as string, error: null };
};

// --- Legacy Invite removed in favor of Code Join, but keeping getMembers for display ---
export const getBusinessMembers = async (businessId: string): Promise<User[]> => {
    const { data } = await supabase
        .from('project_members')
        .select('user:profiles(*)')
        .eq('project_id', businessId);
    
    if (!data) return [];
    return data.map((d: any) => ({
        id: d.user.id,
        name: d.user.name,
        email: d.user.email,
        phone: d.user.phone
    }));
};

// --- Books (Ledgers) ---

export const getBooks = async (businessId: string): Promise<BookWithTotals[]> => {
  const { data, error } = await supabase
    .from('ledgers')
    .select(`
      *,
      entries (amount, type)
    `)
    .eq('project_id', businessId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((b: any) => {
    let totalIn = 0;
    let totalOut = 0;

    if (b.entries) {
      b.entries.forEach((t: any) => {
        if (t.type === 'IN') totalIn += Number(t.amount);
        else totalOut += Number(t.amount);
      });
    }

    return {
      id: b.id,
      businessId: b.project_id,
      name: b.name,
      createdAt: new Date(b.created_at).getTime(),
      totalIn,
      totalOut,
      balance: totalIn - totalOut
    };
  });
};

export const getBook = async (id: string): Promise<Book | undefined> => {
  const { data } = await supabase.from('ledgers').select('*').eq('id', id).single();
  if (!data) return undefined;
  return {
    id: data.id,
    businessId: data.project_id,
    name: data.name,
    createdAt: new Date(data.created_at).getTime()
  };
};

export const getBookTotals = async (bookId: string): Promise<BookWithTotals | null> => {
  const { data, error } = await supabase
    .from('ledgers')
    .select(`*, entries(amount, type)`)
    .eq('id', bookId)
    .single();

  if (error || !data) return null;

  let totalIn = 0;
  let totalOut = 0;
  if (data.entries) {
    data.entries.forEach((t: any) => {
      if (t.type === 'IN') totalIn += Number(t.amount);
      else totalOut += Number(t.amount);
    });
  }

  return {
    id: data.id,
    businessId: data.project_id,
    name: data.name,
    createdAt: new Date(data.created_at).getTime(),
    totalIn,
    totalOut,
    balance: totalIn - totalOut
  };
};

export const createBook = async (businessId: string, name: string): Promise<{ data: Book | null, error: string | null }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: null, error: "Session expired" };

  const { data, error } = await supabase
    .from('ledgers')
    .insert([{ project_id: businessId, name }])
    .select()
    .single();
    
  if (error) {
    console.error("Create Book Error", error);
    return { data: null, error: error.message };
  }

  return {
    data: {
        id: data.id,
        businessId: data.project_id,
        name: data.name,
        createdAt: new Date(data.created_at).getTime()
    },
    error: null
  };
};

export const updateBook = async (id: string, name: string): Promise<{ error: string | null }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Session expired" };

  const { error } = await supabase
    .from('ledgers')
    .update({ name })
    .eq('id', id);

  if (error) {
    console.error("Update Book Error", error);
    return { error: error.message };
  }
  return { error: null };
};

export const deleteBook = async (id: string): Promise<{ error: string | null }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Session expired" };

  const { error } = await supabase
    .from('ledgers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Delete Book Error", error);
    return { error: error.message };
  }
  return { error: null };
};

// --- Transactions (Entries) ---

export const getTransactionsWithBalance = async (bookId: string): Promise<TransactionWithBalance[]> => {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('ledger_id', bookId);

  if (error || !data) return [];

  const txs: Transaction[] = data.map((t: any) => ({
    id: t.id,
    bookId: t.ledger_id,
    amount: Number(t.amount),
    type: t.type as TransactionType,
    date: t.date,
    time: t.time,
    note: t.note || '',
    partyName: t.party_name,
    category: t.category,
    attachmentUrl: t.attachment_url,
    createdAt: new Date(t.created_at).getTime()
  }));

  const sortedAsc = [...txs].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`).getTime();
    const dateB = new Date(`${b.date}T${b.time}`).getTime();
    return dateA - dateB;
  });

  let running = 0;
  const withBalance = sortedAsc.map(tx => {
    if (tx.type === TransactionType.IN) {
      running += tx.amount;
    } else {
      running -= tx.amount;
    }
    return { ...tx, runningBalance: running };
  });

  return withBalance.reverse();
};

export const addTransaction = async (tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<{ data: Transaction | null, error: string | null }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: null, error: "Session expired" };

  const { data, error } = await supabase
    .from('entries')
    .insert([{
      ledger_id: tx.bookId,
      amount: tx.amount,
      type: tx.type,
      date: tx.date,
      time: tx.time,
      note: tx.note,
      party_name: tx.partyName,
      category: tx.category,
      attachment_url: tx.attachmentUrl
    }])
    .select()
    .single();

  if (error) {
    console.error("Add Transaction Error", error);
    return { data: null, error: error.message };
  }

  return {
    data: {
        id: data.id,
        bookId: data.ledger_id,
        amount: Number(data.amount),
        type: data.type as TransactionType,
        date: data.date,
        time: data.time,
        note: data.note,
        partyName: data.party_name,
        category: data.category,
        attachmentUrl: data.attachment_url,
        createdAt: new Date(data.created_at).getTime()
    },
    error: null
  };
};

export const updateTransaction = async (tx: Transaction): Promise<{ data: Transaction | null, error: string | null }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: null, error: "Session expired" };

  const { data, error } = await supabase
    .from('entries')
    .update({
      amount: tx.amount,
      type: tx.type,
      date: tx.date,
      time: tx.time,
      note: tx.note,
      party_name: tx.partyName,
      category: tx.category,
      attachment_url: tx.attachmentUrl
    })
    .eq('id', tx.id)
    .select()
    .single();

  if (error) {
    console.error("Update Transaction Error", error);
    return { data: null, error: error.message };
  }

  return {
    data: {
        id: data.id,
        bookId: data.ledger_id,
        amount: Number(data.amount),
        type: data.type as TransactionType,
        date: data.date,
        time: data.time,
        note: data.note,
        partyName: data.party_name,
        category: data.category,
        attachmentUrl: data.attachment_url,
        createdAt: new Date(data.created_at).getTime()
    },
    error: null
  };
};

export const deleteTransaction = async (id: string) => {
  await supabase.from('entries').delete().eq('id', id);
};
