import React from 'react';
/**
 * Debug Utilities for catching UI glitches, rendering issues, conflicts, and mismatches
 * Enable/disable via __DEV__ flag or environment variable
 */
// Debug configuration
export const DEBUG_CONFIG = {
    // Enable different debug features
    ENABLE_RENDER_TRACKING: __DEV__,
    ENABLE_ANIMATION_DEBUG: __DEV__,
    ENABLE_LAYOUT_DEBUG: __DEV__,
    ENABLE_PERFORMANCE_MONITORING: __DEV__,
    ENABLE_STATE_TRACKING: __DEV__,
    // Performance thresholds (ms)
    SLOW_RENDER_THRESHOLD: 16, // 60fps = 16ms per frame
    VERY_SLOW_RENDER_THRESHOLD: 32,
    // Layout conflict detection
    DETECT_LAYOUT_CONFLICTS: __DEV__,
    DETECT_ANIMATION_CONFLICTS: __DEV__,
};
// Color codes for console logging
const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};
/**
 * Render Tracker - Detects excessive re-renders and performance issues
 */
export class RenderTracker {
    componentRenderCounts = new Map();
    componentRenderTimes = new Map();
    lastRenderTime = new Map();
    trackRender(componentName, props) {
        if (!DEBUG_CONFIG.ENABLE_RENDER_TRACKING)
            return;
        const now = Date.now();
        const count = (this.componentRenderCounts.get(componentName) || 0) + 1;
        this.componentRenderCounts.set(componentName, count);
        // Track render timing
        const lastTime = this.lastRenderTime.get(componentName);
        if (lastTime) {
            const renderDuration = now - lastTime;
            const times = this.componentRenderTimes.get(componentName) || [];
            times.push(renderDuration);
            this.componentRenderTimes.set(componentName, times);
            // Warn on slow renders
            if (renderDuration > DEBUG_CONFIG.VERY_SLOW_RENDER_THRESHOLD) {
                console.warn(`${COLORS.red}[SLOW RENDER]${COLORS.reset} ${componentName} took ${renderDuration}ms to render (threshold: ${DEBUG_CONFIG.VERY_SLOW_RENDER_THRESHOLD}ms)`);
            }
            else if (renderDuration > DEBUG_CONFIG.SLOW_RENDER_THRESHOLD) {
                console.log(`${COLORS.yellow}[Render Warning]${COLORS.reset} ${componentName} took ${renderDuration}ms`);
            }
        }
        this.lastRenderTime.set(componentName, now);
        // Warn on excessive re-renders
        if (count > 10 && count % 10 === 0) {
            console.warn(`${COLORS.red}[EXCESSIVE RENDERS]${COLORS.reset} ${componentName} has rendered ${count} times!`, props ? `Props: ${JSON.stringify(props, null, 2)}` : '');
        }
        if (count % 5 === 0) {
            console.log(`${COLORS.cyan}[Render Count]${COLORS.reset} ${componentName}: ${count} renders`);
        }
    }
    getStats(componentName) {
        if (componentName) {
            return {
                renderCount: this.componentRenderCounts.get(componentName) || 0,
                renderTimes: this.componentRenderTimes.get(componentName) || [],
            };
        }
        const stats = {};
        this.componentRenderCounts.forEach((count, name) => {
            stats[name] = {
                renderCount: count,
                renderTimes: this.componentRenderTimes.get(name) || [],
            };
        });
        return stats;
    }
    reset() {
        this.componentRenderCounts.clear();
        this.componentRenderTimes.clear();
        this.lastRenderTime.clear();
    }
    logSummary() {
        console.log(`\n${COLORS.blue}=== RENDER SUMMARY ===${COLORS.reset}`);
        this.componentRenderCounts.forEach((count, name) => {
            const times = this.componentRenderTimes.get(name) || [];
            const avgTime = times.length > 0
                ? times.reduce((a, b) => a + b, 0) / times.length
                : 0;
            console.log(`${name}: ${count} renders, avg: ${avgTime.toFixed(2)}ms`);
        });
        console.log(`${COLORS.blue}======================${COLORS.reset}\n`);
    }
}
/**
 * Animation Conflict Detector - Detects conflicting animations
 */
