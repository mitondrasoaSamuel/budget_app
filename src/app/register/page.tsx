"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MODE_LABELS } from "@/lib/defaults";
import { api } from "@/lib/client/api";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Button } from "@/components/ui/Button";
import { Input, MoneyInput } from "@/components/ui/Input";
import { Seg } from "@/components/ui/Seg";
import { Spinner } from "@/components/ui/Spinner";

type Mode = "personal" | "couple" | "enterprise";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useWorkspace();
  const [mode, setMode] = useState<Mode>("personal");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [partner, setPartner] = useState("");
  const [company, setCompany] = useState("");
  const [income, setIncome] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (password !== password2) return setErr("Les mots de passe ne correspondent pas.");
    setBusy(true);
    try {
      await api.register({ login, password, displayName, partner, company, income, mode });
      await refresh();
      router.replace("/app");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="welcome">
      <div className="welcome-inner">
        <h1>Créer un compte</h1>
        <p className="lead">Personnel, couple ou entreprise — votre espace MySQL synchronisé en temps réel.</p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <span className="field-label">Type de compte</span>
            <Seg
              full
              label="Type"
              value={mode}
              onChange={setMode}
              options={[
                ["personal", MODE_LABELS.personal],
                ["couple", MODE_LABELS.couple],
                ["enterprise", MODE_LABELS.enterprise],
              ]}
            />
          </div>
          <Input label="Identifiant" value={login} onChange={(e) => setLogin(e.target.value)} hint="Min. 3 caractères" />
          <div className="row">
            <Input label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input label="Confirmer" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
          </div>
          <Input label={mode === "enterprise" ? "Votre nom" : "Votre prénom"} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          {mode === "couple" && <Input label="Prénom du partenaire" value={partner} onChange={(e) => setPartner(e.target.value)} />}
          {mode === "enterprise" && <Input label="Nom de l’entreprise" value={company} onChange={(e) => setCompany(e.target.value)} />}
          <MoneyInput label="Revenu mensuel estimé" value={income} onChange={setIncome} />
          {err && (
            <p className="error-text" role="alert">
              {err}
            </p>
          )}
          <div className="hero-actions">
            <Button variant="primary" type="submit" disabled={busy || !displayName.trim()}>
              {busy ? <Spinner size={16} /> : null}
              Créer mon espace
            </Button>
            <Link className="btn ghost" href="/login">
              Déjà un compte
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
