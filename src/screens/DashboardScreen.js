import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { getDashboardStats } from '../services/billingService';
import { useResponsive } from '../utils/responsive';

const STAT_CARDS = [
    {
        key: 'todaySales',
        label: "Today's Sales",
        icon: 'trending-up',
        color: COLORS.primary,
        bg: COLORS.primaryGhost,
        prefix: '₹',
    },
    {
        key: 'totalOrders',
        label: 'Total Orders',
        icon: 'receipt-outline',
        color: '#3B82F6',
        bg: 'rgba(59,130,246,0.10)',
        prefix: '',
    },
    {
        key: 'lowStock',
        label: 'Low Stock',
        icon: 'warning-outline',
        color: COLORS.warning,
        bg: COLORS.warningLight,
        prefix: '',
    },
    {
        key: 'totalProducts',
        label: 'Products',
        icon: 'cube-outline',
        color: COLORS.accent,
        bg: COLORS.accentLight,
        prefix: '',
    },
];

export default function DashboardScreen({ navigation }) {
    const [stats, setStats] = useState({
        todaySales: 0,
        totalOrders: 0,
        lowStock: 0,
        totalProducts: 0,
    });
    const [refreshing, setRefreshing] = useState(false);
    const [greeting, setGreeting] = useState('Good Morning');
    const r = useResponsive();

    useEffect(() => {
        const hr = new Date().getHours();
        if (hr < 12) setGreeting('Good Morning');
        else if (hr < 17) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const data = await getDashboardStats();
            if (data) {
                setStats({
                    todaySales: data.todaySales ?? data.today_sales ?? 0,
                    totalOrders: data.totalOrders ?? data.total_orders ?? 0,
                    lowStock: data.lowStock ?? data.low_stock ?? 0,
                    totalProducts: data.totalProducts ?? data.total_products ?? 0,
                });
            }
        } catch {
            console.log('Dashboard stats not available');
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
        setRefreshing(false);
    };

    // Responsive values
    const scrollPadding = r.pick({ small: SPACING.md, medium: SPACING.lg, large: SPACING.xxl, xlarge: SPACING.xxl });
    const headerPadH = r.pick({ small: SPACING.md, medium: SPACING.lg, large: SPACING.xxl, xlarge: SPACING.xxl });

    // Stat card: 2-col on small, 4-col on large
    const statCardStyle = r.isSmall
        ? { width: '48%', marginBottom: SPACING.md }
        : { flex: 1 };

    // Action card: 2-col on small, 4-col on large
    const actionCardStyle = r.isSmall
        ? { width: '48%', marginBottom: SPACING.md }
        : { flex: 1 };

    return (
        <View style={styles.container}>
            {/* Page Header */}
            <View style={[styles.header, { paddingHorizontal: headerPadH }]}>
                <View>
                    <Text style={styles.greeting}>{greeting} 👋</Text>
                    <Text style={[styles.headerTitle, { fontSize: r.pick({ small: FONT_SIZES.xl, medium: FONT_SIZES.xxl, large: FONT_SIZES.xxl, xlarge: FONT_SIZES.xxl }) }]}>Dashboard</Text>
                </View>
                {!r.isSmall && (
                    <Text style={styles.dateText}>
                        {new Date().toLocaleDateString('en-IN', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                        })}
                    </Text>
                )}
            </View>

            <ScrollView
                contentContainerStyle={[styles.scroll, { padding: scrollPadding }]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={COLORS.primary}
                    />
                }
            >
                {/* Stat Cards */}
                <View style={[styles.statsRow, r.isSmall && { flexWrap: 'wrap', justifyContent: 'space-between' }]}>
                    {STAT_CARDS.map((card) => (
                        <View key={card.key} style={[styles.statCard, statCardStyle]}>
                            <View style={[styles.statIcon, { backgroundColor: card.bg }]}>
                                <Ionicons name={card.icon} size={r.pick({ small: 22, medium: 24, large: 26, xlarge: 28 })} color={card.color} />
                            </View>
                            <Text style={styles.statValue}>
                                {card.prefix}
                                {typeof stats[card.key] === 'number'
                                    ? stats[card.key].toLocaleString('en-IN')
                                    : stats[card.key]}
                            </Text>
                            <Text style={styles.statLabel}>{card.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={[styles.actionsRow, r.isSmall && { flexWrap: 'wrap', justifyContent: 'space-between' }]}>
                    <TouchableOpacity
                        style={[styles.actionCard, actionCardStyle]}
                        onPress={() => navigation.navigate('Billing')}
                        activeOpacity={0.75}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryGhost }]}>
                            <Ionicons name="cart-outline" size={r.pick({ small: 24, medium: 28, large: 30, xlarge: 30 })} color={COLORS.primary} />
                        </View>
                        <Text style={styles.actionTitle}>New Sale</Text>
                        <Text style={styles.actionDesc}>Open POS billing</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, actionCardStyle]}
                        onPress={() => navigation.navigate('Invoices')}
                        activeOpacity={0.75}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: COLORS.infoLight }]}>
                            <Ionicons name="document-text-outline" size={r.pick({ small: 24, medium: 28, large: 30, xlarge: 30 })} color={COLORS.info} />
                        </View>
                        <Text style={styles.actionTitle}>Invoices</Text>
                        <Text style={styles.actionDesc}>View recent bills</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, actionCardStyle]}
                        onPress={() => navigation.navigate('Inventory')}
                        activeOpacity={0.75}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: COLORS.warningLight }]}>
                            <Ionicons name="cube-outline" size={r.pick({ small: 24, medium: 28, large: 30, xlarge: 30 })} color={COLORS.warning} />
                        </View>
                        <Text style={styles.actionTitle}>Inventory</Text>
                        <Text style={styles.actionDesc}>Manage products</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionCard, actionCardStyle]} activeOpacity={0.75}>
                        <View style={[styles.actionIcon, { backgroundColor: COLORS.accentLight }]}>
                            <Ionicons name="settings-outline" size={r.pick({ small: 24, medium: 28, large: 30, xlarge: 30 })} color={COLORS.accent} />
                        </View>
                        <Text style={styles.actionTitle}>Settings</Text>
                        <Text style={styles.actionDesc}>Configuration</Text>
                    </TouchableOpacity>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.lg,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    greeting: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        marginBottom: 2,
    },
    headerTitle: {
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    dateText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    scroll: {
        paddingBottom: SPACING.xxxl,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: SPACING.lg,
        marginBottom: SPACING.xxl,
    },
    statCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    statIcon: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    statValue: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    statLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        fontWeight: '500',
        marginTop: 4,
    },

    // Actions
    sectionTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: SPACING.lg,
    },
    actionCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    actionIcon: {
        width: 58,
        height: 58,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    actionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    actionDesc: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
    },
});
