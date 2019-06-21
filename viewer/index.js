import LocalStorageStore from "../src/LocalStorageStore";
import ServiceWorkerCacher from "../src/ServiceWorkerCacher";
import PublisherFont from "../src/PublisherFont";
import SerifFont from "../src/SerifFont";
import SansFont from "../src/SansFont";
import DayTheme from "../src/DayTheme";
import SepiaTheme from "../src/SepiaTheme";
import ColumnsPaginatedBookView from "../src/ColumnsPaginatedBookView";
import NightTheme from "../src/NightTheme";
import ScrollingBookView from "../src/ScrollingBookView";
import LocalAnnotator from "../src/LocalAnnotator";
import BookSettings, { ColumnSettings } from "../src/BookSettings";
import IFrameNavigator from "../src/IFrameNavigator";

var getURLQueryParams = function() {
  var params = {};
  var query = window.location.search;
  if (query && query.length) {
    query = query.substring(1);
    var keyParams = query.split("&");
    for (var x = 0; x < keyParams.length; x++) {
      var keyVal = keyParams[x].split("=");
      if (keyVal.length > 1) {
        params[keyVal[0]] = decodeURIComponent(keyVal[1]);
      }
    }
  }
  return params;
};

var element = document.getElementById("viewer");
var urlParams = getURLQueryParams();
var webpubManifestUrl = new URL(urlParams["url"]);
var store = new LocalStorageStore({ prefix: webpubManifestUrl.href });
var cacher = new ServiceWorkerCacher({
  store: store,
  manifestUrl: webpubManifestUrl,
  serviceWorkerUrl: new URL("sw.js", window.location.href),
  staticFileUrls: [
    new URL(window.location.href),
    new URL("index.html", window.location.href),
    new URL("main.css", window.location.href),
    new URL("require.js", window.location.href),
    new URL("fetch.js", window.location.href),
    new URL("webpub-viewer.js", window.location.href)
  ]
});

var publisher = new PublisherFont();
var serif = new SerifFont();
var sans = new SansFont();
var fontSizes = [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];
var lineHeights = [
  0.6,
  0.7,
  0.8,
  0.9,
  1,
  1.1,
  1.2,
  1.3,
  1.4,
  1.5,
  1.6,
  1.8,
  2.0
];
var textAlignments = ["publisher", "left", "justify"];
var columnOptions = [
  ColumnSettings.Auto,
  ColumnSettings.OneColumn,
  ColumnSettings.TwoColumn
];
var defaultFontSize = 1;
var day = new DayTheme();
var sepia = new SepiaTheme();
var night = new NightTheme();
var paginator = new ColumnsPaginatedBookView();
var scroller = new ScrollingBookView();
var annotator = new LocalAnnotator({ store: store });
var settingsStore = new LocalStorageStore({ prefix: "webpub-viewer" });
var upLink = {
  url: new URL("https://github.com/edrlab/webpub-viewer"),
  label: "Details",
  ariaLabel: "Go back to the Github repository"
};

BookSettings.create({
  store: settingsStore,
  bookFonts: [publisher, serif, sans],
  fontSizes: fontSizes,
  lineHeights: lineHeights,
  textAlignments: textAlignments,
  defaultFont: defaultFontSize,
  bookThemes: [day, sepia, night],
  bookViews: [paginator, scroller],
  columnOptions: columnOptions
}).then(function(settings) {
  IFrameNavigator.create({
    element: element,
    manifestUrl: webpubManifestUrl,
    store: store,
    cacher: cacher,
    settings: settings,
    annotator: annotator,
    publisher: publisher,
    serif: serif,
    sans: sans,
    day: day,
    sepia: sepia,
    night: night,
    paginator: paginator,
    scroller: scroller,
    upLink: upLink,
    allowFullscreen: true
  });
});
