(function () {

    "use strict";


    const events =
        window.GLOBALEVEN_EVENTS || [];


    function escapeHTML(value) {

        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function formatDate(date) {

        if (!date) {
            return "";
        }

        const parsed =
            new Date(date + "T12:00:00");


        return new Intl.DateTimeFormat(
            "es",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        ).format(parsed);
    }


    function createEventCard(event) {

        const image =
            event.image
                ?
                `
                <img
                    src="${escapeHTML(event.image)}"
                    alt="${escapeHTML(event.title)}"
                    loading="lazy"
                >
                `
                :
                `
                <span>📅</span>
                `;


        return `

        <article class="event-card">

            <div class="event-image">

                ${image}

            </div>


            <div class="event-body">

                <span class="event-tag">

                    ${escapeHTML(
                        event.categoryName ||
                        event.category ||
                        "Evento"
                    )}

                </span>


                <h3>

                    ${escapeHTML(event.title)}

                </h3>


                <p class="event-meta">

                    📅
                    ${formatDate(event.date)}

                </p>


                <p class="event-meta">

                    📍
                    ${escapeHTML(event.city)}

                    ${event.country
                        ? " · " +
                          escapeHTML(event.country)
                        : ""
                    }

                </p>


                ${
                    event.venue
                    ?
                    `
                    <p class="event-meta">

                        🏟️
                        ${escapeHTML(event.venue)}

                    </p>
                    `
                    :
                    ""
                }


                <a
                    href="evento.html?id=${encodeURIComponent(event.id)}"
                    class="event-link"
                >

                    Ver evento →

                </a>

            </div>

        </article>

        `;
    }


    function renderEvents(
        container,
        list
    ) {

        if (!container) {
            return;
        }


        container.innerHTML =
            list
                .map(createEventCard)
                .join("");


        const empty =
            document.getElementById(
                "no-events"
            );


        if (empty) {

            empty.style.display =
                list.length
                    ? "none"
                    : "block";
        }
    }


    function getParams() {

        return new URLSearchParams(
            window.location.search
        );
    }


    function filterEvents() {

        const params =
            getParams();


        const search =
            (
                document
                    .getElementById("event-search")
                    ?.value ||
                params.get("q") ||
                ""
            )
            .toLowerCase()
            .trim();


        const country =
            (
                document
                    .getElementById("country-filter")
                    ?.value ||
                params.get("pais") ||
                ""
            )
            .toLowerCase()
            .trim();


        const category =
            (
                document
                    .getElementById("category-filter")
                    ?.value ||
                params.get("categoria") ||
                ""
            )
            .toLowerCase()
            .trim();


        const city =
            (
                params.get("ciudad") ||
                ""
            )
            .toLowerCase()
            .trim();


        return events.filter(event => {

            const searchable = [

                event.title,

                event.city,

                event.country,

                event.category,

                event.categoryName,

                event.venue,

                event.description

            ]
            .join(" ")
            .toLowerCase();


            const matchesSearch =
                !search ||
                searchable.includes(search);


            const matchesCountry =
                !country ||
                event.country
                    .toLowerCase()
                    .includes(country);


            const matchesCategory =
                !category ||
                event.category
                    .toLowerCase()
                    === category;


            const matchesCity =
                !city ||
                event.city
                    .toLowerCase()
                    .includes(city);


            return (
                matchesSearch &&
                matchesCountry &&
                matchesCategory &&
                matchesCity
            );

        });
    }


    function populateCountries() {

        const select =
            document.getElementById(
                "country-filter"
            );


        if (!select) {
            return;
        }


        const countries =
            [
                ...new Set(
                    events
                        .map(
                            event =>
                                event.country
                        )
                        .filter(Boolean)
                )
            ]
            .sort(
                (a, b) =>
                    a.localeCompare(b)
            );


        countries.forEach(country => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                country.toLowerCase();


            option.textContent =
                country;


            select.appendChild(
                option
            );

        });


        const params =
            getParams();


        if (params.has("pais")) {

            select.value =
                params
                    .get("pais")
                    .toLowerCase();

        }
    }


    function setupEventPage() {

        const container =
            document.getElementById(
                "event-detail-content"
            );


        if (!container) {
            return;
        }


        const params =
            getParams();


        const id =
            params.get("id");


        const event =
            events.find(
                item =>
                    item.id === id
            );


        if (!event) {

            container.innerHTML = `

                <div class="empty-state">

                    <h1>
                        Evento no encontrado
                    </h1>

                    <p>
                        El evento solicitado
                        no está disponible.
                    </p>

                    <a
                        href="eventos.html"
                        class="primary-button"
                    >
                        Ver eventos
                    </a>

                </div>

            `;

            return;
        }


        document.title =
            event.title +
            " — GlobalEven";


        const image =
            event.image
                ?
                `
                <img
                    src="${escapeHTML(
                        event.image
                    )}"
                    alt="${escapeHTML(
                        event.title
                    )}"
                >
                `
                :
                `
                <span>📅</span>
                `;


        container.innerHTML = `

            <div class="event-detail-grid">

                <div class="event-detail-image">

                    ${image}

                </div>


                <div>

                    <span class="event-tag">

                        ${escapeHTML(
                            event.categoryName ||
                            event.category ||
                            "Evento"
                        )}

                    </span>


                    <h1>

                        ${escapeHTML(
                            event.title
                        )}

                    </h1>


                    <div class="detail-info">

                        <p>
                            📅
                            ${formatDate(
                                event.date
                            )}
                        </p>


                        <p>
                            🕐
                            ${escapeHTML(
                                event.time
                            )}
                        </p>


                        <p>
                            📍
                            ${escapeHTML(
                                event.city
                            )}
                            ·
                            ${escapeHTML(
                                event.country
                            )}
                        </p>


                        <p>
                            🏟️
                            ${escapeHTML(
                                event.venue
                            )}
                        </p>

                    </div>


                    <p>

                        ${escapeHTML(
                            event.description
                        )}

                    </p>


                    ${
                        event.url &&
                        event.url !== "#"
                        ?
                        `
                        <a
                            href="${escapeHTML(
                                event.url
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="primary-button"
                        >
                            Ver información oficial →
                        </a>
                        `
                        :
                        ""
                    }

                </div>

            </div>

        `;

    }


    function setupEventsPage() {

        const container =
            document.getElementById(
                "events-list"
            );


        if (!container) {
            return;
        }


        populateCountries();


        const search =
            document.getElementById(
                "event-search"
            );


        const country =
            document.getElementById(
                "country-filter"
            );


        const category =
            document.getElementById(
                "category-filter"
            );


        const params =
            getParams();


        if (search && params.has("q")) {

            search.value =
                params.get("q");

        }


        if (category &&
            params.has("categoria")) {

            category.value =
                params.get("categoria");

        }


        function update() {

            const filtered =
                filterEvents();


            filtered.sort(
                (a, b) =>
                    String(a.date)
                        .localeCompare(
                            String(b.date)
                        )
            );


            renderEvents(
                container,
                filtered
            );

        }


        search?.addEventListener(
            "input",
            update
        );


        country?.addEventListener(
            "change",
            update
        );


        category?.addEventListener(
            "change",
            update
        );


        update();

    }


    function setupHomeEvents() {

        const container =
            document.getElementById(
                "home-events"
            );


        if (!container) {
            return;
        }


        const upcoming =
            [...events]
                .sort(
                    (a, b) =>
                        String(a.date)
                            .localeCompare(
                                String(b.date)
                            )
                )
                .slice(0, 6);


        renderEvents(
            container,
            upcoming
        );

    }


    window.GlobalEven = {

        events,

        filterEvents,

        renderEvents,

        formatDate

    };


    document.addEventListener(
        "DOMContentLoaded",
        function () {

            setupHomeEvents();

            setupEventsPage();

            setupEventPage();

        }
    );


})();
