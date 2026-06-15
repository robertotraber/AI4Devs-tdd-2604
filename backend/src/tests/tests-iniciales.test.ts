/**
 * Suite inicial de tests de inserción de candidatos (todo en un único fichero).
 *
 * Dos familias:
 *   1) Recepción/validación de los datos del formulario (validateCandidateData + API).
 *   2) Guardado en base de datos (modelos Prisma + orquestación del servicio).
 *
 * Estrategia de mocks: se mockea SOLO la frontera real (`@prisma/client`). El resto
 * (validator, modelos, servicio y ruta) se ejecuta de verdad, de modo que todos los
 * tests pueden convivir en un mismo fichero sin que sus mocks se pisen.
 */

import express from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Mock unificado de Prisma
// ---------------------------------------------------------------------------
const mockCandidateCreate = jest.fn();
const mockCandidateUpdate = jest.fn();
const mockCandidateFindUnique = jest.fn();
const mockEducationCreate = jest.fn();
const mockEducationUpdate = jest.fn();
const mockWorkExperienceCreate = jest.fn();
const mockWorkExperienceUpdate = jest.fn();
const mockResumeCreate = jest.fn();

// La transacción ejecuta el callback con el propio cliente mock (tx).
const mockTransaction = jest.fn(async (cb: any) => cb(mockPrismaClient));

const mockPrismaClient: any = {
    candidate: {
        create: mockCandidateCreate,
        update: mockCandidateUpdate,
        findUnique: mockCandidateFindUnique,
    },
    education: { create: mockEducationCreate, update: mockEducationUpdate },
    workExperience: { create: mockWorkExperienceCreate, update: mockWorkExperienceUpdate },
    resume: { create: mockResumeCreate },
    $transaction: (cb: any) => mockTransaction(cb),
};

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
    Prisma: {
        PrismaClientInitializationError: class extends Error {},
    },
}));

import { validateCandidateData } from '../application/validator';
import { addCandidate } from '../application/services/candidateService';
import { Candidate } from '../domain/models/Candidate';
import { Education } from '../domain/models/Education';
import { WorkExperience } from '../domain/models/WorkExperience';
import { Resume } from '../domain/models/Resume';
import candidateRoutes from '../routes/candidateRoutes';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const validCandidatePayload = {
    firstName: 'Albert',
    lastName: 'Saelices',
    email: 'albert.saelices@gmail.com',
    phone: '656874937',
    address: 'Calle Sant Dalmir 2, 5ºB. Barcelona',
    educations: [
        { institution: 'UC3M', title: 'Computer Science', startDate: '2006-12-31', endDate: '2010-12-26' },
    ],
    workExperiences: [
        { company: 'Coca Cola', position: 'SWE', description: 'Backend development', startDate: '2011-01-13', endDate: '2013-01-17' },
    ],
    cv: { filePath: 'uploads/1715760936750-cv.pdf', fileType: 'application/pdf' },
};

const minimalValidCandidatePayload = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
};

beforeEach(() => {
    // Reseteamos implementación + llamadas y fijamos valores por defecto.
    mockCandidateCreate.mockReset().mockResolvedValue({
        id: 1,
        firstName: validCandidatePayload.firstName,
        lastName: validCandidatePayload.lastName,
        email: validCandidatePayload.email,
    });
    mockCandidateUpdate.mockReset();
    mockCandidateFindUnique.mockReset();
    mockEducationCreate.mockReset().mockResolvedValue({ id: 10 });
    mockEducationUpdate.mockReset();
    mockWorkExperienceCreate.mockReset().mockResolvedValue({ id: 20 });
    mockWorkExperienceUpdate.mockReset();
    mockResumeCreate.mockReset().mockResolvedValue({ id: 30 });
    mockTransaction.mockClear().mockImplementation(async (cb: any) => cb(mockPrismaClient));
});

