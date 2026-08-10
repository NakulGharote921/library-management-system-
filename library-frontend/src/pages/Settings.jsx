import { Settings as SettingsIcon, Bell, Shield, Globe } from 'lucide-react'

export default function Settings() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Settings</h1>
        <p className="text-sm text-gray-500">Configure system preferences</p>
      </div>

      <div className="space-y-4">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Notifications</h2>
          </div>
          <div className="mt-4 space-y-3">
            {['Due date reminders', 'Reservation available', 'Fine notifications', 'Weekly digest'].map((item) => (
              <label key={item} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40">
                <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Security</h2>
          </div>
          <div className="mt-4 space-y-3">
            {['Two-factor authentication', 'Require admin approval for new users', 'Session timeout after 30 minutes'].map((item) => (
              <label key={item} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40">
                <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                <input type="checkbox" defaultChecked={item !== 'Two-factor authentication'} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Library Info</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Library name</label>
              <input defaultValue="City Library" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Borrow limit per user</label>
              <input defaultValue="10" type="number" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Loan period (days)</label>
              <input defaultValue="14" type="number" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Fine per overdue day (₹)</label>
              <input defaultValue="0.50" type="number" step="0.01" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
