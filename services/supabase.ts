import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vusleipiqgxxhdvxeuek.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2xlaXBpcWd4eGhkdnhldWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MDA3NjcsImV4cCI6MjA4MDA3Njc2N30.uZJFshWim6RlVIRKwZoWWPSmBng1PrnZ1lpgEfh2-lc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);