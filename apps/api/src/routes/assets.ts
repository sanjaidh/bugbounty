import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";

export const assetsRouter = Router();

// Serve challenge assets (SSTV audio, meme image)
// Files placed in apps/api/assets/ folder
const ASSETS_DIR = path.join(__dirname, "../../assets");

assetsRouter.get("/:filename", (req: Request, res: Response): void => {
  const filename = path.basename(req.params.filename); // Prevent path traversal
  const filepath = path.join(ASSETS_DIR, filename);

  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  res.sendFile(filepath);
});
