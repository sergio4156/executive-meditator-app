/**
 * Supabase Auth service
 *
 * Supabase auth supports:
 *  - Email / password
 *  - Anonymous sign-in (added 2023)
 *  - OAuth providers (Google, Apple, etc.) — easy to add later
 */
import {supabase} from '@/config/supabase';

export async function signIn(email: string, password: string) {
  const {data, error} = await supabase.auth.signInWithPassword({email, password});
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  const {data, error} = await supabase.auth.signUp({email, password});
  if (error) throw error;
  return data;
}

export async function signInAnonymously() {
  const {data, error} = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data;
}

export async function signOut() {
  const {error} = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const {error} = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://www.theexecutivemeditator.com/auth/reset-password',
  });
  if (error) throw error;
}

export function getCurrentSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(
  callback: (event: string, session: any) => void,
) {
  return supabase.auth.onAuthStateChange(callback);
}
