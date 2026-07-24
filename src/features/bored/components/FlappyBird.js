import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

const GRAVITY = 0.4;
const JUMP_STRENGTH = -6;
const PIPE_SPEED = 2;
const PIPE_WIDTH = 40;
const PIPE_GAP = 120;
const BIRD_SIZE = 30;
const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 300;

// Simple Web Audio API sound synthesizer (no assets required!)
const playSound = (type) => {
    if (Platform.OS !== 'web') return; // Fallback for native mobile

    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'jump') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'score') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.05); // quick pitch jump
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'crash') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) {
        // Ignore audio errors silently
    }
};

const FlappyBird = () => {
    const requestRef = useRef();
    const [gameState, setGameState] = useState('START'); // START, PLAYING, GAME_OVER
    const [score, setScore] = useState(0);

    // Use refs for physics to avoid dependency cycles in requestAnimationFrame
    const bird = useRef({ y: 150, velocity: 0 });
    const pipes = useRef([]);
    const frameCount = useRef(0);

    // We still need state to trigger React re-renders so the UI updates
    const [renderTick, setRenderTick] = useState(0);

    const initGame = () => {
        bird.current = { y: 150, velocity: 0 };
        pipes.current = [];
        frameCount.current = 0;
        setScore(0);
    };

    const jump = () => {
        if (gameState === 'START' || gameState === 'GAME_OVER') {
            initGame();
            setGameState('PLAYING');
        }
        bird.current.velocity = JUMP_STRENGTH;
        playSound('jump');
    };

    const updateGame = () => {
        if (gameState !== 'PLAYING') return;

        // Apply gravity
        bird.current.velocity += GRAVITY;
        bird.current.y += bird.current.velocity;

        // Spawn pipes
        if (frameCount.current % 80 === 0) {
            const minHeight = 40;
            const maxHeight = CANVAS_HEIGHT - PIPE_GAP - 40;
            const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

            pipes.current.push({
                x: CANVAS_WIDTH,
                topHeight,
                passed: false
            });
        }

        let newScore = score;
        let collision = false;

        // Move pipes and check collisions
        for (let i = 0; i < pipes.current.length; i++) {
            let p = pipes.current[i];
            p.x -= PIPE_SPEED;

            // Score point
            if (!p.passed && p.x + PIPE_WIDTH < 50) { // Bird is fixed at x=50
                p.passed = true;
                newScore += 1;
                playSound('score');
            }

            // Collision detection
            const bx = 50;
            const by = bird.current.y;
            const bw = BIRD_SIZE;
            const bh = BIRD_SIZE;

            const checkRectCollision = (rectX, rectY, rectW, rectH) => {
                return (bx < rectX + rectW && bx + bw > rectX && by < rectY + rectH && by + bh > rectY);
            };

            // Top pipe
            if (checkRectCollision(p.x, 0, PIPE_WIDTH, p.topHeight)) collision = true;
            // Bottom pipe
            if (checkRectCollision(p.x, p.topHeight + PIPE_GAP, PIPE_WIDTH, CANVAS_HEIGHT - (p.topHeight + PIPE_GAP))) collision = true;
        }

        if (newScore !== score) setScore(newScore);

        // Remove off-screen pipes
        if (pipes.current.length > 0 && pipes.current[0].x + PIPE_WIDTH < 0) {
            pipes.current.shift();
        }

        // Floor/Ceiling collision
        if (bird.current.y + BIRD_SIZE >= CANVAS_HEIGHT || bird.current.y <= 0) {
            collision = true;
        }

        if (collision) {
            playSound('crash');
            setGameState('GAME_OVER');
        }

        frameCount.current += 1;
        setRenderTick(t => t + 1); // trigger re-render
    };

    const gameLoop = () => {
        updateGame();
        requestRef.current = requestAnimationFrame(gameLoop);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(requestRef.current);
    }, [gameState]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.scoreText}>Score: {score}</Text>
            </View>

            <TouchableOpacity activeOpacity={1} onPress={jump} style={styles.gameArea}>
                {/* Pipes */}
                {pipes.current.map((p, i) => (
                    <React.Fragment key={i}>
                        {/* Top Pipe */}
                        <View style={[styles.pipe, { left: p.x, top: 0, height: p.topHeight }]}>
                            <View style={styles.crossH} /><View style={styles.crossV} />
                        </View>
                        {/* Bottom Pipe */}
                        <View style={[styles.pipe, { left: p.x, top: p.topHeight + PIPE_GAP, height: CANVAS_HEIGHT - (p.topHeight + PIPE_GAP) }]}>
                            <View style={styles.crossH} /><View style={styles.crossV} />
                        </View>
                    </React.Fragment>
                ))}

                {/* Bird */}
                <View style={[styles.bird, { top: bird.current.y }]}>
                    <Text style={{ fontSize: BIRD_SIZE - 4, transform: [{ scaleX: -1 }] }}>🐦</Text>
                </View>

                {/* Overlays */}
                {gameState === 'START' && (
                    <View style={styles.overlay}>
                        <Text style={styles.overlayTitle}>Tap to play</Text>
                    </View>
                )}

                {gameState === 'GAME_OVER' && (
                    <View style={[styles.overlay, { backgroundColor: 'rgba(255, 0, 0, 0.2)' }]}>
                        <Text style={[styles.overlayTitle, { color: '#d32f2f' }]}>CRASHED!</Text>
                        <Text style={styles.overlaySubtitle}>Tap to restart</Text>
                    </View>
                )}
            </TouchableOpacity>
            <View style={{ padding: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>Play this game while we getting your bill details.</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: CANVAS_WIDTH,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#eee',
    },
    header: {
        backgroundColor: '#f5f5f5',
        padding: 8,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    scoreText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    gameArea: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: '#e0f7fa',
        position: 'relative',
        overflow: 'hidden',
    },
    bird: {
        position: 'absolute',
        left: 50,
        width: BIRD_SIZE,
        height: BIRD_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pipe: {
        position: 'absolute',
        width: PIPE_WIDTH,
        backgroundColor: '#4caf50',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#388e3c',
    },
    crossH: {
        position: 'absolute',
        width: 14,
        height: 6,
        backgroundColor: '#fff',
        borderRadius: 2,
    },
    crossV: {
        position: 'absolute',
        width: 6,
        height: 14,
        backgroundColor: '#fff',
        borderRadius: 2,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    overlaySubtitle: {
        fontSize: 16,
        color: '#333',
    }
});

export default FlappyBird;
