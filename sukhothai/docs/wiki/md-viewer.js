(() => {
  const titleEl = document.getElementById("doc-title");
  const pathEl = document.getElementById("doc-path");
  const contentEl = document.getElementById("content");
  const tocEl = document.getElementById("toc");
  const rawEl = document.getElementById("open-raw");
  const errorEl = document.getElementById("doc-error");

  const params = new URLSearchParams(window.location.search);
  const docPath = params.get("doc");

  if (!docPath) {
    showError("ไม่พบพารามิเตอร์ไฟล์ กรุณาเปิดจากหน้า Wiki Portal");
    return;
  }

  if (!isAllowedDocPath(docPath)) {
    showError("เส้นทางไฟล์ไม่ถูกต้อง (อนุญาตเฉพาะ .md ใต้ docs/mvp, docs/shared, docs/vision, docs/wiki)");
    return;
  }

  pathEl.textContent = docPath;
  rawEl.href = docPath;

  fetch(docPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`โหลดไฟล์ไม่สำเร็จ (${response.status})`);
      }
      return response.text();
    })
    .then((markdown) => {
      const html = renderMarkdown(markdown);
      contentEl.innerHTML = html;
      const mainTitle = readMainTitle(markdown) || fileNameOf(docPath);
      titleEl.textContent = mainTitle;
      document.title = `${mainTitle} | Wiki Viewer`;
      buildToc();
    })
    .catch((err) => {
      const isFileOrigin = window.location.protocol === "file:";
      if (isFileOrigin) {
        showError("เปิดผ่าน file:// ทำให้เบราว์เซอร์บล็อกการโหลดไฟล์ ให้เปิดผ่าน local server เช่น `python3 -m http.server`");
      } else {
        showError(`เกิดข้อผิดพลาด: ${err.message}`);
      }
    });

  function showError(message) {
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  function isAllowedDocPath(path) {
    return /^\.\.\/(mvp|shared|vision|wiki)\/[a-z0-9._/-]+\.md$/i.test(path);
  }

  function fileNameOf(path) {
    const parts = path.split("/");
    return parts[parts.length - 1] || path;
  }

  function readMainTitle(markdown) {
    const lines = markdown.split(/\r?\n/);
    for (const line of lines) {
      const hit = line.match(/^#\s+(.+?)\s*$/);
      if (hit) {
        return hit[1].trim();
      }
    }
    return "";
  }

  function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r/g, "").split("\n");
    const out = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) {
        i += 1;
        continue;
      }

      if (/^```/.test(line)) {
        const lang = (line.slice(3).trim() || "text").toLowerCase();
        i += 1;
        const codeLines = [];
        while (i < lines.length && !/^```/.test(lines[i])) {
          codeLines.push(lines[i]);
          i += 1;
        }
        if (i < lines.length) i += 1;
        out.push(`<pre><code class="lang-${escapeHtml(lang)}">${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        continue;
      }

      if (isTableStart(lines, i)) {
        const table = parseTable(lines, i);
        out.push(table.html);
        i = table.nextIndex;
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        out.push(`<h${level}>${renderInline(text)}</h${level}>`);
        i += 1;
        continue;
      }

      if (/^>\s?/.test(line)) {
        const quoteLines = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          quoteLines.push(lines[i].replace(/^>\s?/, ""));
          i += 1;
        }
        out.push(`<blockquote>${renderInline(quoteLines.join(" "))}</blockquote>`);
        continue;
      }

      if (/^([-*_])\1{2,}\s*$/.test(line.trim())) {
        out.push("<hr />");
        i += 1;
        continue;
      }

      if (/^\s*[-*+]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*+]\s+/, "").trim());
          i += 1;
        }
        out.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+\.\s+/, "").trim());
          i += 1;
        }
        out.push(`<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`);
        continue;
      }

      const para = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines, i)) {
        para.push(lines[i].trim());
        i += 1;
      }
      out.push(`<p>${renderInline(para.join(" "))}</p>`);
    }

    return out.join("\n");
  }

  function isBlockStart(lines, i) {
    const line = lines[i];
    const next = lines[i + 1] || "";
    return (
      /^```/.test(line) ||
      /^(#{1,6})\s+/.test(line) ||
      /^>\s?/.test(line) ||
      /^([-*_])\1{2,}\s*$/.test(line.trim()) ||
      /^\s*[-*+]\s+/.test(line) ||
      /^\s*\d+\.\s+/.test(line) ||
      (line.includes("|") && isTableSeparator(next))
    );
  }

  function isTableStart(lines, i) {
    if (i + 1 >= lines.length) return false;
    return lines[i].includes("|") && isTableSeparator(lines[i + 1]);
  }

  function isTableSeparator(line) {
    if (!line || !line.includes("-")) return false;
    const cells = splitTableRow(line);
    if (cells.length === 0) return false;
    return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")));
  }

  function splitTableRow(line) {
    const cleaned = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    if (!cleaned) return [];
    return cleaned.split("|").map((c) => c.trim());
  }

  function parseTable(lines, start) {
    const header = splitTableRow(lines[start]);
    const aligns = splitTableRow(lines[start + 1]).map((cell) => {
      const raw = cell.replace(/\s+/g, "");
      if (raw.startsWith(":") && raw.endsWith(":")) return "center";
      if (raw.endsWith(":")) return "right";
      return "left";
    });

    let i = start + 2;
    const rows = [];
    while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
      rows.push(splitTableRow(lines[i]));
      i += 1;
    }

    const thead = `<thead><tr>${header
      .map((h, idx) => `<th style="text-align:${aligns[idx] || "left"}">${renderInline(h)}</th>`)
      .join("")}</tr></thead>`;

    const tbody = `<tbody>${rows
      .map((row) => {
        const cells = header.map((_, idx) => row[idx] || "");
        return `<tr>${cells
          .map((cell, idx) => `<td style="text-align:${aligns[idx] || "left"}">${renderInline(cell)}</td>`)
          .join("")}</tr>`;
      })
      .join("")}</tbody>`;

    return {
      html: `<table>${thead}${tbody}</table>`,
      nextIndex: i,
    };
  }

  function renderInline(text) {
    let s = escapeHtml(text);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const target = transformHref(href.trim());
      return `<a href="${escapeAttribute(target)}">${label}</a>`;
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return s;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(str) {
    return str.replace(/"/g, "%22");
  }

  function transformHref(href) {
    if (!href) return href;
    if (/^(https?:|mailto:|#)/i.test(href)) return href;
    if (!/\.md($|#|\?)/i.test(href)) return href;

    const resolved = resolveRelativePath(docPath, href.split("#")[0].split("?")[0]);
    if (!isAllowedDocPath(resolved)) return href;
    return `./view.html?doc=${encodeURIComponent(resolved)}`;
  }

  function resolveRelativePath(baseDoc, relative) {
    if (/^\.\.\//.test(relative)) {
      return normalizePath(relative);
    }
    const baseDir = baseDoc.slice(0, baseDoc.lastIndexOf("/") + 1);
    return normalizePath(`${baseDir}${relative}`);
  }

  function normalizePath(path) {
    const parts = path.split("/");
    const stack = [];
    for (const part of parts) {
      if (!part || part === ".") continue;
      if (part === "..") {
        if (stack.length && stack[stack.length - 1] !== "..") {
          stack.pop();
        } else {
          stack.push("..");
        }
      } else {
        stack.push(part);
      }
    }
    return stack.join("/");
  }

  function buildToc() {
    const headingNodes = contentEl.querySelectorAll("h1, h2, h3, h4");
    if (!headingNodes.length) {
      tocEl.innerHTML = "<p>ไม่พบหัวข้อย่อย</p>";
      return;
    }

    const used = new Set();
    const links = [];
    headingNodes.forEach((node) => {
      const level = Number(node.tagName.slice(1));
      const base = slugify(node.textContent || "section");
      const unique = uniqueSlug(base, used);
      node.id = unique;
      links.push(`<a class="lvl-${level}" href="#${unique}">${escapeHtml(node.textContent || "")}</a>`);
    });
    tocEl.innerHTML = links.join("");
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\u0E00-\u0E7F\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function uniqueSlug(base, used) {
    let slug = base || "section";
    let n = 2;
    while (used.has(slug)) {
      slug = `${base}-${n}`;
      n += 1;
    }
    used.add(slug);
    return slug;
  }
})();
