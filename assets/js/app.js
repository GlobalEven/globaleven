(function () {

    "use strict";


    document.addEventListener("DOMContentLoaded", function () {


        /*
        ======================================
        AÑO AUTOMÁTICO DEL FOOTER
        ======================================
        */

        document.querySelectorAll("#year").forEach(function (element) {

            element.textContent = new Date().getFullYear();

        });


        /*
        ======================================
        BÚSQUEDA DESDE LA HOME
        ======================================
        */

        document.querySelectorAll(".hero-search").forEach(function (form) {

            form.addEventListener("submit", function (event) {

                const input = form.querySelector("input[name='q']");

                if (!input) {
                    return;
                }

                const query = input.value.trim();

                /*
                Si está vacío, simplemente vamos
                a la página general de eventos.
                */

                if (!query) {

                    event.preventDefault();

                    window.location.href = "eventos.html";

                }

            });

        });


        /*
        ======================================
        ANIMACIÓN DE TARJETAS DE CATEGORÍAS
        ======================================
        */

        document.querySelectorAll(".category-card").forEach(function (card) {

            card.addEventListener("click", function () {

                card.classList.add("category-card-clicked");

                setTimeout(function () {

                    card.classList.remove("category-card-clicked");

                }, 180);

            });

        });


        /*
        ======================================
        ENLACES INTERNOS
        ======================================
        */

        /*
        No modificamos los enlaces.
        GitHub Pages necesita que funcionen
        normalmente con rutas relativas.
        */


        /*
        ======================================
        ANALÍTICA FUTURA
        ======================================
        */

        /*
        Este espacio queda reservado para
        Google Analytics u otro sistema futuro.
        */


    });


})();
