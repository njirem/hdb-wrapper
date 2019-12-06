'use strict';

module.exports = {
    clearMocks: true,
    restoreMocks: true,
    roots: ['src'],
    collectCoverage: true,
    collectCoverageFrom: ['src/**'],
    coveragePathIgnorePatterns: ['src/test'],
    coverageDirectory: 'coverage',
    coverageReporters: [
        'html',
        'text',
    ],
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    }
}