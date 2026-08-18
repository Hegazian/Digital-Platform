"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademicController = void 0;
const academic_service_1 = require("./academic.service");
class AcademicController {
    // Educational Stages
    static async createEducationalStage(req, res, next) {
        try {
            const stage = await academic_service_1.AcademicService.createEducationalStage(req.body);
            res.status(201).json({ success: true, data: stage });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAllEducationalStages(req, res, next) {
        try {
            const stages = await academic_service_1.AcademicService.getAllEducationalStages();
            res.status(200).json({ success: true, data: stages });
        }
        catch (err) {
            next(err);
        }
    }
    // Grades
    static async createGrade(req, res, next) {
        try {
            const grade = await academic_service_1.AcademicService.createGrade(req.body);
            res.status(201).json({ success: true, data: grade });
        }
        catch (err) {
            next(err);
        }
    }
    static async getGradesByStage(req, res, next) {
        try {
            const { stageId } = req.params;
            const grades = await academic_service_1.AcademicService.getGradesByStage(stageId);
            res.status(200).json({ success: true, data: grades });
        }
        catch (err) {
            next(err);
        }
    }
    // Academic Years
    static async createAcademicYear(req, res, next) {
        try {
            const year = await academic_service_1.AcademicService.createAcademicYear(req.body);
            res.status(201).json({ success: true, data: year });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAllAcademicYears(req, res, next) {
        try {
            const years = await academic_service_1.AcademicService.getAllAcademicYears();
            res.status(200).json({ success: true, data: years });
        }
        catch (err) {
            next(err);
        }
    }
    // Grade - Subject Association
    static async createGradeSubject(req, res, next) {
        try {
            const gradeSubject = await academic_service_1.AcademicService.createGradeSubject(req.body);
            res.status(201).json({ success: true, data: gradeSubject });
        }
        catch (err) {
            next(err);
        }
    }
    static async getSubjectsByGrade(req, res, next) {
        try {
            const { gradeId } = req.params;
            const subjects = await academic_service_1.AcademicService.getSubjectsByGrade(gradeId);
            res.status(200).json({ success: true, data: subjects });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AcademicController = AcademicController;
