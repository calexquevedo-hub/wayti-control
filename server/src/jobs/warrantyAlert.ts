import cron from "node-cron";

import { AssetModel } from "../models/Asset";

export function startWarrantyJobs() {
  cron.schedule("0 8 * * *", async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    try {
      const expiringAssets = await AssetModel.find({
        status: { $ne: "Retired" },
        warrantyEnd: {
          $gte: today,
          $lte: thirtyDaysFromNow,
        },
      }).sort({ warrantyEnd: 1 });

      if (expiringAssets.length === 0) return;

      console.log(`[CRON] ${expiringAssets.length} ativo(s) com garantia a vencer em até 30 dias.`);
      for (const asset of expiringAssets) {
        console.log(
          `[CRON] Garantia: ${asset.assetTag ?? "SEM-TAG"} | ${asset.name} | ${asset.warrantyEnd?.toISOString().slice(0, 10)}`
        );
      }
    } catch (error) {
      console.error("[CRON] Erro ao verificar garantias:", error);
    }
  });
}
