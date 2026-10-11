import type { Block } from "@/content/types";

export function ContentBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="prose-rv">
      {blocks.map((b, i) => (
        <div key={i}>
          {b.h && <h2>{b.h}</h2>}
          {b.p && <p>{b.p}</p>}
          {b.ul && <ul>{b.ul.map((x) => <li key={x}>{x}</li>)}</ul>}
          {b.ol && <ol>{b.ol.map((x) => <li key={x}>{x}</li>)}</ol>}
          {b.note && <p className="rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-brand-900">{b.note}</p>}
        </div>
      ))}
    </div>
  );
}
