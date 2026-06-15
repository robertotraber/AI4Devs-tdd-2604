import { PrismaClient } from '@prisma/client';
import { Candidate } from '../../domain/models/Candidate';
import { validateCandidateData } from '../validator';
import { Education } from '../../domain/models/Education';
import { WorkExperience } from '../../domain/models/WorkExperience';
import { Resume } from '../../domain/models/Resume';

const prisma = new PrismaClient();

export const addCandidate = async (candidateData: any) => {
    try {
        validateCandidateData(candidateData); // Validar los datos del candidato
    } catch (error: any) {
        throw new Error(error);
    }

    const candidate = new Candidate(candidateData); // Crear una instancia del modelo Candidate
    try {
        // Guardar candidato + educación + experiencia + CV de forma atómica.
        // Si cualquier paso falla, la transacción hace rollback y no quedan
        // candidatos huérfanos a medio insertar.
        const savedCandidate = await prisma.$transaction(async (tx) => {
            const saved = await candidate.save(tx); // Guardar el candidato en la base de datos
            const candidateId = saved.id; // Obtener el ID del candidato guardado

            // Guardar la educación del candidato
            if (candidateData.educations) {
                for (const education of candidateData.educations) {
                    const educationModel = new Education(education);
                    educationModel.candidateId = candidateId;
                    await educationModel.save(tx);
                    candidate.education.push(educationModel);
                }
            }

            // Guardar la experiencia laboral del candidato
            if (candidateData.workExperiences) {
                for (const experience of candidateData.workExperiences) {
                    const experienceModel = new WorkExperience(experience);
                    experienceModel.candidateId = candidateId;
                    await experienceModel.save(tx);
                    candidate.workExperience.push(experienceModel);
                }
            }

            // Guardar los archivos de CV
            if (candidateData.cv && Object.keys(candidateData.cv).length > 0) {
                const resumeModel = new Resume(candidateData.cv);
                resumeModel.candidateId = candidateId;
                await resumeModel.save(tx);
                candidate.resumes.push(resumeModel);
            }

            return saved;
        });

        return savedCandidate;
    } catch (error: any) {
        if (error.code === 'P2002') {
            // Unique constraint failed on the fields: (`email`)
            throw new Error('The email already exists in the database');
        } else {
            throw error;
        }
    }
};