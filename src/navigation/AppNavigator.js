import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import MainLayout from '../screens/MainLayout';
import { COLORS } from '../constants/theme';
import { loadStoredToken, setAuthToken, setStoreData, getStoreData } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [storeData, setStoreDataState] = useState(null);

    const authContext = {
        signIn: async (token, storeData) => {
            await setAuthToken(token);
            await setStoreData(storeData);
            if (storeData && typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem('medix_registered_store', JSON.stringify(storeData));
            }
            setStoreDataState(storeData);
            setIsAuthenticated(true);
        },
        signOut: async () => {
            await setAuthToken(null);
            await setStoreData(null);
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem('medix_registered_store');
            }
            setStoreDataState(null);
            setIsAuthenticated(false);
        },
        storeData
    };

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await loadStoredToken();
                const storedStoreData = await getStoreData();
                setStoreDataState(storedStoreData);
                setIsAuthenticated(!!token);
            } catch (e) {
                console.error('Initial auth check failed', e);
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDark }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <AuthContext.Provider value={authContext}>
            <NavigationContainer>
                <Stack.Navigator
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: COLORS.bgDark },
                        animation: 'fade',
                    }}
                >
                    {isAuthenticated ? (
                        <Stack.Screen name="Main" component={MainLayout} />
                    ) : (
                        <Stack.Screen name="Login" component={LoginScreen} />
                    )}
                </Stack.Navigator>
            </NavigationContainer>
        </AuthContext.Provider>
    );
}
