// MediX POS — Deep Forest Green Theme (#1C5C4A) for Tablet POS
// Updated: Ruled ledger aesthetic — no shadows, 0.5px borders, 4–6px radius

import { Dimensions, Platform } from 'react-native';

// ─── Get scale factor based on current screen width ───
const getScale = () => {
    const { width } = Dimensions.get('window');
    if (width < 600) return 0.75;    // Small tablets / phones
    if (width < 900) return 0.88;    // Medium tablets (8"–9")
    if (width < 1200) return 1.0;     // Large tablets (10"–11")
    return 1.05;                       // XL tablets / desktop
};

const s = getScale();

export const FONTS = {
    regular: 'Inter',
    bold: 'Inter',
};

export const COLORS = {
    // Primary — Deep Forest Green
    primary: '#1C5C4A',
    primaryDark: '#144439',
    primaryLight: '#2D7A63',
    primaryGhost: 'rgba(28, 92, 74, 0.08)',
    primarySoft: 'rgba(28, 92, 74, 0.15)',

    // Secondary — Deeper accent
    accent: '#17493B',
    accentLight: 'rgba(23, 73, 59, 0.10)',

    // Status — tint-based
    success: '#1C5C4A',
    successLight: 'rgba(28, 92, 74, 0.10)',
    warning: '#B8860B',
    warningLight: 'rgba(184, 134, 11, 0.10)',
    error: '#C0392B',
    errorLight: 'rgba(192, 57, 43, 0.08)',
    info: '#2C6E8A',
    infoLight: 'rgba(44, 110, 138, 0.10)',

    // Backgrounds
    bgDark: '#F4F6F5',
    bgCard: '#FFFFFF',
    bgCardHover: '#F7F9F8',
    bgInput: '#F8FAF9',
    bgSurface: '#EFF2F1',
    bgSidebar: '#1C2B2A',
    bgSidebarHover: '#263B39',

    // Text
    textPrimary: '#1C2B2A',
    textSecondary: '#4A5C58',
    textMuted: '#7A8E89',
    textInverse: '#FFFFFF',
    textSidebarActive: '#FFFFFF',
    textSidebarInactive: 'rgba(255,255,255,0.55)',

    // Borders
    border: '#CDD5D1',
    borderLight: '#DCE4E1',
    borderFocus: '#1C5C4A',

    // Misc
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(0, 0, 0, 0.35)',
    shadow: 'rgba(0, 0, 0, 0.04)',
};

export const FONT_SIZES = {
    xs: Math.round(13 * s),
    sm: Math.round(15 * s),
    md: Math.round(17 * s),
    lg: Math.round(20 * s),
    xl: Math.round(24 * s),
    xxl: Math.round(30 * s),
    xxxl: Math.round(38 * s),
    display: Math.round(48 * s),
};

export const SPACING = {
    xs: Math.round(4 * s),
    sm: Math.round(8 * s),
    md: Math.round(12 * s),
    lg: Math.round(16 * s),
    xl: Math.round(20 * s),
    xxl: Math.round(26 * s),
    xxxl: Math.round(34 * s),
};

export const RADIUS = {
    sm: 2,
    md: 3,
    lg: 3,
    xl: 3,
    full: 3,   // Sharp 2-3px corners
};

// No box shadows — clean ruled aesthetic
export const SHADOWS = {
    sm: {},
    md: {},
    lg: {},
};
