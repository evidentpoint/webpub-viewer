import LocalStorageStore from "./LocalStorageStore";
import ServiceWorkerCacher from "./ServiceWorkerCacher";
import IFrameNavigator from "./IFrameNavigator";
import PublisherFont from "./PublisherFont";
import SerifFont from "./SerifFont";
import SansFont from "./SansFont";
import DayTheme from "./DayTheme";
import SepiaTheme from "./SepiaTheme";
import NightTheme from "./NightTheme";
import ColumnsPaginatedBookView from "./ColumnsPaginatedBookView";
import ScrollingBookView from "./ScrollingBookView";
import BookSettings, { ColumnSettings } from "./BookSettings";
import LocalAnnotator from "./LocalAnnotator";

const app = async (element: HTMLElement, manifestUrl: URL): Promise<IFrameNavigator> => {
    const bookStore = new LocalStorageStore({ prefix: manifestUrl.href });
    const cacher = new ServiceWorkerCacher({ store: bookStore, manifestUrl });
    const annotator = new LocalAnnotator({ store: bookStore });
    const publisher = new PublisherFont();
    const serif = new SerifFont();
    const sans = new SansFont();
    // const fontSizes = [ 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32 ];
    const fontSizes = [ 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 ];
    const lineHeights = [ 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0];
    const marginSizes = [ 0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500 ];
    const textAlignments = ["publisher", "left", "justify"];
    const columnOptions = [ColumnSettings.Auto, ColumnSettings.OneColumn, ColumnSettings.TwoColumn];
    const day = new DayTheme();
    const sepia = new SepiaTheme();
    const night = new NightTheme();
    const paginator = new ColumnsPaginatedBookView();
    const scroller = new ScrollingBookView();
    const settingsStore = new LocalStorageStore({ prefix: "cassis-reader" });
    const settings = await BookSettings.create({
        store: settingsStore,
        bookFonts: [publisher, serif, sans],
        fontSizes: fontSizes,
        lineHeights: lineHeights,
        textAlignments: textAlignments,
        defaultFontSize: 1,
        bookThemes: [day, sepia, night],
        bookViews: [paginator, scroller],
        columnOptions: columnOptions,
        marginSizes: marginSizes,
    });
    return await IFrameNavigator.create({
        element,
        manifestUrl,
        store: bookStore,
        cacher,
        settings,
        annotator,
        publisher,
        serif,
        sans,
        day,
        sepia,
        night,
        paginator,
        scroller
    });
};

export default app;

