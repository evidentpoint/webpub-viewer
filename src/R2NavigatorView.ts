import {
  Publication,
  IFrameLoader,
  R2ContentViewFactory,
  RenditionContext as R2RenditionContext,
  Rendition,
  Location,
  SpreadMode,
  ScrollMode,
  SettingName,
  ViewportResizer,
  PageTitleTocResolver,
  PageBreakData,
} from '@readium/navigator-web';

import {
  RegionHandling, Region,
} from 'r2-glue-js';

import { ChapterInfo } from './SimpleNavigatorView';
import { TextAlign } from './BookSettings';

export enum RegionScope {
  Viewport = 'viewport',
  Document = 'document',
}

interface settingsProps {
  viewAsVertical: boolean;
  enableScroll: boolean;
  viewport?: HTMLElement;
};

interface HoverSize {
  width: number;
  height: number;
}

type GlueHandler = RegionHandling;

export class R2NavigatorView {
  private rendCtx: R2RenditionContext;
  private viewportRoot: HTMLElement;
  private resizer?: ViewportResizer;

  private viewAsVertical: boolean = false;
  private enableScroll: boolean = false;
  private regionHandlers: RegionHandling[] = [];
  private glueToRegionUpdaterMap: Map<GlueHandler, Function[]> = new Map();
  private shouldCheckWindowHref: boolean = false;
  private pageTitleTocResolver: PageTitleTocResolver;

  private customLeftHoverSize: HoverSize = {
    width: 0,
    height: 0,
  };
  private customRightHoverSize: HoverSize = {
    width: 0,
    height: 0,
  };

  private onHoverLeftCb: Function = () => {};
  private onHoverRightCb: Function = () => {};

  public constructor(settings: settingsProps) {
    this.viewAsVertical = settings != undefined ? settings.viewAsVertical : this.viewAsVertical;
    this.enableScroll = settings != undefined ? settings.enableScroll : this.enableScroll;
    if (!settings.viewport) {
      console.log('No viewport was set in R2NavigatorView');
      return;
    }

    this.bindOwnMethods();
    this.shouldCheckWindowHref = true;

    // Add an event listener for window location hash changes
    window.addEventListener('hashchange', () => {
      this.goToWindowLocation();
    }, false)
  }

  public isVerticalLayout(): boolean {
    return this.rendCtx.rendition.isVerticalLayout();
  }

  public async getShareLink(): Promise<string> {
    let hrefWithoutHash = window.location.href;
    if (window.location.hash.length > 0) {
      hrefWithoutHash = window.location.href.split(window.location.hash)[0];
    }
    const loc = await this.rendCtx.navigator.getCurrentLocationAsync();
    if (!loc) {
      console.error("No location was retrieved");
      return '';
    }

    let newHref = hrefWithoutHash + `#href=${loc.getHref()}`;
    let cfi = loc.getLocation();
    if (cfi) {
      newHref += `&cfi=${cfi}`;
    }

    return newHref;
  }

  public addLocationChangedListener(callback: Function) {
    this.rendCtx.rendition.viewport.addLocationChangedListener(callback);
  }

  public addHoverLeftListener(callback: Function, settings?: any) {
    this.onHoverLeftCb = callback;

    this.customLeftHoverSize = {
      width: settings.width,
      height: settings.height,
    };
  }

  public addHoverRightListener(callback: Function, settings?: any) {
    this.onHoverRightCb = callback;

    this.customRightHoverSize = {
      width: settings.width,
      height: settings.height,
    };
  }

  public async getChapterInfo(): Promise<ChapterInfo> {
    let firstChapterInfo: ChapterInfo = {
      title: '',
      href: '',
    }
    const pub = this.rendCtx.rendition.getPublication();
    const toc = pub.toc;
    if (toc) {
      firstChapterInfo.title = toc[0].title;
      firstChapterInfo.href = toc[0].href;
    }

    let chapterInfo;
    if (this.rendCtx) {
      const currentLoc = await this.rendCtx.navigator.getCurrentLocationAsync();
      if (currentLoc) {
          chapterInfo = this.pageTitleTocResolver.getTocLinkFromLocation(currentLoc);
      }
  }

    return chapterInfo || firstChapterInfo;
  }

