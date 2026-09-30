(function () {

    "use strict";

    /*
    ============================================================
    GLOBALEVEN - SISTEMA REAL DE EVENTOS
    ============================================================

    Fuente exclusiva:

    Ticketmaster
        ↓
    GitHub Actions
        ↓
    data/events.json
        ↓
    este archivo
        ↓
    GlobalEven

    NO utiliza eventos de demostración.
    ============================================================
    */

    let events = [];

    const EVENTS_JSON = "data/events.json";


    /*
    ============================================================
    ESCAPAR HTML
    ============================================================
    */

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /*
    ============================================================
    SLUGIFY
    ============================================================
    */

    function slugify(value) {

        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

    }


    /*
    ============================================================
    FECHA
    ============================================================
    */

    function formatDate(date) {

        if (!date) {
            return "";
        }

        const parsed =
            new Date(
                String(date) + "T12:00:00"
            );

        if (Number.isNaN(parsed.getTime())) {
            return "";
        }

        return new Intl.DateTimeFormat(
            "es",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        ).format(parsed);

    }


    /*
    ============================================================
    HORA
    ============================================================
    */

    function formatTime(time) {

        if (!time) {
            return "";
        }

        return String(time)
            .trim()
            .substring(0, 5);

    }


    /*
    ============================================================
    FECHA/HORA DEL EVENTO
    ============================================================
    */

    function getEventTimestamp(event) {

        if (!event || !event.date) {
            return NaN;
        }

        const date =
            String(event.date);

        const time =
            event.time
                ? String(event.time)
                : "00:00:00";

        const timestamp =
            new Date(
                date + "T" + time
            ).getTime();

        return timestamp;

    }


    /*
    ============================================================
    ESTADO DEL EVENTO
    ============================================================
    */

    function getEventStatus(event) {

        if (
            event &&
            event.status
        ) {

            return String(
                event.status
            ).toLowerCase();

        }

        const timestamp =
            getEventTimestamp(event);

        if (Number.isNaN(timestamp)) {
            return "proximo";
        }

        const now =
            Date.now();

        if (timestamp > now) {
            return "proximo";
        }

        return "pasado";

    }


    /*
    ============================================================
    NOMBRE DEL ESTADO
    ============================================================
    */

    function getStatusLabel(status) {

        switch (status) {

            case "ahora":
                return "Ahora";

            case "pasado":
                return "Pasado";

            case "proximo":
                return "Próximo";

            default:
                return "";

        }

    }


    /*
    ============================================================
    CLASE DEL ESTADO
    ============================================================
    */

    function getStatusClass(status) {

        switch (status) {

            case "ahora":
                return "event-status-now";

            case "pasado":
                return "event-status-past";

            case "proximo":
                return "event-status-upcoming";

            default:
                return "";

        }

    }


    /*
    ============================================================
    CARGAR EVENTS.JSON
    ============================================================
    */

    async function loadEvents() {

        const cacheBuster =
            "?v=" +
            Date.now();


        try {

            const response =
                await fetch(
                    EVENTS_JSON +
                    cacheBuster,
                    {
                        cache: "no-store"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "HTTP " +
                    response.status
                );

            }


            const data =
                await response.json();


            let loadedEvents = [];


            if (
                data &&
                Array.isArray(data.events)
            ) {

                loadedEvents =
                    data.events;

            }

            else if (
                Array.isArray(data)
            ) {

                loadedEvents =
                    data;

            }

            else {

                throw new Error(
                    "Formato de events.json no válido."
                );

            }


            events =
                loadedEvents
                    .filter(Boolean)
                    .map(normalizeEvent)
                    .filter(function (event) {

                        return Boolean(
                            event.id &&
                            event.title &&
                            event.date
                        );

                    });


            return events;


        } catch (error) {

            console.error(
                "GlobalEven: error cargando events.json",
                error
            );


            /*
            ====================================================
            IMPORTANTE

            NO usamos datos de demostración.

            Si events.json falla, mostramos un estado vacío.
            ====================================================
            */

            events = [];

            return events;

        }

    }


    /*
    ============================================================
    NORMALIZAR EVENTO
    ============================================================
    */

    function normalizeEvent(event) {

        const item =
            event || {};


        const normalized = {

            id:
                String(
                    item.id ?? ""
                ),

            title:
                String(
                    item.title ?? ""
                ),

            date:
                String(
                    item.date ?? ""
                ),

            time:
                String(
                    item.time ?? ""
                ),

            startDateTime:
                String(
                    item.startDateTime ?? ""
                ),

            endDateTime:
                String(
                    item.endDateTime ?? ""
                ),

            status:
                String(
                    item.status ?? ""
                ).toLowerCase(),

            city:
                String(
                    item.city ?? ""
                ),

            country:
                String(
                    item.country ?? ""
                ),

            countryCode:
                String(
                    item.countryCode ?? ""
                ),

            category:
                String(
                    item.category ?? "otros"
                ),

            categoryName:
                String(
                    item.categoryName ??
                    item.category ??
                    "Evento"
                ),

            venue:
                String(
                    item.venue ?? ""
                ),

            image:
                String(
                    item.image ?? ""
                ),

            description:
                String(
                    item.description ?? ""
                ),

            url:
                String(
                    item.url ?? ""
                ),

            source:
                String(
                    item.source ?? "ticketmaster"
                )

        };


        /*
        Si el backend no proporcionó estado,
        lo calculamos.
        */

        if (
            !normalized.status
        ) {

            normalized.status =
                getEventStatus(
                    normalized
                );

        }


        return normalized;

    }


    /*
    ============================================================
    CREAR TARJETA
    ============================================================
    */

    function createEventCard(event) {

        const status =
            getEventStatus(event);

        const statusLabel =
            getStatusLabel(status);


        const statusClass =
            getStatusClass(status);


        const image =
            event.image
                ?
                `
                <img
                    src="${escapeHTML(event.image)}"
                    alt="${escapeHTML(event.title)}"
                    loading="lazy"
                    onerror="this.style.display='none'; this.parentElement.classList.add('image-error');"
                >
                `
                :
                `
                <div class="event-image-placeholder">
                    <span>📅</span>
                </div>
                `;


        return `

            <article class="event-card">

                <div class="event-image">

                    ${image}

                    ${
                        statusLabel
                        ?
                        `
                        <span class="event-status ${statusClass}">
                            ${escapeHTML(statusLabel)}
                        </span>
                        `
                        :
                        ""
                    }

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

                        ${escapeHTML(
                            event.title ||
                            "Evento"
                        )}

                    </h3>


                    ${
                        event.date
                        ?
                        `
                        <p class="event-meta">

                            📅
                            ${escapeHTML(
                                formatDate(event.date)
                            )}

                        </p>
                        `
                        :
                        ""
                    }


                    ${
                        event.time
                        ?
                        `
                        <p class="event-meta">

                            🕐
                            ${escapeHTML(
                                formatTime(event.time)
                            )}

                        </p>
                        `
                        :
                        ""
                    }


                    ${
                        event.city ||
                        event.country
                        ?
                        `
                        <p class="event-meta">

                            📍

                            ${escapeHTML(
                                event.city
                            )}

                            ${
                                event.city &&
                                event.country
                                ? " · "
                                : ""
                            }

                            ${escapeHTML(
                                event.country
                            )}

                        </p>
                        `
                        :
                        ""
                    }


                    ${
                        event.venue
                        ?
                        `
                        <p class="event-meta">

                            🏟️
                            ${escapeHTML(
                                event.venue
                            )}

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


    /*
    ============================================================
    RENDERIZAR
    ============================================================
    */

    function renderEvents(
        container,
        list
    ) {

        if (!container) {
            return;
        }


        if (
            !Array.isArray(list) ||
            !list.length
        ) {

            showEmpty(container);

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
                "none";

        }

    }


    /*
    ============================================================
    CARGANDO
    ============================================================
    */

    function showLoading(container) {

        if (!container) {
            return;
        }


        container.innerHTML = `

            <div class="loading-state">

                <p>
                    Cargando eventos reales...
                </p>

            </div>

        `;

    }


    /*
    ============================================================
    VACÍO
    ============================================================
    */

    function showEmpty(container) {

        if (!container) {
            return;
        }


        container.innerHTML = `

            <div class="empty-state">

                <h2>
                    No hay eventos disponibles
                </h2>

                <p>
                    No encontramos eventos reales
                    disponibles para mostrar en este momento.
                </p>

            </div>

        `;

    }


    /*
    ============================================================
    PARÁMETROS URL
    ============================================================
    */

    function getParams() {

        return new URLSearchParams(
            window.location.search
        );

    }


    /*
    ============================================================
    FILTRAR EVENTOS
    ============================================================
    */

    function filterEvents() {

        const params =
            getParams();


        const searchInput =
            document.getElementById(
                "event-search"
            );


        const countrySelect =
            document.getElementById(
                "country-filter"
            );


        const categorySelect =
            document.getElementById(
                "category-filter"
            );


        const statusSelect =
            document.getElementById(
                "status-filter"
            );


        const search =
            (
                searchInput
                    ? searchInput.value
                    : params.get("q") || ""
            )
            .toLowerCase()
            .trim();


        const country =
            (
                countrySelect
                    ? countrySelect.value
                    : params.get("pais") || ""
            )
            .toLowerCase()
            .trim();


        const category =
            (
                categorySelect
                    ? categorySelect.value
                    : params.get("categoria") || ""
            )
            .toLowerCase()
            .trim();


        const status =
            (
                statusSelect
                    ? statusSelect.value
                    : params.get("estado") || ""
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


        return events.filter(function (event) {


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
                slugify(event.country) ===
                slugify(country);


            const matchesCategory =
                !category ||
                slugify(event.category) ===
                slugify(category) ||
                slugify(event.categoryName) ===
                slugify(category);


            const matchesCity =
                !city ||
                slugify(event.city) ===
                slugify(city);


            const matchesStatus =
                !status ||
                getEventStatus(event) ===
                status;


            return (
                matchesSearch &&
                matchesCountry &&
                matchesCategory &&
                matchesCity &&
                matchesStatus
            );

        });

    }


    /*
    ============================================================
    PAÍSES
    ============================================================
    */

    function populateCountries() {

        const select =
            document.getElementById(
                "country-filter"
            );


        if (!select) {
            return;
        }


        select.innerHTML = `

            <option value="">
                Todos los países
            </option>

        `;


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
            .sort(function (a, b) {

                return a.localeCompare(
                    b,
                    "es"
                );

            });


        countries.forEach(function (country) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                slugify(country);


            option.textContent =
                country;


            select.appendChild(
                option
            );

        });


        const params =
            getParams();


        if (params.has("pais")) {

            const requested =
                slugify(
                    params.get("pais")
                );


            const exists =
                Array.from(
                    select.options
                ).some(function (option) {

                    return option.value ===
                        requested;

                });


            if (exists) {

                select.value =
                    requested;

            }

        }

    }


    /*
    ============================================================
    EVENTO INDIVIDUAL
    ============================================================
    */

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


        if (!id) {

            showEventNotFound(
                container
            );

            return;

        }


        const event =
            events.find(function (item) {

                return item.id === id;

            });


        if (!event) {

            showEventNotFound(
                container
            );

            return;

        }


        document.title =
            event.title +
            " — GlobalEven";


        const status =
            getEventStatus(event);


        const statusLabel =
            getStatusLabel(status);


        const statusClass =
            getStatusClass(status);


        const image =
            event.image
                ?
                `
                <img
                    src="${escapeHTML(event.image)}"
                    alt="${escapeHTML(event.title)}"
                    loading="eager"
                    onerror="this.style.display='none';"
                >
                `
                :
                `
                <div class="event-image-placeholder">
                    <span>📅</span>
                </div>
                `;


        container.innerHTML = `

            <div class="event-detail-grid">

                <div class="event-detail-image">

                    ${image}

                </div>


                <div>

                    ${
                        statusLabel
                        ?
                        `
                        <span class="event-status ${statusClass}">
                            ${escapeHTML(statusLabel)}
                        </span>
                        `
                        :
                        ""
                    }


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


                        ${
                            event.date
                            ?
                            `
                            <p>

                                📅

                                ${escapeHTML(
                                    formatDate(
                                        event.date
                                    )
                                )}

                            </p>
                            `
                            :
                            ""
                        }


                        ${
                            event.time
                            ?
                            `
                            <p>

                                🕐

                                ${escapeHTML(
                                    formatTime(
                                        event.time
                                    )
                                )}

                            </p>
                            `
                            :
                            ""
                        }


                        ${
                            event.city ||
                            event.country
                            ?
                            `
                            <p>

                                📍

                                ${escapeHTML(
                                    event.city
                                )}

                                ${
                                    event.city &&
                                    event.country
                                    ? " · "
                                    : ""
                                }

                                ${escapeHTML(
                                    event.country
                                )}

                            </p>
                            `
                            :
                            ""
                        }


                        ${
                            event.venue
                            ?
                            `
                            <p>

                                🏟️

                                ${escapeHTML(
                                    event.venue
                                )}

                            </p>
                            `
                            :
                            ""
                        }

                    </div>


                    ${
                        event.description
                        ?
                        `
                        <p>

                            ${escapeHTML(
                                event.description
                            )}

                        </p>
                        `
                        :
                        ""
                    }


                    ${
                        event.url &&
                        event.url !== "#"
                        ?
                        `
                        <a
                            href="${escapeHTML(event.url)}"
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


    /*
    ============================================================
    EVENTO NO ENCONTRADO
    ============================================================
    */

    function showEventNotFound(container) {

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

    }


    /*
    ============================================================
    PÁGINA DE EVENTOS
    ============================================================
    */

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


        const status =
            document.getElementById(
                "status-filter"
            );


        const params =
            getParams();


        /*
        ========================================================
        RESTAURAR FILTROS DESDE URL
        ========================================================
        */

        if (
            search &&
            params.has("q")
        ) {

            search.value =
                params.get("q");

        }


        if (
            category &&
            params.has("categoria")
        ) {

            const requested =
                slugify(
                    params.get("categoria")
                );


            const optionExists =
                Array.from(
                    category.options
                ).some(function (option) {

                    return slugify(
                        option.value
                    ) === requested;

                });


            if (optionExists) {

                category.value =
                    requested;

            }

        }


        if (
            status &&
            params.has("estado")
        ) {

            status.value =
                params.get("estado");

        }


        /*
        ========================================================
        ACTUALIZAR
        ========================================================
        */

        function update() {

            const filtered =
                filterEvents();


            filtered.sort(function (a, b) {

                return (
                    getEventTimestamp(a) -
                    getEventTimestamp(b)
                );

            });


            renderEvents(
                container,
                filtered
            );

        }


        if (search) {

            search.addEventListener(
                "input",
                update
            );

        }


        if (country) {

            country.addEventListener(
                "change",
                update
            );

        }


        if (category) {

            category.addEventListener(
                "change",
                update
            );

        }


        if (status) {

            status.addEventListener(
                "change",
                update
            );

        }


        update();

    }


    /*
    ============================================================
    EVENTOS EN HOME
    ============================================================
    */

    function setupHomeEvents() {

        const container =
            document.getElementById(
                "home-events"
            );


        if (!container) {
            return;
        }


        /*
        Primero mostramos eventos que están ocurriendo.
        Después próximos eventos.
        */

        const nowEvents =
            events
                .filter(function (event) {

                    return getEventStatus(event) ===
                        "ahora";

                });


        const upcoming =
            events
                .filter(function (event) {

                    return getEventStatus(event) ===
                        "proximo";

                })
                .sort(function (a, b) {

                    return (
                        getEventTimestamp(a) -
                        getEventTimestamp(b)
                    );

                });


        let homeEvents = [];


        /*
        Eventos actuales primero.
        */

        homeEvents =
            homeEvents.concat(
                nowEvents.slice(0, 3)
            );


        /*
        Completar con próximos.
        */

        if (
            homeEvents.length < 6
        ) {

            homeEvents =
                homeEvents.concat(
                    upcoming.slice(
                        0,
                        6 - homeEvents.length
                    )
                );

        }


        /*
        Si no hay actuales ni próximos,
        mostrar los más recientes.
        */

        if (
            homeEvents.length === 0
        ) {

            const past =
                events
                    .filter(function (event) {

                        return getEventStatus(event) ===
                            "pasado";

                    })
                    .sort(function (a, b) {

                        return (
                            getEventTimestamp(b) -
                            getEventTimestamp(a)
                        );

                    });


            homeEvents =
                past.slice(0, 6);

        }


        renderEvents(
            container,
            homeEvents
        );

    }


    /*
    ============================================================
    INICIALIZACIÓN
    ============================================================
    */

    async function initialize() {

        const homeContainer =
            document.getElementById(
                "home-events"
            );


        const eventsContainer =
            document.getElementById(
                "events-list"
            );


        const detailContainer =
            document.getElementById(
                "event-detail-content"
            );


        showLoading(
            homeContainer
        );


        showLoading(
            eventsContainer
        );


        showLoading(
            detailContainer
        );


        await loadEvents();


        /*
        ========================================================
        SI NO HAY EVENTOS
        ========================================================
        */

        if (!events.length) {

            if (homeContainer) {

                showEmpty(
                    homeContainer
                );

            }


            if (eventsContainer) {

                showEmpty(
                    eventsContainer
                );

            }


            if (detailContainer) {

                showEventNotFound(
                    detailContainer
                );

            }


            return;

        }


        /*
        ========================================================
        CONFIGURAR PÁGINAS
        ========================================================
        */

        setupHomeEvents();

        setupEventsPage();

        setupEventPage();


        /*
        ========================================================
        API PÚBLICA
        ========================================================
        */

        window.GlobalEven = {

            events,

            filterEvents,

            renderEvents,

            formatDate,

            slugify,

            loadEvents,

            getEventStatus

        };

    }


    /*
    ============================================================
    ARRANCAR
    ============================================================
    */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();

    }

})();
