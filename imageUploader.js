class ImageUploader {
  constructor(datasheetId, viewId, apiHost, apiToken) {
    this.datasheetId = datasheetId;
    this.viewId = viewId;
    this.apiHost = apiHost;
    this.apiToken = apiToken;
  }

  async fetch(imageUrls) {
    const promises = imageUrls.map((urlObj) => {
      const url = urlObj.url;
      return fetch(url).then((response) => response.blob()).then((blob) =>{
        return {
          fileName: urlObj.fileName,
          blob: blob,
          url: url,
        };
     });
    });

    return Promise.all(promises).then((images) => {
      console.debug("images", images);
      return images;
    });

  }

  async upload(images) {
    const responses = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i]; 
      const formData = new FormData();
      formData.append("file", image.blob, image.fileName);

      const response = await fetch(
          `${this.apiHost}/fusion/v1/datasheets/${this.datasheetId}/attachments`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${this.apiToken}`,
            },
            body: formData,
          }
      ).then((response) => response.json());
      responses.push(response);
      await delay(1000); // wait for 1 second
    }
    return responses;
  }

  async save(recordId, fieldId, uploadResults) {
    let attachments = []
    for (const index in uploadResults) {
      const uploadResult = uploadResults[index];
      if (uploadResult.success) {
        attachments.push(uploadResult.data);
      } else {
        console.debug(`Failed to upload.`, uploadResult);
        return uploadResult
      }
    }

    if (attachments.length == 0) {
      return null;
    }

    const dataToUpdate = JSON.stringify({
      "records": [
        {
          "recordId": recordId,
          "fields": {
            [fieldId]: attachments
          }
        },
      ],
      "fieldKey": "id"
    })

    const response = await fetch(`${this.apiHost}/fusion/v1/datasheets/${this.datasheetId}/records`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${this.apiToken}`,
        "Content-Type": "application/json"
      },
      body: dataToUpdate,
    });
    await delay(1000);
    return response.json();
  }
}
