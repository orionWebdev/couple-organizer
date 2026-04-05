import type { Timestamp } from 'firebase/firestore'

export interface User {
  uid: string
  email: string
  displayName: string
  coupleId: string | null
  createdAt: Timestamp
}

export interface Couple {
  id: string
  memberIds: string[]
  memberNames: Record<string, string> // { uid: displayName }
  inviteCode: string
  createdAt: Timestamp
}

export interface Todo {
  id: string
  coupleId: string
  title: string
  done: boolean
  assignedTo: string | null
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ShoppingItem {
  id: string
  coupleId: string
  name: string
  bought: boolean
  addedBy: string
  createdAt: Timestamp
}

export interface Expense {
  id: string
  coupleId: string
  title: string
  amount: number // stored in cents
  paidBy: string
  createdBy: string
  createdAt: Timestamp
}
