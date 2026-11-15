/* ============================================================
   data 폴더의 내용을 화면에 그려 넣는 파일입니다.
   첫 화면(index.html)과 작업 상세 페이지(work.html) 둘 다 이 파일을 씁니다.
   보통은 고칠 일이 없습니다.

   글 내용은  data/site.json  과  data/works.json  에 있습니다.
   ============================================================ */

(function () {
  "use strict";

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

  // 주소에서 작업 아이디를 꺼냅니다.  /work/sujip  →  sujip
  function currentWorkId() {
    var m = location.pathname.match(/\/work\/([^/]+)\/?$/);
    if (m) return decodeURIComponent(m[1]);
    return new URLSearchParams(location.search).get("id") || "";
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
  function renderHome(site, works) {
    document.title = site.nameKo + " " + site.nameEn;

    fill("works", function (box) {
      box.textContent = "";
      works.forEach(function (w) {
        var li = make("li", "work");
        li.appendChild(make("span", "work-year", w.year));

        var title = make("span", "work-title");
        title.appendChild(maybeLink(w.title, w.id ? "/work/" + w.id : w.href));
        li.appendChild(title);

        li.appendChild(make("span", "work-summary", w.summary));
        box.appendChild(li);
      });
    });

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

  // ---------- 작업 상세 페이지 ----------
  function renderDetail(site, works) {
    var id = currentWorkId();
    var work = works.filter(function (w) { return w.id === id; })[0];

    fill("detail", function (box) {
      box.textContent = "";

      if (!work) {
        box.appendChild(make("h2", null, "없는 작업"));
        var miss = make("div", "work-detail");
        miss.appendChild(make("p", null, "그런 작업을 찾지 못했습니다."));
        miss.appendChild(link("작업 목록으로 돌아가기", "/#work", "back-link"));
        box.appendChild(miss);
        return;
      }

      document.title = work.title + " — " + site.nameKo;

      box.appendChild(make("h2", null, work.year));

      var body = make("div", "work-detail");

      // 썸네일 — 사이트 화면 미리보기
      var figure = make("div", "thumb");
      if (work.thumbnail) {
        var img = document.createElement("img");
        img.src = work.thumbnail;
        img.alt = work.title + " 화면";
        img.loading = "lazy";
        figure.appendChild(img);
      } else {
        figure.className = "thumb thumb-empty";
        figure.appendChild(make("span", null, "준비 중"));
      }
      body.appendChild(figure);

      body.appendChild(make("h3", "work-detail-title", work.title));
      if (work.summary) body.appendChild(make("p", "work-summary", work.summary));

      paragraphs(work.description).forEach(function (t) {
        body.appendChild(make("p", "work-para", t));
      });

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

      body.appendChild(link("작업 목록으로 돌아가기", "/#work", "back-link"));
      box.appendChild(body);
    });
  }

  function load(path) {
    return fetch(path, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error(path + " 를 불러오지 못했습니다 (" + res.status + ")");
      return res.json();
    });
  }

  Promise.all([load("/data/site.json"), load("/data/works.json")])
    .then(function (r) {
      var site = r[0], works = r[1].works || [];
      renderShell(site);
      if (slot("detail")) renderDetail(site, works);
      else renderHome(site, works);
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
