/* ============================================================
   data 폴더의 내용을 화면에 그려 넣는 파일입니다.
   첫 화면(index.html)과 상세 페이지(work.html) 둘 다 이 파일을 씁니다.
   보통은 고칠 일이 없습니다.

   글 내용은 data 폴더에 있습니다.
     data/site.json     이름, 소개, 메뉴, 연락처
     data/works.json    작업 목록   →  /work/이름
     data/notes.json    노트        →  /note/이름
     data/studies.json  스터디      →  /study/이름
   ============================================================ */

(function () {
  "use strict";

  // 목록 세 가지. 첫 화면의 자리 이름(slot)과 상세 페이지 주소가 여기서 정해집니다.
  var KINDS = {
    work:  { slot: "works",   anchor: "#work",  back: "작업 목록으로 돌아가기",   missing: "없는 작업",   missingText: "그런 작업을 찾지 못했습니다." },
    note:  { slot: "notes",   anchor: "#note",  back: "노트 목록으로 돌아가기",   missing: "없는 노트",   missingText: "그런 노트를 찾지 못했습니다." },
    study: { slot: "studies", anchor: "#study", back: "스터디 목록으로 돌아가기", missing: "없는 스터디", missingText: "그런 스터디를 찾지 못했습니다." }
  };

  function slot(name) {
    return document.querySelector('[data-slot="' + name + '"]');
  }

  // 글자는 textContent 로 넣기 때문에 < > & 같은 기호가 들어가도 안전합니다.
  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function link(text, href, className) {
    var a = make("a", className, text);
    a.href = href;
    if (/^https?:/i.test(href)) {      // 바깥 사이트는 새 탭에서
      a.target = "_blank";
      a.rel = "noopener";
    }
    return a;
  }

  function maybeLink(text, href) {
    return href ? link(text, href) : document.createTextNode(text);
  }

  function fill(name, build) {
    var box = slot(name);
    if (box) build(box);
  }

  // 문단 사이를 빈 줄로 나눕니다
  function paragraphs(text) {
    return String(text || "").split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // 주소에서 종류와 아이디를 꺼냅니다.  /study/aistudy  →  study, aistudy
  function currentEntry() {
    var m = location.pathname.match(/\/(work|note|study)\/([^/]+)\/?$/);
    if (m) return { kind: m[1], id: decodeURIComponent(m[2]) };
    var q = new URLSearchParams(location.search);
    var kind = q.get("kind");
    return { kind: KINDS[kind] ? kind : "work", id: q.get("id") || "" };
  }

  // ---------- 모든 페이지 공통 ----------
  function renderShell(site) {
    fill("name", function (box) {
      box.textContent = "";
      var a = link("", "/", null);
      a.appendChild(make("span", null, site.nameKo));
      a.appendChild(document.createTextNode(" "));
      a.appendChild(make("span", "name-en", site.nameEn));
      box.appendChild(a);
    });

    fill("nav", function (box) {
      box.textContent = "";
      (site.nav || []).forEach(function (item) {
        // 첫 화면 안의 위치로 가는 메뉴는, 다른 페이지에서는 첫 화면으로 보냅니다
        var href = item.href;
        if (href && href.charAt(0) === "#" && location.pathname !== "/") href = "/" + href;
        box.appendChild(link(item.label, href));
      });
    });

    fill("colophon", function (box) { box.textContent = site.colophon; });
  }

  // ---------- 첫 화면 ----------
  // 목록 한 칸: 연도, 제목, 한 줄 설명
  function renderList(kind, entries) {
    fill(KINDS[kind].slot, function (box) {
      box.textContent = "";
      entries.forEach(function (w) {
        var li = make("li", "work");
        li.appendChild(make("span", "work-year", w.year));

        var title = make("span", "work-title");
        title.appendChild(maybeLink(w.title, w.id ? "/" + kind + "/" + w.id : w.href));
        li.appendChild(title);

        li.appendChild(make("span", "work-summary", w.summary));
        box.appendChild(li);
      });

      // 글이 하나도 없는 노트, 스터디 칸은 숨깁니다
      var section = box.closest("section");
      if (section && kind !== "work") section.hidden = entries.length === 0;
    });
  }

  function renderHome(site, lists) {
    document.title = site.nameKo + " " + site.nameEn;

    renderList("work", lists.work);
    renderList("note", lists.note);
    renderList("study", lists.study);

    fill("about", function (box) { box.textContent = site.about; });

    fill("contact", function (box) {
      box.textContent = "";
      (site.contact || []).forEach(function (item) {
        var li = make("li");
        li.appendChild(maybeLink(item.label, item.href));
        box.appendChild(li);
      });
    });
  }

  // ---------- 상세 페이지 (작업, 노트, 스터디 공용) ----------

  // 스터디의 체크 목록. 같은 단계가 이어지면 단계 이름은 첫 줄에만 적습니다.
  function renderItems(items, body) {
    var doneCount = items.filter(function (it) { return it.done; }).length;
    body.appendChild(make("p", "items-count", "완료 " + doneCount + " / " + items.length));

    var list = make("ul", "items");
    var lastGroup = null;
    items.forEach(function (it) {
      var li = make("li", "item");
      li.appendChild(make("span", "item-group", it.group !== lastGroup ? it.group : ""));
      lastGroup = it.group;

      var text = make("div", "item-body");
      var title = make("span", "item-title");
      title.appendChild(maybeLink(it.title || "", it.url));
      if (it.done) title.appendChild(make("span", "item-done", "완료"));
      text.appendChild(title);
      if (it.note) text.appendChild(make("span", "item-note", it.note));
      li.appendChild(text);

      list.appendChild(li);
    });
    body.appendChild(list);
  }

  function renderDetail(site, lists) {
    var entry = currentEntry();
    var kind = KINDS[entry.kind];
    var work = (lists[entry.kind] || []).filter(function (w) { return w.id === entry.id; })[0];

    // 글을 다른 목록으로 옮겼을 때, 예전 주소로 들어와도 새 주소로 보내 줍니다
    if (!work) {
      var moved = Object.keys(KINDS).filter(function (k) {
        return (lists[k] || []).some(function (w) { return w.id === entry.id; });
      })[0];
      if (moved) {
        location.replace("/" + moved + "/" + encodeURIComponent(entry.id));
        return;
      }
    }

    fill("detail", function (box) {
      box.textContent = "";

      if (!work) {
        box.appendChild(make("h2", null, kind.missing));
        var miss = make("div", "work-detail");
        miss.appendChild(make("p", null, kind.missingText));
        miss.appendChild(link(kind.back, "/" + kind.anchor, "back-link"));
        box.appendChild(miss);
        return;
      }

      document.title = work.title + " — " + site.nameKo;

      box.appendChild(make("h2", null, work.year));

      var body = make("div", "work-detail");

      // 썸네일 — 화면 미리보기. 작업은 없으면 "준비 중" 칸을, 노트와 스터디는 없으면 비워 둡니다.
      if (work.thumbnail) {
        var figure = make("div", "thumb");
        var img = document.createElement("img");
        img.src = work.thumbnail;
        img.alt = work.title + " 화면";
        img.loading = "lazy";
        figure.appendChild(img);
        body.appendChild(figure);
      } else if (entry.kind === "work") {
        var empty = make("div", "thumb thumb-empty");
        empty.appendChild(make("span", null, "준비 중"));
        body.appendChild(empty);
      }

      body.appendChild(make("h3", "work-detail-title", work.title));
      if (work.summary) body.appendChild(make("p", "work-summary", work.summary));

      paragraphs(work.description).forEach(function (t) {
        body.appendChild(make("p", "work-para", t));
      });

      // 체크 목록 (스터디)
      var items = (work.items || []).filter(function (it) { return it && it.title; });
      if (items.length) renderItems(items, body);

      // 사이트 링크
      var links = (work.links || []).filter(function (l) { return l && l.url; });
      if (links.length) {
        var list = make("ul", "work-links");
        links.forEach(function (l) {
          var li = make("li");
          li.appendChild(link(l.label || l.url, l.url));
          list.appendChild(li);
        });
        body.appendChild(list);
      }

      body.appendChild(link(kind.back, "/" + kind.anchor, "back-link"));
      box.appendChild(body);
    });
  }

  function load(path) {
    return fetch(path, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error(path + " 를 불러오지 못했습니다 (" + res.status + ")");
      return res.json();
    });
  }

  // 노트와 스터디는 파일에 문제가 있어도 작업 목록까지 멈추지 않게, 빈 목록으로 둡니다
  function loadList(path, key) {
    return load(path)
      .then(function (data) { return data[key] || []; })
      .catch(function (err) {
        if (window.console) console.error(err);
        return [];
      });
  }

  Promise.all([
    load("/data/site.json"),
    load("/data/works.json"),
    loadList("/data/notes.json", "notes"),
    loadList("/data/studies.json", "studies")
  ])
    .then(function (r) {
      var site = r[0];
      var lists = { work: r[1].works || [], note: r[2], study: r[3] };
      renderShell(site);
      if (slot("detail")) renderDetail(site, lists);
      else renderHome(site, lists);
    })
    .catch(function (err) {
      // 흔한 원인: index.html 을 그냥 더블클릭해서 열었을 때입니다.
      var box = slot("works") || slot("detail");
      var local = location.protocol === "file:";
      if (box) {
        box.appendChild(make("p", null,
          local
            ? "내용을 불러오지 못했습니다. 파일을 더블클릭해서 열면 브라우저가 data 폴더를 읽지 못합니다. VS Code 의 Live Server 로 열거나, 인터넷에 올린 주소로 확인해 주세요."
            : "내용을 불러오지 못했습니다. data/site.json 과 data/works.json 의 쉼표나 따옴표가 빠지지 않았는지 확인해 주세요."
        ));
      }
      if (window.console) console.error(err);
    });

})();
