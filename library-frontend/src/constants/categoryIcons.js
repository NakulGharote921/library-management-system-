import {
  BookOpen,
  Microscope,
  LibraryBig,
  UserRound,
  ScrollText,
  Brain,
  WandSparkles,
  HeartHandshake,
  Briefcase,
  Code2,
  GraduationCap,
  HeartPulse,
  Baby,
  Smile,
  Feather,
  Church,
  Palette,
  Music,
  Plane,
  ChefHat,
  Trophy,
  FolderOpen,
} from 'lucide-react'

export const ICON_COMPONENTS = {
  BookOpen,
  Microscope,
  LibraryBig,
  UserRound,
  ScrollText,
  Brain,
  WandSparkles,
  HeartHandshake,
  Briefcase,
  Code2,
  GraduationCap,
  HeartPulse,
  Baby,
  Smile,
  Feather,
  Church,
  Palette,
  Music,
  Plane,
  ChefHat,
  Trophy,
  FolderOpen,
}

export function categoryIcon(name) {
  return ICON_COMPONENTS[name] || FolderOpen
}

export const COLOR_GRADIENTS = {
  violet: 'from-violet-500 to-purple-600',
  sky: 'from-sky-500 to-cyan-600',
  indigo: 'from-indigo-500 to-blue-600',
  amber: 'from-amber-500 to-orange-600',
  emerald: 'from-emerald-500 to-green-600',
  fuchsia: 'from-fuchsia-500 to-pink-600',
  purple: 'from-purple-500 to-indigo-600',
  rose: 'from-rose-500 to-pink-600',
  blue: 'from-blue-500 to-indigo-600',
  teal: 'from-teal-500 to-cyan-600',
  cyan: 'from-cyan-500 to-sky-600',
  red: 'from-red-500 to-rose-600',
  pink: 'from-pink-500 to-rose-600',
  lime: 'from-lime-500 to-green-600',
  orange: 'from-orange-500 to-amber-600',
  yellow: 'from-yellow-500 to-amber-600',
  green: 'from-green-500 to-emerald-600',
  gray: 'from-gray-500 to-gray-600',
}

export function categoryColor(name) {
  return COLOR_GRADIENTS[name] || COLOR_GRADIENTS.gray
}

export const ICON_OPTIONS = Object.keys(ICON_COMPONENTS).sort()
export const COLOR_OPTIONS = Object.keys(COLOR_GRADIENTS)