export class AnimationConflictDetector {
    activeAnimations = new Map();
    animationDrivers = new Map();
    registerAnimation(nodeId, animationName, useNativeDriver) {
        if (!DEBUG_CONFIG.DETECT_ANIMATION_CONFLICTS)
            return;
        // Track active animations
        if (!this.activeAnimations.has(nodeId)) {
            this.activeAnimations.set(nodeId, new Set());
        }
        this.activeAnimations.get(nodeId).add(animationName);
        // Track driver types
        if (!this.animationDrivers.has(nodeId)) {
            this.animationDrivers.set(nodeId, new Map());
        }
        this.animationDrivers.get(nodeId).set(animationName, useNativeDriver);
        // Check for conflicts
        this.detectConflict(nodeId);
    }
    unregisterAnimation(nodeId, animationName) {
        if (!DEBUG_CONFIG.DETECT_ANIMATION_CONFLICTS)
            return;
        this.activeAnimations.get(nodeId)?.delete(animationName);
        this.animationDrivers.get(nodeId)?.delete(animationName);
    }
    detectConflict(nodeId) {
        const drivers = this.animationDrivers.get(nodeId);
        if (!drivers || drivers.size <= 1)
            return;
        const driverTypes = new Set(Array.from(drivers.values()));
        if (driverTypes.size > 1) {
            console.error(`${COLORS.red}[ANIMATION CONFLICT]${COLORS.reset} Node ${nodeId} has mixed useNativeDriver animations!`, '\nAnimations:', Array.from(drivers.entries()).map(([name, isNative]) => `${name}: ${isNative ? 'native' : 'JS'}`));
        }
    }
    reset() {
        this.activeAnimations.clear();
        this.animationDrivers.clear();
    }
}
/**
 * Layout Conflict Detector - Detects layout thrashing and conflicts
 */
export class LayoutConflictDetector {
    layoutUpdates = new Map();
    layoutTimestamps = new Map();
    trackLayout(componentId, layout) {
        if (!DEBUG_CONFIG.DETECT_LAYOUT_CONFLICTS)
            return;
        const now = Date.now();
        const count = (this.layoutUpdates.get(componentId) || 0) + 1;
        this.layoutUpdates.set(componentId, count);
        // Track timestamps
        const timestamps = this.layoutTimestamps.get(componentId) || [];
        timestamps.push(now);
        this.layoutTimestamps.set(componentId, timestamps);
        // Detect layout thrashing (many updates in short time)
        const recentUpdates = timestamps.filter(t => now - t < 1000);
        if (recentUpdates.length > 10) {
            console.warn(`${COLORS.yellow}[LAYOUT THRASHING]${COLORS.reset} ${componentId} has ${recentUpdates.length} layout updates in last second!`, layout);
        }
        // Warn on suspicious layout values
        if (layout.width <= 0 || layout.height <= 0) {
            console.warn(`${COLORS.yellow}[INVALID LAYOUT]${COLORS.reset} ${componentId} has invalid dimensions:`, layout);
        }
    }
    reset() {
        this.layoutUpdates.clear();
        this.layoutTimestamps.clear();
    }
}
/**
 * State Mismatch Detector - Detects state/prop mismatches
 */
export class StateMismatchDetector {
    stateHistory = new Map();
    trackState(componentId, state, label) {
        if (!DEBUG_CONFIG.ENABLE_STATE_TRACKING)
            return;
        const history = this.stateHistory.get(componentId) || [];
        history.push({ state, label, timestamp: Date.now() });
        this.stateHistory.set(componentId, history);
        // Keep only last 20 entries
        if (history.length > 20) {
            history.shift();
        }
    }
    compareState(componentId, expected, actual, message) {
        if (!DEBUG_CONFIG.ENABLE_STATE_TRACKING)
            return;
        const isMatch = JSON.stringify(expected) === JSON.stringify(actual);
        if (!isMatch) {
            console.error(`${COLORS.red}[STATE MISMATCH]${COLORS.reset} ${componentId}${message ? `: ${message}` : ''}`, '\nExpected:', expected, '\nActual:', actual);
        }
    }
    reset() {
        this.stateHistory.clear();
    }
    getHistory(componentId) {
        return this.stateHistory.get(componentId) || [];
    }
}
/**
 * Performance Monitor - Tracks performance metrics
 */
