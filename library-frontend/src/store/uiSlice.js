import { createSlice } from '@reduxjs/toolkit'
import { getInitialTheme } from '../utils/theme.js'

const initialState = {
  sidebarOpen: false,
  sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
  theme: getInitialTheme(),
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload
    },
    setSidebarCollapsed(state, action) {
      state.sidebarCollapsed = action.payload
      localStorage.setItem('sidebarCollapsed', String(action.payload))
    },
    setTheme(state, action) {
      state.theme = action.payload
      localStorage.setItem('theme', action.payload)
    },
  },
})

export const { toggleSidebar, setSidebarOpen, setSidebarCollapsed, setTheme } = uiSlice.actions
export const selectUi = (state) => state.ui

export default uiSlice.reducer
