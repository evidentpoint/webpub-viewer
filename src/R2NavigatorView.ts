import {
  Publication,
  IFrameLoader,
  R2ContentViewFactory,
  RenditionContext as R2RenditionContext,
  Rendition,
  SpreadMode,
  ViewportResizer
} from '@evidentpoint/r2-navigator-web';

export class R2NavigatorView {
  private rendCtx: R2RenditionContext;
  private resizer?: ViewportResizer;

  private viewAsVertical: boolean = false;
  private enableScroll: boolean = false;

  public constructor() {
    this.updateSize = this.updateSize.bind(this);
  }

  public destroy(): void {
    if (this.resizer) {
      this.resizer.stopListenResize();
    }
  }

  public async loadPublication(pubUrl: string, root: HTMLElement): Promise<R2RenditionContext> {
    const publication: Publication = await Publication.fromURL(pubUrl);
    const loader = new IFrameLoader(publication.getBaseURI());
    loader.setReadiumCssBasePath('/readerJBKS/readium-css');
    const cvf = new R2ContentViewFactory(loader);
    const rendition = new Rendition(publication, root, cvf);
    rendition.setViewAsVertical(this.viewAsVertical);

    this.rendCtx = new R2RenditionContext(rendition, loader);

    this.updateSize(false);

    rendition.setPageLayout({
        spreadMode: SpreadMode.FitViewportDoubleSpread,
        pageWidth: 0,
        pageHeight: 0,
    });
    await rendition.render();
    rendition.viewport.enableScroll(this.enableScroll);
    
    this.resizer = new ViewportResizer(this.rendCtx, this.updateSize);

    await this.rendCtx.navigator.gotoBegin();

    return this.rendCtx;
  }

  private updateSize(willRefreshLayout: boolean = true): void {
    const availableWidth = this.getAvailableWidth();
    const availableHeight = this.getAvailableHeight();

    // this.viewportRoot.style.width = `${this.root.clientWidth}px`;
    // this.viewportRoot.style.height = `${this.root.clientHeight}px`;

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

  // Get available height for iframe container to sit within
  private getAvailableHeight(): number {
    const topBar = document.getElementById('top-control-bar');
    let topHeight = 0;
    if (topBar) {
        const topRect = topBar.getBoundingClientRect();
        topHeight = topRect.height;
    }
    const bottomBar = document.getElementById('bottom-control-bar');
    let bottomHeight = 0;
    if (bottomBar) {
        const bottomRect = bottomBar.getBoundingClientRect();
        bottomHeight = bottomRect.height;
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