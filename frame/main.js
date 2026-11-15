/* =================================
   HEADER MENU
================================= */

const menuButton =
    document.querySelector(".menu-button");

const menuOverlay =
    document.querySelector(".menu-overlay");

const menuClose =
    document.querySelector(".menu-panel .panel-toggle");

const pageLinks =
    document.querySelectorAll(".page-index a");


/* =================================
   메뉴 열기
================================= */

function openMenu() {

    if (!menuButton || !menuOverlay) {

        return;

    }


    menuOverlay.classList.add(
        "is-open"
    );

    menuButton.classList.add(
        "is-open"
    );

    menuButton.setAttribute(
        "aria-expanded",
        "true"
    );

    menuOverlay.setAttribute(
        "aria-hidden",
        "false"
    );
}


/* =================================
   메뉴 닫기
================================= */

function closeMenu() {

    if (!menuButton || !menuOverlay) {

        return;

    }


    menuOverlay.classList.remove(
        "is-open"
    );

    menuButton.classList.remove(
        "is-open"
    );

    menuButton.setAttribute(
        "aria-expanded",
        "false"
    );

    menuOverlay.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* =================================
   햄버거
================================= */

if (menuButton) {

    menuButton.addEventListener(
        "click",
        () => {

            if (
                menuOverlay.classList.contains(
                    "is-open"
                )
            ) {

                closeMenu();

            } else {

                openMenu();

            }

        }
    );

}


/* =================================
   닫기
================================= */

if (menuClose) {

    menuClose.addEventListener(
        "click",
        closeMenu
    );

}


/* =================================
   바깥 클릭
================================= */

if (menuOverlay) {

    menuOverlay.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                menuOverlay
            ) {

                closeMenu();

            }

        }
    );

}


/* =================================
   목차 이동
================================= */

pageLinks.forEach(
    (link) => {

        link.addEventListener(
            "click",
            () => {

                closeMenu();

            }
        );

    }
);


/* =================================
   ESC
================================= */

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape"
        ) {

            closeMenu();

        }

    }
);

const siteTitle = document.querySelector(".site-title");

if (siteTitle) {
  siteTitle.addEventListener("click", () => {
    window.location.reload();
  });
}
