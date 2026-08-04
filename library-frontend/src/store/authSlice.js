import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authService } from '../services/authService.js'
import { getApiErrorMessage } from '../services/api.js'

let user = null
try { user = JSON.parse(localStorage.getItem('user') || 'null') } catch { /* ignore */ }
const token = localStorage.getItem('token')

const initialState = {
  user,
  token,
  isAuthenticated: !!token,
  loading: false,
  error: null,
}

export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const data = await authService.login(email, password)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify({ id: data.id, name: data.name, email: data.email, role: data.role }))
    return data
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err))
  }
})

export const register = createAsyncThunk('auth/register', async ({ name, email, password }, { rejectWithValue }) => {
  try {
    const data = await authService.register(name, email, password)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify({ id: data.id, name: data.name, email: data.email, role: data.role }))
    return data
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err))
  }
})

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const data = await authService.me()
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify({ id: data.id, name: data.name, email: data.email, role: data.role }))
    return data
  } catch (err) {
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    return rejectWithValue(getApiErrorMessage(err))
  }
})

export const oauthLogin = createAsyncThunk('auth/oauthLogin', async (payload, { rejectWithValue }) => {
  try {
    const { token, id, name, email, role } = payload
    if (!token) throw new Error('No token received from Google login')
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ id, name, email, role }))
    return { token, id, name, email, role }
  } catch (err) {
    return rejectWithValue(err.message || 'Google login failed')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null }
    const rejected = (state, action) => { state.loading = false; state.error = action.payload }

    builder
      .addCase(login.pending, pending)
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.user = { id: action.payload.id, name: action.payload.name, email: action.payload.email, role: action.payload.role }
        state.token = action.payload.token
        state.isAuthenticated = true
      })
      .addCase(login.rejected, rejected)

      .addCase(register.pending, pending)
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false
        state.user = { id: action.payload.id, name: action.payload.name, email: action.payload.email, role: action.payload.role }
        state.token = action.payload.token
        state.isAuthenticated = true
      })
      .addCase(register.rejected, rejected)

      .addCase(fetchMe.pending, pending)
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false
        state.user = { id: action.payload.id, name: action.payload.name, email: action.payload.email, role: action.payload.role }
        state.token = action.payload.token
        state.isAuthenticated = true
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      .addCase(oauthLogin.pending, pending)
      .addCase(oauthLogin.fulfilled, (state, action) => {
        state.loading = false
        state.user = { id: action.payload.id, name: action.payload.name, email: action.payload.email, role: action.payload.role }
        state.token = action.payload.token
        state.isAuthenticated = true
      })
      .addCase(oauthLogin.rejected, rejected)
  },
})

export const { logout, clearError } = authSlice.actions
export const selectAuth = (state) => state.auth
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectUser = (state) => state.auth.user
export const selectUserRole = (state) => state.auth.user?.role

export default authSlice.reducer
