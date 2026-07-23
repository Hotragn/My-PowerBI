import { computeFrontier, FrontierPoint } from "./frontier";

function point(name: string, cost: number, score: number): FrontierPoint {
    return { name, cost, score, date: null, onFrontier: false, selectionId: name };
}

describe("computeFrontier", () => {
    it("returns an empty frontier for no points", () => {
        expect(computeFrontier([])).toEqual([]);
    });

    it("keeps a single point on the frontier", () => {
        const points = [point("A", 10, 50)];
        const frontier = computeFrontier(points);
        expect(frontier).toEqual([points[0]]);
        expect(points[0].onFrontier).toBe(true);
    });

    it("excludes a point that is strictly dominated on both axes", () => {
        const cheaperAndBetter = point("A", 5, 80);
        const dominated = point("B", 10, 60);
        computeFrontier([cheaperAndBetter, dominated]);

        expect(cheaperAndBetter.onFrontier).toBe(true);
        expect(dominated.onFrontier).toBe(false);
    });

    it("keeps points that trade off cost against score", () => {
        const cheapAndWeak = point("Budget", 1, 40);
        const midRange = point("Mid", 5, 70);
        const expensiveAndStrong = point("Flagship", 20, 90);
        const frontier = computeFrontier([expensiveAndStrong, cheapAndWeak, midRange]);

        expect(frontier.map(p => p.name).sort()).toEqual(["Budget", "Flagship", "Mid"]);
    });

    it("breaks cost ties by keeping only the higher score", () => {
        const higherScore = point("A", 10, 80);
        const lowerScoreSameCost = point("B", 10, 60);
        computeFrontier([lowerScoreSameCost, higherScore]);

        expect(higherScore.onFrontier).toBe(true);
        expect(lowerScoreSameCost.onFrontier).toBe(false);
    });

    it("does not mutate the input array order", () => {
        const points = [point("A", 10, 50), point("B", 1, 10)];
        const original = [...points];
        computeFrontier(points);
        expect(points).toEqual(original);
    });
});
