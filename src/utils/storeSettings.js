import { Platform } from 'react-native';
import api from '../services/api';

const STORAGE_KEY = 'medix_store_settings';

export const DEFAULT_SETTINGS = {
    storeName: 'Medix Pharmacy',
    address: '',
    phone: '8101402916',
    gstNo: '',
    licenceNo: '',
    upiId: '',
    printerSize: '58mm',
    showGstDetails: false,
    showDiscountPercentage: true,
    showBarcode: true,
    showQrCode: true,
};

/**
 * Read store settings from local cache.
 * Used for synchronous reads (e.g. receipt printing).
 */
export function getStoreSettings(externalDefaults = null) {
    let regInfo = externalDefaults;

    // If no external defaults provided, try to find them in localStorage (web)
    if (!regInfo && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = window.localStorage.getItem('medix_registered_store');
            if (raw) regInfo = JSON.parse(raw);
        } catch (_) { /* ignore */ }
    }

    // Map external fields if necessary (e.g. storePhone -> phone)
    const baseDefaults = {
        ...DEFAULT_SETTINGS,
        ...(regInfo?.storeName ? { storeName: regInfo.storeName } : {}),
        ...(regInfo?.storePhone ? { phone: regInfo.storePhone } : {}),
    };

    try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                // Return saved settings merged with base defaults
                return { ...baseDefaults, ...parsed };
            }
        }
    } catch (_) { /* ignore */ }
    return baseDefaults;
}

/**
 * Persist store settings to local cache only.
 * Called after a successful API save to keep local cache in sync.
 */
export function saveStoreSettingsLocal(settings) {
    try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            return true;
        }
    } catch (_) { /* ignore */ }
    return false;
}

/**
 * Fetch store settings from the backend API.
 * Does NOT fall back to local cache if the API request succeeds.
 */
export async function fetchStoreSettings(externalDefaults = null) {
    try {
        const res = await api.get('/settings');
        const remote = res.data?.settings;
        if (remote) {
            // Merge with defaults so no field is undefined
            const merged = { ...DEFAULT_SETTINGS, ...remote };
            saveStoreSettingsLocal(merged);
            return merged;
        } else if (remote === null) {
            // No settings in DB yet, fallback to registered defaults
            return getStoreSettings(externalDefaults);
        }
    } catch (err) {
        console.warn('fetchStoreSettings: API fetch failed, using local cache', err?.message);
    }
    // Fallback to local only on network error or missing response
    return getStoreSettings(externalDefaults);
}

/**
 * Save store settings to the backend API and update local cache.
 */
export async function saveStoreSettings(settings) {
    // Always update local cache first (optimistic)
    saveStoreSettingsLocal(settings);
    try {
        const res = await api.put('/settings', settings);
        const saved = res.data?.settings;
        if (saved) {
            const merged = { ...DEFAULT_SETTINGS, ...saved };
            saveStoreSettingsLocal(merged);
            return { success: true, settings: merged };
        }
        return { success: true, settings };
    } catch (err) {
        console.error('saveStoreSettings: API save failed', err?.message);
        return { success: false, message: err?.message || 'Failed to save settings' };
    }
}
