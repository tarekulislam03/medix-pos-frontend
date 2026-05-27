import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    Image,
    Animated,
    ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { loginUser } from '../services/authService';
import { useResponsive } from '../utils/responsive';
import { AuthContext } from '../context/AuthContext';

// ─── ERP Terminal Palette ──────────────────────────────────────────────────────
const T = {
    panelBg:        '#0E1E1A',
    panelBorder:    '#1B332D',
    panelMuted:     'rgba(255,255,255,0.32)',
    panelDim:       'rgba(255,255,255,0.18)',
    panelAccent:    '#2D7A63',
    white:          '#FFFFFF',

    formBg:         '#EAEEED',
    cardBg:         '#FFFFFF',
    inputBg:        '#FDFDFD',
    inputBorder:    '#B0BAB6',
    inputFocus:     '#1C5C4A',

    heading:        '#1A2B28',
    label:          '#2C3E3A',
    muted:          '#6B807A',
    placeholder:    '#94A8A3',

    btnBg:          '#1C5C4A',
    btnText:        '#FFFFFF',

    errBg:          'rgba(192,57,43,0.06)',
    errBorder:      'rgba(192,57,43,0.22)',
    errText:        '#B83A2E',

    rule:           '#C4CCCA',
    ruleStrong:     '#A8B3AE',
    footerText:     '#7E918C',
    stripBg:        '#1A2E29',
    stripBorder:    '#233D36',
    stripText:      'rgba(255,255,255,0.50)',
    stripHi:        '#3CB88E',
};

const MODULES = [
    { label: 'POS Billing' },
    { label: 'Inventory' },
    { label: 'Customers' },
    { label: 'Reports' },
    { label: 'Settings' },
    { label: 'Invoicing' },
    { label: 'Purchase' },
    { label: 'Returns' },
];

