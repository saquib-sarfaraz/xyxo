import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MATCH_TTL_MS = 7 * 24 * 60 * 60 * 1000

function id() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function now() {
  return Date.now()
}

function keepFreshMatches(matches) {
  const minTs = now() - MATCH_TTL_MS
  return (Array.isArray(matches) ? matches : []).filter(
    (m) => m && typeof m.createdAt === 'number' && m.createdAt >= minTs,
  )
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      notifications: [],
      friends: [],
      userSearchResults: [],
      pendingFriendRequestIds: [],
      matches: [],

      addNotification: (notification) => {
        const n = {
          id: id(),
          createdAt: now(),
          ...notification,
        }
        set((state) => ({ notifications: [n, ...state.notifications] }))
        return n.id
      },

      dismissNotification: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== notificationId),
        }))
      },

      dismissNotificationsBy: (predicate) => {
        if (typeof predicate !== 'function') return
        set((state) => ({
          notifications: state.notifications.filter((n) => !predicate(n)),
        }))
      },

      clearNotifications: () => set({ notifications: [] }),

      addFriend: (friend) => {
        const f = { username: String(friend.username), ...friend }
        set((state) => {
          const exists = state.friends.some((x) => x.username === f.username)
          return exists ? state : { friends: [f, ...state.friends] }
        })
      },

      upsertFriend: (friend) => {
        const username = String(friend?.username ?? '').trim()
        if (!username) return
        const nextFriend = { username, status: 'online', ...friend }
        set((state) => {
          const idx = state.friends.findIndex((f) => f.username === username)
          if (idx === -1) return { friends: [nextFriend, ...state.friends] }
          const next = state.friends.slice()
          next[idx] = { ...next[idx], ...nextFriend }
          return { friends: next }
        })
      },

      setUserSearchResults: (results) => {
        const list = Array.isArray(results) ? results : []
        set({ userSearchResults: list })
      },

      setPendingFriendRequest: (userId, pending = true) => {
        const key = String(userId ?? '').trim()
        if (!key) return
        set((state) => {
          const setIds = new Set(state.pendingFriendRequestIds || [])
          if (pending) setIds.add(key)
          else setIds.delete(key)
          return { pendingFriendRequestIds: Array.from(setIds) }
        })
      },

      removeFriend: (username) => {
        set((state) => ({ friends: state.friends.filter((f) => f.username !== username) }))
      },

      addMatch: (match) => {
        const m = { id: id(), createdAt: now(), ...match }
        set((state) => {
          if (state.matches.some((x) => x.id === m.id)) return state
          const next = [m, ...state.matches]
          return { matches: keepFreshMatches(next) }
        })
        return m.id
      },

      clearMatches: () => set({ matches: [] }),

      purgeExpiredMatches: () => {
        set((state) => ({ matches: keepFreshMatches(state.matches) }))
      },

      getStreak: () => {
        const matches = get().matches
        let streak = 0
        for (const m of matches) {
          if (m.outcome !== 'win') break
          streak += 1
        }
        return streak
      },
    }),
    {
      name: 'ttpro:app',
      version: 2,
      migrate: (persistedState, version) => {
        const state = persistedState && typeof persistedState === 'object' ? persistedState : {}
        if (!version || version < 2) {
          return {
            ...state,
            notifications: [],
            friends: [],
            userSearchResults: [],
            pendingFriendRequestIds: [],
            matches: keepFreshMatches(state.matches),
          }
        }
        return state
      },
      merge: (persistedState, currentState) => {
        const next = { ...currentState, ...(persistedState ?? {}) }
        next.matches = keepFreshMatches(persistedState?.matches ?? currentState.matches)
        return next
      },
      partialize: (state) => ({
        notifications: state.notifications,
        friends: state.friends,
        pendingFriendRequestIds: state.pendingFriendRequestIds,
        matches: state.matches,
      }),
    },
  ),
)
