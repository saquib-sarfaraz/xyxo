import API from './axios'

export async function fetchMe() {
  const res = await API.get('/users/me')
  return res.data
}

export async function searchUsers(query) {
  const q = String(query ?? '').trim()
  if (!q) return { users: [] }
  // Mitigation for backends that build RegExp from raw input.
  if (q === '\\') return { users: [] }
  const res = await API.get('/users/search', { params: { q } })
  return res.data
}

export async function fetchUserStats(userId) {
  const res = await API.get(`/users/${userId}/stats`)
  return res.data
}

export async function fetchFriends() {
  const res = await API.get('/friends')
  return res.data
}

export async function sendFriendRequest(receiverId) {
  const res = await API.post('/friends/requests', { receiverId })
  return res.data
}

export async function acceptFriendRequest(requestId) {
  const res = await API.post(`/friends/requests/${requestId}/accept`)
  return res.data
}

export async function fetchPendingRequests() {
  const res = await API.get('/friends/requests/pending')
  return res.data
}
