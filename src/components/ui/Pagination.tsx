"use client";

import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Button } from "./Button";

export function Pagination({
  page,
  pages,
  total,
  from,
  to,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  from: number;
  to: number;
  onChange: (page: number) => void;
}) {
  if (!total) return null;
  return (
    <div className="pagination" role="navigation" aria-label="Pagination">
      <span className="muted">
        {from}–{to} sur {total}
      </span>
      <div className="pagination-actions">
        <Button size="sm" aria-label="Page précédente" disabled={page <= 1} onClick={() => onChange(page - 1)} icon={<FiChevronLeft size={16} />} />
        <span className="pagination-page">
          {page} / {pages}
        </span>
        <Button size="sm" aria-label="Page suivante" disabled={page >= pages} onClick={() => onChange(page + 1)} icon={<FiChevronRight size={16} />} />
      </div>
    </div>
  );
}
