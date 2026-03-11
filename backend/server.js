import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const historyFilePath = path.resolve(__dirname, "..", "LoginHistory.txt");

app.use(cors());
app.use(express.json());

function saveRepoName(req, res) {
  const repoName = req.body?.repoName?.trim();

  if (!repoName) {
    res.status(400).json({ error: "Repository name is required." });
    return;
  }

  const logLine = `Repository: ${repoName} | Saved Time: ${new Date().toISOString()}\n`;

  if (!fs.existsSync(historyFilePath)) {
    fs.writeFileSync(historyFilePath, "", "utf-8");
  }

  fs.appendFileSync(historyFilePath, logLine, "utf-8");
  res.json({ repoName });
}

app.get("/", (req, res) => {
  res.json({ status: "ok", file: historyFilePath });
});

app.post("/save-repo-name", saveRepoName);
app.post("/save", saveRepoName);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  console.log(`Writing repository names to ${historyFilePath}`);
});
