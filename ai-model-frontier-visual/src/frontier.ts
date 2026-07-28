"use strict";

export interface FrontierPoint {
    name: string;
    cost: number;
    score: number;
    date: Date | null;
    onFrontier: boolean;
    selectionId: any;
    /** undefined when no cross-visual highlight is active; otherwise whether this point is part of it */
    highlighted?: boolean;
}

/**
 * Marks the non-dominated points (lowest cost for a given capability score,
 * or highest score for a given cost) and returns them in cost order so they
 * can be drawn as a step line.
 */
export function computeFrontier(points: FrontierPoint[]): FrontierPoint[] {
    const sorted = [...points].sort((a, b) => {
        if (a.cost !== b.cost) return a.cost - b.cost;
        return b.score - a.score;
    });

    let runningMaxScore = -Infinity;
    const frontier: FrontierPoint[] = [];

    for (const point of sorted) {
        if (point.score > runningMaxScore) {
            point.onFrontier = true;
            runningMaxScore = point.score;
            frontier.push(point);
        } else {
            point.onFrontier = false;
        }
    }

    return frontier;
}
