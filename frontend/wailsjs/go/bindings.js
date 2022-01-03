// @ts-check
// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
const go = {
  "main": {
    "KoboService": {
      /**
       * DetectKobos
       * @returns {Promise<Array<Kobo>>}  - Go Type: []main.Kobo
       */
      "DetectKobos": () => {
        return window.go.main.KoboService.DetectKobos();
      },
      /**
       * ListDeviceBookmarks
       * @returns {Promise<Error>}  - Go Type: error
       */
      "ListDeviceBookmarks": () => {
        return window.go.main.KoboService.ListDeviceBookmarks();
      },
      /**
       * ListDeviceContent
       * @returns {Promise<Error>}  - Go Type: error
       */
      "ListDeviceContent": () => {
        return window.go.main.KoboService.ListDeviceContent();
      },
      /**
       * OpenDBConnection
       * @param {string} arg1 - Go Type: string
       * @returns {Promise<Error>}  - Go Type: error
       */
      "OpenDBConnection": (arg1) => {
        return window.go.main.KoboService.OpenDBConnection(arg1);
      },
      /**
       * PromptForLocalDBPath
       * @returns {Promise<Error>}  - Go Type: error
       */
      "PromptForLocalDBPath": () => {
        return window.go.main.KoboService.PromptForLocalDBPath();
      },
      /**
       * SelectKobo
       * @param {string} arg1 - Go Type: string
       * @returns {Promise<boolean>}  - Go Type: bool
       */
      "SelectKobo": (arg1) => {
        return window.go.main.KoboService.SelectKobo(arg1);
      },
    },
  },

};
export default go;
