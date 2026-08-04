import { BookOpen, Library, Users, Shield } from 'lucide-react'

export default function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fadeIn">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">About the Library</h1>
        <p className="mt-2 text-gray-500">A modern library management system for the digital age</p>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          This Library Management System provides a comprehensive platform for managing books, 
          members, and circulation. Built with modern web technologies, it offers role-based 
          access for administrators and members.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Library className="h-8 w-8 text-primary-600" />
          <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-50">Catalog Management</h3>
          <p className="mt-1 text-sm text-gray-500">Manage your complete book catalog with ease</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Users className="h-8 w-8 text-primary-600" />
          <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-50">Member Management</h3>
          <p className="mt-1 text-sm text-gray-500">Track members, loans, and reading history</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <BookOpen className="h-8 w-8 text-primary-600" />
          <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-50">Issue & Returns</h3>
          <p className="mt-1 text-sm text-gray-500">Streamlined book issuance and return workflows</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Shield className="h-8 w-8 text-primary-600" />
          <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-50">Role-Based Access</h3>
          <p className="mt-1 text-sm text-gray-500">Different views for guests, members, and admins</p>
        </div>
      </div>
    </div>
  )
}
