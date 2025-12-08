// Configuration Jest
module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['./tests/setup.js'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'server/**/*.js',
        '!server/config/database.js'
    ],
    testMatch: [
        '**/tests/**/*.test.js'
    ],
    verbose: true
};