// ===========================================================================
// FAMILIA 1 — Recepción / validación del formulario
// ===========================================================================
describe('validateCandidateData — recepción del formulario', () => {
    describe('cuando los datos son válidos', () => {
        it('acepta un payload completo sin lanzar', () => {
            expect(() => validateCandidateData({ ...validCandidatePayload })).not.toThrow();
        });

        it('acepta un payload mínimo con solo los campos obligatorios', () => {
            expect(() => validateCandidateData({ ...minimalValidCandidatePayload })).not.toThrow();
        });

        it('omite la validación obligatoria al editar (id presente)', () => {
            expect(() => validateCandidateData({ id: 1, email: 'not-an-email' })).not.toThrow();
        });

        // Análisis de valores límite (BVA): los extremos válidos deben aceptarse
        test.each([
            ['longitud mínima (2 chars)', 'Al'],
            ['longitud máxima (100 chars)', 'a'.repeat(100)],
            ['acentos y ñ', 'Begoña Núñez'],
        ])('acepta firstName con %s', (_label, firstName) => {
            expect(() => validateCandidateData({ ...minimalValidCandidatePayload, firstName })).not.toThrow();
        });

        it('acepta un candidato sin teléfono (campo opcional)', () => {
            const { firstName, lastName, email } = minimalValidCandidatePayload;
            expect(() => validateCandidateData({ firstName, lastName, email })).not.toThrow();
        });

        it('acepta un cv vacío (aún sin CV subido)', () => {
            expect(() => validateCandidateData({ ...minimalValidCandidatePayload, cv: {} })).not.toThrow();
        });

        it('acepta un título de educación de hasta 250 chars (schema VarChar(250))', () => {
            const payload = {
                ...minimalValidCandidatePayload,
                educations: [{ institution: 'UC3M', title: 'a'.repeat(250), startDate: '2006-12-31' }],
            };
            expect(() => validateCandidateData(payload)).not.toThrow();
        });
    });

    describe('cuando los datos de identidad son inválidos', () => {
        test.each([
            ['', 'Invalid name'],
            ['A', 'Invalid name'],
            ['John123', 'Invalid name'],
            ['a'.repeat(101), 'Invalid name'],
        ])('rechaza firstName "%s" con "%s"', (firstName, expectedError) => {
            expect(() => validateCandidateData({ ...minimalValidCandidatePayload, firstName })).toThrow(expectedError);
        });

        test.each([
            ['', 'Invalid name'],
            ['B', 'Invalid name'],
            ['Smith2', 'Invalid name'],
            ['a'.repeat(101), 'Invalid name'],
        ])('rechaza lastName "%s" con "%s"', (lastName, expectedError) => {
            expect(() => validateCandidateData({ ...minimalValidCandidatePayload, lastName })).toThrow(expectedError);
        });

        test.each([
            ['not-an-email', 'Invalid email'],
            ['', 'Invalid email'],
            ['user@', 'Invalid email'],
            [`${'a'.repeat(250)}@example.com`, 'Invalid email'],
        ])('rechaza email "%s" con "%s"', (email, expectedError) => {
            expect(() => validateCandidateData({ ...minimalValidCandidatePayload, email })).toThrow(expectedError);
        });

        test.each([
            ['123456789', 'Invalid phone'],
            ['512345678', 'Invalid phone'],
            ['61234567', 'Invalid phone'],
        ])('rechaza phone "%s" con "%s"', (phone, expectedError) => {
            expect(() => validateCandidateData({ ...minimalValidCandidatePayload, phone })).toThrow(expectedError);
        });

        it('rechaza una dirección de más de 100 caracteres', () => {
            expect(() => validateCandidateData({ ...minimalValidCandidatePayload, address: 'a'.repeat(101) })).toThrow('Invalid address');
        });
    });

    describe('cuando los datos anidados son inválidos', () => {
        it('rechaza educación con institución inválida', () => {
            const payload = {
                ...minimalValidCandidatePayload,
                educations: [{ institution: '', title: 'Computer Science', startDate: '2006-12-31' }],
            };
            expect(() => validateCandidateData(payload)).toThrow('Invalid institution');
        });

        it('rechaza experiencia con startDate mal formada', () => {
            const payload = {
                ...minimalValidCandidatePayload,
                workExperiences: [{ company: 'Coca Cola', position: 'SWE', startDate: '13-01-2011' }],
            };
            expect(() => validateCandidateData(payload)).toThrow('Invalid date');
        });

        it('rechaza un CV al que le faltan campos obligatorios', () => {
            const payload = { ...minimalValidCandidatePayload, cv: { filePath: 'uploads/cv.pdf' } };
            expect(() => validateCandidateData(payload)).toThrow('Invalid CV data');
        });

        it('rechaza educación con endDate mal formada', () => {
            const payload = {
                ...minimalValidCandidatePayload,
                educations: [{ institution: 'UC3M', title: 'CS', startDate: '2006-12-31', endDate: '26-12-2010' }],
            };
            expect(() => validateCandidateData(payload)).toThrow('Invalid end date');
        });

        it('rechaza educación sin startDate', () => {
            const payload = {
                ...minimalValidCandidatePayload,
                educations: [{ institution: 'UC3M', title: 'CS' }],
            };
            expect(() => validateCandidateData(payload)).toThrow('Invalid date');
        });

        it('rechaza un título de educación de más de 250 chars', () => {
            const payload = {
                ...minimalValidCandidatePayload,
                educations: [{ institution: 'UC3M', title: 'a'.repeat(251), startDate: '2006-12-31' }],
            };
            expect(() => validateCandidateData(payload)).toThrow('Invalid title');
        });

        it('valida todos los items cuando hay varias educaciones', () => {
            const payload = {
                ...minimalValidCandidatePayload,
                educations: [
                    { institution: 'UC3M', title: 'CS', startDate: '2006-12-31' },
                    { institution: '', title: 'Master', startDate: '2011-01-01' },
                ],
            };
            expect(() => validateCandidateData(payload)).toThrow('Invalid institution');
        });

        it('rechaza experiencia con descripción de más de 200 chars', () => {
            const payload = {
                ...minimalValidCandidatePayload,
                workExperiences: [{ company: 'Coca Cola', position: 'SWE', description: 'a'.repeat(201), startDate: '2011-01-13' }],
            };
            expect(() => validateCandidateData(payload)).toThrow('Invalid description');
        });
    });
});

