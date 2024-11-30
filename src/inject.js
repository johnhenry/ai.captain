import * as index from './index.js';
export default (object={}, overwrite = "silent")=>{
  if(!object){
    // fail silently
    return;
  }
  for (const [key, value] of Object.entries(index)) {

    if(object[key]){
      switch (overwrite) {
        case "warn":
          console.warn(`Overwriting ${key} in global object`);
          break;
        case "error":
          throw new Error(`Overwriting ${key} in global object`);
        case "silent":
          default:
          break;
      }
    }
    object[key] = value;
  }
  return {}
}
