import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../../../core/constants/theme';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE; // 400
const TICK_RATE = 120; // ms per frame

const DIRECTIONS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
};

const playSound = (type) => {
    if (Platform.OS !== 'web') return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'eat') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'crash') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.25);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        }
    } catch (e) { /* ignore */ }
};

const getRandomFood = (snake) => {
    let pos;
    do {
        pos = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
        };
    } while (snake.some(seg => seg.x === pos.x && seg.y === pos.y));
    return pos;
};

const SnakeGame = () => {
    const [gameState, setGameState] = useState('START'); // START, PLAYING, GAME_OVER
    const [score, setScore] = useState(0);
    const [renderTick, setRenderTick] = useState(0);

    const snake = useRef([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
    const direction = useRef(DIRECTIONS.RIGHT);
    const nextDirection = useRef(DIRECTIONS.RIGHT);
    const food = useRef(getRandomFood(snake.current));
    const scoreRef = useRef(0);
    const intervalRef = useRef(null);

    const { width: windowWidth } = useWindowDimensions();
    const containerWidth = Math.min(CANVAS_SIZE + 40, windowWidth - 40);
    const scaleFactor = Math.min(1, (containerWidth - 40) / CANVAS_SIZE);

    const initGame = () => {
        snake.current = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        direction.current = DIRECTIONS.RIGHT;
        nextDirection.current = DIRECTIONS.RIGHT;
        food.current = getRandomFood(snake.current);
        scoreRef.current = 0;
        setScore(0);
    };

    const tick = useCallback(() => {
        direction.current = nextDirection.current;
        const head = snake.current[0];
        const newHead = {
            x: head.x + direction.current.x,
            y: head.y + direction.current.y,
        };

        // Wall collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
            playSound('crash');
            setScore(scoreRef.current);
            setGameState('GAME_OVER');
            return;
        }

        // Self collision
        if (snake.current.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
            playSound('crash');
            setScore(scoreRef.current);
            setGameState('GAME_OVER');
            return;
        }

        const newSnake = [newHead, ...snake.current];

        // Eat food
        if (newHead.x === food.current.x && newHead.y === food.current.y) {
            scoreRef.current += 10;
            playSound('eat');
            food.current = getRandomFood(newSnake);
        } else {
            newSnake.pop();
        }

        snake.current = newSnake;
        setRenderTick(t => t + 1);
    }, []);

    useEffect(() => {
        if (gameState === 'PLAYING') {
            intervalRef.current = setInterval(tick, TICK_RATE);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [gameState, tick]);

    // Keyboard controls
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const handleKey = (e) => {
            if (gameState === 'START' || gameState === 'GAME_OVER') {
                if (e.key === ' ' || e.key === 'Enter') {
                    initGame();
                    setGameState('PLAYING');
                    return;
                }
            }
            const dir = direction.current;
            if ((e.key === 'ArrowUp' || e.key === 'w') && dir !== DIRECTIONS.DOWN) {
                nextDirection.current = DIRECTIONS.UP;
            } else if ((e.key === 'ArrowDown' || e.key === 's') && dir !== DIRECTIONS.UP) {
                nextDirection.current = DIRECTIONS.DOWN;
            } else if ((e.key === 'ArrowLeft' || e.key === 'a') && dir !== DIRECTIONS.RIGHT) {
                nextDirection.current = DIRECTIONS.LEFT;
            } else if ((e.key === 'ArrowRight' || e.key === 'd') && dir !== DIRECTIONS.LEFT) {
                nextDirection.current = DIRECTIONS.RIGHT;
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [gameState]);

    const handleTap = () => {
        if (gameState === 'START' || gameState === 'GAME_OVER') {
            initGame();
            setGameState('PLAYING');
        }
    };

    const changeDirection = (newDir) => {
        const dir = direction.current;
        if (newDir === 'UP' && dir !== DIRECTIONS.DOWN) nextDirection.current = DIRECTIONS.UP;
        else if (newDir === 'DOWN' && dir !== DIRECTIONS.UP) nextDirection.current = DIRECTIONS.DOWN;
        else if (newDir === 'LEFT' && dir !== DIRECTIONS.RIGHT) nextDirection.current = DIRECTIONS.LEFT;
        else if (newDir === 'RIGHT' && dir !== DIRECTIONS.LEFT) nextDirection.current = DIRECTIONS.RIGHT;
    };

    return (
        <View style={[styles.container, { width: CANVAS_SIZE * scaleFactor + 40 }]}>
            <View style={[styles.wrapper, { transform: [{ scale: scaleFactor }] }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Snake</Text>
                    <Text style={styles.scoreText}>SCORE: {String(gameState === 'PLAYING' ? scoreRef.current : score).padStart(4, '0')}</Text>
                </View>

                {/* Game Grid */}
                <TouchableOpacity activeOpacity={1} onPress={handleTap} style={styles.gridContainer}>
                    <View style={styles.grid}>
                        {/* Food */}
                        <View style={[styles.food, {
                            left: food.current.x * CELL_SIZE,
                            top: food.current.y * CELL_SIZE,
                        }]}>
                            <Text style={{ fontSize: 16 }}>🍎</Text>
                        </View>

                        {/* Snake */}
                        {snake.current.map((seg, i) => (
                            <View key={i} style={[styles.snakeSegment, {
                                left: seg.x * CELL_SIZE,
                                top: seg.y * CELL_SIZE,
                                backgroundColor: i === 0 ? '#16A34A' : '#22C55E',
                                borderRadius: i === 0 ? 6 : 4,
                                width: CELL_SIZE - 1,
                                height: CELL_SIZE - 1,
                            }]} />
                        ))}

                        {/* Overlay */}
                        {gameState === 'START' && (
                            <View style={styles.overlay}>
                                <Text style={styles.overlayTitle}>🐍 Snake</Text>
                                <Text style={styles.overlaySubtitle}>Tap to Start • Use Arrow Keys or D-Pad</Text>
                            </View>
                        )}

                        {gameState === 'GAME_OVER' && (
                            <View style={styles.overlay}>
                                <Text style={styles.gameOverText}>G A M E   O V E R</Text>
                                <Text style={styles.finalScore}>Score: {score}</Text>
                                <View style={styles.restartIcon}>
                                    <Text style={{ fontSize: 28 }}>🔄</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {/* D-Pad Controls */}
            {gameState === 'PLAYING' && (
                <View style={[styles.dpad, { transform: [{ scale: scaleFactor }] }]}>
                    <TouchableOpacity style={styles.dpadBtn} onPress={() => changeDirection('UP')}>
                        <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.dpadRow}>
                        <TouchableOpacity style={styles.dpadBtn} onPress={() => changeDirection('LEFT')}>
                            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.dpadCenter} />
                        <TouchableOpacity style={styles.dpadBtn} onPress={() => changeDirection('RIGHT')}>
                            <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.dpadBtn} onPress={() => changeDirection('DOWN')}>
                        <Ionicons name="arrow-down" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignSelf: 'center',
        alignItems: 'center',
    },
    wrapper: {
        width: CANVAS_SIZE + 40,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        transformOrigin: 'top center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    title: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scoreText: {
        fontSize: 16,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        color: '#475569',
        letterSpacing: 2,
    },
    gridContainer: {
        padding: 20,
        paddingTop: 0,
    },
    grid: {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        backgroundColor: '#1A2B28',
        borderRadius: 8,
        position: 'relative',
        overflow: 'hidden',
    },
    food: {
        position: 'absolute',
        width: CELL_SIZE,
        height: CELL_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    snakeSegment: {
        position: 'absolute',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(26, 43, 40, 0.85)',
    },
    overlayTitle: {
        fontFamily: FONTS.bold,
        fontSize: 28,
        color: '#FFFFFF',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    overlaySubtitle: {
        fontFamily: FONTS.regular,
        fontSize: 13,
        color: '#A0B2AD',
    },
    gameOverText: {
        fontFamily: FONTS.bold,
        fontSize: 24,
        color: '#FFFFFF',
        letterSpacing: 3,
        marginBottom: 8,
    },
    finalScore: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        color: '#4FA39A',
        marginBottom: 8,
    },
    restartIcon: {
        marginTop: 6,
        opacity: 0.8,
    },
    dpad: {
        alignItems: 'center',
        marginTop: 16,
        transformOrigin: 'top center',
    },
    dpadRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dpadBtn: {
        width: 48,
        height: 48,
        backgroundColor: '#2D3B38',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 3,
    },
    dpadCenter: {
        width: 48,
        height: 48,
        margin: 3,
    },
});

export default SnakeGame;
