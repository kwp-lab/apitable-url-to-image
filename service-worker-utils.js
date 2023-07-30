// This file can be imported inside the service worker,
// which means all of its functions and variables will be accessible
// inside the service worker.
// The importation is done in the file `service-worker.js`.

console.log("External file is also loaded!");

function delay(ms) {
  return new Promise((resolve) => {
    console.debug("Waiting for " + ms + "ms...");
    setTimeout(resolve, ms);
  });
}

/**
 * Checks if a URL starts with "http" or "https"
 * @param {String} urlStr The URL to be checked
 * @returns {Boolean} Returns true if the URL starts with "http" or "https", false otherwise
 */
function startsWithHttpOrHttps(urlStr) {
  // Check if the URL starts with "http" or "https"
  return urlStr.startsWith("http") || urlStr.startsWith("https");
}

/**
 * Checks if a URL string matches the APITable attachment format
 * @param {String} urlStr - The URL string to be validated
 * @returns {Boolean} - The result of the regular expression test
 */
function isAPITableAttachmentFormat(urlStr) {
  // Regular expression pattern to match URLs in the format "filename (http|https://url)"
  let pattern = /.+\s\((http|https):\/\/.+?\.(jpg|gif|jpeg|png)\)$/i;
  return pattern.test(urlStr);
}

function getFileUrlObject(urlStr){
    if( startsWithHttpOrHttps(urlStr) ){
        return {
            "fileName": urlStr.substr(urlStr.lastIndexOf("/")+1),
            "url": urlStr
        };
    }

    return null;
}

function filterValidUrls(record, urlFieldId) {
  // Debugging statement
  console.debug("filterValidUrls", { record, urlFieldId });

  // If the url field name isn't specified or the record doesn't have a value for that field, return null
  if (!urlFieldId || record.fields[urlFieldId] === undefined) {
    return null;
  }

  // Get the value of the specified url field
  let fieldValue = record.fields[urlFieldId];

  // If the field value is an empty string, return null
  if (fieldValue === "") {
    return null;
  }

  // Debugging statement
  console.log("analyzing value:", fieldValue.trim());

  // Check if there are multiple urls separated by commas
  let result = [];
  if (fieldValue.indexOf(",") > -1) {
    let valArr = fieldValue.split(",");
    valArr.forEach((valStr) => {
      valStr = valStr.trim();
      if (valStr === "") return;

      // If the value is a valid url, add it to the result array
      if (startsWithHttpOrHttps(valStr)) {
        result.push(getFileUrlObject(valStr));
      }
      // If the value is in the format of an APITable attachment field converted to a string, add it to the result array
      else if (isAPITableAttachmentFormat(valStr)) {
        let tmp = valStr.split(" (");
        console.log("analyzing APITable Format URL", tmp);
        let fileObj = {
          fileName: tmp[0].trim(),
          url: tmp[1].substr(0, tmp[1].length - 1),
        };
        result.push(fileObj);
      }
    });
  }
  // If there's only one url, check if it's a valid image url or an APITable attachment field converted to a string
  else {
    if (startsWithHttpOrHttps(fieldValue)) {
      result.push(getFileUrlObject(fieldValue));
    } else if (isAPITableAttachmentFormat(fieldValue)) {
      let tmp = fieldValue.split(" (");
      console.log("analyzing APITable Format URL", tmp);
      let fileObj = {
        fileName: tmp[0].trim(),
        url: tmp[1].substr(0, tmp[1].length - 1),
      };
      result.push(fileObj);
    }
  }

  // Return the result array
  return result;
}
