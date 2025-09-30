// components/Loader.js
const h = window.React.createElement;

export function LoaderSkeleton() {
  return h("div", { className: "skeleton-wrap" },
    h("div", { className: "sk-title skeleton shimmer" }),
    h("div", { className: "sk-bubble skeleton shimmer" }),
    h("div", { className: "sk-bubble skeleton shimmer" }),
    h("div", { className: "sk-card skeleton shimmer" }),
    h("div", { className: "sk-grid" },
      Array.from({ length: 6 }).map((_, i) =>
        h("div", { key: i, className: "sk-tile skeleton shimmer" })
      )
    )
  );
}