  // Returns the total number of pagelist items
  public getLastPageTitle(): string {
    const pub = this.rendCtx.rendition.getPublication();
    if (pub.pageList) {
      const length = pub.pageList.length;
      return pub.pageList[length-1].title;
    }

    return '';
  }

  public async getStartEndPageTitles(): Promise<string> {
    const pageBreaks = await this.pageTitleTocResolver.getVisiblePageBreaks();
    if (!pageBreaks.length) {
      return '';
    }

    let startTitle = '';
    let endTitle = '';
    let firstPageBreak = pageBreaks[0];
    // If the first page break is on the left and it's not at the very top,
    // then check if a page break came before it
    if (firstPageBreak.rect.top > 40) {
      const prev = this.pageTitleTocResolver.getPreviousPageBreakInSpineItem(firstPageBreak);
      // If only one page break was returned, check if this previous page break
      // counts as a second
      if (prev !== firstPageBreak && pageBreaks.length === 1) {
        endTitle = firstPageBreak.link.title;
      }
      firstPageBreak = prev;
    }
    startTitle = firstPageBreak.link.title;

    if (pageBreaks.length > 1) {
      const lastPageBreak = pageBreaks[pageBreaks.length-1];
      endTitle = lastPageBreak.link.title;
    }

    let title = startTitle;
    if (startTitle !== endTitle && endTitle) {
      title += `-${endTitle}`
    }

    return title;
  }

  public async getVisiblePageBreaks(): Promise<PageBreakData[]> {
    return await this.pageTitleTocResolver.getVisiblePageBreaks();
  }

  public updateFont(font: string): void {
    let fontFam = '';
    let fontOverload = '';
    if (font === 'publisher-font') {
        fontOverload = 'readium-font-off';
    }
    else if (font === 'serif-font') {
        fontFam = '--RS__modernTf';
        fontOverload = 'readium-font-on';
    }
    else if (font === 'sans-font') {
        fontFam = '--RS__humanistTf';
        fontOverload = 'readium-font-on';
    }

    const settings = [{
        name: SettingName.FontFamily,
        value: `var(${fontFam})`
    },
    {
        name: SettingName.FontOverride,
        value: fontOverload
    }];

    this.rendCtx.rendition.updateViewSettings(settings);
  }

  public updateFontSize(newFontSize: number): void {
    const fontSettings = [{
        name: SettingName.FontSize,
        value: newFontSize * 100,
    }];
    this.rendCtx.rendition.updateViewSettings(fontSettings);
  }

  public updateLineHeight(newLineHeight: number): void {
    const lineHeightSettings = [{
      name: SettingName.LineHeight,
      value: `${newLineHeight * 100}%`,
    }];

    const isAdvancedEnabled = this.rendCtx.rendition.viewSettings().getSetting(SettingName.AdvancedSettings);
    if (!isAdvancedEnabled) {
      lineHeightSettings.push({
        name: SettingName.AdvancedSettings,
        value: 'readium-advanced-on',
      });
    }


    this.rendCtx.rendition.updateViewSettings(lineHeightSettings);
  }

  public updateTextAlign(newTextAlign: string): void {
    let textAlign = '';
    if (newTextAlign === TextAlign.Justify) {
      textAlign = TextAlign.Justify;
    } else if (newTextAlign === TextAlign.Left) {
      textAlign = TextAlign.Left;
    }

    const textAlignSettings = [{
      name: SettingName.TextAlign,
      value: textAlign,
    }];

    const isAdvancedEnabled = this.rendCtx.rendition.viewSettings().getSetting(SettingName.AdvancedSettings);
    if (!isAdvancedEnabled) {
      textAlignSettings.push({
        name: SettingName.AdvancedSettings,
        value: 'readium-advanced-on',
      });
    }

      this.rendCtx.rendition.updateViewSettings(textAlignSettings);
  }

