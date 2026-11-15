const leftPage =
    document.querySelector(".page-left");

const rightPage =
    document.querySelector(".page-right");

const prevPage =
    document.querySelector(".page-prev");

const nextPage =
    document.querySelector(".page-next");

const bookPages =
    document.querySelector(".book-pages");


let current = 0;

let isTurning = false;


/* =================================
   페이지 데이터
================================= */

const pages = [
    {
        number: "01",
        title: "한 방향으로 확장되던 틀",
        text:
            "한 방향으로 이어지던 기록의 틀은 점차 가로와 세로가 고정된 형태로 발전했다."
    },

    {
        number: "02",
        title: "고정된 공간",
        text:
            "일정한 크기의 공간 안에 글자와 요소를 배치하면서 하나의 화면 안에서 내용을 구성할 수 있게 되었다."
    },

    {
        number: "03",
        title: "이어지는 페이지",
        text:
            "고정된 페이지를 앞뒤로 이어 붙이며 내용을 확장하고, 페이지마다 반복되는 구조를 통해 통일감 있는 구성을 만들었다."
    },

    {
        number: "04",
        title: "구성의 규칙",
        text:
            "또한 페이지의 크기는 단일 페이지가 되기도, 양쪽 페이지를 모두 활용하기도 하는 방식으로 다양하게 활용되었다. 페이지마다 반복되는 구성의 규칙은 독자가 내용을 쉽게 이해하도록 돕는 역할을 했다."
    },

    {
        number: "05",
        title: "",
        text: ""
    },

    {
        number: "06",
        title: "비워진 면",
        text:
            "때로는 종이의 한 면이나 두 면을 비워 새로운 장의 시작을 알렸다. 비어 있는 공간 또한 구성의 일부가 되었다."
    }
];


/* =================================
   페이지 내용
================================= */

function setPage(
    element,
    data
) {
    const number =
        element.querySelector(
            ".page-number"
        );

    const title =
        element.querySelector(
            ".page-title"
        );

    const text =
        element.querySelector(
            ".page-text"
        );

    // 기존 색상 초기화
    element.classList.remove("page-blank");

    if (!data) {
        element.style.visibility =
            "hidden";

        number.textContent = "";
        title.textContent = "";
        text.textContent = "";

        return;
    }

    element.style.visibility =
        "visible";

    number.textContent =
        data.number;

    title.textContent =
        data.title;

    text.textContent =
        data.text;

    // 05페이지
    if (data.number === "05") {
        element.classList.add(
            "page-blank"
        );
    }
}

/* =================================
   화면 업데이트
================================= */

function updatePages() {

    setPage(
        prevPage,
        pages[current - 1]
    );

    setPage(
        leftPage,
        pages[current]
    );

    setPage(
        rightPage,
        pages[current + 1]
    );

    setPage(
        nextPage,
        pages[current + 2]
    );
}


/* =================================
   오른쪽 페이지
================================= */

rightPage.addEventListener(
    "click",
    () => {

        if (isTurning) {
            return;
        }


        if (
            current + 2 >=
            pages.length
        ) {
            return;
        }


        isTurning = true;

        current += 2;

        updatePages();


        setTimeout(
            () => {

                isTurning = false;

            },
            300
        );

    }
);


/* =================================
   왼쪽 페이지
================================= */

leftPage.addEventListener(
    "click",
    () => {

        if (isTurning) {
            return;
        }


        if (current <= 0) {
            return;
        }


        isTurning = true;

        current -= 2;

        updatePages();


        setTimeout(
            () => {

                isTurning = false;

            },
            300
        );

    }
);


/* =================================
   커서 안내문
================================= */

let bookGuide =
    document.querySelector(
        ".book-cursor-guide"
    );


if (
    bookPages &&
    !bookGuide
) {

    bookGuide =
        document.createElement(
            "div"
        );

    bookGuide.className =
        "book-cursor-guide";

    bookGuide.textContent = "";

    bookPages.appendChild(
        bookGuide
    );

}


/* =================================
   커서 이동
================================= */

if (
    bookPages &&
    bookGuide
) {

    bookPages.addEventListener(
        "mousemove",
        (event) => {

            const target =
                event.target.closest(
                    ".page-left, .page-right"
                );


            /* -------------------------
               페이지가 아니면 숨김
            ------------------------- */

            if (!target) {

                bookGuide.style.opacity =
                    "0";

                return;
            }


            /* -------------------------
               오른쪽 페이지
            ------------------------- */

            if (
                target.classList.contains(
                    "page-right"
                )
            ) {

                const rightPageNumber =
                    current + 1;


                /* 마지막 페이지 */

                if (
                    rightPageNumber ===
                    pages.length - 1
                ) {

                    bookGuide.textContent =
                        "마지막 페이지입니다";

                }


                /* 일반 오른쪽 페이지 */

                else {

                    bookGuide.textContent =
                        "클릭하면 다음 페이지";

                }

            }


            /* -------------------------
               왼쪽 페이지
            ------------------------- */

            else {

                const leftPageNumber =
                    current;


                /* 첫 번째 페이지 */

                if (
                    leftPageNumber === 0
                ) {

                    bookGuide.style.opacity =
                        "0";

                    return;
                }


                /* 일반 왼쪽 페이지 */

                else {

                    bookGuide.textContent =
                        "클릭하면 이전페이지";

                }

            }


            /* -------------------------
               커서 위치
            ------------------------- */

            const rect =
                bookPages.getBoundingClientRect();


            bookGuide.style.left =
                `${
                    event.clientX -
                    rect.left
                }px`;


            bookGuide.style.top =
                `${
                    event.clientY -
                    rect.top
                }px`;


            bookGuide.style.opacity =
                "1";

        }
    );


    /* -------------------------
       책 밖으로 나가면 숨김
    ------------------------- */

    bookPages.addEventListener(
        "mouseleave",
        () => {

            bookGuide.style.opacity =
                "0";

        }
    );

}

/* =================================
   시작
================================= */

updatePages();