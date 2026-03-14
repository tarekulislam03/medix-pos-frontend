import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { useResponsive } from '../utils/responsive';

// ── Feature cards shown in each Coming Soon screen ──
const SCREEN_CONFIG = {
    Returns: {
        title: 'Returns & Refunds',
        subtitle: 'Manage product returns and process refunds seamlessly',
        icon: 'return-down-back',
        iconColor: '#7C3AED',
        iconBg: 'rgba(124,58,237,0.12)',
        accentColor: '#7C3AED',
        features: [
            { icon: 'swap-horizontal-outline', label: 'Easy Returns', desc: 'Process single or bulk item returns against invoices' },
            { icon: 'cash-outline', label: 'Refund Modes', desc: 'Cash refund, store credit, or exchange options' },
            { icon: 'document-text-outline', label: 'Return Receipts', desc: 'Auto-generate return slips for customer records' },
            { icon: 'stats-chart-outline', label: 'Return Analytics', desc: 'Track return rates and reasons over time' },
            { icon: 'shield-checkmark-outline', label: 'Stock Re-entry', desc: 'Automatically restore stock on approved returns' },
            { icon: 'alert-circle-outline', label: 'Damage Tracking', desc: 'Flag and track damaged or expired returned goods' },
        ],
    },
    Customers: {
        title: 'Customer Management',
        subtitle: 'Build lasting relationships and track every customer interaction',
        icon: 'people',
        iconColor: '#0284C7',
        iconBg: 'rgba(2,132,199,0.12)',
        accentColor: '#0284C7',
        features: [
            { icon: 'person-add-outline', label: 'Customer Profiles', desc: 'Store contact info, allergies, and purchase history' },
            { icon: 'heart-outline', label: 'Loyalty Points', desc: 'Reward repeat customers with a built-in points system' },
            { icon: 'time-outline', label: 'Purchase History', desc: 'View complete transaction history per customer' },
            { icon: 'notifications-outline', label: 'Prescription Reminders', desc: 'Auto-remind customers when medicine refills are due' },
            { icon: 'pricetag-outline', label: 'Custom Pricing', desc: 'Set special discount tiers for VIP customers' },
            { icon: 'phone-portrait-outline', label: 'SMS / WhatsApp', desc: 'Send bills and reminders directly to customers' },
        ],
    },
    SalesAnalytics: {
        title: 'Sales Analytics',
        subtitle: 'Data-driven insights to grow your pharmacy business',
        icon: 'bar-chart',
        iconColor: '#16A34A',
        iconBg: 'rgba(22,163,74,0.12)',
        accentColor: '#16A34A',
        features: [
            { icon: 'trending-up-outline', label: 'Revenue Trends', desc: 'Daily, weekly, and monthly revenue breakdowns' },
            { icon: 'cube-outline', label: 'Top Products', desc: 'See your best-selling medicines and slowest movers' },
            { icon: 'pie-chart-outline', label: 'Payment Mix', desc: 'Cash vs UPI vs card revenue distribution' },
            { icon: 'calendar-outline', label: 'Period Comparison', desc: 'Compare performance across custom date ranges' },
            { icon: 'people-outline', label: 'Customer Insights', desc: 'Repeat customer rate, basket size, and LTV' },
            { icon: 'download-outline', label: 'Export Reports', desc: 'Download PDF or Excel reports for any period' },
        ],
    },
};

export default function ComingSoonScreen({ screenKey = 'Returns' }) {
    const r = useResponsive();
    const config = SCREEN_CONFIG[screenKey] || SCREEN_CONFIG.Returns;

    const cardWidth = r.pick({ small: '100%', medium: '48%', large: '31%', xlarge: '31%' });

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.headerIconBox, { backgroundColor: config.iconBg }]}>
                        <Ionicons name={config.icon} size={26} color={config.accentColor} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>{config.title}</Text>
                        <Text style={styles.headerSub}>{config.subtitle}</Text>
                    </View>
                </View>
                <View style={styles.badge}>
                    <Ionicons name="time-outline" size={14} color="#F59E0B" />
                    <Text style={styles.badgeText}>Coming Soon</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                {/* Hero Banner */}
                <View style={[styles.heroBanner, { borderColor: config.accentColor + '30' }]}>
                    <View style={[styles.heroBigIcon, { backgroundColor: config.iconBg }]}>
                        <Ionicons name={config.icon} size={64} color={config.accentColor} />
                    </View>
                    <Text style={styles.heroTitle}>Under Development</Text>
                    <Text style={styles.heroSub}>
                        We're building something great! This feature will be available in the next update.
                        Here's a preview of what's coming:
                    </Text>
                    <View style={[styles.progressBar, { borderColor: config.accentColor + '40' }]}>
                        <View style={[styles.progressFill, { backgroundColor: config.accentColor, width: '65%' }]} />
                        <Text style={[styles.progressLabel, { color: config.accentColor }]}>65% Complete</Text>
                    </View>
                </View>

                {/* Feature grid */}
                <Text style={styles.featuresHeading}>Planned Features</Text>
                <View style={styles.grid}>
                    {config.features.map((feat, idx) => (
                        <View key={idx} style={[styles.featureCard, { width: cardWidth }]}>
                            <View style={[styles.featureIconBox, { backgroundColor: config.iconBg }]}>
                                <Ionicons name={feat.icon} size={22} color={config.accentColor} />
                            </View>
                            <Text style={styles.featureLabel}>{feat.label}</Text>
                            <Text style={styles.featureDesc}>{feat.desc}</Text>
                        </View>
                    ))}
                </View>

                {/* Footer note */}
                <View style={styles.footerNote}>
                    <Ionicons name="information-circle-outline" size={18} color={COLORS.textMuted} />
                    <Text style={styles.footerNoteText}>
                        Features are being developed based on your feedback. Contact support to suggest priorities.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xxl,
        paddingVertical: SPACING.lg,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        flex: 1,
    },
    headerIconBox: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    headerSub: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        marginTop: 2,
        maxWidth: 400,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(245,158,11,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.35)',
        paddingHorizontal: SPACING.md,
        paddingVertical: 7,
        borderRadius: RADIUS.full,
    },
    badgeText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: '#F59E0B',
    },

    // Body
    body: {
        padding: SPACING.xxl,
        gap: SPACING.xl,
        paddingBottom: SPACING.xxxl,
    },

    // Hero banner
    heroBanner: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.xxl,
        alignItems: 'center',
        borderWidth: 1.5,
        ...SHADOWS.md,
        gap: SPACING.md,
    },
    heroBigIcon: {
        width: 110,
        height: 110,
        borderRadius: RADIUS.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    heroTitle: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: '900',
        color: COLORS.textPrimary,
    },
    heroSub: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 480,
    },
    progressBar: {
        alignSelf: 'stretch',
        height: 36,
        borderRadius: RADIUS.full,
        borderWidth: 1.5,
        backgroundColor: COLORS.bgSurface,
        overflow: 'hidden',
        position: 'relative',
        marginTop: SPACING.sm,
        justifyContent: 'center',
    },
    progressFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: RADIUS.full,
        opacity: 0.2,
    },
    progressLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        textAlign: 'center',
    },

    // Features section
    featuresHeading: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    featureCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        gap: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        ...SHADOWS.sm,
    },
    featureIconBox: {
        width: 42,
        height: 42,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xs,
    },
    featureLabel: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    featureDesc: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        lineHeight: 18,
    },

    // Footer note
    footerNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
        backgroundColor: COLORS.bgSurface,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    footerNoteText: {
        flex: 1,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        lineHeight: 18,
    },
});
