import { Router } from "express";
import { SprintModel } from "../models/Sprint";
import { DemandModel, CARRYOVER_REASONS } from "../models/Demand";
import { SprintCloseoutModel } from "../models/SprintCloseout";
import { requireAuth, checkPermission } from "../middleware/auth";
import mongoose from "mongoose";

const router = Router();

// POST /api/sprints/:id/closeout
router.post("/:id/closeout", requireAuth, checkPermission("reports", "view"), async (req: any, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { toSprintId, decisions, notes } = req.body;
    const actor = res.locals.user.email;

    const sprint = await SprintModel.findById(id).session(session);
    if (!sprint) {
      throw new Error("Sprint não encontrada.");
    }

    if (sprint.status === "Closed") {
      throw new Error("Esta sprint já foi encerrada.");
    }

    // Buscar todas as demandas da sprint
    const allDemands = await DemandModel.find({ sprintId: id }).session(session);
    
    const completedDemands = allDemands.filter(d => d.status === "Concluído");
    const pendingDemands = allDemands.filter(d => d.status !== "Concluído" && d.status !== "Cancelado");
    
    const totals = {
      planned: allDemands.length,
      completed: completedDemands.length,
      notCompleted: pendingDemands.length,
      carryoverMoved: 0,
      backlogReturned: 0,
      canceled: 0
    };

    let criticalCount = 0;

    for (const decision of decisions) {
      const demand = await DemandModel.findById(decision.taskId).session(session);
      if (!demand) continue;

      const historyEvent = {
        fromSprintId: id,
        toSprintId: decision.decisionType === "Carryover" ? toSprintId : null,
        decidedAt: new Date(),
        decidedBy: actor,
        decisionType: decision.decisionType,
        reasonCategory: decision.reasonCategory,
        reasonNotes: decision.reasonNotes
      };

      if (decision.decisionType === "Carryover") {
        demand.sprintId = toSprintId;
        demand.isCarryover = true;
        demand.carryoverFromSprintId = id as any;
        demand.carryoverCount = (demand.carryoverCount || 0) + 1;
        demand.reasonCategory = decision.reasonCategory;
        totals.carryoverMoved++;
        
        if (demand.priority === "P0" || demand.priority === "P1" || (demand as any).blocked) {
          criticalCount++;
        }
      } else if (decision.decisionType === "Backlog") {
        demand.sprintId = null;
        totals.backlogReturned++;
      } else if (decision.decisionType === "Cancel") {
        demand.status = "Cancelado" as any;
        totals.canceled++;
      }

      demand.carryoverHistory.push(historyEvent as any);
      await demand.save({ session });
    }

    // Criar o Closeout
    const carryoverRate = totals.planned > 0 ? (totals.notCompleted / totals.planned) * 100 : 0;
    
    const closeout = new SprintCloseoutModel({
      sprintId: id,
      closedAt: new Date(),
      closedBy: actor,
      totals,
      carryoverRate,
      carryoverCriticalCount: criticalCount,
      notes
    });

    await closeout.save({ session });

    // Fechar a Sprint
    sprint.status = "Closed";
    await sprint.save({ session });

    await session.commitTransaction();
    res.json({ message: "Sprint encerrada com sucesso", closeout });
  } catch (error: any) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// GET /api/sprints/:id/closeout
router.get("/:id/closeout", requireAuth, async (req, res) => {
  try {
    const closeout = await SprintCloseoutModel.findOne({ sprintId: req.params.id });
    if (!closeout) return res.status(404).json({ message: "Closeout não encontrado." });
    res.json(closeout);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