export default function LoginScreen({ navigation }) {
    const { signIn } = React.useContext(AuthContext);
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [focusedInput, setFocusedInput] = useState(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const passwordRef = useRef(null);

    const r = useResponsive();
    const isWide = !r.isSmall;

    useEffect(() => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            document.title = 'Login — MediX POS';
        }
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, []);

    const validateForm = useCallback(() => {
        let ok = true;
        if (!phone.trim()) { setPhoneError('Required'); ok = false; } else { setPhoneError(''); }
        if (!password.trim()) { setPasswordError('Required'); ok = false; } else { setPasswordError(''); }
        return ok;
    }, [phone, password]);

    const handleAuth = useCallback(async () => {
        if (!validateForm()) return;
        setLoading(true);
        setError('');
        try {
            const response = await loginUser({ phone, password });
            if (response?.token) {
                try {
                    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
                        window.sessionStorage.setItem('medix_just_logged_in', 'true');
                    } else {
                        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                        await AsyncStorage.setItem('medix_just_logged_in', 'true');
                    }
                } catch (e) { console.warn('Failed to set login flag:', e); }
                await signIn(response.token, response.user?.storeId);
            } else {
                setError('Authentication failed. Verify credentials.');
            }
        } catch (err) {
            setError(err.message || 'Login failed. Try again.');
        } finally {
            setLoading(false);
        }
    }, [phone, password, validateForm, signIn]);

    const onPhoneChange = useCallback((v) => {
        setPhone(v); if (phoneError) setPhoneError(''); if (error) setError('');
    }, [phoneError, error]);

    const onPassChange = useCallback((v) => {
        setPassword(v); if (passwordError) setPasswordError(''); if (error) setError('');
    }, [passwordError, error]);

    // ─── TOP UTILITY STRIP ────────────────────────────────────────────────────
    const renderStrip = () => (
        <View style={s.strip}>
            <Text style={s.stripLabel}>LICENSED COPY</Text>
            <Text style={s.stripSep}>│</Text>
            <View style={s.stripDot} />
            <Text style={s.stripOnline}>ONLINE</Text>
            <Text style={s.stripSep}>│</Text>
            <Text style={s.stripLabel}>BUILD v1.0</Text>
            <View style={{ flex: 1 }} />
            <Text style={s.stripLabel}>MediX POS & ERP</Text>
        </View>
    );

    // ─── LEFT PANEL ───────────────────────────────────────────────────────────
    const renderLeft = () => (
        <View style={s.left}>
            {/* Brand */}
            <View style={s.brand}>
                <Image
                    source={require('../../assets/icon.png')}
                    style={s.brandIcon}
                    resizeMode="contain"
                />
                <View>
                    <Text style={s.brandName}>
                        Medi<Text style={s.brandX}>X</Text>
                    </Text>
                    <Text style={s.brandSub}>POS & ERP</Text>
                </View>
            </View>

            <View style={s.rule} />

            {/* Modules */}
            <Text style={s.sectionHead}>MODULES</Text>
            <View style={s.moduleList}>
                {MODULES.map((m, i) => (
                    <View key={i} style={s.moduleItem}>
                        <Text style={s.moduleBullet}>›</Text>
                        <Text style={s.moduleLabel}>{m.label}</Text>
                    </View>
                ))}
            </View>

            <View style={s.rule} />

            {/* Sys info */}
            <Text style={s.sectionHead}>SYSTEM</Text>
            <View style={s.sysBlock}>
                <SysRow k="Platform" v="Web / Tablet" />
                <SysRow k="Database" v="Cloud" />
                <SysRow k="Encryption" v="AES-256" />
                <SysRow k="Version" v="1.0.0" />
            </View>

            {/* Footer */}
            <View style={s.leftFoot}>
                <View style={s.statusDot} />
                <Text style={s.leftFootText}>Online</Text>
                <Text style={[s.leftFootText, { marginLeft: 'auto', color: T.panelDim }]}>© 2026 MediX</Text>
            </View>
        </View>
    );

    // ─── RIGHT PANEL ──────────────────────────────────────────────────────────
    const renderRight = () => (
        <Animated.View style={[s.right, { opacity: fadeAnim }]}>
            <ScrollView
                contentContainerStyle={s.formArea}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {!isWide && (
                    <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 12 }}>
                        <Image source={require('../../assets/icon.png')} style={{ width: 48, height: 48, marginBottom: 8 }} resizeMode="contain" />
                        <Text style={{ fontSize: 24, fontWeight: '700', color: T.heading }}>Medi<Text style={{ color: T.panelAccent }}>X</Text></Text>
                        <Text style={{ fontSize: 10, color: T.muted, letterSpacing: 2 }}>POS & ERP</Text>
                    </View>
                )}

                {/* Form title */}
                <View style={s.formHeader}>
                    <Text style={s.formTitle}>▸ User Login</Text>
                </View>

                <View style={s.card}>
                    {/* Error */}
                    {error ? (
                        <View style={s.errBar}>
                            <Text style={s.errMark}>!</Text>
                            <Text style={s.errText}>{error}</Text>
                        </View>
                    ) : null}

                    {/* Phone */}
                    <View style={s.field}>
                        <Text style={s.fieldLabel}>Phone No. <Text style={s.req}>*</Text></Text>
                        <View style={[
                            s.inputRow,
                            focusedInput === 'phone' && s.inputRowFocus,
                            phoneError ? s.inputRowErr : null,
                        ]}>
                            <TextInput
                                style={s.input}
                                placeholder="Phone number"
                                placeholderTextColor={T.placeholder}
                                value={phone}
                                onChangeText={onPhoneChange}
                                keyboardType="phone-pad"
                                autoCapitalize="none"
                                autoCorrect={false}
                                onFocus={() => setFocusedInput('phone')}
                                onBlur={() => setFocusedInput(null)}
                                returnKeyType="next"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </View>
                        {phoneError ? <Text style={s.fieldErr}>{phoneError}</Text> : null}
                    </View>

                    {/* Password */}
                    <View style={s.field}>
                        <View style={s.labelRow}>
                            <Text style={s.fieldLabel}>Password <Text style={s.req}>*</Text></Text>
                            <TouchableOpacity
                                onPress={() => navigation?.navigate('ForgotPassword')}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                                <Text style={s.forgotLink}>Reset</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[
                            s.inputRow,
                            focusedInput === 'pass' && s.inputRowFocus,
                            passwordError ? s.inputRowErr : null,
                        ]}>
                            <TextInput
                                ref={passwordRef}
                                style={s.input}
                                placeholder="Password"
                                placeholderTextColor={T.placeholder}
                                value={password}
                                onChangeText={onPassChange}
                                secureTextEntry={!showPassword}
                                onFocus={() => setFocusedInput('pass')}
                                onBlur={() => setFocusedInput(null)}
                                onSubmitEditing={handleAuth}
                                returnKeyType="go"
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                style={s.eyeBtn}
                            >
                                <Text style={s.eyeLabel}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
                            </TouchableOpacity>
                        </View>
                        {passwordError ? <Text style={s.fieldErr}>{passwordError}</Text> : null}
                    </View>

                    <View style={s.cardDivider} />

                    {/* Submit */}
                    <TouchableOpacity
                        style={[s.submitBtn, loading && s.submitBtnOff]}
                        onPress={handleAuth}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        <Text style={s.submitText}>{loading ? 'SIGNING IN...' : 'LOGIN'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Session info */}
                <Text style={s.sessionInfo}>Secure session · Auto-logout: 30 min</Text>
            </ScrollView>

            {/* Footer */}
            <View style={s.rightFoot}>
                <Text style={s.footText}>MediX POS</Text>
                <Text style={s.footSep}>│</Text>
                <Text style={s.footText}>v1.0.0</Text>
                <Text style={s.footSep}>│</Text>
                <Text style={s.footText}>Support: 1800-123-4567</Text>
            </View>
        </Animated.View>
    );

    // ─── RENDER ───────────────────────────────────────────────────────────────
    if (isWide) {
        return (
            <View style={s.root}>
                {renderStrip()}
                <View style={s.split}>
                    {renderLeft()}
                    <KeyboardAvoidingView behavior="height" style={s.flex1}>
                        {renderRight()}
                    </KeyboardAvoidingView>
                </View>
            </View>
        );
    }

    return (
        <View style={s.root}>
            {renderStrip()}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[s.flex1, { backgroundColor: T.formBg }]}
            >
                {renderRight()}
            </KeyboardAvoidingView>
        </View>
    );
}

