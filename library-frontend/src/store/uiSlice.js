import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  sidebarOpen: false,
  theme: localStorage.getItem('theme') || 'light',
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
    setTheme(state, action) {
      state.theme = action.payload
      localStorage.setItem('theme', action.payload)
    },
  },
})

export const { toggleSidebar, setSidebarOpen, setTheme } = uiSlice.actions
export const selectUi = (state) => state.ui

export default uiSlice.reducer
