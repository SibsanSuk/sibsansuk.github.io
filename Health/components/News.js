// components/News.js
const h = window.React.createElement;
const { useState, useEffect } = window.React;

const stripHTML = (text = "") => typeof text === "string" ? text.replace(/<[^>]+>/g, "").trim() : "";
const getText = (node, selector) => {
  if (!node) return "";
  if (!selector) return (node.textContent || "").trim();
  const found = node.querySelector(selector);
  return (found?.textContent || "").trim();
};

export const defaultNewsSources = [
  {
    id: "thaihealth",
    title: "ข่าวสุขภาพ ThaiHealth",
    description: "เนื้อหาจากกองทุนสนับสนุนการสร้างเสริมสุขภาพ",
    url: "https://www.thaihealth.or.th/wp-json/export-rss/category/208/?post_type=post&items=10",
    limit: 4,
    extractItems: (payload, meta) => {
      if (meta?.format === "xml" && payload?.querySelectorAll) {
        const items = Array.from(payload.querySelectorAll("item"));
        return items.map((node, index) => ({
          id: getText(node, "guid") || getText(node, "link") || `thaihealth-${index}`,
          title: getText(node, "title") || "ไม่มีชื่อบทความ",
          link: getText(node, "link") || "#",
          published: getText(node, "pubDate") || getText(node, "dc\\:date"),
          excerpt: stripHTML(getText(node, "description"))
        }));
      }
      const list = Array.isArray(payload) ? payload : (payload?.items || payload?.posts || []);
      return (list || []).map((item) => ({
        id: item.id || item.guid || item.link || item.title,
        title: (item.title && (item.title.rendered || item.title)) || "ไม่มีชื่อบทความ",
        link: item.link || item.guid || "#",
        published: item.date || item.pubDate || item.modified,
        excerpt: stripHTML(item.description || item.excerpt?.rendered || item.contentSnippet || "")
      }));
    }
  }
];

export function News({ sources = defaultNewsSources, className = "" }) {
  const [feedsState, setFeedsState] = useState(() =>
    (sources || []).reduce((acc, source) => {
      acc[source.id] = { status: "idle", items: [] };
      return acc;
    }, {})
  );
  const [activeArticle, setActiveArticle] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (sources || []).forEach((source) => {
      setFeedsState((prev) => ({ ...prev, [source.id]: { status: "loading", items: [] } }));
      if (typeof fetch !== "function") {
        setFeedsState((prev) => ({
          ...prev,
          [source.id]: { status: "error", error: "ไม่รองรับการเชื่อมต่อ", items: [] }
        }));
        return;
      }
      fetch(source.url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((raw) => {
          if (cancelled) return;
          let parsed = raw;
          let meta = { format: "text" };
          try {
            parsed = JSON.parse(raw);
            meta = { format: "json" };
          } catch (jsonErr) {
            if (typeof window !== "undefined" && window.DOMParser) {
              try {
                const parser = new window.DOMParser();
                const doc = parser.parseFromString(raw, "text/xml");
                if (!doc.querySelector("parsererror")) {
                  parsed = doc;
                  meta = { format: "xml" };
                } else {
                  meta = { format: "text", error: "parsererror" };
                }
              } catch (xmlErr) {
                meta = { format: "text", error: xmlErr?.message };
              }
            }
          }
          const extractor = source.extractItems || (() => []);
          const items = (extractor(parsed, meta, raw) || []).slice(0, source.limit || 4);
          if ((!items || !items.length) && meta.format === "text") {
            throw new Error("รูปแบบข้อมูลไม่รองรับ");
          }
          setFeedsState((prev) => ({
            ...prev,
            [source.id]: { status: "success", items }
          }));
        })
        .catch((err) => {
          if (cancelled) return;
          setFeedsState((prev) => ({
            ...prev,
            [source.id]: {
              status: "error",
              error: err?.message || "ไม่สามารถโหลดข้อมูล",
              items: []
            }
          }));
        });
    });
    return () => { cancelled = true; };
  }, [sources]);

  const openArticle = (item, source) => {
    if (!item) return;
    if (item.link && !item.content && !item.description && !item.excerpt) {
      window.open(item.link, "_blank", "noopener");
      return;
    }
    setActiveArticle({ item, source });
  };

  const closeArticle = () => setActiveArticle(null);

  if (!sources || !sources.length) return null;

  const section = h("section", {
    className: ["home-articles", className].filter(Boolean).join(" "),
    "aria-label": "อัปเดตสุขภาพจากแหล่งภายนอก"
  },
    sources.map((source) => {
      const state = feedsState[source.id] || { status: "idle", items: [] };
      return h("div", { key: source.id, className: "feed-card" },
        h("div", { className: "feed-card-header" },
          h("div", null,
            h("h3", null, source.title),
            source.description ? h("p", null, source.description) : null
          ),
          h("span", { className: `feed-status ${state.status}` },
            state.status === "loading" ? "กำลังโหลด..." :
            state.status === "error" ? "เชื่อมต่อไม่ได้" :
            `แสดง ${state.items.length}/${source.limit}`)
        ),
        state.status === "error"
          ? h("div", { className: "feed-error" }, state.error || "ไม่สามารถโหลดข้อมูล")
          : (state.status === "loading" && (!state.items || !state.items.length))
            ? h("div", { className: "feed-loading" }, "กำลังดึงข้อมูล...")
            : h("div", { className: "feed-scroll", role: "list" },
              (state.items && state.items.length ? state.items : [{
                id: `${source.id}-empty`,
                title: "ยังไม่มีข้อมูลจากแหล่งนี้",
                link: "#",
                excerpt: "โปรดลองใหม่ภายหลัง"
              }]).map((item) =>
                h("article", { key: item.id || item.link, className: "feed-item", role: "listitem" },
                  h("button", {
                    type: "button",
                    className: "feed-item-btn",
                    onClick: () => openArticle(item, source)
                  },
                    h("h4", null, item.title)
                  ),
                  item.excerpt ? h("p", null, item.excerpt.slice(0, 140) + (item.excerpt.length > 140 ? "…" : "")) : null,
                  item.published ? h("span", { className: "feed-date" },
                    new Date(item.published).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
                  ) : null
                )
              )
            )
      );
    })
  );

  const modal = activeArticle ? h("div", { className: "news-modal", role: "dialog", "aria-modal": "true" },
    h("div", { className: "news-modal-backdrop", onClick: closeArticle }),
    h("div", { className: "news-modal-box" },
      h("header", { className: "news-modal-header" },
        h("div", null,
          h("span", { className: "news-modal-source" }, activeArticle.source?.title || "ข่าว"),
          h("h2", null, activeArticle.item?.title || "ไม่มีชื่อบทความ")
        ),
        h("button", { type: "button", className: "news-modal-close", onClick: closeArticle, "aria-label": "ปิดหน้าต่าง" }, "×")
      ),
      h("div", { className: "news-modal-body" },
        activeArticle.item?.published ? h("div", { className: "news-modal-date" },
          new Date(activeArticle.item.published).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
        ) : null,
        activeArticle.item?.excerpt ? h("p", null, activeArticle.item.excerpt) : null,
        activeArticle.item?.content ? h("div", {
          className: "news-modal-content",
          dangerouslySetInnerHTML: { __html: activeArticle.item.content }
        }) : null,
        activeArticle.item?.link ? h("a", {
          className: "news-modal-link",
          href: activeArticle.item.link,
          target: "_blank",
          rel: "noopener noreferrer"
        }, "เปิดอ่านจากแหล่งที่มา") : null
      )
    )
  ) : null;

  return h(React.Fragment, null, section, modal);
}
