/* =================================
   ELEMENTS
================================= */

const history =
    document.querySelector(".history");


const paperWindow =
    document.querySelector(".paper-window");


const paperEnd =
    document.querySelector(".paper-end");


const scrollElement =
    document.querySelector(".scroll");


const scrollGuide =
    document.querySelector(".scroll-guide");


/* =================================
   설정
================================= */

const UNFOLD_DISTANCE =
    window.innerHeight * 1.2;


const MIN_HEIGHT =
    window.innerHeight * 0.08;


const MAX_HEIGHT =
    window.innerHeight * 1;


/* =================================
   제한
================================= */

function clamp(
    value,
    min,
    max
) {

    return Math.max(
        min,
        Math.min(max, value)
    );

}


/* =================================
   초기 상태
================================= */

if (paperWindow) {

    paperWindow.style.height =
        `${MIN_HEIGHT}px`;

}


/* =================================
   스크롤
================================= */

if (history && paperWindow) {

    history.addEventListener(
        "scroll",
        () => {

            const scrollY =
                history.scrollTop;


            /* -----------------------------
               펼쳐지는 정도 계산
            ----------------------------- */

            let progress =
                scrollY /
                UNFOLD_DISTANCE;


            progress =
                clamp(
                    progress,
                    0,
                    1
                );


            /* -----------------------------
               종이 높이
            ----------------------------- */

            const currentHeight =
                MIN_HEIGHT +
                (
                    MAX_HEIGHT -
                    MIN_HEIGHT
                ) *
                progress;


            paperWindow.style.height =
                `${currentHeight}px`;


            /* -----------------------------
               종이 끝
            ----------------------------- */

            if (paperEnd) {

                const paperEndY =
                    currentHeight - 12;


                paperEnd.style.top =
                    `${paperEndY}px`;


                if (progress >= 1) {

                    paperEnd.style.opacity =
                        "1";

                } else {

                    paperEnd.style.opacity =
                        "0";

                }

            }


            /* -----------------------------
               안내문
            ----------------------------- */

            if (scrollGuide) {

                if (scrollY > 5) {

                    /*
                       스크롤 시작
                       → 안내문 숨김
                    */

                    scrollGuide.classList.add(
                        "is-hidden"
                    );

                } else {

                    /*
                       다시 맨 위
                       → 안내문 다시 표시
                    */

                    scrollGuide.classList.remove(
                        "is-hidden"
                    );

                }

            }

        },
        {
            passive: true
        }
    );

}


/* =================================
   마우스를 올리면 살짝 펼쳐짐
================================= */

if (
    paperWindow &&
    scrollElement
) {

    paperWindow.addEventListener(
        "mouseenter",
        () => {

            scrollElement.classList.add(
                "is-unrolling"
            );

            paperWindow.style.height =
                `${window.innerHeight * 0.14}px`;

        }
    );


    paperWindow.addEventListener(
        "mouseleave",
        () => {

            scrollElement.classList.remove(
                "is-unrolling"
            );

            const scrollY =
                history
                    ? history.scrollTop
                    : 0;


            let progress =
                scrollY /
                UNFOLD_DISTANCE;


            progress =
                clamp(
                    progress,
                    0,
                    1
                );


            const currentHeight =
                MIN_HEIGHT +
                (
                    MAX_HEIGHT -
                    MIN_HEIGHT
                ) *
                progress;


            paperWindow.style.height =
                `${currentHeight}px`;

        }
    );

}


/* =================================
   처음 안내문 표시
================================= */

if (scrollGuide) {

    scrollGuide.classList.remove(
        "is-hidden"
    );

}