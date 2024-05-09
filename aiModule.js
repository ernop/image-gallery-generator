
function displayInternalError(t){
  console.log(t);
  $("#output").html(t);
}

let ai = {

  // Send image URL to API endpoint for description
  DescribeImageAI: function(url){
    //await settingsModule.loadSettings();
    displayInternalError("AI");

    if (!util.apiKeyFormatIsValid(settingsModule.settings.apiKey)){
      alert("apikey format is invalid.");
    }
    let apiUrl = "https://api.openai.com/v1/chat/completions";
    let imageUrl = imageUrls[displayedImageIndex];
    imageUrl="http:"+imageUrl;
    let apiOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      }
    };

    let requestBody =
      {"model": "gpt-4-turbo",

        "messages": [
          {
            "role": "system",
            "content":
              [
                {
                  "type": "text",
                  "text": "You are a professional artist, photographer, and award-winning poet and novelist.  Your goal is to describe what is in this image using beautiful, creative, precise language. Include details about the environment, subjects, people, style, format, specific age and origin of any people. If there is text in the image, transcribe it in quotes. You see exquisite detail and overall composition, color, style, layout choices with a master's eye and describe them intimately and in great detail, while still easily giving an overall image summary precisely."
                }
              ]
          },
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": "Describe the image."
              },
              {
                "type": "image_url",
                "image_url": {
                  "url":  imageUrl
                }
              }
            ]
          }
        ],
        "max_tokens": MAX_TOKENS
      };
    apiOptions.body=JSON.stringify(requestBody);
    fetch(apiUrl, apiOptions)
      .then(response => response.json())
      .then(data => {
        displayInternalError(data);
        let description = data.choices[0].text;
        displayInternalError(description);
      })
      .catch(error => {
        console.error("eError", error);
      })
  }
}
