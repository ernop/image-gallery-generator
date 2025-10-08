/*fully generic, first in load order.*/
let util={
  isNullOrEmpty: function(value){
    return value===undefined || value===null ||  value==='' || Number.isNaN(value);
  },
  
  getFileType: function(path) {
    return path.match(/\.webm$/i) ? "video" : "image";
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
  
}