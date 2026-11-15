const textBox =
    document.querySelector(".text-box");


if (textBox) {

    textBox.addEventListener(
        "mouseenter",
        () => {

            console.log(
                "글상자 영역"
            );

        }
    );


    textBox.addEventListener(
        "mouseleave",
        () => {

            console.log(
                "글상자에서 나감"
            );

        }
    );

}