// MediX POS — Teal Theme (#4FA39A) for Tablet POS
// Now with responsive scaling via the responsive utility

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
    // Primary — Medical Teal
    primary: '#4FA39A',
    primaryDark: '#3D8880',
    primaryLight: '#7DC4BD',
    primaryGhost: 'rgba(79, 163, 154, 0.10)',
    primarySoft: 'rgba(79, 163, 154, 0.18)',

    // Secondary — Deep Teal
    accent: '#2D8B83',
    accentLight: 'rgba(45, 139, 131, 0.12)',

    // Status
    success: '#16A34A',
    successLight: 'rgba(22, 163, 74, 0.12)',
    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.12)',
    error: '#EF4444',
    errorLight: 'rgba(239, 68, 68, 0.10)',
    info: '#3B82F6',
    infoLight: 'rgba(59, 130, 246, 0.10)',

    // Backgrounds
    bgDark: '#F0F5F4',
    bgCard: '#FFFFFF',
    bgCardHover: '#F5FAF9',
    bgInput: '#F7FAFA',
    bgSurface: '#ECF2F1',
    bgSidebar: '#1A3F3A',
    bgSidebarHover: '#245650',

    // Text
    textPrimary: '#1A2E2B',
    textSecondary: '#4A635F',
    textMuted: '#7A948F',
    textInverse: '#FFFFFF',
    textSidebarActive: '#FFFFFF',
    textSidebarInactive: 'rgba(255,255,255,0.65)',

    // Borders
    border: '#D0DDD9',
    borderLight: '#E3EEEB',
    borderFocus: '#4FA39A',

    // Misc
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(0, 0, 0, 0.35)',
    shadow: 'rgba(0, 50, 45, 0.08)',
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
    xs: Math.round(6 * s),
    sm: Math.round(10 * s),
    md: Math.round(16 * s),
    lg: Math.round(20 * s),
    xl: Math.round(26 * s),
    xxl: Math.round(34 * s),
    xxxl: Math.round(44 * s),
};

export const RADIUS = {
    sm: Math.round(8 * s),
    md: Math.round(12 * s),
    lg: Math.round(16 * s),
    xl: Math.round(22 * s),
    full: 999,
};

export const SHADOWS = {
    sm: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 5,
    },
    lg: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 24,
        elevation: 10,
    },
};
