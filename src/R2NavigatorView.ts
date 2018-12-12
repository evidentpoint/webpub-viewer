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
  ViewportResizer
} from '@readium/navigator-web';

import {
  RegionHandling, Region,
} from 'r2-glue-js';

import { ChapterInfo } from './SimpleNavigatorView';

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

interface EventData {
  clientX: number;
  clientY: number;
  screenX: number;
  screenY: number;
  pageX: number;
  pageY: number;
}

interface Point {
  x: number;
  y: number;
}

interface Rect extends Point {
  width: number,
  height: number,
}

type GlueHandler = RegionHandling;

export class R2NavigatorView {
  private rendCtx: R2RenditionContext;
  private viewportRoot: HTMLElement;
  private resizer?: ViewportResizer;

  private viewAsVertical: boolean = false;
  private enableScroll: boolean = false;
  private regionHandlers: RegionHandling[] = [];
  private glueToIframeMap: Map<GlueHandler, HTMLIFrameElement> = new Map();
  private shouldCheckWindowHref: boolean = false;

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

  public getShareLink(): string {
    const hrefWithoutHash = window.location.href.split(window.location.hash)[0];
    const loc = this.rendCtx.navigator.getCurrentLocation();
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
    let chapterInfo: ChapterInfo = {
      title: '',
      href: '',
    }

    if (this.rendCtx) {
      const pub = this.rendCtx.rendition.getPublication();
      const currentLoc = await this.rendCtx.navigator.getCurrentLocationAsync();
      let currentChap;
      if (currentLoc) {
          const chapterHref = currentLoc.getHref()
          currentChap = pub.toc.find((item: any) => {
              return ( chapterHref === item.href);
          });

          if (!currentChap) {
              currentChap = pub.toc[0];
          }
          chapterInfo.title = currentChap.title;
          chapterInfo.href = chapterHref;
      }
  }

    return chapterInfo;
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

  public async goToHrefLocation(href: string, cfi: string = ''): Promise<void> {
    const pub = this.rendCtx.rendition.getPublication();
    const relHref = pub.getHrefRelativeToManifest(href);
    const loc = new Location(cfi, relHref, true);
    await this.rendCtx.navigator.gotoLocation(loc);
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


    // Check the window location only once
    if (this.shouldCheckWindowHref) {
      await this.goToWindowLocation();
      this.shouldCheckWindowHref = false;
    } else {
      this.rendCtx.navigator.gotoBegin();
    }
  }

  public async goToWindowLocation(): Promise<void> {
    const hash = window.location.hash;
    const arr = hash.split('&');
    const href = (arr[0] && arr[0].split('href=')[1]) || '';
    const cfi = (arr[1] && arr[1].split('cfi=')[1]) || '';

    if (href || cfi) {
      await this.goToHrefLocation(href, cfi);
    } else {
      await this.rendCtx.navigator.gotoBegin();
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
    this.glueToIframeMap.set(glue, iframe);

    // Destroy references on unload
    win.addEventListener('unload', () => {
      this.destroyGlueHandler(glue);
    });

    return glue;
  }

  private destroyGlueHandler(glue: GlueHandler) {
    const index = this.regionHandlers.indexOf(glue);
    this.regionHandlers.splice(index, 1);
    this.glueToIframeMap.delete(glue);
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

    const leftHoverSize = this.getLeftHoverSize();
    const regionHandling = this.addGlueHandler(new RegionHandling(iframe.contentWindow), iframe);

    // Left Hover
    const widthLeft = leftHoverSize.width;
    const heightLeft = leftHoverSize.height;
    const regionLeft: Region = {
      left: 0,
      top: 0,
      width: widthLeft,
      height: heightLeft,
      scope: RegionScope.Viewport,
    };

    const iframeRect = iframe.getBoundingClientRect();
    // regionHandling.addEventListener('mouseenter', regionLeft, () => {
    //   this.onHoverLeftCb(true);
    //   console.log('mouseenter');
    // });
    // regionHandling.addEventListener('mouseout', regionLeft, () => {
    //   this.onHoverLeftCb(false);
    //   console.log('mouseexit');
    // });
    regionHandling.addEventListener('click', regionLeft, (opts: any) => {
      const mouseData = opts[0];
      this.iframeHoverRegionClicked(mouseData, iframe);
    }, {
      offset: {
        x: iframeRect.left,
      }
    });
    this.onHoverLeftCb(false);

    // Right Hover
    const rightHoverSize = this.getRightHoverSize();
    const viewportRect = this.viewportRoot.getBoundingClientRect();
    const widthRight = rightHoverSize.width;
    const heightRight = rightHoverSize.height;
    const regionRight: Region = {
      left: viewportRect.width - widthRight,
      top: 0,
      width: widthRight,
      height: heightRight,
      scope: RegionScope.Viewport,
    }

    this.onHoverRightCb(false);
    // regionHandling.addEventListener('mouseenter', regionRight, () => {
    //   this.onHoverRightCb(true);
    // });
    // regionHandling.addEventListener('mouseout', regionRight, () => {
    //   this.onHoverRightCb(false);
    // });
    regionHandling.addEventListener('click', regionRight, (opts: any) => {
      const mouseData = opts[0];
      this.iframeHoverRegionClicked(mouseData, iframe);
    }, {
      offset: {
        x: iframeRect.left,
      }
    });

    return regionHandling;
  }

  private iframeHoverRegionClicked(mouseData: EventData, iframe: HTMLIFrameElement): void {
    const iframeRect = iframe.getBoundingClientRect();
    const viewportRect = this.viewportRoot.getBoundingClientRect();

    // The absolute position on the screen
    const absPosX = mouseData.clientX + iframeRect.left;
    const absPosY = mouseData.clientY + iframeRect.top;

    // Determine if the mouse has clicked within the hover region
    const leftHoverSize = this.getLeftHoverSize();
    const withinLeftHover = this.pointWithinRect(
      {
        x: absPosX,
        y: absPosY,
      },
      {
        x: viewportRect.left,
        y: viewportRect.top,
        width: leftHoverSize.width,
        height: leftHoverSize.height,
      }
    );

    const rightHoverSize = this.getLeftHoverSize();
    const withinRightHover = this.pointWithinRect(
      {
        x: absPosX,
        y: absPosY,
      },
      {
        x: viewportRect.width - viewportRect.left,
        y: viewportRect.top,
        width: rightHoverSize.width,
        height: rightHoverSize.height,
      }
    );

    if (withinLeftHover) {
      this.previousScreen();
    }
    if (withinRightHover) {
      this.nextScreen();
    }
  }

  private pointWithinRect(point: Point, rect: Rect) {
    return (
      (point.x >= rect.x && point.x <= rect.x + rect.width) &&
      (point.y >= rect.y && point.y <= rect.y + rect.height)
    );
  }

  private bindOwnMethods(): void {
    this.updateFont = this.updateFont.bind(this);
    this.updateFontSize = this.updateFontSize.bind(this);
    this.updateSize = this.updateSize.bind(this);
    this.updateTheme = this.updateTheme.bind(this);
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
    this.updateHoverRegion();
  }

  private updateHoverRegion(): void {
    for (const handler of this.regionHandlers) {
      const iframe = this.glueToIframeMap.get(handler);
      if (!iframe) {
        continue;
      }
      const iframeRect = iframe.getBoundingClientRect();
      handler.setOptions({
        offset: {
          x: iframeRect.left,
          y: iframeRect.top,
        },
      });
    }
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
      const prevBtn = document.getElementById('prev-page-btn');
      let prevBtnWidth = 0;
      if (prevBtn) {
          const rect = prevBtn.getBoundingClientRect();
          prevBtnWidth = rect.width;
      }
      const nextBtn = document.getElementById('next-page-btn');
      let nextBtnWidth = 0;
      if (nextBtn) {
          const rect = nextBtn.getBoundingClientRect();
          nextBtnWidth = rect.width;
      }

      return window.innerWidth - prevBtnWidth - nextBtnWidth;
  }
}