describe('POST /candidates — recepción vía API', () => {
    const createTestApp = () => {
        const app = express();
        app.use(express.json());
        app.use('/candidates', candidateRoutes);
        return app;
    };

    it('devuelve 201 y el candidato guardado con un payload válido', async () => {
        const response = await request(createTestApp()).post('/candidates').send(validCandidatePayload);

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({ id: 1, firstName: 'Albert', email: 'albert.saelices@gmail.com' });
    });

    it('devuelve 400 cuando los datos no pasan la validación', async () => {
        const response = await request(createTestApp())
            .post('/candidates')
            .send({ firstName: 'Ada', lastName: 'Lovelace', email: 'bad-email' });

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/Invalid email/);
        expect(mockCandidateCreate).not.toHaveBeenCalled();
    });

    it('devuelve 400 cuando el email ya existe en la base de datos', async () => {
        mockCandidateCreate.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));

        const response = await request(createTestApp()).post('/candidates').send(validCandidatePayload);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('The email already exists in the database');
    });

    it('persiste el candidato recibido en el cuerpo de la petición', async () => {
        await request(createTestApp()).post('/candidates').send(validCandidatePayload);

        expect(mockCandidateCreate).toHaveBeenCalledTimes(1);
        expect(mockCandidateCreate.mock.calls[0][0].data).toMatchObject({ firstName: 'Albert', email: 'albert.saelices@gmail.com' });
    });
});

