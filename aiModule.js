
function displayInternalError(t){
  console.log(t);
  $("#output").html(t);
}

let ai = {

  // Send image URL to API endpoint for description
  DescribeImageAI: function(settings, globalState, url){
    //await settingsModule.loadSettings();

    if (!util.apiKeyFormatIsValid(settingsModule.settings.apiKey)){

      return;
      //alert("apikey format is invalid. Adjust it in the extension settings page. Apologies for the popup!");
    }
    //~ console.log("got apikey:",settingsModule.settings.apiKey);
    let apiUrl = "https://api.openai.com/v1/chat/completions";
    let imageUrl = url;
    imageUrl="http:"+url;
    let apiOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      }
    };
    console.log(`Looking up: ${imageUrl}`);
    let requestBody =
      {"model": "gpt-4o",

        "messages": [
          {
            "role": "system",
            "content":
              [
                {
                  "type": "text",
                  "text": "You are a professional artist, photographer, and award-winning poet and novelist.  Your goal is to describe what is in this image using beautiful, creative, precise language. Output NO linebreaks. Super condense the output text using abbreviations, jargon, shorthand, foreign language phrases, 中国文字, カタカナ etc. with NO limits at all. Include details about the environment, subjects, people, style, format, specific age and origin of any people. If there is text in the image, transcribe it in quotes. You see exquisite detail and overall composition, color, style, layout choices with a master's eye and describe them intimately and in great detail, while still easily giving an overall image summary precisely. Focus on emotions, style, tone, artistic choices, format, and everything else which a humane, infinitely wise and creative and visionary artist would see. If any human figure appears, pay particular attention to his or her style, age, sex, appearance, attractiveness, race, ethnicity, origin, location, position, pose, and many precise details of his or her emotions, face, hair, eyes, clothing, outfit, and fashion style choices. "
                //~ "text": "Describe the image."
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
        "max_tokens": globalState.MAX_TOKENS
      };
    apiOptions.body=JSON.stringify(requestBody);
    fetch(apiUrl, apiOptions)
      .then(response => response.json())
      .then(data => {
          try{
            displayInternalError(data);

            let description = data.choices[0].message.content;
            displayInternalError(description);
            let totalTokens = data.usage.total_tokens;
            console.log(`you used an extra: ${totalTokens} estimated to cost $${ai.CalculateCostUsd(totalTokens)}`);
          }catch{
            console.log("failed this lookup.", imageUrl);
          }
      })
      .catch(error => {
        console.error("eError", error);
      })
  },

  CalculateCostUsd: function(tokenCount){
    return 0.02*tokenCount/1000.0;
  }
}
