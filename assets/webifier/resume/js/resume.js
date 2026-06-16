document.addEventListener("show.bs.collapse", (event) => {
    if (!event.target.classList.contains("experience-compact-view") && !event.target.classList.contains("experience-expanded-view")) {
        return;
    }

    event.target.classList.add("is-opening");
    event.target.classList.remove("is-closing");
});

document.addEventListener("hide.bs.collapse", (event) => {
    if (!event.target.classList.contains("experience-compact-view") && !event.target.classList.contains("experience-expanded-view")) {
        return;
    }

    event.target.classList.add("is-closing");
    event.target.classList.remove("is-opening");
});

document.addEventListener("shown.bs.collapse", (event) => {
    if (event.target.classList.contains("experience-compact-view") || event.target.classList.contains("experience-expanded-view")) {
        event.target.classList.remove("is-opening", "is-closing");
    }
});

document.addEventListener("hidden.bs.collapse", (event) => {
    if (event.target.classList.contains("experience-compact-view") || event.target.classList.contains("experience-expanded-view")) {
        event.target.classList.remove("is-opening", "is-closing");
    }
});