// ===========================================================================
// FAMILIA 2 — Guardado en base de datos
// ===========================================================================
describe('Candidate.save — persistencia del candidato', () => {
    describe('al crear un candidato nuevo', () => {
        it('persiste los campos núcleo vía prisma.candidate.create', async () => {
            const input = { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', phone: '612345678', address: 'London' };
            const persisted = { id: 1, ...input };
            mockCandidateCreate.mockResolvedValue(persisted);

            const result = await new Candidate(input).save();

            expect(mockCandidateCreate).toHaveBeenCalledWith({ data: input });
            expect(result).toEqual(persisted);
        });

        it('devuelve el id generado por la base de datos', async () => {
            const input = { firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' };
            mockCandidateCreate.mockResolvedValue({ id: 99, ...input });

            const result = await new Candidate(input).save();

            expect(result.id).toBe(99);
        });
    });

    describe('al actualizar un candidato existente', () => {
        it('persiste los cambios vía prisma.candidate.update', async () => {
            const input = { id: 5, firstName: 'Albert', lastName: 'Saelices', email: 'albert.saelices@gmail.com', phone: '656874937' };
            mockCandidateUpdate.mockResolvedValue({ ...input });

            const result = await new Candidate(input).save();

            expect(mockCandidateUpdate).toHaveBeenCalledWith({
                where: { id: 5 },
                data: { firstName: 'Albert', lastName: 'Saelices', email: 'albert.saelices@gmail.com', phone: '656874937' },
            });
            expect(result).toEqual(input);
        });
    });

    describe('al persistir entidades anidadas', () => {
        it('construye bloques Prisma "create" para educations, experiences y resumes', async () => {
            const input = {
                firstName: 'Albert',
                lastName: 'Saelices',
                email: 'albert.saelices@gmail.com',
                education: [{ institution: 'UC3M', title: 'CS', startDate: new Date('2006-12-31'), endDate: new Date('2010-12-26') }],
                workExperience: [{ company: 'Coca Cola', position: 'SWE', description: 'Backend', startDate: new Date('2011-01-13'), endDate: new Date('2013-01-17') }],
                resumes: [{ filePath: 'uploads/cv.pdf', fileType: 'application/pdf' }],
            };
            mockCandidateCreate.mockResolvedValue({ id: 7 });

            await new Candidate(input).save();

            const dataArg = mockCandidateCreate.mock.calls[0][0].data;
            expect(dataArg.educations).toEqual({
                create: [{ institution: 'UC3M', title: 'CS', startDate: input.education[0].startDate, endDate: input.education[0].endDate }],
            });
            expect(dataArg.workExperiences).toEqual({
                create: [{ company: 'Coca Cola', position: 'SWE', description: 'Backend', startDate: input.workExperience[0].startDate, endDate: input.workExperience[0].endDate }],
            });
            expect(dataArg.resumes).toEqual({ create: [{ filePath: 'uploads/cv.pdf', fileType: 'application/pdf' }] });
        });
    });

    describe('cuando fallan las operaciones de base de datos', () => {
        it('re-lanza errores inesperados en create', async () => {
            mockCandidateCreate.mockRejectedValue(new Error('Unexpected database failure'));

            await expect(new Candidate({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }).save())
                .rejects.toThrow('Unexpected database failure');
        });

        it('lanza error de "no encontrado" al actualizar un candidato inexistente', async () => {
            mockCandidateUpdate.mockRejectedValue(Object.assign(new Error('Record not found'), { code: 'P2025' }));

            await expect(new Candidate({ id: 999, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }).save())
                .rejects.toThrow('No se pudo encontrar el registro del candidato con el ID proporcionado.');
        });

        it('traduce un error de conexión de Prisma a un mensaje amigable en create', async () => {
            // Fijamos el prototipo para que `instanceof` funcione pese a que el
            // target ES5 rompe la herencia de Error en clases transpiladas.
            const { Prisma } = require('@prisma/client');
            const connError = new Error('connection refused');
            Object.setPrototypeOf(connError, Prisma.PrismaClientInitializationError.prototype);
            mockCandidateCreate.mockRejectedValue(connError);

            await expect(new Candidate({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }).save())
                .rejects.toThrow('No se pudo conectar con la base de datos. Por favor, asegúrese de que el servidor de base de datos esté en ejecución.');
        });
    });
});

describe('Candidate.findOne — recuperación', () => {
    it('devuelve null cuando el id no existe', async () => {
        mockCandidateFindUnique.mockResolvedValue(null);

        const result = await Candidate.findOne(999);

        expect(mockCandidateFindUnique).toHaveBeenCalledWith({ where: { id: 999 } });
        expect(result).toBeNull();
    });

    it('devuelve una instancia de Candidate cuando existe el registro', async () => {
        mockCandidateFindUnique.mockResolvedValue({ id: 1, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' });

        const result = await Candidate.findOne(1);

        expect(result).toBeInstanceOf(Candidate);
        expect(result).toMatchObject({ id: 1, firstName: 'Ada', email: 'ada@example.com' });
    });
});

describe('Education.save — persistencia', () => {
    it('crea una educación nueva con su candidateId', async () => {
        await new Education({ institution: 'UC3M', title: 'Computer Science', startDate: '2006-12-31', endDate: '2010-12-26', candidateId: 1 }).save();

        expect(mockEducationCreate).toHaveBeenCalledWith({
            data: { institution: 'UC3M', title: 'Computer Science', startDate: new Date('2006-12-31'), endDate: new Date('2010-12-26'), candidateId: 1 },
        });
        expect(mockEducationUpdate).not.toHaveBeenCalled();
    });

    it('deja endDate undefined cuando no se proporciona', async () => {
        await new Education({ institution: 'UC3M', title: 'CS', startDate: '2006-12-31', candidateId: 1 }).save();
        expect(mockEducationCreate.mock.calls[0][0].data.endDate).toBeUndefined();
    });

    it('actualiza una educación existente cuando hay id', async () => {
        await new Education({ id: 10, institution: 'UC3M', title: 'CS', startDate: '2006-12-31' }).save();

        expect(mockEducationUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 10 } }));
        expect(mockEducationCreate).not.toHaveBeenCalled();
    });
});

describe('WorkExperience.save — persistencia', () => {
    it('crea una experiencia nueva con su candidateId', async () => {
        await new WorkExperience({ company: 'Coca Cola', position: 'SWE', description: 'Backend development', startDate: '2011-01-13', endDate: '2013-01-17', candidateId: 1 }).save();

        expect(mockWorkExperienceCreate).toHaveBeenCalledWith({
            data: { company: 'Coca Cola', position: 'SWE', description: 'Backend development', startDate: new Date('2011-01-13'), endDate: new Date('2013-01-17'), candidateId: 1 },
        });
        expect(mockWorkExperienceUpdate).not.toHaveBeenCalled();
    });

    it('actualiza una experiencia existente cuando hay id', async () => {
        await new WorkExperience({ id: 20, company: 'Coca Cola', position: 'SWE', startDate: '2011-01-13' }).save();

        expect(mockWorkExperienceUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 20 } }));
        expect(mockWorkExperienceCreate).not.toHaveBeenCalled();
    });
});

