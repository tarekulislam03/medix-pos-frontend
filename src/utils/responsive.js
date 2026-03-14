/**
 * responsive.js – Adaptive layout helpers for all tablet sizes
 *
 * Breakpoints (portrait width):
 *   small   : < 600px   (7" tablets, large phones in landscape)
 *   medium  : 600–899px (8"–9" tablets)
 *   large   : 900–1199px (10"–11" tablets)
 *   xlarge  : ≥ 1200px  (12"+ tablets, landscape iPads, desktop web)
 */

import { useState, useEffect } from 'react';
import { Dimensions, PixelRatio } from 'react-native';

// ─── Base dimensions (design was made for ~1280×800 landscape tablet) ───
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 800;

// ─── Static helpers (use current snapshot of Dimensions) ───────────────

/** Horizontal scale factor relative to base design width */
export const wp = (percent) => {
    const { width } = Dimensions.get('window');
    return (percent / 100) * width;
};

/** Vertical scale factor relative to base design height */
export const hp = (percent) => {
    const { height } = Dimensions.get('window');
    return (percent / 100) * height;
};

/** Scale a pixel value proportionally to the screen width */
export const scaleW = (size) => {
    const { width } = Dimensions.get('window');
    return Math.round((width / BASE_WIDTH) * size);
};

/** Scale a pixel value proportionally to the screen height */
export const scaleH = (size) => {
    const { height } = Dimensions.get('window');
    return Math.round((height / BASE_HEIGHT) * size);
};

/** Moderately scale – blends width-scale with original to avoid extremes */
export const moderateScale = (size, factor = 0.5) => {
    const { width } = Dimensions.get('window');
    const scaleRatio = width / BASE_WIDTH;
    return Math.round(size + (scaleRatio * size - size) * factor);
};

/** Scale font size – caps the scaling to keep text readable */
export const scaleFontSize = (size) => {
    const { width } = Dimensions.get('window');
    const scale = width / BASE_WIDTH;
    const newSize = size * Math.min(Math.max(scale, 0.7), 1.3);
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// ─── Breakpoint detection ─────────────────────────────────────────────

export const getBreakpoint = (width) => {
    if (width < 600) return 'small';
    if (width < 900) return 'medium';
    if (width < 1200) return 'large';
    return 'xlarge';
};

export const isSmall = (width) => width < 600;
export const isMedium = (width) => width >= 600 && width < 900;
export const isLarge = (width) => width >= 900 && width < 1200;
export const isXLarge = (width) => width >= 1200;

// ─── React Hook ───────────────────────────────────────────────────────

/**
 * useResponsive()
 *
 * Returns an object with:
 *   width, height, breakpoint, isSmall, isMedium, isLarge, isXLarge,
 *   wp, hp, scale, moderateScale, scaleFontSize, isLandscape
 *
 * Auto-updates on orientation / resize.
 */
export function useResponsive() {
    const [dims, setDims] = useState(() => Dimensions.get('window'));

    useEffect(() => {
        const handler = ({ window }) => setDims(window);
        const subscription = Dimensions.addEventListener('change', handler);
        return () => {
            if (subscription?.remove) subscription.remove();
        };
    }, []);

    const { width, height } = dims;
    const breakpoint = getBreakpoint(width);
    const scaleRatio = width / BASE_WIDTH;

    return {
        width,
        height,
        breakpoint,
        isLandscape: width > height,

        isSmall: breakpoint === 'small',
        isMedium: breakpoint === 'medium',
        isLarge: breakpoint === 'large',
        isXLarge: breakpoint === 'xlarge',

        /** Width percentage */
        wp: (pct) => (pct / 100) * width,
        /** Height percentage */
        hp: (pct) => (pct / 100) * height,

        /** Scale a pixel value proportionally to width */
        scale: (size) => Math.round(scaleRatio * size),

        /** Moderate scale (less aggressive) */
        ms: (size, factor = 0.5) =>
            Math.round(size + (scaleRatio * size - size) * factor),

        /** Scale font size (clamped) */
        fs: (size) => {
            const newSize = size * Math.min(Math.max(scaleRatio, 0.7), 1.3);
            return Math.round(PixelRatio.roundToNearestPixel(newSize));
        },

        /** Pick value based on breakpoint: { small, medium, large, xlarge } */
        pick: (map) => {
            if (map[breakpoint] !== undefined) return map[breakpoint];
            // Fallback chain: xlarge -> large -> medium -> small
            if (breakpoint === 'xlarge') return map.large ?? map.medium ?? map.small;
            if (breakpoint === 'large') return map.medium ?? map.small ?? map.xlarge;
            if (breakpoint === 'medium') return map.small ?? map.large ?? map.xlarge;
            return map.medium ?? map.large ?? map.xlarge;
        },
    };
}
