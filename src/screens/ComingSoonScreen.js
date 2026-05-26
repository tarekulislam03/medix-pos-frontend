import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useResponsive } from '../utils/responsive';

// ── Feature configs for each unavailable screen ──
const SCREEN_CONFIG = {
    Returns: {
        title: 'Sales Returns',
        subtitle: 'Manage product returns and process refunds',
        icon: 'return-down-back',
        features: [
            { icon: 'swap-horizontal-outline', label: 'Easy Returns', desc: 'Process single or bulk item returns against invoices' },
            { icon: 'cash-outline', label: 'Refund Modes', desc: 'Cash refund, store credit, or exchange options' },
            { icon: 'document-text-outline', label: 'Return Receipts', desc: 'Auto-generate return slips for customer records' },
            { icon: 'stats-chart-outline', label: 'Return Analytics', desc: 'Track return rates and reasons over time' },
            { icon: 'shield-checkmark-outline', label: 'Stock Re-entry', desc: 'Automatically restore stock on approved returns' },
            { icon: 'alert-circle-outline', label: 'Damage Tracking', desc: 'Flag and track damaged or expired returned goods' },
        ],
    },
    Purchase: {
        title: 'Purchase Orders',
        subtitle: 'Manage purchases and track supplier stock orders',
        icon: 'cart-outline',
        features: [
            { icon: 'create-outline', label: 'Create Orders', desc: 'Build and send purchase orders directly to suppliers' },
            { icon: 'time-outline', label: 'Purchase History', desc: 'Track past orders, pending items, and total spend' },
            { icon: 'cube-outline', label: 'Receive Stock', desc: 'Instantly update inventory counts on receiving purchases' },
            { icon: 'pricetag-outline', label: 'Cost Tracking', desc: 'Maintain buying price history to calculate gross margins' },
            { icon: 'document-text-outline', label: 'Billing Bills', desc: 'Upload purchase bills and match with order logs' },
            { icon: 'notifications-outline', label: 'Low Stock Alerts', desc: 'Auto-draft POs when items drop below safety stock' },
        ],
    },
    Suppliers: {
        title: 'Supplier Directory',
        subtitle: 'Manage medicine manufacturers and distributors',
        icon: 'business-outline',
        features: [
            { icon: 'person-add-outline', label: 'Supplier Profiles', desc: 'Save contact details, payment terms, and GST details' },
            { icon: 'wallet-outline', label: 'Ledger History', desc: 'Track payables, pending dues, and past transactions' },
            { icon: 'link-outline', label: 'Purchase Links', desc: 'Associate purchase orders to specific suppliers' },
            { icon: 'star-outline', label: 'Supplier Ratings', desc: 'Monitor supplier fulfillment speed and order accuracy' },
            { icon: 'copy-outline', label: 'Bulk Imports', desc: 'Upload Excel/CSV directories of manufacturers' },
            { icon: 'calendar-outline', label: 'Payment Reminders', desc: 'Schedule reminders for outstanding distributor invoices' },
        ],
    },
    Expenses: {
        title: 'Expense Tracking',
        subtitle: 'Record shop utilities, rent, salaries, and petty cash',
        icon: 'cash-outline',
        features: [
            { icon: 'add-circle-outline', label: 'Log Expenses', desc: 'Quick record categories like Utilities, Salaries, Rent' },
            { icon: 'receipt-outline', label: 'Expense Receipts', desc: 'Attach digital bills/receipts for audit trials' },
            { icon: 'bar-chart-outline', label: 'Cost Reports', desc: 'Daily, weekly, and monthly expense analysis charts' },
            { icon: 'trending-down-outline', label: 'Profit & Loss Link', desc: 'Deduct expenses from gross profit to get net income' },
            { icon: 'people-outline', label: 'Staff Salaries', desc: 'Track payouts and advance payments to employees' },
            { icon: 'shield-outline', label: 'Tax Deductions', desc: 'Categorize tax-deductible items for easy returns filing' },
        ],
    },
    Invoices: {
        title: 'Invoice Registry',
        subtitle: 'Search, audit, and re-print sales bills',
        icon: 'receipt-outline',
        features: [
            { icon: 'search-outline', label: 'Search & Filter', desc: 'Search invoices by customer, date, or amount' },
            { icon: 'print-outline', label: 'Re-print Bills', desc: 'Direct PDF export or thermal re-print of invoices' },
            { icon: 'calculator-outline', label: 'Tax Records', desc: 'Consolidated view of CGST, SGST, and IGST collections' },
            { icon: 'close-circle-outline', label: 'Void Invoice', desc: 'Process cancellations and auto-restore stock levels' },
            { icon: 'stats-chart-outline', label: 'Sales Summary', desc: 'Filter sales reports by staff counter or shifts' },
            { icon: 'cloud-download-outline', label: 'GSTR Data Export', desc: 'Download CSV reports tailored for tax accountants' },
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
                    <View>
                        <Text style={styles.headerTitle}>{config.title}</Text>
                        <Text style={styles.headerSub}>{config.subtitle}</Text>
                    </View>
                </View>
                <View style={styles.badge}>
                    <Ionicons name="warning-outline" size={12} color={COLORS.warning} />
                    <Text style={styles.badgeText}>Work Under Process</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                {/* Work Under Process Disclaimer Banner */}
                <View style={styles.disclaimerBanner}>
                    <View style={styles.disclaimerIconBox}>
                        <Ionicons name="construct-outline" size={16} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.disclaimerTitle}>Module Under Development</Text>
                        <Text style={styles.disclaimerText}>
                            This feature is currently under active development. The planned capabilities listed below will be fully integrated and ready to use in the upcoming software update.
                        </Text>
                    </View>
                </View>

                {/* Feature grid */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.featuresHeading}>Planned Features</Text>
                </View>

                <View style={styles.grid}>
                    {config.features.map((feat, idx) => (
                        <View key={idx} style={[styles.featureCard, { width: cardWidth }]}>
                            <View style={styles.featureIconBox}>
                                <Ionicons name={feat.icon} size={16} color={COLORS.primary} />
                            </View>
                            <Text style={styles.featureLabel}>{feat.label}</Text>
                            <Text style={styles.featureDesc}>{feat.desc}</Text>
                        </View>
                    ))}
                </View>

                {/* Footer note */}
                <View style={styles.footerNote}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                    <Text style={styles.footerNoteText}>
                        Features are being developed based on user feedback. Contact system administration to suggest prioritization.
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
        padding: 12,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        marginBottom: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    headerSub: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.warningLight,
        borderWidth: 0.5,
        borderColor: COLORS.warning,
        paddingHorizontal: 8,
        height: 22,
        borderRadius: 2,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.warning,
    },

    // Body
    body: {
        gap: 12,
        paddingBottom: 40,
    },

    // Disclaimer banner
    disclaimerBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: COLORS.primaryGhost,
        borderRadius: 2,
        padding: 12,
        borderWidth: 0.5,
        borderColor: COLORS.primarySoft,
    },
    disclaimerIconBox: {
        width: 28,
        height: 28,
        borderRadius: 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primarySoft,
        marginTop: 2,
    },
    disclaimerTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    disclaimerText: {
        fontSize: 11,
        color: COLORS.primary,
        lineHeight: 16,
    },

    // Features section
    sectionHeaderRow: {
        marginTop: 4,
    },
    featuresHeading: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textPrimary,
        textTransform: 'uppercase',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    featureCard: {
        backgroundColor: COLORS.white,
        borderRadius: 2,
        padding: 12,
        gap: 4,
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    featureIconBox: {
        width: 32,
        height: 32,
        borderRadius: 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primaryGhost,
        marginBottom: 4,
    },
    featureLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    featureDesc: {
        fontSize: 11,
        color: COLORS.textMuted,
        lineHeight: 15,
    },

    // Footer note
    footerNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F8FAF9',
        borderRadius: 2,
        padding: 10,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        marginTop: 4,
    },
    footerNoteText: {
        flex: 1,
        fontSize: 11,
        color: COLORS.textMuted,
        lineHeight: 16,
    },
});
