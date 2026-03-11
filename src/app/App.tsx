import { FormEvent, useState } from "react";
import { AnnotationWorkspace } from "./components/annotation/AnnotationWorkspace";

export default function App() {
  const [username, setUsername] = useState("");
  const [activeUser, setActiveUser] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError("Enter your username.");
      return;
    }

    setActiveUser(trimmedUsername);
    setIsLoggedIn(true);
    setError("");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveUser("");
    setUsername("");
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <section className="w-full max-w-md p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Enter Username</h1>
          <p className="mt-1 text-sm text-slate-600">
            GitHub Pages supports only frontend files, so this app uses a simple username screen before opening the workspace.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleContinue}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="Enter username"
              />
            </div>

            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Continue
            </button>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Welcome, {activeUser}</h2>
              <p className="text-sm text-slate-600">You are now in the normal application page.</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Change User
            </button>
          </div>
        </section>

        <section>
          <AnnotationWorkspace />
        </section>
      </div>
    </main>
  );
}
