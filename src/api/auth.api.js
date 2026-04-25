import API from './axios';

export async function signup(payload) {
  const res = await API.post('/auth/signup', payload);
  return res.data;
}

export async function login(payload) {
  const res = await API.post('/auth/login', payload);
  return res.data;
}

export async function refresh(payload) {
  const res = await API.post('/auth/refresh', payload);
  return res.data;
}

export async function logout() {
  const res = await API.post('/auth/logout');
  return res.data;
}

