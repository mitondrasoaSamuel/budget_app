"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useWorkspace();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await api.login(login, password);
      await refresh();
      router.replace("/app");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Connexion impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="welcome">
      <div className="welcome-inner">
        <h1>Connexion</h1>
        <p className="lead">Entrez votre identifiant et votre mot de passe.</p>
        <form onSubmit={onSubmit}>
          <Input label="Identifiant" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} />
          <Input
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && (
            <p className="error-text" role="alert">
              {err}
            </p>
          )}
          <div className="hero-actions">
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? <Spinner size={16} /> : null}
              Se connecter
            </Button>
            <Link className="btn ghost" href="/register">
              Créer un compte
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
