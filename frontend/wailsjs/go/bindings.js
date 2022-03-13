// @ts-check
// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
const go = {
  "main": {
    "KoboService": {
      /**
       * BuildContentIndex
       * @param {Array<Content>} arg1 - Go Type: []device.Content
       * @returns {Promise<Content>}  - Go Type: map[string]device.Content
       */
      "BuildContentIndex": (arg1) => {
        return window.go.main.KoboService.BuildContentIndex(arg1);
      },
      /**
       * CheckReadwiseConfig
       * @returns {Promise<boolean>}  - Go Type: bool
       */
      "CheckReadwiseConfig": () => {
        return window.go.main.KoboService.CheckReadwiseConfig();
      },
      /**
       * CheckTokenValidity
       * @returns {Promise<Error>}  - Go Type: error
       */
      "CheckTokenValidity": () => {
        return window.go.main.KoboService.CheckTokenValidity();
      },
      /**
       * CountDeviceBookmarks
       * @returns {Promise<number>}  - Go Type: int64
       */
      "CountDeviceBookmarks": () => {
        return window.go.main.KoboService.CountDeviceBookmarks();
      },
      /**
       * DetectKobos
       * @returns {Promise<Array<Kobo>>}  - Go Type: []device.Kobo
       */
      "DetectKobos": () => {
        return window.go.main.KoboService.DetectKobos();
      },
      /**
       * FindBooksOnDevice
       * @param {Array<string>} arg1 - Go Type: []string
       * @returns {Promise<Array<Content>|Error>}  - Go Type: []device.Content
       */
      "FindBooksOnDevice": (arg1) => {
        return window.go.main.KoboService.FindBooksOnDevice(arg1);
      },
      /**
       * ForwardToReadwise
       * @returns {Promise<number|Error>}  - Go Type: int
       */
      "ForwardToReadwise": () => {
        return window.go.main.KoboService.ForwardToReadwise();
      },
      /**
       * GetReadwiseToken
       * @returns {Promise<string>}  - Go Type: string
       */
      "GetReadwiseToken": () => {
        return window.go.main.KoboService.GetReadwiseToken();
      },
      /**
       * GetSelectedKobo
       * @returns {Promise<Kobo>}  - Go Type: device.Kobo
       */
      "GetSelectedKobo": () => {
        return window.go.main.KoboService.GetSelectedKobo();
      },
      /**
       * ListDeviceBookmarks
       * @returns {Promise<Array<Bookmark>|Error>}  - Go Type: []device.Bookmark
       */
      "ListDeviceBookmarks": () => {
        return window.go.main.KoboService.ListDeviceBookmarks();
      },
      /**
       * ListDeviceContent
       * @returns {Promise<Array<Content>|Error>}  - Go Type: []device.Content
       */
      "ListDeviceContent": () => {
        return window.go.main.KoboService.ListDeviceContent();
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
       * @returns {Promise<Error>}  - Go Type: error
       */
      "SelectKobo": (arg1) => {
        return window.go.main.KoboService.SelectKobo(arg1);
      },
      /**
       * SetContext
       * @param {Context} arg1 - Go Type: context.Context
       * @returns {Promise<void>} 
       */
      "SetContext": (arg1) => {
        return window.go.main.KoboService.SetContext(arg1);
      },
      /**
       * SetReadwiseToken
       * @param {string} arg1 - Go Type: string
       * @returns {Promise<Error>}  - Go Type: error
       */
      "SetReadwiseToken": (arg1) => {
        return window.go.main.KoboService.SetReadwiseToken(arg1);
      },
    },
  },

};
export default go;
