import API from './axios'

export async function signup(payload) {
  const res = await API.post('/auth/signup', payload)
  return res.data
}

export async function login(payload) {
  const res = await API.post('/auth/login', payload)
  return res.data
}

