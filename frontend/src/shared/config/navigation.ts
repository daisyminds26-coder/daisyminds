import {
  Award,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  CircleUserRound,
  ClipboardList,
  FileQuestion,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Layers,
  Megaphone,
  PenSquare,
  Receipt,
  ScrollText,
  Settings,
  UserCog,
  Users,
  Video,
} from 'lucide-react'

import type { NavSection } from '@/shared/types/nav'

/**
 * Static navigation model for the three role-scoped app areas. This is a
 * UI-only affordance (SECURITY.md §3) — it controls what renders in the
 * sidebar, not what the server will actually authorize. Student/Trainer/
 * Course/Batch/Enrollment Management are implemented (Phases 6/7/9A/10A/10B);
 * remaining business modules behind these links (fees, certificates, etc.)
 * are out of scope so far — those routes exist as lazy-loaded "Coming Soon"
 * placeholders.
 */
export const adminNavigation: readonly NavSection[] = [
  {
    id: 'overview',
    items: [{ id: 'dashboard', label: 'Dashboard', href: '/admin', icon: LayoutDashboard }],
  },
  {
    id: 'academics',
    label: 'Academics',
    items: [
      { id: 'students', label: 'Students', href: '/admin/students', icon: GraduationCap },
      { id: 'trainers', label: 'Trainers', href: '/admin/trainers', icon: Users },
      { id: 'courses', label: 'Courses', href: '/admin/courses', icon: BookOpen },
      { id: 'batches', label: 'Batches', href: '/admin/batches', icon: Layers },
      {
        id: 'Enrollments',
        label: 'Enrollments',
        href: '/admin/Enrollments',
        icon: ClipboardList,
      },
      { id: 'live-classes', label: 'Live Classes', href: '/admin/live-classes', icon: Video },
      { id: 'attendance', label: 'Attendance', href: '/admin/attendance', icon: CalendarCheck },
      { id: 'assignments', label: 'Assignments', href: '/admin/assignments', icon: PenSquare },
      {
        id: 'question-bank',
        label: 'Question Bank',
        href: '/admin/question-bank',
        icon: HelpCircle,
      },
      {
        id: 'assessments',
        label: 'Quizzes & Exams',
        href: '/admin/assessments',
        icon: FileQuestion,
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { id: 'fees', label: 'Fees & Payments', href: '/admin/fees', icon: Receipt },
      { id: 'certificates', label: 'Certificates', href: '/admin/certificates', icon: Award },
      { id: 'placements', label: 'Placements', href: '/admin/placements', icon: Megaphone },
      { id: 'reports', label: 'Reports', href: '/admin/reports', icon: BarChart3 },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'users',
        label: 'User Management',
        href: '/admin/users',
        icon: UserCog,
      },
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        href: '/admin/audit-logs',
        icon: ScrollText,
        roles: ['SUPER_ADMIN'],
      },
      {
        id: 'settings',
        label: 'Settings',
        href: '/admin/settings',
        icon: Settings,
        roles: ['SUPER_ADMIN'],
      },
    ],
  },
]

export const trainerNavigation: readonly NavSection[] = [
  {
    id: 'overview',
    items: [{ id: 'dashboard', label: 'Dashboard', href: '/trainer', icon: LayoutDashboard }],
  },
  {
    id: 'teaching',
    label: 'Teaching',
    items: [
      { id: 'courses', label: 'My Courses', href: '/trainer/courses', icon: BookOpen },
      { id: 'live-classes', label: 'Live Classes', href: '/trainer/live-classes', icon: Video },
      { id: 'attendance', label: 'Attendance', href: '/trainer/attendance', icon: CalendarCheck },
    ],
  },
  {
    id: 'evaluation',
    label: 'Evaluation',
    items: [
      { id: 'assignments', label: 'Assignments', href: '/trainer/assignments', icon: PenSquare },
      {
        id: 'assessments',
        label: 'Quizzes & Exams',
        href: '/trainer/assessments',
        icon: FileQuestion,
      },
      { id: 'results', label: 'Results', href: '/trainer/results', icon: ClipboardList },
    ],
  },
]

/**
 * Phase 11A (Student Portal Foundation) real nav — Dashboard/My Courses/
 * Schedule/Resources are real pages this phase ships; Notifications/
 * Certificates are honest future placeholders (their own module hasn't
 * been built yet), not disguised as empty real pages.
 */
export const studentNavigation: readonly NavSection[] = [
  {
    id: 'overview',
    items: [{ id: 'dashboard', label: 'Dashboard', href: '/student', icon: LayoutDashboard }],
  },
  {
    id: 'learning',
    label: 'Learning',
    items: [
      { id: 'courses', label: 'My Courses', href: '/student/courses', icon: BookOpen },
      { id: 'live-classes', label: 'Live Classes', href: '/student/live-classes', icon: Video },
      { id: 'schedule', label: 'Schedule', href: '/student/schedule', icon: CalendarCheck },
      { id: 'attendance', label: 'Attendance', href: '/student/attendance', icon: CalendarClock },
      { id: 'assignments', label: 'Assignments', href: '/student/assignments', icon: PenSquare },
      {
        id: 'assessments',
        label: 'Quizzes & Exams',
        href: '/student/assessments',
        icon: FileQuestion,
      },
      { id: 'resources', label: 'Resources', href: '/student/resources', icon: FileText },
    ],
  },
  {
    id: 'future',
    label: 'Coming later',
    items: [
      {
        id: 'notifications',
        label: 'Notifications',
        href: '/student/notifications',
        icon: Megaphone,
      },
      { id: 'certificates', label: 'Certificates', href: '/student/certificates', icon: Award },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { id: 'profile', label: 'Profile', href: '/student/profile', icon: CircleUserRound },
      { id: 'settings', label: 'Settings & Security', href: '/student/settings', icon: Settings },
    ],
  },
]

export const navigationByArea = {
  admin: adminNavigation,
  trainer: trainerNavigation,
  student: studentNavigation,
} as const

export type NavigationArea = keyof typeof navigationByArea
