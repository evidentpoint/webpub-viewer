import PaginatedBookView from "./PaginatedBookView";
import BookSettings from "./BookSettings";
import Store from "./Store";
import Manifest from "./Manifest";

type settingsProps = {
  paginator: PaginatedBookView,
  settings: BookSettings,
  manifestUrl: URL,
  store: Store,
};

export type ChapterInfo = {
  title: string,
  href: string,
};

export class SimpleNavigatorView {
  iframe: HTMLIFrameElement;
  paginator: PaginatedBookView;
  settings: BookSettings;
  manifestUrl: URL;
  store: Store;
  manifest: Manifest;

  // @ts-ignore
  public constructor(settings: settingsProps) {
    this.bindOwnMethods();

    this.paginator = settings.paginator;
    this.settings = settings.settings;
    this.manifestUrl = settings.manifestUrl;
    this.store = settings.store;
  }

  // @ts-ignore
  public addLocationChangedListener(callback: Function) {
  }

  public async getChapterInfo(): Promise<ChapterInfo> {
    let chapterInfo: ChapterInfo = {
      title: '',
      href: '',
    }

    return chapterInfo;
  }

  // @ts-ignore
  public updateFont(font: string): void {

  }

  // @ts-ignore
  public updateFontSize(newFontSize: number): void {
  }

  // @ts-ignore
  public updateTheme(theme: string): void {

  }

  public nextScreen(): void {
  }

  public previousScreen(): void {
  }

  // @ts-ignore
  public goToHrefLocation(href: string): void {
  }

  public destroy(): void {
    this.iframe.remove();
  }

  // @ts-ignore
  public async loadPublication(pubUrl: string, root: HTMLElement): Promise<void> {
    this.manifest = await Manifest.getManifest(this.manifestUrl, this.store);
    const startLink = this.manifest.getStartLink();
    let startUrl: string = '';
    if (startLink && startLink.href) {
      startUrl = new URL(startLink.href, this.manifestUrl.href).href;
    }

    const width = this.getAvailableWidth();
    const height = this.getAvailableHeight();
    this.iframe = this.createIFrame(startUrl);
    this.iframe.width = width + 'px';
    this.iframe.height = height + 'px';

    this.paginator.bookElement = this.iframe;
    this.paginator.height = height;
    this.paginator.sideMargin = 40;


    // @ts-ignore
    window.paginator = this.paginator;
    root.appendChild(this.iframe);
  }

  private bindOwnMethods(): void {
    this.updateFont = this.updateFont.bind(this);
    this.updateFontSize = this.updateFontSize.bind(this);
    this.updateTheme = this.updateTheme.bind(this);
  }

  private createIFrame(src: string): HTMLIFrameElement {
    let iframe = document.createElement('iframe');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.src = src;

    return iframe;
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

  // private navigate(readingPosition: ReadingPosition): void {
  //   // this.newPosition = readingPosition;
  //   if (readingPosition.resource.indexOf("#") === -1) {
  //       this.iframe.src = readingPosition.resource;
  //   } else {
  //       // We're navigating to an anchor within the resource,
  //       // rather than the resource itself. Go to the resource
  //       // first, then go to the anchor.
  //       // newElementId = readingPosition.resource.slice(readingPosition.resource.indexOf("#") + 1)

  //       const newResource = readingPosition.resource.slice(0, readingPosition.resource.indexOf("#"))
  //       this.iframe.src = newResource;
  //   }
  // }
}