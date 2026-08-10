import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { setTheme, selectUi } from '../store/uiSlice.js'
import {
  ArrowLeftRight,
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ClipboardList,
  CreditCard,
  Crown,
  Globe,
  GraduationCap,
  Heart,
  Library,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Newspaper,
  Phone,
  Plus,
  RefreshCcw,
  RefreshCw,
  Rocket,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  UserPlus,
  X,
} from 'lucide-react'
import { KODNEST_LOGO_URL } from '../constants/branding.js'
import DriftWall from '../components/Reactbites/src/component/Reactbites/DriftWall.jsx'
import MorphSlider from '../components/Reactbites/src/component/Reactbites/MorphSlider.jsx'
import BorderGlow from '../components/Reactbites/BorderGlow.jsx'
import { getApiErrorMessage, bookService, subscriptionService } from '../services/api.js'
import { preferCover, preloadCovers, DEFAULT_COVER } from '../utils/bookCovers.js'
import { buildPlanFeatureList } from '../utils/planFeatures.js'

const NAV_LINKS = [
  { label: 'Features', to: '/home/features' },
  { label: 'Membership', to: '/home/membership' },
  { label: 'Testimonials', to: '/home/testimonials' },
]

const FEATURES = [
  { icon: Library, title: 'Catalog Management', desc: 'Organize every title with rich metadata, covers, categories, and real-time availability.' },
  { icon: Search, title: 'Instant Search', desc: 'Find books by title, author, ISBN, or category in milliseconds.' },
  { icon: ArrowLeftRight, title: 'Issue & Return', desc: 'Streamlined checkout and return workflows with automatic due dates.' },
  { icon: CalendarDays, title: 'Smart Reservations', desc: 'Members can reserve books and get notified the moment they become available.' },
  { icon: CreditCard, title: 'Fines & Payments', desc: 'Automated fine calculation with complete payment tracking for every member.' },
  { icon: BookMarked, title: 'Reading History', desc: 'Keep a personal timeline of everything a member has ever borrowed.' },
  { icon: Heart, title: 'Wishlist', desc: 'Let members save titles for later and get alerts when they are back in stock.' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Real-time insights into borrowing trends, revenue, and top titles.' },
  { icon: Crown, title: 'Membership Plans', desc: 'Flexible tiers with auto-renewals and instant upgrades.' },
  { icon: Bell, title: 'Notifications', desc: 'Email and in-app alerts for due dates, pickups, and announcements.' },
  { icon: ShieldAlert, title: 'Activity Log', desc: 'Complete, tamper-proof trail of every action in the system.' },
]

const MORPH_ITEMS = [
  { image: 'https://images.unsplash.com/photo-1782977389500-dd7adad33ebe?q=80&w=1600&auto=format&fit=crop', caption: 'One' },
  { image: 'https://images.unsplash.com/photo-1781499455083-6ccc3beb20cd?q=80&w=1600&auto=format&fit=crop', caption: 'Two' },
  { image: 'https://images.unsplash.com/photo-1776394254711-4a0d7345269a?q=80&w=1600&auto=format&fit=crop', caption: 'Three' },
]

const STEPS = [
  { icon: UserPlus, title: 'Create your account', desc: 'Sign up in seconds and set up your library profile.' },
  { icon: Search, title: 'Browse the catalog', desc: 'Explore thousands of titles with smart filters and search.' },
  { icon: BookOpen, title: 'Reserve or borrow', desc: 'Request books, reserve copies, or borrow instantly.' },
  { icon: ClipboardList, title: 'Track & return', desc: 'Monitor due dates, renew loans, and view your history.' },
]

const TESTIMONIALS = [
  { name: 'Aarav Mehta', role: 'Head Librarian, Sunrise Public Library', quote: 'We moved our entire catalog onto KodNest in a weekend. The analytics alone saved us months of manual reporting.' },
  { name: 'Priya Sharma', role: 'Student Member', quote: 'The reservation alerts are a lifesaver. I finally get the books I want, when I want them.' },
  { name: 'Daniel Fernandes', role: 'IT Administrator', quote: 'Role-based access and audit logs gave our team total control and peace of mind.' },
  { name: 'Sneha Iyer', role: 'College Faculty', quote: 'Borrowing books for my course is effortless. The reading history feature is brilliant.' },
  { name: 'Rohan Kulkarni', role: 'Library Manager', quote: 'Fines and online payments used to be a headache. Now it is fully automated and members love it.' },
  { name: 'Ananya Rao', role: 'Premium Member', quote: 'Worth every rupee. Priority pickups and longer loan periods changed how I read.' },
]

const FAQS = [
  { q: 'What is KodNest Library?', a: 'KodNest Library is a modern, cloud-based library management platform that helps institutions and readers manage catalogs, borrowing, reservations, fines, and membership — all from one beautiful interface.' },
  { q: 'How much does it cost?', a: 'Membership plans are defined by your library and shown on the Membership page. Free and paid tiers are available, and institutional pricing is custom-quoted based on the size of your library and the features you need.' },
  { q: 'Can I upgrade or downgrade my membership?', a: 'Yes. You can change your plan at any time from your Profile. Upgrades take effect immediately and downgrades apply at the end of your current billing period.' },
  { q: 'How do fines and payments work?', a: 'Overdue books accrue fines automatically. Admins settle fines and every transaction is tracked in the Payments dashboard.' },
  { q: 'Can institutions import their existing catalog?', a: 'Absolutely. Our Institutional plan includes bulk import and cataloging tools so you can migrate thousands of books quickly.' },
  { q: 'Is my data safe?', a: 'Yes. Data is encrypted in transit and at rest, access is protected by role-based permissions, every action is logged in an audit trail, and continuous backups keep your catalog safe.' },
  { q: 'How do I get support?', a: 'Free members get community support, paid members get email support, and Premium and Institutional members get 24/7 priority support with a dedicated team.' },
]

const TRUSTED_LOGOS = [
  { icon: Building2, name: 'Sunrise Public Library' },
  { icon: GraduationCap, name: 'Greenfield University' },
  { icon: Library, name: 'Riverdale School' },
  { icon: Newspaper, name: 'Metro City Archives' },
  { icon: BookOpen, name: 'Horizon Institute' },
  { icon: Award, name: 'Northbridge College' },
]

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out will-change-transform ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} ${className}`}
    >
      {children}
    </div>
  )
}

function Parallax({ children, speed = 0.06, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.style.transform = `translate3d(0, ${window.scrollY * speed}px, 0)`
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [speed])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-600 dark:border-primary-900 dark:bg-primary-950/40 dark:text-primary-400">
        <Sparkles className="h-3.5 w-3.5" />
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-base text-gray-500 dark:text-gray-400 sm:text-lg">{subtitle}</p>}
    </div>
  )
}

function Navbar() {
  const dispatch = useDispatch()
  const { theme } = useSelector(selectUi)
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/home" className="flex items-center space-x-3 rtl:space-x-reverse" aria-label="KodNest Library home">
          {/* <img src={KODNEST_LOGO_URL} alt="KodNest" className="h-8 w-auto" /> */}
          <span className="self-center whitespace-nowrap text-xl font-semibold text-gray-900 dark:text-gray-50">
            <b className='text-yellow-500 font-sans'> K</b>odNest
          </span>
        </Link>

        <div className="flex items-center space-x-3 md:order-2 md:space-x-0 rtl:space-x-reverse">
          <label
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50"
            title="Toggle theme"
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={theme === 'dark'}
              onChange={(e) => dispatch(setTheme(e.target.checked ? 'dark' : 'light'))}
            />
            {theme === 'dark' ? (
              <svg aria-label="moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                </g>
              </svg>
            ) : (
              <svg aria-label="sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2"></path>
                  <path d="M12 20v2"></path>
                  <path d="m4.93 4.93 1.41 1.41"></path>
                  <path d="m17.66 17.66 1.41 1.41"></path>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="m6.34 17.66-1.41 1.41"></path>
                  <path d="m19.07 4.93-1.41 1.41"></path>
                </g>
              </svg>
            )}
          </label>
          <Link
            to="/admin/login"
            className="hidden items-center gap-1.5 rounded-md border border-purple-300 bg-purple-50 px-3 py-2 text-sm font-medium leading-5 text-purple-700 transition hover:bg-purple-100 md:inline-flex dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/40"
          >
            <ShieldCheck className="h-4 w-4" />
            Admin Login
          </Link>
          <Link
            to="/login"
            className="hidden rounded-md px-3 py-2 text-sm font-medium leading-5 text-gray-600 transition hover:text-gray-900 md:inline-block dark:text-gray-400 dark:hover:text-gray-50"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="box-border inline-block rounded-md border border-transparent bg-primary-600 px-3 py-2 text-sm font-medium leading-5 text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-200 dark:focus:ring-primary-900"
          >
            Get Started
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-controls="navbar-sticky"
            aria-expanded={open}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md p-2 text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-100 md:hidden dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50"
          >
            <span className="sr-only">Open main menu</span>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div
          className={`${open ? 'block' : 'hidden'} w-full items-center justify-between md:order-1 md:flex md:w-auto`}
          id="navbar-sticky"
        >
          <ul className="mt-4 flex flex-col gap-1 rounded-md border border-gray-200 bg-gray-50 p-4 font-medium md:mt-0 md:flex-row md:space-x-8 md:border-0 md:bg-transparent md:p-0 rtl:space-x-reverse dark:border-gray-700 dark:bg-gray-800 md:dark:bg-transparent">
            <li>
              <Link
                to="/home"
                onClick={() => setOpen(false)}
                aria-current="page"
                className="block rounded bg-primary-600 px-3 py-2 text-white md:bg-transparent md:p-0 md:text-primary-600 dark:md:text-primary-500"
              >
                Home
              </Link>
            </li>
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="block rounded px-3 py-2 text-gray-900 transition hover:bg-gray-100 md:border-0 md:p-0 md:hover:bg-transparent md:hover:text-primary-600 dark:text-gray-50 dark:hover:bg-gray-700 md:dark:hover:bg-transparent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="md:hidden">
              <Link
                to="/admin/login"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded px-3 py-2 text-purple-700 transition hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-gray-700"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin Login
              </Link>
            </li>
            <li className="md:hidden">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block rounded px-3 py-2 text-gray-900 transition hover:bg-gray-100 dark:text-gray-50 dark:hover:bg-gray-700"
              >
                Sign In
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  )
}

function Hero() {
  const [driftItems, setDriftItems] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      image: DEFAULT_COVER,
      title: `Book ${i + 1}`,
      href: '/books',
    })),
  )

  useEffect(() => {
    let cancelled = false
    bookService
      .getAll()
      .then((books) => {
        if (cancelled) return
        if (!books || books.length === 0) return
        const items = books.map((b) => ({
          image: preferCover(b),
          title: b.title,
          href: `/books/${b.id}`,
        }))
        preloadCovers(items.map((i) => i.image))
        setDriftItems(items)
      })
      .catch(() => { /* keep fallback covers */ })
    return () => { cancelled = true }
  }, [])

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-[#060010] pt-28 pb-24">
      <div className="absolute inset-0 z-0">
        <DriftWall
          items={driftItems}
          columns={5}
          tileWidth={200}
          tileHeight={132}
          gap={18}
          tilt={16}
          turn={-14}
          perspective={1200}
          depth={120}
          speed={42}
          direction="up"
          variance={0.45}
          parallax={0.6}
          lift={64}
          fade={0.6}
          dim={0.55}
          overlayColor="#060010"
          radius={14}
          roll={0}
          pauseOnHover={false}
          grayscale={false}
        />
      </div>
      <Parallax speed={0.08} className="pointer-events-none absolute -top-24 -right-32 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl" />
      <Parallax speed={-0.05} className="pointer-events-none absolute top-40 -left-32 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.08)_1px,transparent_0)] bg-[size:28px_28px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#F8FAFC] to-transparent dark:from-gray-950" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
          <div>
            
            <Reveal delay={100}>
              <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                One Platform Endless{' '}
                <span className="bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">
                  Knowledge
                </span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-5 max-w-xl text-lg text-gray-300">
                Everything your library needs—from managing books and members to tracking circulation and
                generating insights—in one intuitive dashboard
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-primary-600/25 transition hover:-translate-y-0.5 hover:bg-primary-700"
                >
                  Get Started 
                  <ArrowRight className="h-4 w-4" />
                </Link>
               
              </div>
            </Reveal>
            
          </div>

          {/*  */}
        </div>
      </div>
    </section>
  )
}

function TrustedBy() {
  return (
    <section className="border-y border-gray-100 bg-white py-12 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Trusted by libraries, schools & institutions
        </p>
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {TRUSTED_LOGOS.map(({ icon: Logo, name }) => (
            <div key={name} className="flex items-center justify-center gap-2 text-gray-400 transition hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400">
              <Logo className="h-5 w-5" />
              <span className="whitespace-nowrap text-sm font-bold tracking-tight">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const [morphItems, setMorphItems] = useState(MORPH_ITEMS)

  useEffect(() => {
    let cancelled = false
    bookService
      .getAll()
      .then((books) => {
        if (cancelled || !Array.isArray(books) || !books.length) return
        const items = books.slice(0, 8).map((b) => ({ image: preferCover(b), caption: b.title }))
        preloadCovers(items.map((i) => i.image))
        setMorphItems(items)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section id="features" className="scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeader
            eyebrow="Features"
            title="Everything a modern library needs"
            subtitle="Eleven powerful modules, one seamless experience — built to delight readers and simplify librarians."
          />
        </Reveal>
        <div className="mt-14 overflow-hidden rounded-[16px] shadow-2xl shadow-gray-900/10" style={{ height: '500px', position: 'relative' }}>
          <MorphSlider
            items={morphItems}
            transition="melt"
            intensity={0.55}
            aberration={0.35}
            drift={0.4}
            autoplay={false}
            overlayColor="#05060a"
            duration={1.1}
            ease="power2.inOut"
            scale={2.4}
            autoplayDelay={4}
            loop
            radius={16}
            showCaptions
            showControls
            showIndicators
          />
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={(i % 3) * 80}>
              <div className="group h-full rounded-[20px] border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl hover:shadow-primary-600/5 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-700">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors duration-300 group-hover:bg-primary-600 group-hover:text-white dark:bg-primary-950/50 dark:text-primary-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-gray-50">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-white py-20 dark:bg-gray-900 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeader
            eyebrow="How it works"
            title="Up and running in four simple steps"
            subtitle="From signup to your first book in hand — no training required."
          />
        </Reveal>
        <div className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent md:block dark:via-primary-800" />
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 120}>
              <div className="relative text-center">
                <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/25">
                  <Icon className="h-5 w-5" />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-900 text-[10px] font-bold text-white dark:border-gray-900 dark:bg-gray-50 dark:text-gray-900">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-bold text-gray-900 dark:text-gray-50">{title}</h3>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function planFeatureItems(plan) {
  return buildPlanFeatureList(plan).filter(
    (f) => f.type !== 'priorityReservation' && f.type !== 'fineExempt'
  )
}

function PlanStats({ plan }) {
  const stats = [
    { icon: BookOpen, label: 'Borrow limit', value: `${plan.maxBooks} books` },
    { icon: CalendarDays, label: 'Loan duration', value: `${plan.maxLoanDays} days` },
    { icon: RefreshCcw, label: 'Renewals', value: `${plan.maxRenewals}` },
    { icon: ClipboardList, label: 'Reservations', value: `${plan.maxReservations}` },
  ]
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {stats.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
          <Icon className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</p>
            <p className="truncate text-sm font-bold text-gray-800 dark:text-gray-100">{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

const PLAN_STATUS_LABEL = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
}

function Plans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await subscriptionService.getPlans()
      setPlans(data)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const sorted = [...plans].sort(
    (a, b) =>
      Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0) ||
      Number(a.price ?? 0) - Number(b.price ?? 0),
  )

  return (
    <section id="membership" className="scroll-mt-24 bg-white py-20 dark:bg-gray-900 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeader
            eyebrow="Membership"
            title="Simple plans for every kind of reader"
            subtitle="Start free, upgrade anytime. No hidden fees, cancel whenever you like."
          />
        </Reveal>

        {loading ? (
          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-[24px] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton mt-4 h-9 w-1/2" />
                <div className="skeleton mt-6 h-16 w-full rounded-xl" />
                <div className="mt-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="skeleton h-4 w-full" />
                  ))}
                </div>
                <div className="skeleton mt-6 h-11 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-14 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800">
            <ShieldAlert className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-4 max-w-md text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm transition hover:border-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-primary-400 dark:hover:border-primary-500"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="mt-14 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-gray-200 bg-white px-6 py-20 text-center dark:border-gray-700 dark:bg-gray-800">
            <Crown className="h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-50">No membership plans yet.</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Check back soon — plans are on the way.</p>
          </div>
        ) : (
          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {sorted.map((plan, i) => {
              const highlighted = Boolean(plan.featured)
              const features = planFeatureItems(plan)
              const period = plan.validityDays > 0 ? `/ ${plan.validityDays} days` : ''
              return (
                <Reveal key={plan.id ?? plan.name} delay={i * 90}>
                  <div
                    className={`relative flex h-full flex-col rounded-[24px] p-6 transition-all duration-300 hover:-translate-y-1 ${
                      highlighted
                        ? 'border-2 border-primary-600 bg-primary-50/60 shadow-2xl shadow-primary-600/20 dark:border-primary-500 dark:bg-primary-950/40'
                        : 'border border-gray-100 bg-white shadow-sm hover:shadow-xl hover:shadow-primary-600/5 dark:border-gray-700 dark:bg-gray-800'
                    }`}
                  >
                    {highlighted && (
                      <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-primary-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
                        <Crown className="h-3 w-3" /> Most Popular
                      </span>
                    )}
                    <span
                      className={`absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        plan.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : plan.status === 'INACTIVE'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {PLAN_STATUS_LABEL[plan.status] || 'Active'}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{plan.name}</h3>
                    {plan.description && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{plan.description}</p>}
                    <p className="mt-4 flex items-baseline gap-1.5">
                      <span className={`text-4xl font-extrabold tracking-tight ${highlighted ? 'gradient-text' : 'text-gray-900 dark:text-gray-50'}`}>
                        {plan.price === 0 || plan.price === '0' ? 'Free' : `₹${plan.price}`}
                      </span>
                      {period && <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{period}</span>}
                    </p>
                    <div className="mt-5">
                      <PlanStats plan={plan} />
                    </div>
                    <ul className="mt-5 flex-1 space-y-3">
                      {features.map((feature) => (
                        <li key={feature.text} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${highlighted ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400'}`}>
                            <Check className="h-3 w-3" />
                          </span>
                          {feature.text}
                        </li>
                      ))}
                    </ul>
                    {(Boolean(plan.priorityReservation) || Boolean(plan.fineExempt)) && (
                      <div className="mt-5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Policies</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Boolean(plan.priorityReservation) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                              <ShieldCheck className="h-3.5 w-3.5" /> Priority Reservations
                            </span>
                          )}
                          {Boolean(plan.fineExempt) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                              <ShieldCheck className="h-3.5 w-3.5" /> Fine Exempt
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <Link
                      to="/register"
                      className={`mt-7 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        highlighted
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700'
                          : 'border border-gray-200 bg-white text-gray-700 hover:border-primary-200 hover:text-primary-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-primary-500 dark:hover:text-primary-400'
                      }`}
                    >
                      Choose {plan.name}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </Reveal>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeader
            eyebrow="Testimonials"
            title="Loved by readers & librarians"
            subtitle="Thousands of members and institutions rely on KodNest Library every day."
          />
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map(({ name, role, quote }, i) => (
            <Reveal key={name} delay={(i % 3) * 90}>
              <BorderGlow
                className="h-full"
                backgroundColor="var(--border-glow-bg)"
                borderRadius={20}
                glowRadius={36}
                edgeSensitivity={25}
                fillOpacity={0.35}
              >
                <figure className="flex h-full flex-col p-6">
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">"{quote}"</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-sky-500 text-xs font-bold text-white">
                      {name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{role}</p>
                    </div>
                  </figcaption>
                </figure>
              </BorderGlow>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Faq() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" className="scroll-mt-24 bg-white py-20 dark:bg-gray-900 lg:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeader
            eyebrow="FAQ"
            title="Frequently asked questions"
            subtitle="Everything you need to know before getting started."
          />
        </Reveal>
        <div className="mt-12 space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <Reveal key={faq.q} delay={i * 40}>
                <div className={`overflow-hidden rounded-xl border transition-colors ${isOpen ? 'border-primary-200 bg-primary-50/40 dark:border-primary-700 dark:bg-primary-950/30' : 'border-gray-200 bg-white hover:border-primary-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-700'}`}>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-50 sm:text-base">{faq.q}</span>
                    <Plus className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-45 text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{faq.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Cta() {
  return (
    <section className="pb-20 lg:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-700 via-primary-600 to-sky-600 px-6 py-16 text-center shadow-2xl shadow-primary-600/25 sm:px-12 lg:py-20">
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white ring-1 ring-white/25">
                <Rocket className="h-4 w-4" />
                No setup fees. No hidden charges. Get started in minutes.
              </span>
              <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Join the Next Generation of Digital Libraries
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/80 sm:text-lg">
                Manage books, members, reservations, and reading history with a fast, secure, and modern library management platform.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold text-primary-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-primary-50 sm:w-auto"
                >
                  Create Free Account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/books"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/20 sm:w-auto"
                >
                  Browse the Catalog
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Footer() {
  const FOOTER_COLUMNS = [
    {
      heading: 'Product',
      links: [
        { label: 'Features', href: '/home/features' },
        { label: 'How it works', href: '/home#how-it-works' },
        { label: 'Membership', href: '/home/membership' },
      ],
    },
    {
      heading: 'Explore',
      links: [
        { label: 'Browse Books', href: '/books' },
        { label: 'Categories', href: '/categories' },
        { label: 'About the Library', href: '/about' },
        { label: 'Testimonials', href: '/home/testimonials' },
      ],
    },
    {
      heading: 'Resources',
      links: [
        { label: 'Help Center', href: '#faq' },
        { label: 'Membership', href: '/membership' },
        { label: 'Sign In', href: '/login' },
        { label: 'Create Account', href: '/register' },
      ],
    },
  ]

  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link to="/home" className="flex items-center gap-2.5">
              <img src={KODNEST_LOGO_URL} alt="KodNest" className="h-9 w-auto" />
              <span className="text-lg font-extrabold tracking-tight text-white">
                KodNest <span className="bg-gradient-to-r from-primary-400 to-sky-400 bg-clip-text text-transparent">Library</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              The modern library management platform built for readers, librarians, and institutions of every size.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[
                { icon: Globe, label: 'Website' },
                { icon: MessageSquare, label: 'Community' },
                { icon: Mail, label: 'Email us' },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#home"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-gray-400 ring-1 ring-white/10 transition hover:bg-primary-600 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading} className="lg:col-span-2">
              <h4 className="text-sm font-bold uppercase tracking-wider text-white">{col.heading}</h4>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link to={link.href} className="transition hover:text-primary-400">{link.label}</Link>
                    ) : (
                      <a href={link.href} className="transition hover:text-primary-400">{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" />
                Bengaluru, India
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-primary-400" />
                library@kodnest.com
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-primary-400" />
                +91 98765 43210
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs">© {new Date().getFullYear()} KodNest Library. All rights reserved.</p>
          <div className="flex items-center gap-5 text-xs">
            <a href="#home" className="transition hover:text-primary-400">Privacy Policy</a>
            <a href="#home" className="transition hover:text-primary-400">Terms of Service</a>
            <a href="#home" className="transition hover:text-primary-400">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function SectionPage({ children }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      <Navbar />
      <main className="pt-28">{children}</main>
      <Footer />
    </div>
  )
}

export function FeaturesSection() {
  return <Features />
}

export function MembershipSection() {
  return <Plans />
}

export function TestimonialsSection() {
  return <Testimonials />
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      <Navbar />
      <main>
        <Hero />
        <TrustedBy />
        <HowItWorks />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  )
}