  public updateTheme(theme: string): void {
      let themeSettings = {
          name: SettingName.ReadingMode,
          value: '',
      }

      if (theme === 'night-theme') {
          themeSettings.value = 'readium-night-on';
      }
      else if (theme === 'sepia-theme') {
          themeSettings.value = 'readium-sepia-on';
      }

      this.rendCtx.rendition.updateViewSettings([themeSettings]);
  }

  public nextScreen(): void {
    this.rendCtx.navigator.nextScreen();
  }

  public previousScreen(): void {
    this.rendCtx.navigator.previousScreen();
  }

  public async goToHrefLocation(fullHref: string, cfi?: string): Promise<void> {
    const pub = this.rendCtx.rendition.getPublication();
    const splitHref = fullHref.split('#');
    const href = splitHref[0];
    const eleId = splitHref.length >= 2 ? splitHref[1] : '';
    const relHref = pub.getHrefRelativeToManifest(href);

    if (cfi) {
      const loc = new Location(cfi, relHref, true);
      await this.rendCtx.navigator.gotoLocation(loc);
    } else {
      await this.rendCtx.navigator.gotoAnchorLocation(relHref, eleId);
    }
  }

  public destroy(): void {
    if (this.resizer) {
      this.resizer.stopListenResize();
    }
    const el = document.getElementById('layout-view-root');
    if (el) {
      el.remove();
    }
  }

  public async loadPublication(pubUrl: string, root: HTMLElement): Promise<void> {
    const publication: Publication = await Publication.fromURL(pubUrl);
    const loader = new IFrameLoader(publication.getBaseURI());
    loader.setReadiumCssBasePath('/readerJBKS/readium-css');
    const cvf = new R2ContentViewFactory(loader);
    const rendition = new Rendition(publication, root, cvf);
    rendition.setViewAsVertical(this.viewAsVertical);
    this.viewportRoot = root;

    this.rendCtx = new R2RenditionContext(rendition, loader);
    this.pageTitleTocResolver = new PageTitleTocResolver(this.rendCtx);
    this.addLocationChangedListener(() => {
      this.viewportContentChanged();
    });

    this.updateSize(false);

    rendition.setPageLayout({
        spreadMode: SpreadMode.FitViewportDoubleSpread,
        pageWidth: 0,
        pageHeight: 0,
    });
    await rendition.render();
    rendition.viewport.setScrollMode(this.enableScroll ? ScrollMode.Publication : ScrollMode.None);

    this.resizer = new ViewportResizer(this.rendCtx, this.updateSize);
    loader.addIFrameLoadedListener((iframe: HTMLIFrameElement) => {
      this.iframeLoaded(iframe);
    });


    this.rendCtx.navigator.gotoBegin();
    this.rendCtx.navigator.ensureLoaded().then(() => {
      if (this.shouldCheckWindowHref) {
        this.goToWindowLocation();
        this.shouldCheckWindowHref = false;
      }
    });
  }

  public async goToWindowLocation(): Promise<void> {
    const hash = window.location.hash;
    const arr = hash.split('&');
    const href = (arr[0] && arr[0].split('href=')[1]) || '';
    const cfi = (arr[1] && arr[1].split('cfi=')[1]) || '';

    if (href || cfi) {
      await this.goToHrefLocation(href, cfi);
    }
  }

  private iframeLoaded(iframe: HTMLIFrameElement): void {
    this.addRegionHandling(iframe);
  }

  private addGlueHandler(glue: GlueHandler, iframe: HTMLIFrameElement): GlueHandler {
    const win = iframe.contentWindow;
    if (!glue || !win) {
      return glue;
    }
    this.regionHandlers.push(glue);

    // Destroy references on unload
    win.addEventListener('unload', () => {
      this.destroyGlueHandler(glue);
    });

    return glue;
  }

  private destroyGlueHandler(glue: GlueHandler) {
    const index = this.regionHandlers.indexOf(glue);
    this.regionHandlers.splice(index, 1);
    this.glueToRegionUpdaterMap.delete(glue);
    glue.destroy();
  }

  private getLeftHoverSize(): HoverSize {
    const viewportRect = this.viewportRoot.getBoundingClientRect();
    return {
      width: this.customLeftHoverSize.width || viewportRect.width / 2,
      height: this.customLeftHoverSize.height || viewportRect.height,
    }
  }

