/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/tests/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
    moduleFileExtensions: ['ts', 'js', 'json'],
    // Cobertura centrada en los módulos de inserción de candidatos.
    // Se calcula solo al pasar --coverage; en `npm test` no penaliza.
    collectCoverageFrom: [
        'src/application/validator.ts',
        'src/application/services/candidateService.ts',
        'src/domain/models/Candidate.ts',
        'src/domain/models/Education.ts',
        'src/domain/models/WorkExperience.ts',
        'src/domain/models/Resume.ts',
        'src/routes/candidateRoutes.ts',
        'src/presentation/controllers/candidateController.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 75,
            lines: 75,
            statements: 75,
        },
    },
};
