/* ============================================================
   data 폴더의 내용을 index.html 의 틀 안에 그려 넣는 파일입니다.
   보통은 고칠 일이 없습니다.

   글 내용은  data/site.json  과  data/works.json  에 있습니다.
   ============================================================ */

(function () {
  "use strict";

  // data-slot="이름" 이 붙은 자리를 찾습니다
  function slot(name) {
    return document.querySelector('[data-slot="' + name + '"]');
  }

  // 태그를 하나 만듭니다. 글자는 textContent 로 넣기 때문에
  // 내용에 < > & 같은 기호가 들어가도 그대로 안전하게 보입니다.
  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  // href 가 있으면 링크로, 없으면 그냥 글자로 만듭니다
  function maybeLink(text, href) {
    if (!href) return document.createTextNode(text);
    var a = make("a", null, text);
    a.href = href;
    if (/^https?:/i.test(href)) {       // 바깥 사이트는 새 탭에서
      a.target = "_blank";
      a.rel = "noopener";
    }
    return a;
  }

  function fill(name, build) {
    var box = slot(name);
    if (box) build(box);
  }

  function render(site, works) {
    document.title = site.nameKo + " " + site.nameEn;

    // ---------- 이름 ----------
    fill("name", function (box) {
      box.textContent = "";
      box.appendChild(make("span", null, site.nameKo));
      box.appendChild(document.createTextNode(" "));
      box.appendChild(make("span", "name-en", site.nameEn));
    });

    // ---------- 메뉴 ----------
    fill("nav", function (box) {
      (site.nav || []).forEach(function (item) {
        var a = make("a", null, item.label);
        a.href = item.href;
        box.appendChild(a);
      });
    });

    // ---------- 작업 목록 ----------
    fill("works", function (box) {
      (works || []).forEach(function (w) {
        var li = make("li", "work");
        li.appendChild(make("span", "work-year", w.year));

        var title = make("span", "work-title");
        title.appendChild(maybeLink(w.title, w.href));
        li.appendChild(title);

        li.appendChild(make("span", "work-summary", w.summary));
        box.appendChild(li);
      });
    });

    // ---------- 소개 ----------
    fill("about", function (box) { box.textContent = site.about; });

    // ---------- 연락처 ----------
    fill("contact", function (box) {
      (site.contact || []).forEach(function (item) {
        var li = make("li");
        li.appendChild(maybeLink(item.label, item.href));
        box.appendChild(li);
      });
    });

    // ---------- 맨 아래 ----------
    fill("colophon", function (box) { box.textContent = site.colophon; });
  }

  function load(path) {
    return fetch(path, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error(path + " 를 불러오지 못했습니다 (" + res.status + ")");
      return res.json();
    });
  }

  Promise.all([load("data/site.json"), load("data/works.json")])
    .then(function (results) {
      render(results[0], results[1].works);
    })
    .catch(function (err) {
      // 흔한 원인: index.html 을 그냥 더블클릭해서 열었을 때입니다.
      // 브라우저가 file:// 주소에서는 보안 때문에 data 폴더를 읽지 못합니다.
      var box = slot("works");
      var local = location.protocol === "file:";
      if (box) {
        box.appendChild(make("li", null,
          local
            ? "내용을 불러오지 못했습니다. 파일을 더블클릭해서 열면 브라우저가 data 폴더를 읽지 못합니다. VS Code 의 Live Server 로 열거나, 인터넷에 올린 주소로 확인해 주세요."
            : "내용을 불러오지 못했습니다. data/site.json 과 data/works.json 이 제자리에 있는지, 쉼표나 따옴표가 빠지지 않았는지 확인해 주세요."
        ));
      }
      if (window.console) console.error(err);
    });

})();
