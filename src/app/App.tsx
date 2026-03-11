import { FormEvent, useState } from "react";
import { AnnotationWorkspace } from "./components/annotation/AnnotationWorkspace";

const backendBaseUrl = "http://localhost:3000";

export default function App() {
  const [repoName, setRepoName] = useState("");
  const [savedRepoName, setSavedRepoName] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedRepoName = repoName.trim();
    if (!trimmedRepoName) {
      setError("Enter the GitHub repository name.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`${backendBaseUrl}/save-repo-name`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoName: trimmedRepoName }),
      });

      const responseText = await response.text();
      let data: { error?: string; repoName?: string } = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(`Backend returned non-JSON response: ${responseText.slice(0, 120)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to save repository name.");
      }

      setSavedRepoName(data.repoName || trimmedRepoName);
      setRepoName("");
    } catch (saveError) {
      console.error("Saving repository name failed", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save repository name.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Save GitHub Repository Name</h2>
              <p className="text-sm text-slate-600">Enter a repository name to append it into `LoginHistory.txt`.</p>
            </div>
          </div>
        </section>

        <section className="p-4">
          <form className="max-w-md space-y-4" onSubmit={handleSave}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="repoName">
                GitHub Repository Name
              </label>
              <input
                id="repoName"
                type="text"
                value={repoName}
                onChange={(event) => setRepoName(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="Enter repository name"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Name"}
            </button>

            {savedRepoName && <p className="text-sm text-green-700">Saved repository: {savedRepoName}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </section>

        <section>
          <AnnotationWorkspace />
        </section>
      </div>
    </main>
  );
}
