/* =================================
   ELEMENT
================================= */

const divider =
    document.querySelector("#divider");

const historyPanel =
    document.querySelector(".history");

const demoPanel =
    document.querySelector(".demo");

const panelToggle =
    document.querySelector(".panel-toggle");


/* =================================
   설정
================================= */

/*
    Demo 패널 비율

    0   = 완전히 닫힘
    0.3 = 기본
    0.5 = 최대
*/

const MIN_DEMO_RATIO = 0;

const DEFAULT_DEMO_RATIO = 0.3;

const MAX_DEMO_RATIO = 0.5;


/* =================================
   상태
================================= */

let demoRatio =
    DEFAULT_DEMO_RATIO;

let isDividerDragging = false;


/* =================================
   패널 레이아웃
================================= */

function updateDividerLayout(ratio) {

    ratio =
        Math.max(
            MIN_DEMO_RATIO,
            Math.min(
                MAX_DEMO_RATIO,
                ratio
            )
        );


    demoRatio =
        ratio;


    const historyRatio =
        1 - ratio;


    /* =================================
       왼쪽 History
    ================================= */

    if (historyPanel) {

        historyPanel.style.width =
            `${historyRatio * 100}%`;

    }


    /* =================================
       오른쪽 Demo
    ================================= */

    if (demoPanel) {

        demoPanel.style.width =
            `${ratio * 100}%`;

    }


    /* =================================
       Divider 위치
    ================================= */

    if (divider) {

        divider.style.left =
            `${historyRatio * 100}%`;

    }


    /* =================================
       패널 버튼
    ================================= */

    if (!panelToggle) {

        return;

    }


    if (ratio === 0) {

        /*
            Demo가 닫힌 상태
        */

        panelToggle.textContent =
            "←";

        panelToggle.setAttribute(
            "aria-label",
            "패널 열기"
        );

    } else {

        /*
            Demo가 열린 상태
        */

        panelToggle.textContent =
            "→";

        panelToggle.setAttribute(
            "aria-label",
            "패널 닫기"
        );

    }

}


/* =================================
   패널 버튼
================================= */

if (panelToggle) {

    panelToggle.addEventListener(
        "click",
        () => {

            if (demoRatio > 0) {

                /* 닫기 */

                updateDividerLayout(
                    MIN_DEMO_RATIO
                );

            } else {

                /* 다시 열기 */

                updateDividerLayout(
                    DEFAULT_DEMO_RATIO
                );

            }

        }
    );

}


/* =================================
   DIVIDER
   드래그 시작
================================= */

if (divider) {

    divider.addEventListener(
        "mousedown",
        (event) => {

            isDividerDragging = true;


            document.body.classList.add(
                "is-dragging"
            );


            event.preventDefault();

        }
    );

}


/* =================================
   드래그 중
================================= */

window.addEventListener(
    "mousemove",
    (event) => {

        if (
            !isDividerDragging
        ) {

            return;

        }


        /*
            브라우저 전체 너비를 기준으로
            Divider 위치를 계산한다.
        */

        const screenWidth =
            window.innerWidth;


        const historyRatio =
            event.clientX /
            screenWidth;


        const newDemoRatio =
            1 -
            historyRatio;


        updateDividerLayout(
            newDemoRatio
        );

    }
);


/* =================================
   드래그 종료
================================= */

window.addEventListener(
    "mouseup",
    () => {

        if (
            !isDividerDragging
        ) {

            return;

        }


        isDividerDragging =
            false;


        document.body.classList.remove(
            "is-dragging"
        );

    }
);


/* =================================
   마우스가 창 밖으로 나간 경우
================================= */

window.addEventListener(
    "blur",
    () => {

        if (
            !isDividerDragging
        ) {

            return;

        }


        isDividerDragging =
            false;


        document.body.classList.remove(
            "is-dragging"
        );

    }
);


/* =================================
   초기 상태
================================= */

updateDividerLayout(
    DEFAULT_DEMO_RATIO
);