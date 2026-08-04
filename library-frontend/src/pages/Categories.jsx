import { useCallback, useEffect, useState } from 'react'
import { BookMarked, Library, TrendingUp, BookOpen, Plus, FolderTree, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { selectUserRole } from '../store/authSlice.js'
import Button from '../components/Button.jsx'
import Modal from '../components/Modal.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import { bookService, getApiErrorMessage } from '../services/api.js'

const COLOR_MAP = {
  Fiction: 'from-violet-500 to-purple-600',
  Science: 'from-sky-500 to-cyan-600',
  Technology: 'from-indigo-500 to-blue-600',
  History: 'from-amber-500 to-orange-600',
  Biography: 'from-emerald-500 to-green-600',
}

const ICON_MAP = {
  Fiction: BookOpen,
  Science: TrendingUp,
  Technology: Library,
  History: BookMarked,
  Biography: BookOpen,
}

const DEFAULT_CATEGORIES = ['Fiction', 'Science', 'Technology', 'History', 'Biography']

function getCategoryColor(name) {
  return COLOR_MAP[name] || 'from-gray-500 to-gray-600'
}

function getCategoryIcon(name) {
  return ICON_MAP[name] || FolderTree
}

export default function Categories() {
  const role = useSelector(selectUserRole)
  const isAdmin = role === 'ADMIN'
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      const books = await bookService.getAll()
      const counts = {}
      books.forEach((b) => {
        const cat = (b.category || '').trim()
        if (cat) {
          counts[cat] = (counts[cat] || 0) + 1
        }
      })
      const cats = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
          name,
          count,
          icon: getCategoryIcon(name),
          color: getCategoryColor(name),
        }))
      setCategories(cats)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  const handleAddCategory = async () => {
    const name = newCatName.trim()
    if (!name) return
    if (categories.find((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Category already exists')
      return
    }
    setSaving(true)
    try {
      setCategories((prev) => [...prev, { name, count: 0, icon: FolderTree, color: 'from-gray-500 to-gray-600' }])
      setNewCatName('')
      setAddOpen(false)
      toast.success(`Category "${name}" added`)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await bookService.deleteCategory(deleteTarget)
      setCategories((prev) => prev.filter((c) => c.name !== deleteTarget))
      setDeleteTarget(null)
      toast.success(`Category "${deleteTarget}" deleted`)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Categories</h1>
          <p className="text-sm text-gray-500">{isAdmin ? 'Manage and browse book categories' : 'Browse books by category'}</p>
        </div>
        {isAdmin && (
          <Button icon={Plus} type="button" onClick={() => setAddOpen(true)}>
            Add Category
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
          <FolderTree className="h-10 w-10 text-gray-400" />
          <p className="mt-3 text-lg font-semibold text-gray-800 dark:text-gray-100">No Categories Yet</p>
          <p className="mt-1 text-sm text-gray-500 max-w-sm">
            {isAdmin ? 'Add your first category to organize the catalog.' : 'Categories will appear here once books are added.'}
          </p>
          {isAdmin && (
            <Button icon={Plus} className="mt-6" onClick={() => setAddOpen(true)}>
              Add Category
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const Icon = cat.icon

  return (
              <article
                key={cat.name}
                className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
              >
                <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${cat.color} opacity-10 blur-2xl transition group-hover:opacity-20`} />
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.color} text-white shadow-inner`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{cat.name}</h3>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(cat.name)}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">{cat.count} book{cat.count !== 1 ? 's' : ''} available</p>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={!!deleteTarget}
        title="Delete Category"
        size="sm"
        onClose={() => !deleting && setDeleteTarget(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" type="button" loading={deleting} onClick={handleDeleteCategory}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Are you sure you want to delete the category <strong>{deleteTarget}</strong>? This will remove the category from all books that use it.
        </p>
      </Modal>

      <Modal
        open={addOpen}
        title="Add Category"
        size="sm"
        onClose={() => setAddOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={handleAddCategory}>
              Add
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">Category Name</label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g., Fantasy, Romance, Sports..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-800 dark:bg-gray-900"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory() }}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}