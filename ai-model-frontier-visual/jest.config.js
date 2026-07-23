module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["<rootDir>/src/**/*.test.ts"],
    transform: {
        "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }]
    }
};
