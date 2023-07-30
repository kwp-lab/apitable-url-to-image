// This is the service worker script, which executes in its own context
// when the extension is installed or refreshed (or when you access its console).
// It would correspond to the background script in chrome extensions v2.

console.log(
    "This prints to the console of the service worker (background script)"
);

// Importing and using functionality from external files is also possible.
importScripts("service-worker-utils.js");

importScripts("imageUploader.js");

// If you want to import a file that is deeper in the file hierarchy of your
// extension, simply do `importScripts('path/to/file.js')`.
// The path should be relative to the file `manifest.json`.

// Where we will expose all the data we retrieve from storage.sync.
const storageCache = { apiToken: "", apiHost: "https://apitable.com" };

// Asynchronously retrieve data from storage.sync, then cache it.
const initStorageCache = chrome.storage.sync.get().then((items) => {
    // Copy the data retrieved from storage into storageCache.
    Object.assign(storageCache, items);
});

// fetch image data from url, convert to blob data, and upload to APITable as attachment with API
async function convertUrltoImage(eventData) {
    const params = {
        datasheetId: eventData.popupData.datasheetId,
        viewId: eventData.popupData.viewId,
        urlFieldId: eventData.selectedUrlFieldId,
    };

    // retrieve all records in datasheet and loop through each record
    const records = await getAllRecords(params).catch((error) => {
        console.debug(error);
        return { message: error.message, success: false };
    });

    const results = []

    if (Array.isArray(records)) {
        console.debug(`Total ${records.length} records`);

        for (const record of records) {

            // get the urls from the url field
            const imageUrls = filterValidUrls(record, params.urlFieldId)

            console.debug(`Processing ${imageUrls.length} urls`, imageUrls);

            if (!Array.isArray(imageUrls) || imageUrls.length == 0) {
                continue;
            }

            const uploader = new ImageUploader(params.datasheetId, params.viewId, storageCache.apiHost, storageCache.apiToken);

            const result = await uploader.fetch(imageUrls)
                .then((images) => uploader.upload(images))
                .then((uploadResults) => uploader.save(record.recordId, eventData.selectedAttachmentFieldId, uploadResults))
                .catch((error) => {
                    console.error(error);
                    return { message: error.message, success: false };
                });

            if (!result.success) {
                return result
            }

            results.push(result);
        }
    }

    return {results: results, success: true};
}

async function getAllRecords(params) {
    const pageSize = 1000;
    let pageNum = 1;
    let allRecords = [];

    while (true) {
        const response = await fetch(
            `${storageCache.apiHost}/fusion/v1/datasheets/${params.datasheetId}/records?viewId=${params.viewId}&fieldKey=id&fields=${params.urlFieldId}&pageNum=${pageNum}&pageSize=${pageSize}&cellFormat=string`,
            {
                method: "GET",
                headers: {
                    "Content-type": "application/json; charset=utf-8",
                    Authorization: `Bearer ${storageCache.apiToken}`,
                },
            }
        )
        const resData = await response.json();

        if (resData.code == 200) {
            const records = resData.data.records;
            allRecords = allRecords.concat(records);
            if (records.length < pageSize) {
                break;
            }
        } else {
            throw new Error(resData.message);
        }

        console.debug(`Loaded ${allRecords.length} records`);

        await delay(1500)
        pageNum++;
    }

    return allRecords;
}

chrome.runtime.onMessage.addListener(function (
    eventMsg,
    sender,
    sendResponse
) {
    console.debug(
        sender.tab
            ? "from a content script:" + sender.tab.url
            : "from the extension",
        eventMsg
    );

    const eventData = Object.assign({}, eventMsg.data);

    initStorageCache.then(() => {
        if (eventMsg.event == "convertToImage") {
            return convertUrltoImage(eventData)
        }
        return { message: "Unknown event", success: false };
    }).then((result) => {
        console.debug("convertUrltoImage() results", result);
        return sendResponse(result);
    })

    return true;
});