// Tiny helper
const SysRow = ({ k, v }) => (
    <View style={s.sysRow}>
        <Text style={s.sysKey}>{k}</Text>
        <Text style={s.sysVal}>{v}</Text>
    </View>
);

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: T.panelBg },
    split: { flex: 1, flexDirection: 'row' },
    flex1: { flex: 1 },

    // ── TOP STRIP ──────────────────────────────────────────────────────────
    strip: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 22,
        backgroundColor: T.stripBg,
        borderBottomWidth: 1,
        borderBottomColor: T.stripBorder,
        paddingHorizontal: 10,
        gap: 6,
    },
    stripLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: T.stripText,
        letterSpacing: 0.8,
    },
    stripSep: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.12)',
    },
    stripDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: T.stripHi,
    },
    stripOnline: {
        fontSize: 9,
        fontWeight: '700',
        color: T.stripHi,
        letterSpacing: 0.5,
    },

    // ── LEFT PANEL ─────────────────────────────────────────────────────────
    left: {
        width: 260,
        backgroundColor: T.panelBg,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
        borderRightWidth: 1,
        borderRightColor: T.panelBorder,
    },
    brand: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    brandIcon: {
        width: 26,
        height: 26,
        marginRight: 8,
    },
    brandName: {
        fontSize: 18,
        fontWeight: '700',
        color: T.white,
        letterSpacing: -0.3,
    },
    brandX: {
        color: T.panelAccent,
    },
    brandSub: {
        fontSize: 8.5,
        fontWeight: '600',
        color: T.panelMuted,
        letterSpacing: 2,
        marginTop: 0,
    },
    rule: {
        height: 1,
        backgroundColor: T.panelBorder,
        marginVertical: 10,
    },
    sectionHead: {
        fontSize: 8.5,
        fontWeight: '700',
        color: T.panelMuted,
        letterSpacing: 1.8,
        marginBottom: 6,
    },
    moduleList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    moduleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '50%',
        paddingVertical: 2,
    },
    moduleBullet: {
        fontSize: 11,
        color: T.panelAccent,
        marginRight: 5,
        fontWeight: '700',
    },
    moduleLabel: {
        fontSize: 10.5,
        color: T.panelDim,
        fontWeight: '500',
    },
    sysBlock: {
        gap: 3,
    },
    sysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sysKey: {
        fontSize: 10,
        color: T.panelMuted,
        fontWeight: '500',
    },
    sysVal: {
        fontSize: 10,
        color: T.panelDim,
        fontWeight: '400',
    },
    leftFoot: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 'auto',
        paddingTop: 8,
    },
    statusDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: T.panelAccent,
        marginRight: 5,
    },
    leftFootText: {
        fontSize: 9,
        color: T.panelMuted,
        fontWeight: '500',
    },

    // ── RIGHT PANEL ────────────────────────────────────────────────────────
    right: {
        flex: 1,
        backgroundColor: T.formBg,
        justifyContent: 'center',
    },
    formArea: {
        paddingLeft: 24,
        paddingRight: 24,
        paddingTop: 16,
        paddingBottom: 12,
        maxWidth: 360,
        width: '100%',
        alignSelf: 'center',
    },
    formHeader: {
        marginBottom: 8,
    },
    formTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: T.heading,
        letterSpacing: 0,
    },

    // Card
    card: {
        backgroundColor: T.cardBg,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: T.ruleStrong,
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 14,
    },

    // Error
    errBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.errBg,
        borderWidth: 1,
        borderColor: T.errBorder,
        borderRadius: 1,
        paddingVertical: 5,
        paddingHorizontal: 8,
        marginBottom: 10,
        gap: 6,
    },
    errMark: {
        fontSize: 10,
        fontWeight: '800',
        color: T.errText,
        width: 14,
        textAlign: 'center',
    },
    errText: {
        color: T.errText,
        fontSize: 11,
        fontWeight: '500',
        flex: 1,
    },

    // Fields
    field: {
        marginBottom: 10,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    fieldLabel: {
        fontSize: 10.5,
        fontWeight: '600',
        color: T.label,
        marginBottom: 3,
        letterSpacing: 0.2,
    },
    req: {
        color: T.errText,
        fontWeight: '400',
    },
    forgotLink: {
        fontSize: 10,
        fontWeight: '600',
        color: T.btnBg,
        marginBottom: 3,
        textDecorationLine: 'underline',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.inputBg,
        borderWidth: 1,
        borderColor: T.inputBorder,
        borderRadius: 2,
        height: 36,
        paddingHorizontal: 8,
    },
    inputRowFocus: {
        borderColor: T.inputFocus,
        borderWidth: 1.5,
    },
    inputRowErr: {
        borderColor: T.errText,
    },
    input: {
        flex: 1,
        fontSize: 12.5,
        color: T.heading,
        paddingVertical: 0,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
    },
    eyeBtn: {
        paddingLeft: 6,
        paddingVertical: 2,
    },
    eyeLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: T.muted,
        letterSpacing: 0.5,
    },
    fieldErr: {
        fontSize: 10,
        color: T.errText,
        fontWeight: '500',
        marginTop: 2,
    },
    cardDivider: {
        height: 1,
        backgroundColor: T.rule,
        marginVertical: 10,
    },

    // Submit
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.btnBg,
        borderRadius: 2,
        height: 34,
        borderWidth: 1,
        borderColor: '#164A3B',
    },
    submitBtnOff: {
        opacity: 0.5,
    },
    submitText: {
        color: T.btnText,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
    },

    // Session info
    sessionInfo: {
        fontSize: 9.5,
        color: T.footerText,
        marginTop: 8,
    },

    // Footer
    rightFoot: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: T.ruleStrong,
        gap: 8,
    },
    footText: {
        fontSize: 9.5,
        color: T.footerText,
        fontWeight: '500',
    },
    footSep: {
        fontSize: 9,
        color: T.rule,
    },
});