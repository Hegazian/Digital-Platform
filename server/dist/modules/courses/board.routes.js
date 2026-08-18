"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const board_controller_1 = require("./board.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const router = (0, express_1.Router)();
router.get('/:blockId', auth_middleware_1.authenticate, board_controller_1.getBoardState);
router.post('/:blockId/state', auth_middleware_1.authenticate, board_controller_1.updateBoardState);
exports.default = router;
