import API from './axios'

export async function createGame(payload) {
  const res = await API.post('/games', payload ?? {})
  return res.data
}

export async function joinGame(gameId, payload) {
  const res = await API.post(`/games/${gameId}/join`, payload ?? {})
  return res.data
}

export async function sendMove(gameId, index) {
  const res = await API.post(`/games/${gameId}/move`, { index })
  return res.data
}

