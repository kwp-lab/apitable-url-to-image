// Where we will expose all the data we retrieve from storage.sync.
const storageCache = { apiToken: '', apiHost: 'https://aitable.ai' };
// Asynchronously retrieve data from storage.sync, then cache it.
const initStorageCache = chrome.storage.sync.get().then((items) => {
    // Copy the data retrieved from storage into storageCache.
    Object.assign(storageCache, items);
});

const popupData = {
    urlFieldList: [],
    attachmentFieldList: [],
    datasheetId: "",
    viewId: "",
}

// get the datasheetId and viewId from current active tab url
async function getDatasheetParamsFromURL() {
    const tabs = await chrome.tabs.query({ 'active': true, 'lastFocusedWindow': true })
    const url = tabs[0].url;
    const regex = /\/(dst\w+)\/(viw\w+)/;
    const match = regex.exec(url);

    console.debug("Current URL: " + url);
    console.debug("Match: ", match);

    if (match) {
        popupData.datasheetId = match[1];
        popupData.viewId = match[2];
    } else {
        throw new Error("Please open a datasheet view in AITable Workbench.");
    }
}

// get the list of attachment and url fields from api
async function getFieldList() {
    console.debug("Loading Data...");

    const res = await fetch(
        `${storageCache.apiHost}/fusion/v1/datasheets/${popupData.datasheetId}/fields?viewId=${popupData.viewId}`,
        {
            method: "GET",
            headers: {
                "Content-type": "application/json; charset=utf-8",
                Authorization: `Bearer ${storageCache.apiToken}`,
            },
        }
    );
    const resData = await res.json();

    if (resData.code == 401) {
        throw new Error(JSON.stringify(resData));
    }

    const fields = resData.data.fields;

    for (const index in fields) {
        const field = fields[index];
        if (field.type == "Attachment") {
            popupData.attachmentFieldList.push(field);
        } else if (["SingleText", "Text", "URL"].indexOf(field.type) >= 0) {
            popupData.urlFieldList.push(field);
        }
    }
}

// Render the field list as a dropdown selection (HTML select tag).
function renderFieldList(fieldList, elementId) {
    const selectEl = document.querySelector(elementId);

    selectEl.removeChild(selectEl.querySelector('option'));

    for (const field of fieldList) {
        const optionEl = document.createElement('option');
        optionEl.value = field.id;
        optionEl.textContent = field.name;
        selectEl.appendChild(optionEl);
    }
}

async function convert() {
    const btn = document.querySelector('#btnConvert');
    btn.classList.add("progress-bar-striped", "progress-bar-animated");
    btn.disabled = true;
    btn.textContent = "Converting...";
    hideMsg()

    const response = await chrome.runtime.sendMessage({ 
        event: "convertToImage", 
        "data": { 
            "selectedUrlFieldId": document.querySelector('#inputUrlField').value,
            "selectedAttachmentFieldId": document.querySelector('#inputAttachmentField').value,
            "popupData": popupData
        } 
    });
    console.log(response);

    if (response.success !== undefined) {
        if (response.success === true) {
            showMsg("Conversion completed successfully.", "alert-success");
        } else {
            showMsg("Error: "+ JSON.stringify(response.message), "alert-danger");
        }
        
    } else {
        showMsg("unknown error", "alert-danger");
    }

    btn.classList.remove("progress-bar-striped", "progress-bar-animated");
    btn.disabled = false;
    btn.textContent = "Convert";
}

function showMsg(msg, type) {
    const msgEl = document.querySelector('#alertBox');
    msgEl.textContent = msg;
    msgEl.classList.add(type || "alert-primary");
    msgEl.style.display = "block";
}

function hideMsg(){
    const msgEl = document.querySelector('#alertBox');
    msgEl.textContent = "";
    msgEl.style.display = "none";
}

// init popup page
async function init() {
    console.debug("Initializing popup page...");

    try {
        await initStorageCache;

        await getDatasheetParamsFromURL();

        await getFieldList();

        if (popupData.urlFieldList.length == 0 && popupData.attachmentFieldList.length == 0) {
            throw new Error("No URL or Attachment field found in this datasheet.");
        }

        renderFieldList(popupData.urlFieldList, '#inputUrlField');
        renderFieldList(popupData.attachmentFieldList, '#inputAttachmentField');

        document.querySelector('#btnConvert').addEventListener('click', convert);

    } catch (e) {
        // Handle error.
        showMsg(e.message, "alert-danger");
    }
}

document.addEventListener('DOMContentLoaded', init);

document.querySelector(".btn-open-options-page").addEventListener("click", function () {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    }
    else {
        window.open(chrome.runtime.getURL('settings.html'));
    }
});