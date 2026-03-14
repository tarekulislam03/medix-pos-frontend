import { Platform } from 'react-native';

const STORAGE_KEY = 'medix_store_settings';

export const DEFAULT_SETTINGS = {
    storeName: 'Medix Pharmacy',
    address: '',
    phone: '8101402916',
    gstNo: '',
    upiId: '',
};

/** Read store settings — returns defaults if nothing saved yet */
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

/** Persist store settings */
export function saveStoreSettings(settings) {
    try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            return true;
        }
    } catch (_) { /* ignore */ }
    return false;
}
