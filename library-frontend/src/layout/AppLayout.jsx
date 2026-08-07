import { Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import Navbar from '../components/Navbar.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { selectUi } from '../store/uiSlice.js'

/**
 * App shell: top navigation, responsive sidebar, routed content, global toasts.
 */
export default function AppLayout() {
  const { sidebarCollapsed } = useSelector(selectUi)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      <Navbar />
      <Sidebar />
      <main className={`pt-16 transition-[padding] duration-300 md:pl-20 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-[280px]'}`}>
        <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-6 sm:px-6 lg:px-10">
          <div className="animate-fadeIn">
            <Outlet />
          </div>
        </div>
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'text-sm',
          style: {
            borderRadius: '12px',
            padding: '12px 14px',
          },
        }}
      />
    </div>
  )
}