export class PerformanceMonitor {
    marks = new Map();
    measures = new Map();
    start(label) {
        if (!DEBUG_CONFIG.ENABLE_PERFORMANCE_MONITORING)
            return;
        this.marks.set(label, Date.now());
    }
    end(label) {
        if (!DEBUG_CONFIG.ENABLE_PERFORMANCE_MONITORING)
            return;
        const startTime = this.marks.get(label);
        if (!startTime) {
            console.warn(`${COLORS.yellow}[Performance]${COLORS.reset} No start mark found for: ${label}`);
            return;
        }
        const duration = Date.now() - startTime;
        const durations = this.measures.get(label) || [];
        durations.push(duration);
        this.measures.set(label, durations);
        if (duration > 100) {
            console.warn(`${COLORS.yellow}[SLOW OPERATION]${COLORS.reset} ${label} took ${duration}ms`);
        }
        this.marks.delete(label);
    }
    getMetrics(label) {
        if (label) {
            const durations = this.measures.get(label) || [];
            return {
                count: durations.length,
                average: durations.reduce((a, b) => a + b, 0) / durations.length,
                min: Math.min(...durations),
                max: Math.max(...durations),
            };
        }
        const metrics = {};
        this.measures.forEach((durations, name) => {
            metrics[name] = {
                count: durations.length,
                average: durations.reduce((a, b) => a + b, 0) / durations.length,
                min: Math.min(...durations),
                max: Math.max(...durations),
            };
        });
        return metrics;
    }
    reset() {
        this.marks.clear();
        this.measures.clear();
    }
    logSummary() {
        console.log(`\n${COLORS.blue}=== PERFORMANCE SUMMARY ===${COLORS.reset}`);
        const metrics = this.getMetrics();
        Object.entries(metrics).forEach(([name, data]) => {
            console.log(`${name}: avg=${data.average.toFixed(2)}ms, min=${data.min}ms, max=${data.max}ms (${data.count} calls)`);
        });
        console.log(`${COLORS.blue}===========================${COLORS.reset}\n`);
    }
}
// Global instances
export const renderTracker = new RenderTracker();
export const animationConflictDetector = new AnimationConflictDetector();
export const layoutConflictDetector = new LayoutConflictDetector();
export const stateMismatchDetector = new StateMismatchDetector();
export const performanceMonitor = new PerformanceMonitor();
/**
 * React hook for tracking component renders
 */
export function useRenderTracking(componentName, props) {
    if (__DEV__) {
        renderTracker.trackRender(componentName, props);
    }
}
/**
 * HOC for tracking component renders
 */
export function withRenderTracking(Component, componentName) {
    const WithRenderTracking = (props) => {
        const name = componentName || Component.displayName || Component.name || 'Unknown';
        useRenderTracking(name, props);
        // Use createElement instead of JSX to avoid parser issues in some bundler contexts
        return React.createElement(Component, props);
    };
    WithRenderTracking.displayName = `WithRenderTracking(${componentName || Component.displayName || Component.name || 'Component'})`;
    return WithRenderTracking;
}
/**
 * Log all debug summaries
 */
export function logDebugSummary() {
    if (!__DEV__)
        return;
    console.log(`\n${COLORS.magenta}╔═══════════════════════════════════╗${COLORS.reset}`);
    console.log(`${COLORS.magenta}║     DEBUG SUMMARY REPORT          ║${COLORS.reset}`);
    console.log(`${COLORS.magenta}╚═══════════════════════════════════╝${COLORS.reset}\n`);
    renderTracker.logSummary();
    performanceMonitor.logSummary();
}
/**
 * Reset all debug trackers
 */
export function resetDebugTrackers() {
    renderTracker.reset();
    animationConflictDetector.reset();
    layoutConflictDetector.reset();
    stateMismatchDetector.reset();
    performanceMonitor.reset();
    console.log(`${COLORS.green}[Debug] All trackers reset${COLORS.reset}`);
}
// Export for use in __DEV__ environments
if (__DEV__) {
    // @ts-ignore - Attach to global for easy access in dev tools
    global.debugUtils = {
        renderTracker,
        animationConflictDetector,
        layoutConflictDetector,
        stateMismatchDetector,
        performanceMonitor,
        logSummary: logDebugSummary,
        reset: resetDebugTrackers,
        config: DEBUG_CONFIG,
    };
    console.log(`${COLORS.green}[Debug Utils] Enabled! Access via global.debugUtils${COLORS.reset}`);
}
