"use client";

import { useEffect, useState } from "react";
import { getCats, catOf } from "@/lib/budgetMath";
import { ARTICLE_SECTIONS, ARTICLES, CAT_HELP, type ArticleBlock } from "@/lib/learnContent";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";

function ArticleBlockView({ block }: { block: ArticleBlock }) {
  if (typeof block === "string") return <p>{block}</p>;
  const List = block.ordered ? "ol" : "ul";
  return (
    <List className="article-list">
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </List>
  );
}

export default function ApprendrePage() {
  const { workspace } = useWorkspace();
  const [articleId, setArticleId] = useState<string | null>(null);
  const [helpCat, setHelpCat] = useState<string | null>(null);

  useEffect(() => {
    if (articleId) window.scrollTo(0, 0);
  }, [articleId]);

  if (!workspace) return null;
  const cats = getCats(workspace);

  if (articleId) {
    const a = ARTICLES.find((x) => x.id === articleId);
    if (!a) {
      return (
        <div className="page">
          <p className="muted">Article introuvable.</p>
          <Button variant="ghost" size="sm" onClick={() => setArticleId(null)}>
            Retour
          </Button>
        </div>
      );
    }
    const idx = ARTICLES.indexOf(a);
    const next = ARTICLES[idx + 1];
    return (
      <article className="article">
        <Button
          variant="ghost"
          size="sm"
          icon={<AppIcon name="left" size={16} />}
          onClick={() => setArticleId(null)}
        >
          Tous les articles
        </Button>
        <p className="faint" style={{ marginTop: 18, fontSize: 14 }}>
          {a.sec}, {a.min} min de lecture
        </p>
        <h2>{a.title}</h2>
        <p className="lede">{a.lede}</p>
        {a.body.map((block, i) => (
          <ArticleBlockView key={i} block={block} />
        ))}
        {next && (
          <div style={{ marginTop: 36 }}>
            <span className="faint" style={{ fontSize: 14 }}>
              Article suivant
            </span>
            <br />
            <button
              type="button"
              className="link-btn"
              style={{ fontSize: 17, fontWeight: 500 }}
              onClick={() => setArticleId(next.id)}
            >
              {next.title}
            </button>
          </div>
        )}
      </article>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>Apprendre</h2>
        <p>De courts articles pour comprendre la gestion de l’argent, même sans rien y connaître.</p>
      </div>

      <section className="block">
        <div className="block-head">
          <h3>Vos catégories</h3>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {cats.map((c) => (
            <button
              key={c.id}
              type="button"
              className="btn"
              style={{ flex: "0 1 auto" }}
              onClick={() => setHelpCat(c.id)}
            >
              <span className="swatch" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
      </section>

      <div className="art-sections">
        {ARTICLE_SECTIONS.map((sec) => (
          <div className="art-sec" key={sec}>
            <h3>{sec}</h3>
            {ARTICLES.filter((a) => a.sec === sec).map((a) => (
              <button
                key={a.id}
                type="button"
                className="art-link"
                onClick={() => setArticleId(a.id)}
              >
                <span>{a.title}</span>
                <span className="faint">{a.min} min</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {helpCat && (
        <div className="sheet-root" role="dialog" aria-modal="true">
          <button
            type="button"
            className="sheet-backdrop"
            aria-label="Fermer"
            onClick={() => setHelpCat(null)}
          />
          <div className="sheet-panel">
            <div className="sheet-head">
              <h3>{catOf(workspace, helpCat).name}</h3>
              <button
                type="button"
                className="icon-btn"
                aria-label="Fermer"
                onClick={() => setHelpCat(null)}
              >
                <AppIcon name="close" size={18} />
              </button>
            </div>
            <div className="sheet-body help-body">
              {CAT_HELP[helpCat] ? (
                <>
                  <p>{CAT_HELP[helpCat].def}</p>
                  <h4>Exemples</h4>
                  <ul>
                    {CAT_HELP[helpCat].ex.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                  <h4>À savoir</h4>
                  <p>{CAT_HELP[helpCat].warn}</p>
                </>
              ) : (
                <>
                  <p>
                    Catégorie personnalisée de type{" "}
                    {catOf(workspace, helpCat).kind === "transfer"
                      ? "épargne / projet (versement)"
                      : "dépense"}
                    .
                  </p>
                  <p className="muted">
                    Vous pouvez renommer cette catégorie et ajuster son pourcentage dans Paramètres.
                  </p>
                </>
              )}
            </div>
            <div className="sheet-foot">
              <Button onClick={() => setHelpCat(null)}>Fermer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
