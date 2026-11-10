// LatticeWire site: hero lattice, benchmark tabs, stealth observer, copy buttons.
(() => {
  "use strict";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SVG = "http://www.w3.org/2000/svg";
  const el = (name, attrs = {}, parent) => {
    const node = document.createElementNS(SVG, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  };

  // ---------------- hero lattice ----------------
  function lattice() {
    const svg = document.getElementById("lattice");
    if (!svg) return;
    const W = 640, H = 560, STEP = 70, ROW = STEP * Math.sqrt(3) / 2;

    // A deterministic jitter, so the lattice looks hand-placed but is the same on every visit.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

    const defs = el("defs", {}, svg);
    const grad = el("linearGradient", { id: "wireGrad", x1: "0", x2: "1", y1: "0", y2: "0" }, defs);
    el("stop", { offset: "0", "stop-color": "#5B3DF5" }, grad);
    el("stop", { offset: "1", "stop-color": "#0891B2" }, grad);

    // Triangular lattice of nodes.
    const rows = [];
    for (let r = 0, y = 40; y < H - 20; r++, y += ROW) {
      const row = [];
      for (let c = 0, x = 30 + (r % 2 ? STEP / 2 : 0); x < W - 10; c++, x += STEP) {
        row.push({ x: x + (rand() - 0.5) * 12, y: y + (rand() - 0.5) * 12, r, c });
      }
      rows.push(row);
    }
    const edges = [];
    rows.forEach((row, r) => row.forEach((n, c) => {
      if (row[c + 1]) edges.push([n, row[c + 1]]);
      const below = rows[r + 1];
      if (!below) return;
      const off = r % 2; // odd rows are shifted right
      const a = below[c - 1 + off], b = below[c + off];
      if (a) edges.push([n, a]);
      if (b) edges.push([n, b]);
    }));

    const gEdges = el("g", {}, svg);
    const edgeEls = edges.map(([a, b]) => el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: "lat-edge" }, gEdges));

    // The wire: a path across the lattice from "your device" to "your server".
    // It wanders up and down on its way, climbing overall toward the server.
    const route = [];
    let r = Math.floor(rows.length * 0.72), c = 0;
    route.push(rows[r][c]);
    let last = 0;
    while (c < rows[r].length - 1) {
      const roll = rand();
      const dir = last !== 1 && r > 1 && roll < 0.38 ? -1 : last !== -1 && r < rows.length - 2 && roll > 0.82 ? 1 : 0;
      if (dir) {
        // Diagonal neighbours sit half a step left or right on the next row.
        const off = r % 2;
        const next = rows[r + dir][c + off];
        if (next) { r += dir; c += off; route.push(next); last = dir; continue; }
      }
      c += 1;
      last = 0;
      route.push(rows[r][c]);
    }
    const d = route.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("");
    const glow = el("path", { d, class: "lat-wire-glow" }, svg);
    const wire = el("path", { d, class: "lat-wire" }, svg);

    const gNodes = el("g", {}, svg);
    const onWire = new Set(route);
    const nodeEls = [];
    rows.flat().forEach((n) => {
      if (onWire.has(n)) return;
      const circle = el("circle", { cx: n.x, cy: n.y, r: 4, class: "lat-node" }, gNodes);
      nodeEls.push({ n, circle });
    });
    route.slice(1, -1).forEach((n) => el("circle", { cx: n.x, cy: n.y, r: 5, class: "lat-hop" }, svg));
    const start = route[0], end = route[route.length - 1];
    el("circle", { cx: start.x, cy: start.y, r: 9, class: "lat-end", fill: "#5B3DF5" }, svg);
    el("circle", { cx: end.x, cy: end.y, r: 9, class: "lat-end", fill: "#0891B2" }, svg);
    const label = (p, text, dy, anchor) => {
      const t = el("text", { x: p.x, y: p.y + dy, class: "lat-label", "text-anchor": anchor }, svg);
      t.textContent = text;
    };
    label(start, "your device", 28, "start");
    label(end, "your server", -18, "end");

    // Packets travelling along the wire.
    const len = wire.getTotalLength();
    const packets = [0, 0.33, 0.66].map((phase) => ({
      phase,
      halo: el("circle", { r: 11, class: "packet-halo" }, svg),
      dot: el("circle", { r: 5, class: "packet" }, svg),
    }));
    const place = (t) => packets.forEach((p) => {
      const pt = wire.getPointAtLength(((t + p.phase) % 1) * len);
      for (const node of [p.halo, p.dot]) { node.setAttribute("cx", pt.x); node.setAttribute("cy", pt.y); }
    });

    if (reduced) {
      place(0.1);
      return;
    }

    // Load sequence: edges sweep in left to right, then the wire draws, then packets run.
    edgeEls.forEach((line, i) => {
      const l = Math.hypot(line.x2.baseVal.value - line.x1.baseVal.value, line.y2.baseVal.value - line.y1.baseVal.value);
      line.style.strokeDasharray = l;
      line.style.strokeDashoffset = l;
      const delay = (Math.min(line.x1.baseVal.value, line.x2.baseVal.value) / W) * 600 + (i % 7) * 20;
      line.style.transition = `stroke-dashoffset 700ms ease ${delay}ms`;
    });
    for (const path of [wire, glow]) {
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.style.transition = "stroke-dashoffset 1100ms cubic-bezier(.6,.1,.2,1) 650ms";
    }
    packets.forEach((p) => { p.halo.style.opacity = 0; p.dot.style.opacity = 0; });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      edgeEls.forEach((line) => { line.style.strokeDashoffset = 0; });
      for (const path of [wire, glow]) path.style.strokeDashoffset = 0;
    }));

    let running = true, t0 = null;
    const tick = (now) => {
      if (!running) return;
      if (t0 === null) t0 = now;
      const elapsed = now - t0 - 1800; // wait for the wire to finish drawing
      if (elapsed > 0) {
        packets.forEach((p) => { p.halo.style.opacity = ""; p.dot.style.opacity = ""; });
        place((elapsed / 4200) % 1);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // Stop the loop when the hero is off screen.
    new IntersectionObserver(([entry]) => {
      const was = running;
      running = entry.isIntersecting;
      if (running && !was) requestAnimationFrame(tick);
    }).observe(svg);

    // Nodes near the pointer lift a little.
    const pt = svg.createSVGPoint();
    svg.addEventListener("pointermove", (e) => {
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      for (const { n, circle } of nodeEls) {
        circle.classList.toggle("near", Math.hypot(n.x - p.x, n.y - p.y) < 64);
      }
    });
    svg.addEventListener("pointerleave", () => nodeEls.forEach(({ circle }) => circle.classList.remove("near")));
  }

  // ---------------- tabs helper ----------------
  function tabs(root, attr, onSelect) {
    const buttons = [...root.querySelectorAll(`.tabs button[${attr}]`)];
    const select = (btn, focus) => {
      buttons.forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
      buttons.forEach((b) => (b.tabIndex = b === btn ? 0 : -1));
      if (focus) btn.focus();
      onSelect(btn.getAttribute(attr));
    };
    buttons.forEach((btn, i) => {
      btn.addEventListener("click", () => select(btn));
      btn.addEventListener("keydown", (e) => {
        const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (step) select(buttons[(i + step + buttons.length) % buttons.length], true);
      });
    });
    select(buttons.find((b) => b.getAttribute("aria-selected") === "true") || buttons[0]);
  }

  // ---------------- benchmark chart ----------------
  function chart() {
    const root = document.querySelector("[data-chart]");
    if (!root) return;
    // Mb/s: LatticeWire, Phantom, wireguard-go, kernel WireGuard (medians of 3).
    const data = [
      [7778, 6765, 5348, 2539],
      [7482, 6434, 5348, 2493],
      [9474, 8689, 6952, 2650],
      [9777, 8539, 6728, 2581],
    ];
    const MAX = 10000;
    const rows = [...root.querySelectorAll(".bar-row")];
    const shown = rows.map(() => 0);
    const fmt = (v) => `${(v / 1000).toFixed(1)} Gb/s`;
    tabs(root, "data-test", (i) => {
      data[i].forEach((v, k) => {
        rows[k].querySelector(".bar-fill").style.width = `${(v / MAX) * 100}%`;
        const out = rows[k].querySelector(".bar-val");
        const from = shown[k];
        shown[k] = v;
        if (reduced || from === 0) { out.textContent = fmt(v); return; }
        const t0 = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - t0) / 700);
          out.textContent = fmt(from + (v - from) * (1 - Math.pow(1 - t, 3)));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    });
  }

  // ---------------- stealth observer ----------------
  const MODES = {
    plain: {
      title: "Plain",
      body: "Encrypted LatticeWire datagrams on a port of your choice. Nobody can read them, but a careful network can tell it's a VPN.",
      when: "Best on networks you trust, for the highest speed.",
      packets: [
        ["0.0", "→", "UDP handshake fragment", "1,173 B", "#8A90B5"],
        ["0.1", "→", "UDP handshake fragment", "156 B", "#8A90B5"],
        ["2.3", "←", "UDP handshake fragment", "1,323 B", "#8A90B5"],
        ["2.4", "←", "UDP handshake fragment", "1,323 B", "#8A90B5"],
        ["2.5", "←", "UDP handshake fragment", "1,323 B", "#8A90B5"],
        ["4.9", "→", "UDP encrypted data", "1,441 B", "#5B3DF5"],
        ["5.0", "←", "UDP encrypted data", "1,441 B", "#5B3DF5"],
        ["5.0", "→", "UDP encrypted data", "1,441 B", "#5B3DF5"],
      ],
    },
    phantom: {
      title: "Phantom",
      body: "Opens with a QUIC handshake for the website you choose, then carries the tunnel in QUIC packets that continue that connection.",
      when: "Best where VPN protocols are blocked or slowed down.",
      packets: [
        ["0.0", "→", "QUIC Initial, ClientHello for cdn.example.net", "1,252 B", "#059669"],
        ["0.6", "←", "QUIC Initial + Handshake", "1,262 B", "#059669"],
        ["0.6", "←", "QUIC Handshake", "644 B", "#059669"],
        ["0.9", "→", "QUIC Initial + Handshake, Finished", "1,201 B", "#059669"],
        ["1.2", "→", "QUIC 1-RTT", "1,181 B", "#0891B2"],
        ["3.5", "←", "QUIC 1-RTT", "1,331 B", "#0891B2"],
        ["24", "↔", "QUIC 1-RTT, steady traffic", "1,4xx B", "#0891B2"],
      ],
    },
    ghost: {
      title: "Ghost",
      body: "Your server relays the genuine handshake of a real website to you, so the opening is the real thing, certificate and all.",
      when: "Best where networks inspect handshakes closely.",
      packets: [
        ["0.0", "→", "QUIC Initial, ClientHello for your site", "1,252 B", "#059669"],
        ["11", "←", "QUIC Initial, the site's real ServerHello", "1,252 B", "#059669"],
        ["13", "←", "QUIC Handshake, the site's real certificate", "1,252 B", "#059669"],
        ["16", "←", "QUIC Handshake", "1,252 B", "#059669"],
        ["20", "→", "QUIC 1-RTT", "1,181 B", "#0891B2"],
        ["23", "←", "QUIC 1-RTT", "1,331 B", "#0891B2"],
        ["40", "↔", "QUIC 1-RTT, steady traffic", "1,4xx B", "#0891B2"],
      ],
    },
    tls: {
      title: "TLS fallback",
      body: "When UDP gets no answer, the client switches to TLS on TCP port 443, the same as an HTTPS site. Anyone else who connects gets your real website.",
      when: "Best where UDP is blocked or throttled.",
      packets: [
        ["0.0", "→", "TCP connect to port 443", "74 B", "#8A90B5"],
        ["0.4", "←", "TCP accept", "74 B", "#8A90B5"],
        ["0.5", "→", "TLS ClientHello for your site", "517 B", "#B45309"],
        ["1.1", "←", "TLS ServerHello, certificate", "2,104 B", "#B45309"],
        ["1.6", "→", "TLS application data", "1,449 B", "#B45309"],
        ["1.9", "←", "TLS application data", "1,449 B", "#B45309"],
        ["30", "↔", "TLS application data, steady", "1,4xx B", "#B45309"],
      ],
    },
  };

  function observer() {
    const root = document.querySelector("[data-observer]");
    if (!root) return;
    const list = root.querySelector("[data-packets]");
    const title = root.querySelector("[data-mode-title]");
    const body = root.querySelector("[data-mode-body]");
    const when = root.querySelector("[data-mode-when]");
    tabs(root, "data-mode", (mode) => {
      const m = MODES[mode];
      title.textContent = m.title;
      body.textContent = m.body;
      when.textContent = m.when;
      list.replaceChildren(...m.packets.map(([t, dir, what, size, color], i) => {
        const li = document.createElement("li");
        li.style.setProperty("--c", color);
        li.style.animationDelay = `${i * 60}ms`;
        for (const [cls, text] of [["t", `${t} ms`], ["dir", dir], ["what", what], ["len", size]]) {
          const span = document.createElement("span");
          span.className = cls;
          span.textContent = text;
          li.appendChild(span);
        }
        return li;
      }));
    });
  }

  // ---------------- copy buttons ----------------
  function copyButtons() {
    document.querySelectorAll(".code .copy").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const text = btn.parentElement.querySelector("code").textContent;
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "Copied";
          btn.classList.add("done");
        } catch {
          btn.textContent = "Press Ctrl+C";
        }
        setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1600);
      });
    });
  }

  lattice();
  chart();
  observer();
  copyButtons();
})();
