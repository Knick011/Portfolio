/* Nihith (Nick) Mekala portfolio
   1. Invocursor replay in the hero
   2. Chart lightbox
   3. Copy email
   4. Current section in the nav */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Invocursor replay ---------- */

  const EXAMPLES = [
    {
      request: "switch to night mode",
      match: "“night mode” matches the <b>dark mode</b> action",
      action: "toggle_dark_mode",
      steps: [
        ["click", "#settings-menu"],
        ["click", "#appearance-tab"],
        ["toggle", "#dark-mode-switch"]
      ],
      missing: null,
      result: "All 3 targets found. Running the steps."
    },
    {
      request: "export this as a PDF",
      match: "“export this as a PDF” matches the <b>export report</b> action",
      action: "export_report_pdf",
      steps: [
        ["click", "#reports-nav"],
        ["click", "#export-pdf"]
      ],
      missing: "#export-pdf",
      result: "Stopped. #export-pdf isn't on this page, so nothing ran. The request is logged for review."
    }
  ];

  const demo = document.getElementById("demo");

  if (demo) {
    const reqEl = document.getElementById("demo-req");
    const matchEl = document.getElementById("demo-match");
    const planEl = document.getElementById("demo-plan");
    const checksEl = document.getElementById("demo-checks");
    const resultEl = document.getElementById("demo-result");
    const buttons = demo.querySelectorAll("[data-example]");

    let runId = 0;

    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    function planLines(ex) {
      const lines = [
        "{",
        `  <span class="k">"action"</span>: <span class="s">"${esc(ex.action)}"</span>,`,
        `  <span class="k">"steps"</span>: [`
      ];
      ex.steps.forEach(([verb, sel], i) => {
        const comma = i < ex.steps.length - 1 ? "," : "";
        lines.push(`    { <span class="k">"${verb}"</span>: <span class="s sel" data-sel="${esc(sel)}">"${esc(sel)}"</span> }${comma}`);
      });
      lines.push("  ]", "}");
      return lines;
    }

    function renderPlan(ex, hidden) {
      planEl.innerHTML = planLines(ex)
        .map((l) => `<span class="ln${hidden ? " is-hidden" : ""}">${l}</span>`)
        .join("\n");
    }

    function checkItem(sel) {
      const li = document.createElement("li");
      li.className = "is-pending";
      li.innerHTML = `<span class="tick" aria-hidden="true"></span><code>${esc(sel)}</code> <span class="state">checking</span>`;
      return li;
    }

    function setCheck(li, ok) {
      li.className = ok ? "is-pass" : "is-fail";
      li.querySelector(".state").textContent = ok ? "found" : "isn't on this page";
    }

    function selInPlan(sel) {
      return planEl.querySelector(`.sel[data-sel="${CSS.escape(sel)}"]`);
    }

    function setPressed(index) {
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.example) === index)));
    }

    function renderFinal(ex) {
      demo.classList.remove("is-typing");
      reqEl.textContent = ex.request;
      matchEl.innerHTML = ex.match;
      matchEl.classList.remove("is-hidden");
      renderPlan(ex, false);
      checksEl.innerHTML = "";
      for (const [, sel] of ex.steps) {
        const li = checkItem(sel);
        const ok = sel !== ex.missing;
        setCheck(li, ok);
        checksEl.appendChild(li);
        const s = selInPlan(sel);
        if (s) s.classList.add(ok ? "is-pass" : "is-fail");
        if (!ok) break;
      }
      resultEl.textContent = ex.result;
      resultEl.className = "demo-result " + (ex.missing ? "is-fail" : "is-pass");
    }

    const wait = (ms, id) =>
      new Promise((resolve, reject) => {
        setTimeout(() => (id === runId ? resolve() : reject(new Error("cancelled"))), ms);
      });

    async function play(index) {
      const ex = EXAMPLES[index];
      const id = ++runId;
      setPressed(index);

      if (reduceMotion) {
        renderFinal(ex);
        return;
      }

      try {
        // Reset
        reqEl.textContent = "";
        matchEl.innerHTML = ex.match;
        matchEl.classList.add("is-hidden");
        renderPlan(ex, true);
        checksEl.innerHTML = "";
        resultEl.textContent = "";
        resultEl.className = "demo-result";
        demo.classList.add("is-typing");

        // Type the request
        await wait(250, id);
        for (const ch of ex.request) {
          reqEl.textContent += ch;
          await wait(38, id);
        }
        demo.classList.remove("is-typing");

        // Synonym match
        await wait(250, id);
        matchEl.classList.remove("is-hidden");

        // The model's plan arrives
        await wait(400, id);
        for (const line of planEl.querySelectorAll(".ln")) {
          line.classList.remove("is-hidden");
          await wait(70, id);
        }

        // The engine checks each target against the page
        await wait(300, id);
        for (const [, sel] of ex.steps) {
          const li = checkItem(sel);
          checksEl.appendChild(li);
          const s = selInPlan(sel);
          if (s) s.classList.add("is-target");
          await wait(520, id);
          const ok = sel !== ex.missing;
          setCheck(li, ok);
          if (s) {
            s.classList.remove("is-target");
            s.classList.add(ok ? "is-pass" : "is-fail");
          }
          if (!ok) break;
          await wait(120, id);
        }

        // Outcome
        await wait(250, id);
        resultEl.textContent = ex.result;
        resultEl.className = "demo-result " + (ex.missing ? "is-fail" : "is-pass");
      } catch (e) {
        /* A newer run took over. */
      }
    }

    buttons.forEach((b) => b.addEventListener("click", () => play(Number(b.dataset.example))));

    // Play once on load, only when the demo is on screen.
    if ("IntersectionObserver" in window && !reduceMotion) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          play(0);
        }
      }, { threshold: 0.35 });
      io.observe(demo);
    }
  }

  /* ---------- 2. Chart lightbox ---------- */

  const dlg = document.getElementById("lightbox");

  if (dlg && typeof dlg.showModal === "function") {
    const img = document.getElementById("lightbox-img");
    const cap = document.getElementById("lightbox-caption");
    const count = document.getElementById("lightbox-count");
    let group = [];
    let idx = 0;

    function show(i) {
      idx = (i + group.length) % group.length;
      const btn = group[idx];
      img.src = btn.dataset.full;
      img.alt = btn.querySelector("img").alt;
      cap.textContent = btn.dataset.caption;
      count.textContent = `${idx + 1} of ${group.length}`;
      if (!dlg.open) dlg.showModal();
    }

    document.querySelectorAll(".figs").forEach((list) => {
      const items = Array.from(list.querySelectorAll(".fig"));
      items.forEach((btn, i) =>
        btn.addEventListener("click", () => {
          group = items;
          show(i);
        })
      );
    });

    document.getElementById("lightbox-prev").addEventListener("click", () => show(idx - 1));
    document.getElementById("lightbox-next").addEventListener("click", () => show(idx + 1));
    document.getElementById("lightbox-close").addEventListener("click", () => dlg.close());

    dlg.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });

    // Close when the backdrop is clicked
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });

    dlg.addEventListener("close", () => {
      img.removeAttribute("src");
    });
  } else {
    // Old browsers: open the full image instead.
    document.querySelectorAll(".fig").forEach((btn) =>
      btn.addEventListener("click", () => window.open(btn.dataset.full, "_blank", "noopener"))
    );
  }

  /* ---------- 3. Copy email ---------- */

  const copyBtn = document.getElementById("copy-email");
  const copyStatus = document.getElementById("copy-status");

  if (copyBtn) {
    if (!navigator.clipboard) {
      copyBtn.hidden = true;
    } else {
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(copyBtn.dataset.email);
          copyBtn.textContent = "Copied";
          copyBtn.classList.add("is-done");
          copyStatus.textContent = "Email address copied";
          setTimeout(() => {
            copyBtn.textContent = "Copy";
            copyBtn.classList.remove("is-done");
            copyStatus.textContent = "";
          }, 2000);
        } catch (e) {
          copyStatus.textContent = "Couldn't copy. Select the address and copy it instead.";
        }
      });
    }
  }

  /* ---------- 4. Current section in the nav ---------- */

  const navLinks = Array.from(document.querySelectorAll(".nav a"));
  const sections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) => {
            if (a.getAttribute("href") === "#" + entry.target.id) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-35% 0px -60% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }
})();
