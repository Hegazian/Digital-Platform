"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBoardState = exports.getBoardState = void 0;
const prisma_1 = require("../../prisma");
const getBoardState = async (req, res) => {
    const blockId = req.params.blockId;
    let board = await prisma_1.prisma.board.findUnique({
        where: { lessonBlockId: blockId },
    });
    if (!board) {
        board = await prisma_1.prisma.board.create({
            data: {
                lessonBlockId: blockId,
                elementsJson: '[]',
            },
        });
    }
    return res.status(200).json({
        success: true,
        data: board,
    });
};
exports.getBoardState = getBoardState;
const updateBoardState = async (req, res) => {
    const blockId = req.params.blockId;
    const { elementsJson } = req.body;
    const board = await prisma_1.prisma.board.upsert({
        where: { lessonBlockId: blockId },
        update: { elementsJson },
        create: {
            lessonBlockId: blockId,
            elementsJson,
        },
    });
    return res.status(200).json({
        success: true,
        data: board,
    });
};
exports.updateBoardState = updateBoardState;
