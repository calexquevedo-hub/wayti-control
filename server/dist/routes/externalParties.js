import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { ExternalPartyModel } from "../models/ExternalParty";
const router = Router();
router.get("/", requireAuth, checkPermission("demands", "view"), async (_req, res) => {
    const items = await ExternalPartyModel.find().sort({ createdAt: -1 });
    return res.json(items);
});
router.post("/", requireAuth, checkPermission("demands", "edit"), async (req, res) => {
    const created = await ExternalPartyModel.create(req.body);
    return res.status(201).json(created);
});
router.patch("/:id", requireAuth, checkPermission("demands", "edit"), async (req, res) => {
    const updated = await ExternalPartyModel.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
    });
    return res.json(updated);
});
export default router;
