import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../core/constants/theme';
import { fetchStoreSettings, saveStoreSettings, DEFAULT_SETTINGS } from '../utils/storeSettings';
import { useResponsive } from '../../../core/utils/responsive';
import { AuthContext } from '../../../core/context/AuthContext';

export default function SettingsScreen() {
    const r = useResponsive();
    const { storeData } = useContext(AuthContext);
    const [form, setForm] = useState(DEFAULT_SETTINGS);
    const [saved, setSaved] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Dynamic defaults based on registered credentials
    const dynamicDefaults = {
        ...DEFAULT_SETTINGS,
        ...(storeData?.storeName ? { storeName: storeData.storeName } : {}),
        ...(storeData?.storePhone ? { phone: storeData.storePhone } : {}),
    };

    // Load persisted settings from API on mount
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const s = await fetchStoreSettings(storeData || {});
                if (mounted) setForm(s);
            } catch (e) {
                console.error('Failed to load settings', e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [storeData]);

    const set = (key, val) => {
        setForm(prev => ({ ...prev, [key]: val }));
        setDirty(true);
        setSaved(false);
    };

    const handleSave = async () => {
        if (!form.storeName.trim()) {
            Alert.alert('Validation', 'Store name is required.');
            return;
        }
        setSaving(true);
        const result = await saveStoreSettings(form);
        setSaving(false);
        if (result.success) {
            setSaved(true);
            setDirty(false);
        } else {
            Alert.alert('Error', result.message || 'Failed to save settings. Changes saved locally.');
            setSaved(true);
            setDirty(false);
        }
    };

    const handleReset = () => {
        Alert.alert(
            'Reset to Defaults',
            'This will clear your custom store info and restore registered credentials. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset', style: 'destructive', onPress: async () => {
                        setForm({ ...dynamicDefaults });
                        await saveStoreSettings(dynamicDefaults);
                        setSaved(false);
                        setDirty(false);
                    }
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 12, color: COLORS.textMuted, fontSize: 13 }}>Loading settings…</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View>
                        <Text style={styles.headerTitle}>Settings</Text>
                        <Text style={styles.headerSub}>Configure your store information for bills & receipts</Text>
                    </View>
                </View>
                {saved && (
                    <View style={styles.savedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                        <Text style={styles.savedText}>Saved</Text>
                    </View>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

                {/* ── Bill Header Preview ── */}
                <View style={styles.previewCard}>
                    <Text style={styles.previewTitle}>
                        <Ionicons name="receipt-outline" size={13} color={COLORS.textMuted} />
                        {' '}Live Receipt Preview ({form.printerSize || '58mm'})
                    </Text>
                    <View style={styles.receiptPreview}>
                        <Text style={styles.rStoreName}>{form.storeName || 'Store Name'}</Text>
                        <Text style={styles.rAddress}>{form.address || 'Store Address'}</Text>
                        <Text style={styles.rPhone}>{form.phone || 'Phone Number'}</Text>
                        {form.gstNo ? <Text style={styles.rGST}>GST: {form.gstNo}</Text> : null}
                        {form.licenceNo ? <Text style={styles.rGST}>DL: {form.licenceNo}</Text> : null}
                        <View style={styles.rDivider} />
                        <Text style={styles.rDimLabel}>━━ Items appear below ━━</Text>
                    </View>
                </View>

                {/* ── Store Info Form ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="storefront-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Store Information</Text>
                    </View>
                    <Text style={styles.sectionSub}>
                        This information will appear at the top of every 58mm printed bill.
                    </Text>

                    <View style={styles.formCard}>
                        {/* Printer Size Selection */}
                        <View style={styles.printerSizeContainer}>
                            <Text style={styles.printerSizeLabel}>Receipt Printer Size</Text>
                            <View style={styles.printerSizeOptions}>
                                <TouchableOpacity
                                    style={[styles.printerSizeOption, (form.printerSize === '58mm' || !form.printerSize) && styles.printerSizeOptionActive]}
                                    onPress={() => set('printerSize', '58mm')}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="print-outline" size={16} color={(form.printerSize === '58mm' || !form.printerSize) ? COLORS.primary : COLORS.textMuted} />
                                    <Text style={[styles.printerSizeText, (form.printerSize === '58mm' || !form.printerSize) && styles.printerSizeTextActive]}>58mm</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.printerSizeOption, form.printerSize === '80mm' && styles.printerSizeOptionActive]}
                                    onPress={() => set('printerSize', '80mm')}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="print-outline" size={16} color={form.printerSize === '80mm' ? COLORS.primary : COLORS.textMuted} />
                                    <Text style={[styles.printerSizeText, form.printerSize === '80mm' && styles.printerSizeTextActive]}>80mm</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

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

                        {/* Show GST Details Toggle */}
                        <View style={[fStyles.container, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 2 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="receipt-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                                <Text style={fStyles.label}>Show GST Breakdown on Bill</Text>
                            </View>
                            <Switch
                                value={!!form.showGstDetails}
                                onValueChange={v => set('showGstDetails', v)}
                                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                            />
                        </View>

                        {/* Show Discount Percentage on Receipt */}
                        <View style={[fStyles.container, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 2 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="pricetag-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                                <Text style={fStyles.label}>Show Discount % on Bill Items</Text>
                            </View>
                            <Switch
                                value={form.showDiscountPercentage ?? true}
                                onValueChange={v => set('showDiscountPercentage', v)}
                                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                            />
                        </View>

                        {/* Show Invoice Barcode */}
                        <View style={[fStyles.container, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 2 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="barcode-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                                <Text style={fStyles.label}>Show Invoice Barcode on Bill</Text>
                            </View>
                            <Switch
                                value={form.showBarcode ?? true}
                                onValueChange={v => set('showBarcode', v)}
                                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                            />
                        </View>

                        {/* Show Payment QR Code */}
                        <View style={[fStyles.container, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 2 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="qr-code-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                                <Text style={fStyles.label}>Show Payment QR Code on Bill</Text>
                            </View>
                            <Switch
                                value={form.showQrCode ?? true}
                                onValueChange={v => set('showQrCode', v)}
                                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                            />
                        </View>

                        {/* Medicine Store Licence No */}
                        <Field
                            label="Medicine Store Licence No."
                            icon="shield-checkmark-outline"
                            placeholder="e.g. 20/WB/MED/2024"
                            value={form.licenceNo}
                            onChangeText={v => set('licenceNo', v)}
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
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.infoNoteText}>
                        Changes are saved to the cloud and applied to all new bills.
                        Settings sync across devices when you log in.
                    </Text>
                </View>

                {/* ── Actions ── */}
                <View style={[styles.actionRow, r.isSmall && { flexDirection: 'column-reverse', alignItems: 'stretch' }]}>
                    <TouchableOpacity
                        style={styles.resetBtn}
                        onPress={handleReset}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="refresh-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                        <Text style={styles.resetBtnText}>Reset to Defaults</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        activeOpacity={dirty && !saving ? 0.8 : 1}
                        disabled={saving || !dirty}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color={COLORS.white} style={{ marginRight: 6 }} />
                        ) : (
                            <Ionicons name="cloud-upload-outline" size={14} color={COLORS.white} style={{ marginRight: 6 }} />
                        )}
                        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Settings'}</Text>
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
                <Ionicons name={icon} size={16} color={focused ? COLORS.primary : COLORS.textMuted} style={{ marginTop: multiline ? 2 : 0, marginRight: 6 }} />
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
                    {...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {})}
                />
            </View>
        </View>
    );
}

// ── Styles ──
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgDark, padding: 12 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        marginBottom: 10,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '400', color: COLORS.textPrimary },
    headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    savedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.successLight,
        borderWidth: 0.5,
        borderColor: COLORS.success,
        paddingHorizontal: 8,
        height: 22,
        borderRadius: 2,
    },
    savedText: { fontSize: 11, fontWeight: '600', color: COLORS.success },

    body: { gap: 12, paddingBottom: 60 },

    // Live preview card
    previewCard: {
        backgroundColor: COLORS.white,
        borderRadius: 2,
        padding: 12,
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    previewTitle: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '500',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    receiptPreview: {
        backgroundColor: '#F8FAF9',
        borderRadius: 2,
        padding: 12,
        alignItems: 'center',
        borderWidth: 0.5,
        borderStyle: 'dashed',
        borderColor: COLORS.border,
    },
    rStoreName: { fontSize: 14, fontWeight: '700', color: '#000', fontFamily: 'monospace' },
    rAddress: { fontSize: 10, color: '#555', fontFamily: 'monospace', textAlign: 'center', marginTop: 2 },
    rPhone: { fontSize: 10, color: '#555', fontFamily: 'monospace', marginTop: 1 },
    rGST: { fontSize: 10, color: '#555', fontFamily: 'monospace', marginTop: 1, fontWeight: '700' },
    rDivider: { borderTopWidth: 1.5, borderTopColor: '#000', alignSelf: 'stretch', marginVertical: 6 },
    rDimLabel: { fontSize: 10, color: '#aaa', fontFamily: 'monospace' },

    // Section
    section: { gap: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, textTransform: 'uppercase' },
    sectionSub: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },

    formCard: {
        backgroundColor: COLORS.white,
        borderRadius: 2,
        padding: 12,
        gap: 12,
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },

    // Printer Size
    printerSizeContainer: { gap: 6, marginBottom: 4 },
    printerSizeLabel: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary, textTransform: 'uppercase' },
    printerSizeOptions: { flexDirection: 'row', gap: 8 },
    printerSizeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 36,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 4,
        backgroundColor: COLORS.bgInput,
    },
    printerSizeOptionActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryGhost || '#EFF6FF',
    },
    printerSizeText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
    printerSizeTextActive: { color: COLORS.primary, fontWeight: '600' },

    // Info note
    infoNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        backgroundColor: COLORS.primaryGhost,
        borderRadius: 2,
        padding: 10,
        borderWidth: 0.5,
        borderColor: COLORS.primarySoft,
    },
    infoNoteText: { flex: 1, fontSize: 11, color: COLORS.primary, lineHeight: 16, fontWeight: '500' },

    // Action row
    actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    resetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    resetBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
    saveBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
        borderWidth: 0.5,
        borderColor: COLORS.primary,
    },
    saveBtnDisabled: {
        backgroundColor: COLORS.white,
        borderColor: COLORS.border,
        opacity: 0.5,
    },
    saveBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.white,
    },
});

const fStyles = StyleSheet.create({
    container: { gap: 4 },
    label: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary, textTransform: 'uppercase' },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: COLORS.border,
        borderRadius: 2,
        backgroundColor: COLORS.bgInput,
        paddingHorizontal: 8,
        height: 34,
    },
    inputRowFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.white },
    inputRowMulti: { alignItems: 'flex-start', paddingTop: 6, height: 60 },
    input: {
        flex: 1,
        fontSize: 12,
        color: COLORS.textPrimary,
        height: '100%',
        paddingVertical: 0,
    },
    inputMulti: { height: 48, textAlignVertical: 'top' },
});
