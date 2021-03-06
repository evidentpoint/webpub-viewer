export const WIDTH_ATTR: number = 24;
export const HEIGHT_ATTR: number = 24;
export const VIEWBOX_ATTR: string = `0 0 24 24`;

const iconTemplate = (id: string, title: string, path: string, classAttr: string = `icon`) => `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH_ATTR}" height="${HEIGHT_ATTR}" viewBox="${VIEWBOX_ATTR}" preserveAspectRatio="xMidYMid meet" role="img" class="${classAttr}" aria-labelledBy="${id}">
  <title id="${id}">${title}</title>
  ${path}
</svg>`;

const iconSymbol = (id: string, title: string, path: string, classAttr: string = `svgIcon use`) => `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" role="img" class="${classAttr}">
  <defs>
    <symbol id="${id}" viewBox="${VIEWBOX_ATTR}">
      <title>${title}</title>
      ${path}
    </symbol>
  </defs>
</svg>`;

const iconUse = (id: string, classAttr: string) => `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" class="${classAttr}" role="img" aria-labelledby="${id}">
  <use xlink:href="#${id}"></use>
</svg>`;

export const icons = {
  "homeIcon": `<path d="M12 5.69l5 4.5V18h-2v-6H9v6H7v-7.81l5-4.5M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>`,
  "arrowIcon": `<path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z"/>`,
  "checkOriginal": iconSymbol(`check-icon`, `Checked`, `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z"/>`),
  "checkDupe": iconUse("check-icon", "checkedIcon"),
  "closeOriginal": iconSymbol(`close-icon`, `Close`, `<path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.59-13L12 10.59 8.41 7 7 8.41 10.59 12 7 15.59 8.41 17 12 13.41 15.59 17 17 15.59 13.41 12 17 8.41z"/>`),
  "closeDupe": iconUse("close-icon", "icon close inactive-icon"),
  "error": iconTemplate(`error-icon`, `Warning`, `<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>`),
  "expand": iconTemplate(`expand-icon`, `Enter fullscreen`, `<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>`, `icon active-icon`),
  "loading": iconTemplate(`loading-icon`, `Loading`, `<path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>`),
  "menu": iconTemplate(`menu-icon`, `Show and hide navigation bar`, `<path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z"/>`, `icon menu open inactive-icon`),
  "minimize": iconTemplate(`minimize-icon`, `Exit fullscreen`, `<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>`, `icon inactive-icon`),
  "next": iconTemplate(`next-icon`, `Next Chapter`, `<path d="M6.49 20.13l1.77 1.77 9.9-9.9-9.9-9.9-1.77 1.77L14.62 12l-8.13 8.13z"/>`),
  "previous": iconTemplate(`previous-icon`, `Previous Chapter`, `<path d="M17.51 3.87L15.73 2.1 5.84 12l9.9 9.9 1.77-1.77L9.38 12l8.13-8.13z"/>`),
  "settings": iconTemplate(`settings-icon`, `Settings`, `<path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.09-.16-.26-.25-.44-.25-.06 0-.12.01-.17.03l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.06-.02-.12-.03-.18-.03-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.09.16.26.25.44.25.06 0 .12-.01.17-.03l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73 0 .21-.02.43-.05.73l-.14 1.13.89.7 1.08.84-.7 1.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16 1.13-.2 1.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21 1.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21 1.27.51 1.04.42.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19 1.35.16 1.13 1.06.43c.43.18.83.41 1.23.71l.91.7 1.06-.43 1.27-.51.7 1.21-1.07.85-.89.7.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>`, `icon open`),
  "toc": iconTemplate(`toc-icon`, `Table of Contents`, `<path d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm16 0h2v-2h-2v2zm0-10v2h2V7h-2zm0 6h2v-2h-2v2z"/>`, `icon open`),
  "increaseLineHeight": iconTemplate('increase-line-height-icon', 'Increase Line Height',
      `<rect x="4.04" y="0.05" width="13.34" height="0.8"/>
      <path d="M17.42.88H4V0H17.42ZM4.08.81H17.34V.09H4.08Z"/>
      <rect x="10.2" y="2.26" width="1.11" height="12.69"/>
      <polygon points="6.21 5.92 7.02 6.67 10.75 2.68 14.48 6.67 15.3 5.92 10.75 1.06 6.21 5.92"/>
      <rect x="4.04" y="23.14" width="13.34" height="0.8"/>
      <path d="M17.42,24H4v-.87H17.42ZM4.08,23.9H17.34v-.72H4.08Z"/>
      <rect x="10.2" y="9.06" width="1.11" height="12.69"/>
      <polygon points="15.3 18.08 14.49 17.33 10.75 21.32 7.02 17.33 6.21 18.08 10.75 22.94 15.3 18.08"/>`,
  'line-height'),
  "decreaseLineHeight": iconTemplate('decrease-line-height-icon', 'Decrease Line Height',
      `<rect x="5.55" y="11.6" width="13.25" height="0.8"/>
      <path d="M18.84,12.43H5.51v-.86H18.84ZM5.59,12.36H18.77v-.72H5.59Z"/>
      <rect x="11.62" y="0.06" width="1.1" height="9.48"/>
      <polygon points="16.69 5.88 15.88 5.13 12.18 9.12 8.47 5.13 7.66 5.88 12.18 10.74 16.69 5.88"/>
      <rect x="11.62" y="14.46" width="1.1" height="9.48"/>
      <polygon points="7.66 18.11 8.47 18.87 12.18 14.88 15.88 18.87 16.69 18.11 12.18 13.26 7.66 18.11"/>`,
  'line-height'),
  "increaseMarginSize": iconTemplate('increase-margin-size-icon', 'Increase Margin Size',
  `<rect x="3.76" y="11.56" width="20.59" height="0.92" transform="translate(26.07 -2.04) rotate(90)"/><path d="M13.56,22.37V1.66h1V22.37Zm.08-20.59V22.26h.83V1.78Z"/><rect x="1" y="11.56" width="20.59" height="0.92" transform="translate(23.32 0.72) rotate(90)"/><path d="M10.8,22.37V1.66h1V22.37Zm.08-20.59V22.26h.84V1.78Z"/><rect x="15.38" y="3.56" width="8.65" height="0.92" transform="translate(39.42 8.03) rotate(180)"/><path d="M15.36,3.52h8.7v1h-8.7ZM24,3.6h-8.6v.83H24Z"/><rect x="15.31" y="7.56" width="8.72" height="0.92" transform="translate(39.34 16.03) rotate(180)"/><path d="M15.29,7.52h8.77v1H15.29ZM24,7.6H15.33v.83H24Z"/><rect x="15.31" y="11.56" width="8.72" height="0.92" transform="translate(39.34 24.03) rotate(180)"/><path d="M15.29,11.52h8.77v1H15.29ZM24,11.6H15.33v.83H24Z"/><rect x="15.31" y="15.56" width="8.72" height="0.92" transform="translate(39.34 32.03) rotate(180)"/><path d="M15.29,15.52h8.77v1H15.29ZM24,15.6H15.33v.83H24Z"/><rect x="15.31" y="19.56" width="8.72" height="0.92" transform="translate(39.34 40.03) rotate(180)"/><path d="M15.29,19.52h8.77v1H15.29ZM24,19.6H15.33v.83H24Z"/><rect x="0.06" y="11.48" width="9.49" height="1.11"/><polygon points="5.89 7.49 5.14 8.31 9.13 12.04 5.14 15.77 5.89 16.59 10.75 12.04 5.89 7.49"/>`),
  "decreaseMarginSize": iconTemplate('decrease-margin-size-icon', 'Decrease Margin Size',
  `<rect x="3.7" y="11.52" width="20.59" height="0.92" transform="translate(25.98 -2.02) rotate(90)"/><path d="M13.5,22.33V1.62h1V22.33Zm.08-20.59V22.22h.84V1.74Z"/><rect x="-9.85" y="11.52" width="20.59" height="0.92" transform="translate(12.42 11.53) rotate(90)"/><path d="M-.06,22.33V1.62h1V22.33ZM0,1.74V22.22H.86V1.74Z"/><rect x="15.33" y="3.52" width="8.65" height="0.92" transform="translate(39.31 7.95) rotate(180)"/><path d="M15.31,3.48H24v1H15.31ZM24,3.56h-8.6v.83H24Z"/><rect x="15.25" y="7.52" width="8.72" height="0.92" transform="translate(39.23 15.95) rotate(180)"/><path d="M15.23,7.48H24v1H15.23ZM24,7.56H15.28v.83H24Z"/><rect x="15.25" y="11.52" width="8.72" height="0.92" transform="translate(39.23 23.95) rotate(180)"/><path d="M15.23,11.48H24v1H15.23Zm8.72.08H15.28v.83H24Z"/><rect x="15.25" y="15.52" width="8.72" height="0.92" transform="translate(39.23 31.95) rotate(180)"/><path d="M15.23,15.48H24v1H15.23Zm8.72.08H15.28v.83H24Z"/><rect x="15.25" y="19.52" width="8.72" height="0.92" transform="translate(39.23 39.95) rotate(180)"/><path d="M15.23,19.48H24v1H15.23Zm8.72.08H15.28v.83H24Z"/><rect x="2.2" y="11.44" width="8.8" height="1.11"/><polygon points="5.86 16.55 6.62 15.73 2.63 12 6.62 8.27 5.86 7.45 1 12 5.86 16.55"/>`),
}