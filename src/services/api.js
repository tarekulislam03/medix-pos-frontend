import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token if available
api.interceptors.request.use(
  (config) => {
    // Token will be set after login
    const token = api.defaults.headers.common['Authorization'];
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — standardize error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';
    console.error('API Error:', message);
    return Promise.reject({ message, status: error.response?.status });
  }
);

export const setAuthToken = async (token) => {
  try {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      await AsyncStorage.setItem('authToken', token);
      console.log('Token saved to storage');
    } else {
      delete api.defaults.headers.common['Authorization'];
      await AsyncStorage.removeItem('authToken');
      console.log('Token removed from storage');
    }
  } catch (err) {
    console.error('Error in setAuthToken:', err);
  }
};

export const loadStoredToken = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return token;
    }
  } catch (error) {
    console.error('Error loading stored token:', error);
  }
  return null;
};

export const setStoreData = async (storeData) => {
  try {
    if (storeData) {
      await AsyncStorage.setItem('storeData', JSON.stringify(storeData));
    } else {
      await AsyncStorage.removeItem('storeData');
    }
  } catch (err) {
    console.error('Error in setStoreData:', err);
  }
};

export const getStoreData = async () => {
  try {
    const data = await AsyncStorage.getItem('storeData');
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Error in getStoreData:', err);
    return null;
  }
};

export default api;
