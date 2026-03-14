import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { getStoreSettings, saveStoreSettings, DEFAULT_SETTINGS } from '../utils/storeSettings';
import { useResponsive } from '../utils/responsive';
import { AuthContext } from '../context/AuthContext';

export default function SettingsScreen() {
    const r = useResponsive();
    const { storeData } = useContext(AuthContext);
    const [form, setForm] = useState(DEFAULT_SETTINGS);
    const [saved, setSaved] = useState(false);
    const [dirty, setDirty] = useState(false);

    // Dynamic defaults based on registered credentials
    const dynamicDefaults = {
        ...DEFAULT_SETTINGS,
        ...(storeData?.storeName ? { storeName: storeData.storeName } : {}),
        ...(storeData?.storePhone ? { phone: storeData.storePhone } : {}),
    };

    // Load persisted settings on mount
    useEffect(() => {
        const s = getStoreSettings(storeData || {});
        setForm(s);
    }, [storeData]);

    const set = (key, val) => {
        setForm(prev => ({ ...prev, [key]: val }));
        setDirty(true);
        setSaved(false);
    };

    const handleSave = () => {
        if (!form.storeName.trim()) {
            Alert.alert('Validation', 'Store name is required.');
            return;
        }
        saveStoreSettings(form);
        setSaved(true);
        setDirty(false);
    };

    const handleReset = () => {
        Alert.alert(
            'Reset to Defaults',
            'This will clear your custom store info and restore registered credentials. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset', style: 'destructive', onPress: () => {
                        setForm({ ...dynamicDefaults });
                        saveStoreSettings(dynamicDefaults);
                        setSaved(false);
                        setDirty(false);
                    }
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.headerIconBox}>
                        <Ionicons name="settings" size={24} color={COLORS.primary} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Settings</Text>
                        <Text style={styles.headerSub}>Configure your store information for bills & receipts</Text>
                    </View>
                </View>
                {saved && (
                    <View style={styles.savedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        <Text style={styles.savedText}>Saved</Text>
                    </View>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

                {/* ── Bill Header Preview ── */}
                <View style={styles.previewCard}>
                    <Text style={styles.previewTitle}>
                        <Ionicons name="receipt-outline" size={14} color={COLORS.textMuted} />
                        {' '}Live Receipt Preview (58mm)
                    </Text>
                    <View style={styles.receiptPreview}>
                        <Text style={styles.rStoreName}>{form.storeName || 'Store Name'}</Text>
                        <Text style={styles.rAddress}>{form.address || 'Store Address'}</Text>
                        <Text style={styles.rPhone}>{form.phone || 'Phone Number'}</Text>
                        {form.gstNo ? <Text style={styles.rGST}>GST: {form.gstNo}</Text> : null}
                        <View style={styles.rDivider} />
                        <Text style={styles.rDimLabel}>━━ Items appear below ━━</Text>
                    </View>
                </View>

                {/* ── Store Info Form ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="storefront-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Store Information</Text>
                    </View>
                    <Text style={styles.sectionSub}>
                        This information will appear at the top of every 58mm printed bill.
                    </Text>

                    <View style={styles.formCard}>
                        {/* Store Name */}
                        <Field
                            label="Store Name"
                            icon="storefront-outline"
                            placeholder="e.g. MediX Pharmacy"
                            value={form.storeName}
                            onChangeText={v => set('storeName', v)}
                            required
                        />

                        {/* Address */}
                        <Field
                            label="Store Address"
                            icon="location-outline"
                            placeholder="e.g. 12, Main Street, Mumbai - 400001"
                            value={form.address}
                            onChangeText={v => set('address', v)}
                            multiline
                        />

                        {/* Phone */}
                        <Field
                            label="Mobile / Phone No."
                            icon="call-outline"
                            placeholder="e.g. +91 98765 43210"
                            value={form.phone}
                            onChangeText={v => set('phone', v)}
                            keyboardType="phone-pad"
                        />

                        {/* GST No */}
                        <Field
                            label="GST Number"
                            icon="document-text-outline"
                            placeholder="e.g. 27AAAAA0000A1Z5"
                            value={form.gstNo}
                            onChangeText={v => set('gstNo', v)}
                            autoCapitalize="characters"
                        />

                        {/* UPI ID */}
                        <Field
                            label="UPI ID for Payments"
                            icon="qr-code-outline"
                            placeholder="e.g. storename@okaxis"
                            value={form.upiId}
                            onChangeText={v => set('upiId', v)}
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* ── Info note ── */}
                <View style={styles.infoNote}>
                    <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.infoNoteText}>
                        Changes are applied immediately to all new bills printed from this device.
                        Settings are stored locally and persist across sessions.
                    </Text>
                </View>

                {/* ── Actions ── */}
                <View style={[styles.actionRow, r.isSmall && { flexDirection: 'column-reverse', alignItems: 'stretch' }]}>
                    <TouchableOpacity
                        style={styles.resetBtn}
                        onPress={handleReset}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="refresh-outline" size={18} color={COLORS.textMuted} />
                        <Text style={styles.resetBtnText}>Reset to Defaults</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.saveBtn, !dirty && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        activeOpacity={dirty ? 0.8 : 1}
                    >
                        <Ionicons name="save-outline" size={20} color={COLORS.white} />
                        <Text style={styles.saveBtnText}>Save Settings</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

// ── Reusable form field ──
function Field({ label, icon, placeholder, value, onChangeText, required, multiline, keyboardType, autoCapitalize }) {
    const [focused, setFocused] = useState(false);
    return (
        <View style={fStyles.container}>
            <Text style={fStyles.label}>
                {label}
                {required && <Text style={{ color: COLORS.error }}> *</Text>}
            </Text>
            <View style={[fStyles.inputRow, focused && fStyles.inputRowFocused, multiline && fStyles.inputRowMulti]}>
                <Ionicons name={icon} size={18} color={focused ? COLORS.primary : COLORS.textMuted} style={{ marginTop: multiline ? 2 : 0 }} />
                <TextInput
                    style={[fStyles.input, multiline && fStyles.inputMulti]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType={keyboardType || 'default'}
                    multiline={multiline}
                    numberOfLines={multiline ? 2 : 1}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    autoCapitalize={autoCapitalize || 'none'}
                />
            </View>
        </View>
    );
}

// ── Styles ──
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgDark },

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
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    headerIconBox: {
        width: 48, height: 48, borderRadius: RADIUS.lg,
        backgroundColor: COLORS.primaryGhost,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
    headerSub: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: 2 },
    savedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: COLORS.successLight,
        borderWidth: 1, borderColor: COLORS.success + '40',
        paddingHorizontal: SPACING.md, paddingVertical: 7,
        borderRadius: RADIUS.full,
    },
    savedText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.success },

    body: { padding: SPACING.xxl, gap: SPACING.xl, paddingBottom: 60 },

    // Live preview card
    previewCard: {
        backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
        padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
    },
    previewTitle: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, fontWeight: '600', marginBottom: SPACING.md },
    receiptPreview: {
        backgroundColor: '#FAFAFA',
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        alignItems: 'center',
        borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border,
    },
    rStoreName: { fontSize: 15, fontWeight: '900', color: '#000', fontFamily: 'monospace' },
    rAddress: { fontSize: 10, color: '#555', fontFamily: 'monospace', textAlign: 'center', marginTop: 2 },
    rPhone: { fontSize: 10, color: '#555', fontFamily: 'monospace', marginTop: 1 },
    rGST: { fontSize: 10, color: '#555', fontFamily: 'monospace', marginTop: 1, fontWeight: '700' },
    rDivider: { borderTopWidth: 1.5, borderTopColor: '#000', alignSelf: 'stretch', marginVertical: 6 },
    rDimLabel: { fontSize: 10, color: '#aaa', fontFamily: 'monospace' },

    // Section
    section: { gap: SPACING.md },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.textPrimary },
    sectionSub: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, lineHeight: 18 },

    formCard: {
        backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
        padding: SPACING.xl, gap: SPACING.lg,
        borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm,
    },

    // Info note
    infoNote: {
        flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
        backgroundColor: COLORS.primaryGhost, borderRadius: RADIUS.md,
        padding: SPACING.md, borderWidth: 1, borderColor: COLORS.primary + '30',
    },
    infoNoteText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.primary, lineHeight: 18, fontWeight: '500' },

    // Action row
    actionRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
    resetBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
        paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
        borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    resetBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textMuted },
    saveBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: SPACING.sm, backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    },
    saveBtnDisabled: { backgroundColor: COLORS.textMuted, opacity: 0.5 },
    saveBtnText: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.white },
});

const fStyles = StyleSheet.create({
    container: { gap: 6 },
    label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary },
    inputRow: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
        backgroundColor: COLORS.bgInput, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        minHeight: 48,
    },
    inputRowFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.white },
    inputRowMulti: { alignItems: 'flex-start', paddingTop: SPACING.sm, minHeight: 64 },
    input: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
    inputMulti: { minHeight: 48 },
});
