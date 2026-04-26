/**
 * Auth Slice — manages the currently authenticated Firebase user.
 */
import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isPaid: boolean;
  isPaidLoading: boolean;
  paidAt: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: true, // true until Supabase resolves the initial auth state
  error: null,
  isPaid: false,
  isPaidLoading: false,
  paidAt: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.error = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setAuthError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    clearError(state) {
      state.error = null;
    },
    setIsPaid(state, action: PayloadAction<boolean>) {
      state.isPaid = action.payload;
      state.isPaidLoading = false;
    },
    setIsPaidLoading(state, action: PayloadAction<boolean>) {
      state.isPaidLoading = action.payload;
    },
    setPaidAt(state, action: PayloadAction<string | null>) {
      state.paidAt = action.payload;
    },
  },
});

export const {setUser, setLoading, setAuthError, clearError, setIsPaid, setIsPaidLoading, setPaidAt} = authSlice.actions;
export default authSlice.reducer;
