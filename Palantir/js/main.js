window.onload = function () {
    // add eventListener for tizenhwkey
    document.addEventListener('tizenhwkey', function (e) {
        if (e.keyName == "back")
            try {
                tizen.application.getCurrentApplication().exit();
            } catch (ignore) { }
    });

    // Website configuration file path
    const webConfigPath = "../config/webConfig.json";

    // Initial configuration parameters
    let configurationData = null;
    let palantirApiUrl = null;
    let teamSize = null;
    let branchesLimit = null;

    // Widget creation watchers
    let mergesWidgetWasCreated = false;
    let buildsWidgetWasCreated = false;
    let issuesWidgetWasCreated = false;
    let iframeWidgetWasCreated = false;

    // Buttons and events	
    const btnUpdate = document.getElementById("btn-update");
    if (btnUpdate) {
        btnUpdate.addEventListener("click", loadAllWidgets);
    }

    // Read configuration and start widgets loading cycle
    setConfigurationAndLoadAllWidgets();

    // Initial web configuration and widgets loading
    async function setConfigurationAndLoadAllWidgets() {
        await setConfiguration();
        loadAllWidgets();
        setInterval(() => {
            loadAllWidgets();
        }, Number(configurationData.refreshFrequency));
    }

    async function setConfiguration() {
        await fetchAsyncResource(webConfigPath, "GET", {})
            .then(async function (response) {
                configurationData = await response.json();
            });
        palantirApiUrl = configurationData.palantirApiUrl;
        teamSize = Number(configurationData.teamSize);
        branchesLimit = Number(configurationData.branchesLimit);
    }

    function loadAllWidgets() {
        listMergeRequests();
        listBuilds();
        listIssues();
        showIframe();
    }

    // Merge requests widget drawing
    async function listMergeRequests() {
        await setConfiguration();

        const mergeRequestsUrl = palantirApiUrl + "/scm/";
        let mergeRequestsData = null;
        let alertData = null;

        let listFunction = function (data, listGroup) {
            const anchor = createElementFromHtml("<a class='list-group-item' target='_blank' rel='noopener noreferrer' href=" + data.url + ">" +
                data.authorName + ": " + data.title + " (" + data.id + ")" + "</a>");
            listGroup.appendChild(anchor);
        };

        await fetchAsyncResource(mergeRequestsUrl, "GET", {})
            .then(async function (response) {
                mergeRequestsData = await response.json();
            }).catch(function () {
                alertData = { type: "alert-danger", content: "Failed to fetch the source control management service." };
                createCard("merges-card", "Merge requests", mergeRequestsData, listFunction, alertData);
            });

        if (mergeRequestsData !== null) {
            if (mergeRequestsData.length === 0) {
                alertData = { type: "alert-info", content: "No data." }
            } else if (mergeRequestsData.length > teamSize) {
                alertData = { type: "alert-warning", content: "The number of open merge requests exceeds the number of team members." }
            }

            if (!mergesWidgetWasCreated) {
                createCard("merges-card", "Merge requests", mergeRequestsData, listFunction, alertData);
                mergesWidgetWasCreated = true;
                const btnUpdateMergesCard = document.getElementById("btn-update-merges-card");
                btnUpdateMergesCard.addEventListener("click", listMergeRequests);
            } else {
                updateCard("merges-card", mergeRequestsData, listFunction, alertData);
            }
        }
    }

    // Builds widget drawing
    async function listBuilds() {
        await setConfiguration();

        const buildsUrl = palantirApiUrl + "/bs/";
        let buildsData = null;
        let alertData = null;

        let listFunction = function (data, listGroup) {
            let status = (data.state === "passed" ? "list-group-item-success" : (data.state === "errored" ? "list-group-item-danger" : "list-group-item-warning"));
            const anchor = createElementFromHtml("<a class='list-group-item " + status + "' target='_blank' rel='noopener noreferrer' href=" + data.url + ">" +
                data.id + " - " + data.repository + ", " + data.branch + ": " + data.commit + " (" + data.state + ")</a>");
            listGroup.appendChild(anchor);
        };

        await fetchAsyncResource(buildsUrl, "GET", {})
            .then(async function (response) {
                buildsData = await response.json();
            }).catch(function () {
                alertData = { type: "alert-danger", content: "Failed to fetch the build server/continuous integration service" };
                createCard("builds-card", "Builds", buildsData, listFunction, alertData);
            });

        if (buildsData !== null) {
            if (buildsData.length === 0) {
                alertData = { type: "alert-info", content: "No data." }
            }
            else if (buildsData.length > branchesLimit) {
                alertData = { type: "alert-warning", content: "There are more than " + branchesLimit + " branches being built." }
            }

            if (!buildsWidgetWasCreated) {
                createCard("builds-card", "Builds", buildsData, listFunction, alertData);
                buildsWidgetWasCreated = true;
                const btnUpdateBuildsCard = document.getElementById("btn-update-builds-card");
                btnUpdateBuildsCard.addEventListener("click", listBuilds);
            } else {
                updateCard("builds-card", buildsData, listFunction, alertData);
            }
        }
    }

    // Issues widget drawing
    async function listIssues() {
        await setConfiguration();

        const issuesUrl = palantirApiUrl + "/it/";
        let issuesData = null;
        let alertData = null;

        let listFunction = function (data, listGroup) {
            const anchor = createElementFromHtml("<a class='list-group-item' target='_blank' rel='noopener noreferrer' href=" + data.url + ">" +
                data.id + " - " + data.assignedTo + ": " + data.title + "</a>");
            listGroup.appendChild(anchor);
        };

        await fetchAsyncResource(issuesUrl, "GET", {})
            .then(async function (response) {
                issuesData = await response.json();
            }).catch(function () {
                alertData = { type: "alert-danger", content: "Failed to fetch the issue tracking service." };
                createCard("issues-card", "Issues", issuesData, listFunction, alertData);
            });

        if (issuesData !== null) {
            if (issuesData.length === 0) {
                alertData = { type: "alert-info", content: "No data." }
            }
            else if (issuesData.length > teamSize) {
                alertData = { type: "alert-warning", content: "The number of issues exceeds the number of team members." }
            }

            if (!issuesWidgetWasCreated) {
                createCard("issues-card", "Issues", issuesData, listFunction, alertData);
                issuesWidgetWasCreated = true;
                const btnUpdateIssuesCard = document.getElementById("btn-update-issues-card");
                btnUpdateIssuesCard.addEventListener("click", listIssues);
            } else {
                updateCard("issues-card", issuesData, listFunction, alertData);
            }
        }
    }

    // Iframe widget drawing
    async function showIframe() {
        await setConfiguration();

        const iframeUrl = palantirApiUrl + "/iframe/";
        let iframeData = null;
        let alertData = null;

        let listFunction = function (data, listGroup) {
            const iframe = createElementFromHtml(data.html);
            listGroup.appendChild(iframe);
        };

        await fetchAsyncResource(iframeUrl, "GET", {})
            .then(async function (response) {
                iframeData = await response.json();
            });

        if (iframeData !== null) {
            if (iframeData.length === 0) {
                alertData = { type: "alert-info", content: "No data." }
            }

            if (!iframeWidgetWasCreated) {
                createCard("iframe-card", "Iframe", iframeData, listFunction, alertData);
                iframeWidgetWasCreated = true;
                const btnUpdateIframeCard = document.getElementById("btn-update-iframe-card");
                btnUpdateIframeCard.addEventListener("click", showIframe);
            } else {
                updateCard("iframe-card", iframeData, listFunction, alertData);
            }
        }
    }

    // Bootstrap card drawing
    function createCard(cardId, cardTitle, data, listFunction, alertData) {
        const dataLength = data !== null ? data.length : "error";
        const badgeCategory = data !== null ? "info" : "danger";
        const parent = document.getElementById("widgets-panel");
        const card = createElementFromHtml("<div class='card' id=" + cardId + "></div>");
        const cardHeader = createElementFromHtml("<h5 id='" + cardId + "-header' class='card-header'>" +
            "<button id='btn-update-" + cardId + "' class='btn btn-outline-primary btn-sm float-right' style='font-size: 0.7rem;'>" +
            "<em class='fas fa-sync' aria-hidden='true'></em></button>" +
            "<a data-toggle='collapse' href='#" + cardId + "' aria-expanded='true' aria-controls='collapse-body-repos' id='collapse-body-elem'>" + cardTitle +
            "</a> <span id='" + cardId + "-badge' class='badge badge-" + badgeCategory + " badge-pill'>" + dataLength + "</span></h5>");
        const collapseBody = createElementFromHtml("<div class='collapse show' id='" + cardId + "' aria-labelledby='collapse-body-elem'></div>");
        const cardBody = createElementFromHtml("<div id='" + cardId + "-body' class='card-body'></div>");
        const listGroup = createElementFromHtml("<div id='" + cardId + "-list' class='list-group list-group-flush'></div>");
        const cardFooter = createElementFromHtml("<div id='" + cardId + "-footer' class='card-footer'><small id='" + cardId + "-footer-text' class='text-muted'> Last update: " + new Date().toLocaleString() + "</small></div>");

        clearElementById(cardId);

        if (data !== null && data.length > 0) {
            data.forEach(e => listFunction(e, listGroup));
        }

        card.appendChild(cardHeader);
        card.appendChild(collapseBody);
        collapseBody.appendChild(cardBody);

        if (alertData !== null) {
            const cardAlert = createElementFromHtml("<div id='" + cardId + "-alert' class='alert " + alertData.type + " role='alert'>" + alertData.content + "</div>");
            cardBody.appendChild(cardAlert);
        }

        cardBody.appendChild(listGroup);
        card.appendChild(cardFooter);
        parent.appendChild(card);
    }

    // Update card list data
    function updateCard(cardId, data, listFunction, alertData) {
        const dataLength = data !== null ? data.length : "error";
        const badgeCategory = data !== null ? "info" : "danger";

        clearElementById(cardId + "-list");
        clearElementById(cardId + "-alert");
        clearElementById(cardId + "-badge");

        const listGroup = createElementFromHtml("<div id='" + cardId + "-list' class='list-group list-group-flush'></div>");

        if (data !== null && data.length > 0) {
            data.forEach(e => listFunction(e, listGroup));
        }

        let cardHeader = document.getElementById(cardId + "-header");
        const badge = createElementFromHtml("<span id='" + cardId + "-badge' class='badge badge-" + badgeCategory + " badge-pill'>" + dataLength + "</span></a></h5>");
        cardHeader.appendChild(badge);

        let cardBody = document.getElementById(cardId + "-body");
        if (alertData !== null) {
            const cardAlert = createElementFromHtml("<div id='" + cardId + "-alert' class='alert " + alertData.type + " role='alert'>" + alertData.content + "</div>");
            cardBody.appendChild(cardAlert);
        }
        cardBody.appendChild(listGroup);

        let cardFooter = document.getElementById(cardId + "-footer");
        clearElementById(cardId + "-footer-text");
        let updateInfo = createElementFromHtml("<small id='" + cardId + "-footer-text'  class='text-muted'> Last update: " + new Date().toLocaleString() + "</small>");
        cardFooter.appendChild(updateInfo);
    }

    function createElementFromHtml(htmlString) {
        let div = document.createElement('div');
        div.innerHTML = htmlString.trim();

        return div.firstChild;
    }

    function clearElementById(id) {
        const e = document.getElementById(id);
        if (e != null) {
            while (e.firstChild) {
                e.removeChild(e.firstChild);
            }
            e.parentNode.removeChild(e);
        }
    }
};

// Fetch asynchronous resource (REST APIs, files, etc)
async function fetchAsyncResource(url, method, headers) {
    const response = await fetch(url, {
        "method": method,
        "headers": headers
    });
    return response;
}
