/*fully generic, first in load order.*/
let util={
  isNullOrEmpty: function(value){
    return value===undefined || value===null ||  value==='' || Number.isNaN(value);
  },
  
  getFileType: function(path) {
    return path.match(/\.webm$/i) ? "video" : "image";
  },
    
  apiKeyFormatIsValid: function(apiKey) {
    const apiKeyRegex = /^sk-[a-zA-Z0-9]{48}$/;
    return apiKeyRegex.test(apiKey);
  },
  
  //is it done loading and stuff, bit janky?
  isImageDone: function(img){
		if (!img[0].complete) {
			return false;
		}
		if (img[0].naturalWidth === 0) {
			return false;
		}
		return true;
	},
  apiKeyIsValidWithOpenAI: async function (apiKey){
    let apiUrl = "https://api.openai.com/v1/models";
    let apiOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    };

    try{
      const response = await fetch(apiUrl, apiOptions)
      var responseJson = await response.json();
      if (response.ok){
        return [true, responseJson.data.length];
      }else{
        return [false, responseJson.error.message];
      }
    }catch (error) {
      return [false, error];
    }
    return false,'xxx';
  },
  
}