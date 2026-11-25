const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Common fetch wrapper with automatic JWT token attachment
 */
const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('shareplate_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const authAPI = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (credentials) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request('/api/auth/me', { method: 'GET' }),
  logout: () => request('/api/auth/logout', { method: 'POST' })
};

export const userAPI = {
  getProfile: () => request('/api/users/profile', { method: 'GET' }),
  updateProfile: (profileData) => request('/api/users/profile', { method: 'PUT', body: JSON.stringify(profileData) }),
  getAllUsers: (params = '') => request(`/api/users${params}`, { method: 'GET' }),
  verifyNgo: (id, status) => request(`/api/users/${id}/verify-ngo`, { method: 'PUT', body: JSON.stringify({ status }) })
};

export const donationAPI = {
  create: (donationData) => request('/api/donations', { method: 'POST', body: JSON.stringify(donationData) }),
  getAll: (params = '') => request(`/api/donations${params}`, { method: 'GET' }),
  getMy: () => request('/api/donations/my', { method: 'GET' }),
  getById: (id) => request(`/api/donations/${id}`, { method: 'GET' }),
  update: (id, data) => request(`/api/donations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancel: (id) => request(`/api/donations/${id}/cancel`, { method: 'PATCH' }),
  claim: (id) => request(`/api/donations/${id}/claim`, { method: 'PUT' }),
  schedulePickup: (id, data) => request(`/api/donations/${id}/schedule-pickup`, { method: 'PUT', body: JSON.stringify(data) }),
  pickup: (id) => request(`/api/donations/${id}/pickup`, { method: 'PUT' }),
  complete: (id) => request(`/api/donations/${id}/complete`, { method: 'PUT' }),
  uploadImage: (image) => request('/api/donations/upload-image', { method: 'POST', body: JSON.stringify({ image }) }),
  getDonorStats: () => request('/api/donations/donor/stats', { method: 'GET' })
};

export const requestAPI = {
  create: (requestData) => request('/api/requests', { method: 'POST', body: JSON.stringify(requestData) }),
  getMy: () => request('/api/requests/my', { method: 'GET' }),
  getIncoming: () => request('/api/requests/incoming', { method: 'GET' }),
  getById: (id) => request(`/api/requests/${id}`, { method: 'GET' }),
  approve: (id, data) => request(`/api/requests/${id}/approve`, { method: 'PUT', body: JSON.stringify(data || {}) }),
  reject: (id, reason) => request(`/api/requests/${id}/reject`, { method: 'PUT', body: JSON.stringify({ rejectionReason: reason }) }),
  cancel: (id) => request(`/api/requests/${id}/cancel`, { method: 'PUT' }),
  schedulePickup: (id, data) => request(`/api/requests/${id}/schedule-pickup`, { method: 'PUT', body: JSON.stringify(data) }),
  markReady: (id) => request(`/api/requests/${id}/ready-for-pickup`, { method: 'PUT' }),
  confirmHandover: (id) => request(`/api/requests/${id}/confirm-handover`, { method: 'PUT' }),
  confirmCollection: (id) => request(`/api/requests/${id}/confirm-collection`, { method: 'PUT' }),
  getNgoStats: () => request('/api/requests/ngo/stats', { method: 'GET' })
};

export const notificationAPI = {
  getMy: () => request('/api/notifications', { method: 'GET' }),
  markRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/api/notifications/read-all', { method: 'PUT' })
};

export const adminAPI = {
  getMetrics: () => request('/api/admin/metrics', { method: 'GET' }),
  getReports: (params = '') => request(`/api/admin/reports${params}`, { method: 'GET' }),
  getAllDonations: (params = '') => request(`/api/admin/donations${params}`, { method: 'GET' }),
  getAllRequests: (params = '') => request(`/api/admin/requests${params}`, { method: 'GET' }),
  updateUserStatus: (userId, status) => request(`/api/admin/users/${userId}/status`, { method: 'PUT', body: JSON.stringify({ status }) })
};