describe('Resume.save — persistencia', () => {
    const FIXED_NOW = new Date('2026-06-14T10:00:00.000Z');

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(FIXED_NOW);
    });
    afterEach(() => {
        jest.useRealTimers();
    });

    it('crea un resume nuevo con un uploadDate determinista', async () => {
        mockResumeCreate.mockResolvedValue({ id: 30, candidateId: 1, filePath: 'uploads/cv.pdf', fileType: 'application/pdf' });

        const result = await new Resume({ candidateId: 1, filePath: 'uploads/cv.pdf', fileType: 'application/pdf' }).save();

        expect(mockResumeCreate).toHaveBeenCalledWith({
            data: { candidateId: 1, filePath: 'uploads/cv.pdf', fileType: 'application/pdf', uploadDate: FIXED_NOW },
        });
        expect(result).toBeInstanceOf(Resume);
        expect(result.id).toBe(30);
    });

    it('rechaza actualizar un resume existente', async () => {
        const resume = new Resume({ id: 30, candidateId: 1, filePath: 'uploads/cv.pdf', fileType: 'application/pdf' });

        await expect(resume.save()).rejects.toThrow('No se permite la actualización de un currículum existente.');
        expect(mockResumeCreate).not.toHaveBeenCalled();
    });
});

describe('addCandidate — orquestación de la persistencia', () => {
    it('guarda el candidato y todas las entidades relacionadas con un payload válido', async () => {
        const result = await addCandidate({ ...validCandidatePayload });

        expect(mockCandidateCreate).toHaveBeenCalledTimes(1);
        expect(mockEducationCreate).toHaveBeenCalledTimes(1);
        expect(mockEducationCreate.mock.calls[0][0].data).toMatchObject({ institution: 'UC3M', candidateId: 1 });
        expect(mockWorkExperienceCreate).toHaveBeenCalledTimes(1);
        expect(mockWorkExperienceCreate.mock.calls[0][0].data).toMatchObject({ company: 'Coca Cola', candidateId: 1 });
        expect(mockResumeCreate).toHaveBeenCalledTimes(1);
        expect(mockResumeCreate.mock.calls[0][0].data).toMatchObject({ filePath: 'uploads/1715760936750-cv.pdf', candidateId: 1 });
        expect(result).toMatchObject({ id: 1, email: validCandidatePayload.email });
    });

    it('rechaza datos inválidos antes de intentar guardar', async () => {
        await expect(addCandidate({ firstName: 'A', lastName: 'Lovelace', email: 'ada@example.com' })).rejects.toThrow('Invalid name');
        expect(mockCandidateCreate).not.toHaveBeenCalled();
    });

    it('guarda solo el candidato cuando no hay entidades anidadas', async () => {
        await addCandidate({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada.lovelace@example.com' });

        expect(mockCandidateCreate).toHaveBeenCalledTimes(1);
        expect(mockEducationCreate).not.toHaveBeenCalled();
        expect(mockWorkExperienceCreate).not.toHaveBeenCalled();
        expect(mockResumeCreate).not.toHaveBeenCalled();
    });

    it('lanza error de email duplicado cuando falla la restricción única', async () => {
        mockCandidateCreate.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));

        await expect(addCandidate({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }))
            .rejects.toThrow('The email already exists in the database');
    });

    it('ejecuta todo el guardado dentro de una única transacción', async () => {
        await addCandidate({ ...validCandidatePayload });
        expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('propaga el error (rollback) cuando falla una educación anidada', async () => {
        mockEducationCreate.mockRejectedValue(new Error('DB write failed'));

        await expect(addCandidate({ ...validCandidatePayload })).rejects.toThrow('DB write failed');
        expect(mockWorkExperienceCreate).not.toHaveBeenCalled();
        expect(mockResumeCreate).not.toHaveBeenCalled();
    });

    it('devuelve solo el candidato guardado, sin el árbol anidado', async () => {
        const result = await addCandidate({ ...validCandidatePayload });

        expect(result).not.toHaveProperty('educations');
        expect(result).not.toHaveProperty('workExperiences');
    });

    test.each([
        ['Invalid email', { firstName: 'Ada', lastName: 'Lovelace', email: 'not-valid' }],
        ['Invalid phone', { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', phone: '123' }],
    ])('rechaza payload con %s antes de persistir', async (_label, payload) => {
        await expect(addCandidate(payload)).rejects.toThrow();
        expect(mockCandidateCreate).not.toHaveBeenCalled();
    });
});
