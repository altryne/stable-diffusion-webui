window.SD = (() => {
  // Altryne : I hate classes, this calls the init function, everyting else is there. 
 
  /*
   * Painterro is made a field of the SD global object
   * To provide convinience when using w() method in css_and_js.py
   */
  
  class PainterroClass {
    static isOpen = false;
    static async init ({ x, toId }) {
      const img = x;
      const originalImage = Array.isArray(img) ? img[0] : img;

      if (window.Painterro === undefined) {
        try {
          await this.load();
        } catch (e) {
          SDClass.error(e);

          return this.fallback(originalImage);
        }
      }

      if (this.isOpen) {
        return this.fallback(originalImage);
      }
      this.isOpen = true;

      let resolveResult;
      const paintClient = Painterro({
        hiddenTools: ['arrow'],
        onHide: () => {
          resolveResult?.(null);
        },
        saveHandler: (image, done) => {
          const data = image.asDataURL();

          // ensures stable performance even
          // when the editor is in interactive mode
          SD.clearImageInput(SD.el.get(`#${toId}`));

          resolveResult(data);

          done(true);
          paintClient.hide();
        },
      });

      const result = await new Promise((resolve) => {
        resolveResult = resolve;
        paintClient.show(originalImage);
      });
      this.isOpen = false;

      return result ? this.success(result) : this.fallback(originalImage);
    }
    static success (result) { return [result, result]; }
    static fallback (image) { return [image, image]; }
    static load () {
      return new Promise((resolve, reject) => {
        const scriptId = '__painterro-script';
        if (document.getElementById(scriptId)) {
          reject(new Error('Tried to load painterro script, but script tag already exists.'));
          return;
        }

        const styleId = '__painterro-css-override';
        if (!document.getElementById(styleId)) {
          /* Ensure Painterro window is always on top */
          const style = document.createElement('style');
          style.id = styleId;
          style.setAttribute('type', 'text/css');
          style.appendChild(document.createTextNode(`
            .ptro-holder-wrapper {
                z-index: 100;
            }
          `));
          document.head.appendChild(style);
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://unpkg.com/painterro@1.2.78/build/painterro.min.js';
        script.onload = () => resolve(true);
        script.onerror = (e) => {
          // remove self on error to enable reattempting load
          document.head.removeChild(script);
          reject(e);
        };
        document.head.appendChild(script);
      });
    }
  }

  /*
   * Turns out caching elements doesn't actually work in gradio
   * As elements in tabs might get recreated
   */
  class ElementCache {
    #el;
    constructor () {
      this.root = document.querySelector('gradio-app').shadowRoot;
    }
    get (selector) {
      return this.root.querySelector(selector);
    }
  }

  /*
   * The main helper class to incapsulate functions
   * that change gradio ui functionality
   */
  class SDClass {
    el = new ElementCache();
    Painterro = PainterroClass;

    
    moveImageFromGallery ({ x, fromId, toId }) {
      if (!Array.isArray(x) || x.length === 0) return;

      this.clearImageInput(this.el.get(`#${toId}`));

      const i = this.#getGallerySelectedIndex(this.el.get(`#${fromId}`));

      return [x[i].replace('data:;','data:image/png;')];
    }
    async copyImageFromGalleryToClipboard ({ x, fromId }) {
      if (!Array.isArray(x) || x.length === 0) return;

      const i = this.#getGallerySelectedIndex(this.el.get(`#${fromId}`));

      const data = x[i];
      const blob = await (await fetch(data.replace('data:;','data:image/png;'))).blob();
      const item = new ClipboardItem({'image/png': blob});

      await this.copyToClipboard([item]);
    }
    clickFirstVisibleButton({ rowId }) {
      const generateButtons = this.el.get(`#${rowId}`).querySelectorAll('.gr-button-primary');

      if (!generateButtons) return;

      for (let i = 0, arr = [...generateButtons]; i < arr.length; i++) {
        const cs = window.getComputedStyle(arr[i]);

        if (cs.display !== 'none' && cs.visibility !== 'hidden') {
          console.log(arr[i]);

          arr[i].click();
          break;
        }
      }
    }
    async gradioInputToClipboard ({ x }) { return this.copyToClipboard(x); }
    async copyToClipboard (value) {
      if (!value || typeof value === 'boolean') return;
      try {
        if (Array.isArray(value) &&
            value.length &&
            value[0] instanceof ClipboardItem) {
          await navigator.clipboard.write(value);
        } else {
          await navigator.clipboard.writeText(value);
        }
      } catch (e) {
        SDClass.error(e);
      }
    }
    static error (e) {
      console.error(e);
      if (typeof e === 'string') {
        alert(e);
      } else if(typeof e === 'object' && Object.hasOwn(e, 'message')) {
        alert(e.message);
      }
    }
    clearImageInput (imageEditor) {
      imageEditor?.querySelector('.modify-upload button:last-child')?.click();
    }
    #getGallerySelectedIndex (gallery) {
      const selected = gallery.querySelector(`.\\!ring-2`);
      return selected ? [...selected.parentNode.children].indexOf(selected) : 0;
    }


    async getParams() {
      console.log('fuck this dude man')
    }
  }


  return new SDClass();

  
})();

/* 
Everything above should die a slow fiery death ,who the fuck needs classes in JS? 
What is this, CS 101?? 
Fucking init() function and you're good
*/
let getEL = (selector) => document.querySelector('gradio-app').shadowRoot.querySelector(selector);

let injectParamsFromUrl = async () => {
  debugger
  // turn query params into an object
  let params = new URLSearchParams(window.location.search);
  // iterate over the params and add to object
  let paramsObj = {};
  for (let p of params) {
    paramsObj[p[0]] = p[1];
  }

  if(paramsObj['active_tab']){
    getEL(`#tabss>div>button:nth-child(${paramsObj['active_tab']})`).click();
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  if(paramsObj['txt2img_prompt']){
    let txt2img_prompt = getEL('#prompt_input [data-testid="textbox"]')
    setNativeValue(txt2img_prompt, paramsObj['txt2img_prompt']);
  }

  if(paramsObj['img2img_prompt']){
    let img2img_prompt = getEL('#img2img_prompt_input [data-testid="textbox"]')
    setNativeValue(img2img_prompt, paramsObj['img2img_prompt']);
  }
  if(paramsObj['img2img_src']){
    let sideload_input = getEL('#imgtimg_sideload [data-testid="textbox"]')
    setNativeValue(sideload_input, paramsObj['img2img_src']);
    getEL('#img2img_sideloadbtn').click();
  }
  

  //Autosubmit
  window.setTimeout(() => {
    if(paramsObj['autosubmit']){
      getEL('#generate')?.click()
      getEL('#img2img_mask_btn')?.click()
      getEL('#img2img_edit_btn')?.click()

    }
  }, 500)
}


let setNativeValue = function(element, value) {
  let lastValue = element.value;
  element.value = value;
  let event = new Event("input", { target: element, bubbles: true });
  // React 15
  event.simulated = true;
  // React 16
  let tracker = element._valueTracker;
  if (tracker) {
    tracker.setValue(lastValue);
  }
  element.dispatchEvent(event);
}

let init = async function(){
  // this stuff runs when our machine runs
  console.log('init happened yay') 
  
  // inject params from URL
  injectParamsFromUrl()
}

init()