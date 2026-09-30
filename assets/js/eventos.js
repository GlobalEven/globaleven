(function () {

    "use strict";


    /*
    ============================================================
    GLOBALEVEN - SISTEMA DE EVENTOS
    ============================================================

    Flujo:

    Ticketmaster
        ↓
    GitHub Actions
        ↓
    data/events.json
        ↓
    este archivo
        ↓
    GlobalEven

    Si el JSON no está disponible, se utiliza como
    respaldo window.GLOBALEVEN_EVENTS.
    ============================================================
    */


    let events = [];


    /*
    ============================================================
    CONFIGURACIÓN
    ============================================================
    */

    const EVENTS_JSON =
        "data/events.json";


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

    Convierte:

    Estados Unidos
    → estados-unidos

    São Paulo
    → sao-paulo

    Reino Unido
    → reino-unido

    Esto permite que los enlaces de países y ciudades
    funcionen correctamente.
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
            new Date(String(date) + "T12:00:00");


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
            .trim();

    }


    /*
    ============================================================
    CARGAR EVENTS.JSON
    ============================================================
    */

    async function loadEvents() {

        /*
        Cache busting.

        Evita que el navegador mantenga
        una versión vieja de events.json.
        */

        const cacheBuster =
            "?v=" +
            Math.floor(Date.now() / 3600000);


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


            /*
            El formato esperado es:

            {
                "updatedAt": "...",
                "total": 123,
                "events": []
            }
            */


            if (
                data &&
                Array.isArray(data.events)
            ) {

                events =
                    data.events
                        .filter(Boolean)
                        .map(normalizeEvent);

                return events;

            }


            /*
            Compatibilidad por si algún día
            el JSON contiene directamente un array.
            */

            if (Array.isArray(data)) {

                events =
                    data
                        .filter(Boolean)
                        .map(normalizeEvent);

                return events;

            }


            throw new Error(
                "Formato de events.json no válido."
            );


        } catch (error) {

            console.error(
                "GlobalEven: no se pudo cargar data/events.json",
                error
            );


            /*
            RESPALDO

            Si por alguna razón el JSON no está disponible,
            utilizamos los datos incluidos en data.js.
            */

            if (
                Array.isArray(
                    window.GLOBALEVEN_EVENTS
                )
            ) {

                events =
                    window.GLOBALEVEN_EVENTS
                        .filter(Boolean)
                        .map(normalizeEvent);

                return events;

            }


            events = [];

            return events;

        }

    }


    /*
    ============================================================
    NORMALIZAR EVENTO
    ============================================================

    Ticketmaster puede devolver campos vacíos.

    Esta función garantiza que el resto del sitio
    siempre trabaje con strings seguros.
    ============================================================
    */

    function normalizeEvent(event) {

        const item =
            event || {};


        return {

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
                )

        };

    }


    /*
    ============================================================
    CREAR TARJETA DE EVENTO
    ============================================================
    */

    function createEventCard(event) {

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
    RENDERIZAR EVENTOS
    ============================================================
    */

    function renderEvents(
        container,
        list
    ) {

        if (!container) {
            return;
        }


        if (!Array.isArray(list)) {
            list = [];
        }


        if (!list.length) {

            container.innerHTML = "";


        } else {

            container.innerHTML =
                list
                    .map(createEventCard)
                    .join("");

        }


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


    /*
    ============================================================
    ESTADO DE CARGA
    ============================================================
    */

    function showLoading(container) {

        if (!container) {
            return;
        }


        container.innerHTML = `

            <div class="loading-state">

                <p>
                    Cargando eventos...
                </p>

            </div>

        `;

    }


    /*
    ============================================================
    ESTADO DE ERROR / VACÍO
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
                    En este momento no encontramos
                    eventos para mostrar.
                </p>

            </div>

        `;

    }


    /*
    ============================================================
    URL PARAMETERS
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


        const city =
            (
                params.get("ciudad") ||
                ""
            )
            .toLowerCase()
            .trim();


        return events.filter(function (event) {


            /*
            ------------------------------------------
            BÚSQUEDA GENERAL
            ------------------------------------------
            */

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


            /*
            ------------------------------------------
            PAÍS
            ------------------------------------------
            */

            const matchesCountry =
                !country ||
                slugify(event.country) ===
                slugify(country);


            /*
            ------------------------------------------
            CATEGORÍA
            ------------------------------------------
            */

            const matchesCategory =
                !category ||
                slugify(event.category) ===
                slugify(category) ||
                slugify(event.categoryName) ===
                slugify(category);


            /*
            ------------------------------------------
            CIUDAD
            ------------------------------------------
            */

            const matchesCity =
                !city ||
                slugify(event.city) ===
                slugify(city);


            return (
                matchesSearch &&
                matchesCountry &&
                matchesCategory &&
                matchesCity
            );

        });

    }


    /*
    ============================================================
    LLENAR SELECT DE PAÍSES
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


        /*
        Evita duplicar opciones.
        */

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
    PÁGINA DE EVENTO INDIVIDUAL
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


        const params =
            getParams();


        /*
        ------------------------------------------
        RESTAURAR BÚSQUEDA
        ------------------------------------------
        */

        if (
            search &&
            params.has("q")
        ) {

            search.value =
                params.get("q");

        }


        /*
        ------------------------------------------
        RESTAURAR CATEGORÍA
        ------------------------------------------
        */

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


        /*
        ------------------------------------------
        ACTUALIZAR RESULTADOS
        ------------------------------------------
        */

        function update() {

            const filtered =
                filterEvents();


            filtered.sort(function (a, b) {

                const dateA =
                    new Date(
                        String(a.date) +
                        "T" +
                        (
                            a.time ||
                            "00:00"
                        )
                    ).getTime();


                const dateB =
                    new Date(
                        String(b.date) +
                        "T" +
                        (
                            b.time ||
                            "00:00"
                        )
                    ).getTime();


                return (
                    (Number.isNaN(dateA)
                        ? Infinity
                        : dateA
                    )
                    -
                    (Number.isNaN(dateB)
                        ? Infinity
                        : dateB
                    )
                );

            });


            renderEvents(
                container,
                filtered
            );

        }


        /*
        ------------------------------------------
        EVENTOS DE LOS FILTROS
        ------------------------------------------
        */

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


        const upcoming =
            [...events]
                .sort(function (a, b) {

                    const dateA =
                        new Date(
                            String(a.date) +
                            "T" +
                            (
                                a.time ||
                                "00:00"
                            )
                        ).getTime();


                    const dateB =
                        new Date(
                            String(b.date) +
                            "T" +
                            (
                                b.time ||
                                "00:00"
                            )
                        ).getTime();


                    return (
                        (Number.isNaN(dateA)
                            ? Infinity
                            : dateA
                        )
                        -
                        (Number.isNaN(dateB)
                            ? Infinity
                            : dateB
                        )
                    );

                })
                .slice(0, 6);


        renderEvents(
            container,
            upcoming
        );

    }


    /*
    ============================================================
    INICIALIZACIÓN
    ============================================================
    */

    async function initialize() {

        /*
        Mostrar carga mientras se obtiene
        events.json.
        */

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


        /*
        Cargar eventos.
        */

        await loadEvents();


        /*
        Si no hay datos, mostrar estado vacío.
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
        Ya tenemos los eventos.
        */

        setupHomeEvents();

        setupEventsPage();

        setupEventPage();


        /*
        Exponer API pública.
        */

        window.GlobalEven = {

            events,

            filterEvents,

            renderEvents,

            formatDate,

            slugify,

            loadEvents

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
