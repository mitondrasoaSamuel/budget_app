"use client";

import { useState } from "react";
import { FiLogOut, FiUpload } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { FONT_OPTIONS, MODE_LABELS } from "@/lib/defaults";
import { api } from "@/lib/client/api";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Seg } from "@/components/ui/Seg";
import { Spinner } from "@/components/ui/Spinner";

async function toDataUrl(file: File, max = 480) {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Lecture impossible"));
    reader.readAsDataURL(file);
  });
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas indisponible"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Image invalide"));
    img.src = raw;
  });
}

export default function SettingsPage() {
  const router = useRouter();
  const { workspace, setWorkspace, setSaving, notify } = useWorkspace();
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!workspace) return null;

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const { workspace: next } = await api.patchWorkspace(body);
      setWorkspace(next);
      notify("Enregistré");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>Paramètres</h2>
        <p>
          Compte {MODE_LABELS[workspace.mode]} · {workspace.login}
        </p>
      </div>

      <section className="block">
        <div className="block-head">
          <h3>Profil</h3>
        </div>
        <div className="profile-edit">
          {workspace.profilePhoto ? (
            <img src={workspace.profilePhoto} alt="" className="avatar lg" />
          ) : (
            <span className="avatar lg avatar-fallback">{workspace.displayName.slice(0, 1).toUpperCase()}</span>
          )}
          <label className="btn">
            <FiUpload size={16} />
            Photo
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void toDataUrl(file).then((profilePhoto) => patch({ profilePhoto }));
              }}
            />
          </label>
        </div>
        <Input label="Nom affiché" value={workspace.displayName} onChange={(e) => void patch({ displayName: e.target.value })} />
        <Input label="Nom de l’espace" value={workspace.name} onChange={(e) => void patch({ name: e.target.value })} />
      </section>

      <section className="block">
        <div className="block-head">
          <h3>Apparence</h3>
        </div>
        <div className="profile-edit">
          {workspace.branding.logoDataUrl ? (
            <img src={workspace.branding.logoDataUrl} alt="" className="brand-logo-img lg" />
          ) : (
            <span className="brand-logo-mark lg">{workspace.branding.appName.slice(0, 1)}</span>
          )}
          <label className="btn">
            <FiUpload size={16} />
            Logo
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void toDataUrl(file, 256).then((logoDataUrl) =>
                  patch({ branding: { ...workspace.branding, logoDataUrl } })
                );
              }}
            />
          </label>
        </div>
        <Input
          label="Nom de l’application"
          value={workspace.branding.appName}
          onChange={(e) => void patch({ branding: { ...workspace.branding, appName: e.target.value } })}
        />
        <div className="row">
          <div className="field">
            <label htmlFor="accent">Accent</label>
            <input
              id="accent"
              className="input"
              type="color"
              value={workspace.branding.accent}
              onChange={(e) => void patch({ branding: { ...workspace.branding, accent: e.target.value } })}
            />
          </div>
          <div className="field">
            <label htmlFor="ink">Texte (thème clair)</label>
            <input
              id="ink"
              className="input"
              type="color"
              value={workspace.branding.ink}
              onChange={(e) => void patch({ branding: { ...workspace.branding, ink: e.target.value } })}
            />
            <p className="field-hint">En mode sombre, le texte reste clair pour la lisibilité.</p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="font">Police</label>
          <select
            id="font"
            className="input"
            value={workspace.branding.fontFamily}
            onChange={(e) => void patch({ branding: { ...workspace.branding, fontFamily: e.target.value } })}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.id} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <Seg
          label="Thème"
          value={workspace.branding.theme}
          onChange={(theme) => void patch({ branding: { ...workspace.branding, theme } })}
          options={[
            ["auto", "Automatique"],
            ["light", "Clair"],
            ["dark", "Sombre"],
          ]}
        />
      </section>

      <section className="block">
        <div className="block-head">
          <h3>Sécurité</h3>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <Input label="Mot de passe actuel" type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} />
          <Input label="Nouveau" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          <Input label="Confirmer" type="password" value={newPass2} onChange={(e) => setNewPass2(e.target.value)} />
        </div>
        {err && <p className="error-text">{err}</p>}
        <Button
          disabled={busy || !curPass || !newPass}
          onClick={() => {
            setErr("");
            if (newPass !== newPass2) return setErr("Les mots de passe ne correspondent pas.");
            setBusy(true);
            void api
              .changePassword(curPass, newPass)
              .then(() => {
                setCurPass("");
                setNewPass("");
                setNewPass2("");
                notify("Mot de passe mis à jour");
              })
              .catch((e) => setErr(e instanceof Error ? e.message : "Erreur"))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? <Spinner size={16} /> : null}
          Changer le mot de passe
        </Button>
      </section>

      <section className="block">
        <Button
          variant="logout"
          icon={<FiLogOut size={16} />}
          onClick={() =>
            void api.logout().then(() => {
              router.replace("/login");
              router.refresh();
            })
          }
        >
          Se déconnecter
        </Button>
      </section>
    </div>
  );
}
