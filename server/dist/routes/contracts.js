import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { ContractModel } from "../models/Contract";
const router = Router();
router.get("/", requireAuth, checkPermission("contracts", "view"), async (req, res) => {
    const { status, vendorId } = req.query;
    const filter = {};
    if (status)
        filter.status = status;
    if (vendorId)
        filter.vendorId = vendorId;
    const contracts = await ContractModel.find(filter)
        .populate({ path: "vendorId", select: "name type category" })
        .populate({ path: "relatedAssets", select: "tag name status" })
        .sort({ endDate: 1 });
    return res.json(contracts);
});
router.get("/:id", requireAuth, checkPermission("contracts", "view"), async (req, res) => {
    const contract = await ContractModel.findById(req.params.id)
        .populate({ path: "vendorId", select: "name type category" })
        .populate({ path: "relatedAssets", select: "tag name status" });
    if (!contract) {
        return res.status(404).json({ message: "Contrato não encontrado." });
    }
    return res.json(contract);
});
router.post("/", requireAuth, checkPermission("contracts", "create"), async (req, res) => {
    const payload = req.body;
    if (!payload.title || !payload.vendorId || !payload.costValue || !payload.startDate) {
        return res.status(400).json({ message: "title, vendorId, costValue e startDate são obrigatórios." });
    }
    const created = await ContractModel.create(payload);
    const populated = await created.populate([
        { path: "vendorId", select: "name type category" },
        { path: "relatedAssets", select: "tag name status" },
    ]);
    return res.status(201).json(populated);
});
router.patch("/:id", requireAuth, checkPermission("contracts", "edit"), async (req, res) => {
    const payload = req.body;
    const updated = await ContractModel.findByIdAndUpdate(req.params.id, payload, {
        new: true,
    })
        .populate({ path: "vendorId", select: "name type category" })
        .populate({ path: "relatedAssets", select: "tag name status" });
    if (!updated) {
        return res.status(404).json({ message: "Contrato não encontrado." });
    }
    return res.json(updated);
});
router.get("/check-renewals/summary", requireAuth, checkPermission("contracts", "view"), async (_req, res) => {
    const contracts = await ContractModel.find().lean({ virtuals: true });
    const critical = contracts.filter((c) => c.renewalStatus === "Critical").length;
    const monthlyTotal = contracts
        .filter((c) => c.status === "Active" && c.frequency === "Monthly")
        .reduce((sum, c) => sum + (c.costValue ?? 0), 0);
    return res.json({ critical, monthlyTotal });
});
export default router;
