(function () {

    "use strict";


    document.addEventListener(
        "DOMContentLoaded",
        function () {


            /*
            ======================================
            AÑO AUTOMÁTICO DEL FOOTER
            ======================================
            */

            document
                .querySelectorAll("#year")
                .forEach(element => {

                    element.textContent =
                        new Date()
                            .getFullYear();

                });


            /*
            ======================================
            BÚSQUEDA DESDE LA HOME
            ======================================
            */

            const searchForms =
                document.querySelectorAll(
                    ".hero-search"
                );


            searchForms.forEach(form => {

                form.addEventListener(
                    "submit",
                    function (event) {

                        const input =
                            form.querySelector(
                                "input[name='q']"
                            );


                        if (
                            !input ||
                            !input.value.trim()
                        ) {

                            event.preventDefault();

                            window.location.href =
                                "eventos.html";

                        }

                    }
                );

            });


            /*
            ======================================
            CATEGORÍAS
            ======================================
            */

            document
                .querySelectorAll(
                    ".category-card"
                )
                .forEach(card => {

                    card.addEventListener(
                        "click",
                        function () {

                            card.style.transform =
                                "translateY(-2px)";

                        }
                    );

                });


            /*
            ======================================
            ENLACES INTERNOS
            ======================================
            */

            document
                .querySelectorAll(
                    "a[href]"
                )
                .forEach(link => {

                    link.addEventListener(
                        "click",
                        function () {

                            /*
                            Espacio reservado para
                            analítica futura.
                            */

                        }
                    );

                });

        }
    );

})();