  private getRightHoverSize(): HoverSize {
    const viewportRect = this.viewportRoot.getBoundingClientRect();
    return {
      width: this.customRightHoverSize.width || viewportRect.width / 2,
      height: this.customRightHoverSize.height || viewportRect.height,
    }
  }

  private addRegionHandling(iframe: HTMLIFrameElement): RegionHandling | null {
    if (!iframe.contentWindow) {
      console.error("IFrame not loaded");
      return null;
    }

    const regionHandling: RegionHandling = this.addGlueHandler(new RegionHandling(iframe.contentWindow), iframe);

    // Left Hover
    this.setupRegionListeners(regionHandling, this.getLeftHoverRegion, iframe);
    this.onHoverLeftCb(false);

    // Right Hover
    this.setupRegionListeners(regionHandling, this.getRightHoverRegion, iframe);
    this.onHoverRightCb(false);

    return regionHandling;
  }

  private setupRegionListeners(regionHandling: RegionHandling, regionGetter: Function, iframe: HTMLIFrameElement): void {
    // regionHandling.addEventListener('mouseenter', region, () => {
    //   console.log('mouseenter');
    // });
    // regionHandling.addEventListener('mouseout', region, () => {
    //   console.log('mouseexit');
    // });
    const region = regionGetter();
    regionHandling.addEventListener('click', region, () => {
      this.iframeHoverRegionClicked(regionGetter, iframe);
    }).then((listenerId: number) => {
      // Function to be called later
      // Updates the region of this specific listener
      const regionUpdater = () => {
        const region = regionGetter();
        regionHandling.setRegion(region, listenerId);
      };

      this.addToRegionUpdaterMap(regionHandling, regionUpdater);
      // Wait for the content in the iframe to finish loading, and then update the region
      this.rendCtx.rendition.viewport.ensureLoaded().then(() => {
        this.updateHoverRegion(regionHandling);
      });
    });
  }

  private addToRegionUpdaterMap(regionHandling: RegionHandling, regionUpdater: Function): void {
    const updaters = this.glueToRegionUpdaterMap.get(regionHandling) || [];

    updaters.push(regionUpdater);
    this.glueToRegionUpdaterMap.set(regionHandling, updaters);
  }

  private getLeftHoverRegion(): Region {
    const leftHoverSize = this.getLeftHoverSize();
    const region = {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      scope: RegionScope.Viewport,
    }

    const startPos = this.rendCtx.rendition.viewport.getStartPosition();
    if (!startPos) {
      return region;
    }

    const pageWidth: number = this.rendCtx.rendition.getPageWidth();

    return {
      left: startPos.pageIndex * pageWidth,
      top: 0,
      width: leftHoverSize.width,
      height: leftHoverSize.height,
      scope: RegionScope.Viewport,
    };
  }

  private getRightHoverRegion(): Region {
    const rightHoverRegion: HoverSize = this.getRightHoverSize();
    const region = {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      scope: RegionScope.Viewport,
    }

    const endPos = this.rendCtx.rendition.viewport.getEndPosition();
    if (!endPos) {
      return region;
    }

    const pageWidth: number = this.rendCtx.rendition.getPageWidth();
    const columnGap: number = this.rendCtx.rendition.viewSettings().getSetting(SettingName.ColumnGap) || 0;

    return {
      left: endPos.pageIndex * pageWidth - rightHoverRegion.width - columnGap,
      top: 0,
      width: rightHoverRegion.width,
      height: rightHoverRegion.height,
      scope: RegionScope.Viewport,
    };
  }

  private iframeHoverRegionClicked(regionGetter: Function, iframe: HTMLIFrameElement): void {
    const iframeRect = iframe.getBoundingClientRect();
    const viewportRect = this.viewportRoot.getBoundingClientRect();
    const region = regionGetter();

    // We already know that a region was clicked, so we just need to figure out which region it was
    const isLeftRegion = regionGetter === this.getLeftHoverRegion;
    const isRightRegion = regionGetter === this.getRightHoverRegion;

    // We're only interested in the leftmost and rightmost regions.
    if (isRightRegion && region.left + iframeRect.left >= viewportRect.left + viewportRect.width / 2) {
      this.nextScreen();
    }
    if (isLeftRegion && region.left + iframeRect.left < viewportRect.left + viewportRect.width / 2) {
      this.previousScreen();
    }
  }

