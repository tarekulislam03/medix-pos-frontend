import React, { useState, useEffect, useRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';
import GradientButton from '../components/GradientButton';
import { loginUser } from '../services/authService';
import { useResponsive } from '../utils/responsive';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
    const { signIn } = React.useContext(AuthContext);
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Inline field errors
    const [phoneError, setPhoneError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Focus state
    const [focusedInput, setFocusedInput] = useState(null);
    
    // Entrance animations
    const cardOpacity = useRef(new Animated.Value(0)).current;
    const cardTranslateY = useRef(new Animated.Value(15)).current;

    const r = useResponsive();

    useEffect(() => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            document.title = 'Sign In — MediX POS';
        }

        // Animated entrance
        Animated.parallel([
            Animated.timing(cardOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(cardTranslateY, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const validateForm = () => {
        let isValid = true;
        if (!phone.trim()) {
            setPhoneError('Phone number is required');
            isValid = false;
        } else {
            setPhoneError('');
        }

        if (!password.trim()) {
            setPasswordError('Password is required');
            isValid = false;
        } else {
            setPasswordError('');
        }

        return isValid;
    };

    const handleAuth = async () => {
        if (!validateForm()) return;

        setLoading(true);
        setError('');

        try {
            const response = await loginUser({ phone, password });

            if (response?.token) {
                await signIn(response.token, response.user?.storeId);
            } else {
                setError('Authentication failed. Please verify credentials.');
            }
        } catch (err) {
            setError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Responsive design values
    const cardWidth = r.pick({ small: '92%', medium: 390, large: 410, xlarge: 430 });
    const cardPadding = r.pick({ small: 18, medium: SPACING.xl, large: SPACING.xxl, xlarge: SPACING.xxl });
    const logoSize = r.pick({ small: 32, medium: 38, large: 42, xlarge: 44 });
    const inputHeight = r.pick({ small: 50, medium: 54, large: 56, xlarge: 58 });

    return (
        <LinearGradient
            colors={['#070D19', '#0B1528', '#070D19']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            {/* Modern subtle medical glow patterns (fixed background) */}
            <View style={styles.glowBlob1} />
            <View style={styles.glowBlob2} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View style={[styles.card, { width: cardWidth, padding: cardPadding, opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}>
                        {/* Subtle top progress/light streak */}
                        <LinearGradient
                            colors={['#4FA39A', '#7DC4BD', '#4FA39A']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.topStreak}
                        />

                        {/* Sleek Close Button */}
                        {navigation && navigation.canGoBack() && (
                            <TouchableOpacity 
                                style={styles.closeButton} 
                                onPress={() => navigation.goBack()}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <Feather name="x" size={16} color="rgba(255, 255, 255, 0.4)" />
                            </TouchableOpacity>
                        )}

                        {/* Logo & Typography Hierarchy (SaaS Identity Block) */}
                        <View style={styles.logoWrapper}>
                            <View style={[styles.logoGlow, { width: logoSize * 1.6, height: logoSize * 1.6, borderRadius: (logoSize * 1.6) / 2 }]} />
                            <Image
                                source={require('../../assets/icon.png')}
                                style={{ width: logoSize, height: logoSize }}
                                resizeMode="contain"
                            />
                        </View>

                        <Text style={styles.welcomeText}>WELCOME BACK</Text>
                        <Text style={[styles.brand, { fontSize: r.pick({ small: 26, medium: 28, large: 30, xlarge: 32 }) }]}>MediX</Text>
                        <Text style={styles.subtitle}>Sign in to your account</Text>

                        {/* Error Banner */}
                        {error ? (
                            <View style={styles.errorBox}>
                                <Feather name="alert-circle" size={14} color={COLORS.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Phone Input */}
                        <View style={styles.fieldContainer}>
                            <View style={[
                                styles.inputGroup,
                                { height: inputHeight },
                                focusedInput === 'phone' && styles.inputGroupFocused,
                                phoneError ? styles.inputGroupError : null
                            ]}>
                                <Feather name="phone" size={18} color={focusedInput === 'phone' ? '#4FA39A' : 'rgba(255, 255, 255, 0.3)'} style={styles.inputIcon} />
                                <View style={styles.inputContent}>
                                    {(phone.length > 0 || focusedInput === 'phone') && (
                                        <Text style={styles.floatingLabel}>Phone Number</Text>
                                    )}
                                    <TextInput
                                        style={[styles.input, (phone.length > 0 || focusedInput === 'phone') && styles.inputWithLabel]}
                                        placeholder={focusedInput === 'phone' ? '' : 'Phone Number'}
                                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                                        value={phone}
                                        onChangeText={(val) => {
                                            setPhone(val);
                                            if (phoneError) setPhoneError('');
                                        }}
                                        keyboardType="phone-pad"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        onFocus={() => setFocusedInput('phone')}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                </View>
                            </View>
                            {phoneError ? <Text style={styles.inlineErrorText}>{phoneError}</Text> : null}
                        </View>

                        {/* Password Input */}
                        <View style={styles.fieldContainer}>
                            <View style={[
                                styles.inputGroup,
                                { height: inputHeight },
                                focusedInput === 'password' && styles.inputGroupFocused,
                                passwordError ? styles.inputGroupError : null
                            ]}>
                                <Feather name="lock" size={18} color={focusedInput === 'password' ? '#4FA39A' : 'rgba(255, 255, 255, 0.3)'} style={styles.inputIcon} />
                                <View style={styles.inputContent}>
                                    {(password.length > 0 || focusedInput === 'password') && (
                                        <Text style={styles.floatingLabel}>Password</Text>
                                    )}
                                    <TextInput
                                        style={[styles.input, (password.length > 0 || focusedInput === 'password') && styles.inputWithLabel]}
                                        placeholder={focusedInput === 'password' ? '' : 'Password'}
                                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                                        value={password}
                                        onChangeText={(val) => {
                                            setPassword(val);
                                            if (passwordError) setPasswordError('');
                                        }}
                                        secureTextEntry={!showPassword}
                                        onFocus={() => setFocusedInput('password')}
                                        onBlur={() => setFocusedInput(null)}
                                        onSubmitEditing={handleAuth}
                                        returnKeyType="go"
                                    />
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Feather
                                        name={showPassword ? 'eye-off' : 'eye'}
                                        size={16}
                                        color="rgba(255, 255, 255, 0.4)"
                                    />
                                </TouchableOpacity>
                            </View>
                            {passwordError ? <Text style={styles.inlineErrorText}>{passwordError}</Text> : null}
                        </View>

            

                        {/* Premium CTA Button */}
                        <GradientButton
                            title="Sign In"
                            onPress={handleAuth}
                            loading={loading}
                            style={styles.authBtn}
                            icon={<Feather name="arrow-right" size={18} color={COLORS.white} />}
                        />


                        {/* Trust Indicators */}
                        <View style={styles.footerContainer}>
                            <Feather name="lock" size={12} color="#4FA39A" style={styles.footerIcon} />
                            <Text style={styles.footerText}>
                                Encrypted & Secure Login
                            </Text>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        paddingHorizontal: SPACING.md,
    },
    glowBlob1: {
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(79, 163, 154, 0.04)',
        filter: Platform.OS === 'web' ? 'blur(80px)' : undefined,
    },
    glowBlob2: {
        position: 'absolute',
        bottom: '25%',
        right: '15%',
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(45, 139, 131, 0.03)',
        filter: Platform.OS === 'web' ? 'blur(60px)' : undefined,
    },
    card: {
        backgroundColor: 'rgba(11, 21, 40, 0.75)',
        borderRadius: RADIUS.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        // Extreme Stripe/Linear-style deep glassmorphism shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.45,
        shadowRadius: 40,
        elevation: 24,
        overflow: 'hidden',
        backdropFilter: Platform.OS === 'web' ? 'blur(16px)' : undefined,
    },
    topStreak: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2.5,
    },
    closeButton: {
        position: 'absolute',
        top: 14,
        right: 14,
        padding: 4,
        borderRadius: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    logoWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        marginTop: 4,
    },
    logoGlow: {
        position: 'absolute',
        backgroundColor: 'rgba(79, 163, 154, 0.12)',
        filter: Platform.OS === 'web' ? 'blur(10px)' : undefined,
    },
    welcomeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#4FA39A',
        letterSpacing: 2,
        opacity: 0.85,
        marginBottom: 2,
        textAlign: 'center',
    },
    brand: {
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.8,
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12.5,
        color: 'rgba(255, 255, 255, 0.45)',
        marginBottom: SPACING.lg,
        fontWeight: '400',
        textAlign: 'center',
        letterSpacing: -0.1,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginBottom: SPACING.md,
        width: '100%',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.15)',
    },
    errorText: {
        color: '#FCA5A5',
        fontSize: 12,
        fontWeight: '500',
    },
    fieldContainer: {
        width: '100%',
        marginBottom: 12,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        paddingHorizontal: SPACING.md,
        width: '100%',
    },
    inputGroupFocused: {
        borderColor: 'rgba(79, 163, 154, 0.6)',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        // Glow effect
        shadowColor: '#4FA39A',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },
    inputGroupError: {
        borderColor: 'rgba(239, 68, 68, 0.5)',
    },
    inputIcon: {
        marginRight: 12,
    },
    inputContent: {
        flex: 1,
        justifyContent: 'center',
    },
    floatingLabel: {
        fontSize: 9,
        color: '#4FA39A',
        fontWeight: '600',
        marginBottom: -6,
        marginTop: 2,
        letterSpacing: 0.5,
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
        paddingVertical: 10,
        outlineStyle: 'none',
    },
    inputWithLabel: {
        fontSize: 13,
        paddingTop: 12,
        paddingBottom: 4,
    },
    inlineErrorText: {
        color: '#FCA5A5',
        fontSize: 11,
        marginTop: 4,
        marginLeft: 4,
        fontWeight: '500',
    },
    forgotPasswordBtn: {
        alignSelf: 'flex-end',
        marginBottom: SPACING.lg,
    },
    forgotPasswordText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        fontWeight: '500',
    },
    authBtn: {
        width: '100%',
        marginTop: SPACING.xs,
    },
    shortcutsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.lg,
        width: '100%',
    },
    shortcutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        gap: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.04)',
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
    },
    shortcutText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        fontWeight: '500',
    },
    shortcutDivider: {
        width: 1,
        height: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginHorizontal: SPACING.md,
    },
    footerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        opacity: 0.5,
    },
    footerIcon: {
        marginRight: 4,
    },
    footerText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
});