  private bindOwnMethods(): void {
    this.updateFont = this.updateFont.bind(this);
    this.updateFontSize = this.updateFontSize.bind(this);
    this.updateSize = this.updateSize.bind(this);
    this.updateTheme = this.updateTheme.bind(this);
    this.getLeftHoverRegion = this.getLeftHoverRegion.bind(this);
    this.getRightHoverRegion = this.getRightHoverRegion.bind(this);
    this.updateTextAlign = this.updateTextAlign.bind(this);
    this.updateLineHeight = this.updateLineHeight.bind(this);
  }

  private updateSize(willRefreshLayout: boolean = true): void {
    const availableWidth = this.getAvailableWidth();
    const availableHeight = this.getAvailableHeight();

    this.viewportRoot.style.width = `${availableWidth}px`;
    this.viewportRoot.style.height = `${availableHeight}px`;

    const scrollerWidthAdj = this.enableScroll ? 15 : 0;
    const viewportWidth = availableWidth - scrollerWidthAdj;
    const viewportHeight = availableHeight;

    const viewportSize = this.viewAsVertical ? viewportHeight : viewportWidth;
    const viewportSize2nd = this.viewAsVertical ? viewportWidth : viewportHeight;
    this.rendCtx.rendition.viewport.setViewportSize(viewportSize, viewportSize2nd);
    this.rendCtx.rendition.viewport.setPrefetchSize(Math.ceil(availableWidth * 0.1));
    if (willRefreshLayout) {
      this.rendCtx.rendition.refreshPageLayout();
    }
  }

  private viewportContentChanged(): void {
    this.updateHoverRegionAll();
    // TODO: Call this only when the element offsets change
    // Currently it gets called too often, like when flipping pages
    this.pageTitleTocResolver.updatePageListMap();
  }

  // Iterates through all region handlers
  private updateHoverRegionAll(): void {
    for (const handler of this.regionHandlers) {
      this.updateHoverRegion(handler);
    }
  }

  private updateHoverRegion(handler: RegionHandling): void {
    const regionUpdaters = this.glueToRegionUpdaterMap.get(handler);
    if (!regionUpdaters) {
      return;
    }

    regionUpdaters.forEach((regionUpdater) => {
      if (regionUpdater) {
        regionUpdater();
      }
    });
  }

  // Get available height for iframe container to sit within
  private getAvailableHeight(): number {
    const topBar = document.getElementById('top-control-bar');
    let topHeight = 0;
    if (topBar) {
        const topRect = topBar.getBoundingClientRect();
        topHeight = topRect.height;
    }
    const bottomBar = document.getElementById('bottom-control-bar');
    const bottomBar2 = document.getElementById('bottom-info-bar');
    let bottomHeight = 0;
    if (bottomBar) {
        const bottomRect = bottomBar.getBoundingClientRect();
        bottomHeight = bottomRect.height;

        if (bottomHeight <= 5 && bottomBar2) {
          const bottomRect2 = bottomBar2.getBoundingClientRect();
          bottomHeight = bottomRect2.height;
        }
    }

    return window.innerHeight - topHeight - bottomHeight;
  }

  // Get available width for iframe container to sit within
  private getAvailableWidth(): number {
      const prevBtn = document.getElementById('left-control-container');
      let prevBtnWidth = 0;
      if (prevBtn) {
          const rect = prevBtn.getBoundingClientRect();
          prevBtnWidth = rect.width;
      }
      const nextBtn = document.getElementById('right-control-container');
      let nextBtnWidth = 0;
      if (nextBtn) {
          const rect = nextBtn.getBoundingClientRect();
          nextBtnWidth = rect.width;
      }

      return window.innerWidth - prevBtnWidth - nextBtnWidth;
  }
}